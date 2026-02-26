import { Request, Response, NextFunction } from 'express'
import response from '../utils/response.util'
import { getSupabase, getServiceSupabase, createServiceRoleClient } from '../config/supabase.config'

// Use anon client for auth operations (signUp/signIn) — they set session state on the client
// Use service client (db) for DB reads/writes — bypasses RLS and doesn't get polluted by auth sessions
const authClient = getSupabase()
const db = getServiceSupabase()

/**
 * POST /api/v1/auth/signup
 * Body: { email, password, username }
 */
export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, username } = req.body

    if (!email || !password || !username) {
      return response.failure(res, 400, 'validation_error', 'email, password, and username are required')
    }

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await authClient.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    })

    if (authError) {
      return response.failure(res, 400, 'signup_failed', authError.message)
    }

    const user = authData.user
    if (!user) {
      return response.failure(res, 500, 'signup_failed', 'User creation failed')
    }

    // 2. Auto-confirm email in dev so Postman testing works
    const admin = createServiceRoleClient()
    if (admin) {
      await admin.auth.admin.updateUserById(user.id, { email_confirm: true })
    }

    // 3. Create matching row in profiles table (use db to bypass RLS)
    const { error: profileError } = await db
      .from('profiles')
      .upsert({
        id: user.id,
        username,
        avatar_url: null,
        bio: null,
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('[auth.signup] Profile creation failed:', profileError)
    }

    // 4. Auto-login after signup (since we auto-confirmed the email)
    let session = authData.session
    if (!session) {
      const { data: loginData } = await authClient.auth.signInWithPassword({ email, password })
      session = loginData?.session ?? null
    }

    return response.created(res, {
      user: {
        id: user.id,
        email: user.email,
        username,
      },
      session: session ? {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
      } : null,
    })
  } catch (err) {
    return next(err)
  }
}

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return response.failure(res, 400, 'validation_error', 'email and password are required')
    }

    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return response.failure(res, 401, 'login_failed', error.message)
    }

    // Fetch profile info using service client (bypasses RLS)
    const { data: profile } = await db
      .from('profiles')
      .select('username, avatar_url, bio')
      .eq('id', data.user.id)
      .single()

    return response.success(res, {
      user: {
        id: data.user.id,
        email: data.user.email,
        username: profile?.username ?? null,
        avatar_url: profile?.avatar_url ?? null,
        bio: profile?.bio ?? null,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
      },
    })
  } catch (err) {
    return next(err)
  }
}

/**
 * POST /api/v1/auth/logout
 */
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return response.failure(res, 401, 'unauthorized', 'No token provided')
    }

    const { error } = await db.auth.admin.signOut(token)
    if (error) {
      console.warn('[auth.logout]', error.message)
    }

    return response.success(res, { message: 'Logged out successfully' })
  } catch (err) {
    return next(err)
  }
}

/**
 * GET /api/v1/auth/me
 */
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return response.failure(res, 401, 'unauthorized', 'No token provided')
    }

    const { data: { user }, error } = await db.auth.getUser(token)
    if (error || !user) {
      return response.failure(res, 401, 'unauthorized', 'Invalid or expired token')
    }

    const { data: profile } = await db
      .from('profiles')
      .select('username, avatar_url, bio, created_at')
      .eq('id', user.id)
      .single()

    return response.success(res, {
      id: user.id,
      email: user.email,
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
      bio: profile?.bio ?? null,
      created_at: profile?.created_at ?? user.created_at,
    })
  } catch (err) {
    return next(err)
  }
}
