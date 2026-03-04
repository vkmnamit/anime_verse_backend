import { Request, Response, NextFunction } from 'express'
import response from '../utils/response.util'
import { buildMeta } from '../utils/pagination.util'
import { getServiceSupabase } from '../config/supabase.config'
const supabase = getServiceSupabase()

const KITSU_BASE = 'https://kitsu.io/api/edge'

/** Fetch the poster image URL for an anime name from Kitsu */
async function fetchKitsuPoster(name: string): Promise<string> {
  try {
    const url = `${KITSU_BASE}/anime?filter[text]=${encodeURIComponent(name)}&page[limit]=1`
    const res = await fetch(url, { headers: { Accept: 'application/vnd.api+json' } })
    if (!res.ok) return ''
    const json: any = await res.json()
    const attrs = json?.data?.[0]?.attributes
    if (!attrs) return ''
    return (
      attrs.posterImage?.large ||
      attrs.posterImage?.medium ||
      attrs.posterImage?.small ||
      ''
    )
  } catch {
    return ''
  }
}

/** Enrich a raw DB battle row with Kitsu images */
async function enrichBattle(raw: any) {
  const nameA: string = raw.anime_a_name ?? ''
  const nameB: string = raw.anime_b_name ?? ''

  // Fetch both images in parallel
  const [imageA, imageB] = await Promise.all([
    nameA ? fetchKitsuPoster(nameA) : Promise.resolve(''),
    nameB ? fetchKitsuPoster(nameB) : Promise.resolve(''),
  ])

  return {
    ...raw,
    animeA: { name: nameA, image: imageA },
    animeB: { name: nameB, image: imageB },
  }
}

/**
 * GET /api/v1/battles
 */
export async function getBattles(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(String(req.query.page || '1'), 10) || 1
    const limit = parseInt(String(req.query.limit || '20'), 10) || 20
    const offset = (page - 1) * limit

    const { data, error, count } = await supabase
      .from('battles')
      .select('id, anime_a_name, anime_b_name, round, day_number, status, winner, created_at', { count: 'exact' })
      .not('anime_a_name', 'is', null)
      .order('day_number', { ascending: true })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Enrich all battles with Kitsu images in parallel
    const enriched = await Promise.all((data || []).map(enrichBattle))

    return response.success(res, enriched, buildMeta(count || 0, page, limit))
  } catch (err) {
    return next(err)
  }
}

/**
 * POST /api/v1/battles
 */
export async function createBattle(req: Request, res: Response, next: NextFunction) {
  try {
    const { anime_a_name, anime_b_name, round, day_number } = req.body

    const { data, error } = await supabase
      .from('battles')
      .insert({ anime_a_name, anime_b_name, round: round ?? 1, day_number: day_number ?? 1, status: 'active' })
      .select()
      .single()

    if (error) throw error
    return response.created(res, data)
  } catch (err) {
    return next(err)
  }
}

/**
 * GET /api/v1/battles/:id
 */
export async function getBattleDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const userId = req.user?.id

    const { data: battle, error } = await supabase
      .from('battles')
      .select('id, anime_a_name, anime_b_name, round, day_number, status, winner, created_at')
      .eq('id', id)
      .single()

    if (error || !battle) return response.failure(res, 404, 'not_found', 'Battle not found')

    // Fetch images from Kitsu
    const [imageA, imageB] = await Promise.all([
      battle.anime_a_name ? fetchKitsuPoster(battle.anime_a_name) : Promise.resolve(''),
      battle.anime_b_name ? fetchKitsuPoster(battle.anime_b_name) : Promise.resolve(''),
    ])

    // Fetch vote counts
    const { data: votes } = await supabase
      .from('battle_votes')
      .select('vote_for')
      .eq('battle_id', id)

    const votesA = (votes || []).filter(v => v.vote_for === 'A').length
    const votesB = (votes || []).filter(v => v.vote_for === 'B').length
    const total = votesA + votesB

    // Fetch user's own vote if logged in
    let userVote: string | null = null
    if (userId) {
      const { data: myVote } = await supabase
        .from('battle_votes')
        .select('vote_for')
        .eq('battle_id', id)
        .eq('user_id', userId)
        .single()
      userVote = myVote?.vote_for ?? null
    }

    return response.success(res, {
      ...battle,
      animeA: { name: battle.anime_a_name, image: imageA },
      animeB: { name: battle.anime_b_name, image: imageB },
      votes: {
        A: votesA,
        B: votesB,
        total,
        percentA: total ? Math.round((votesA / total) * 100) : 0,
        percentB: total ? Math.round((votesB / total) * 100) : 0,
      },
      userVote,
    })
  } catch (err) {
    return next(err)
  }
}

/**
 * POST /api/v1/battles/:id/vote
 */
export async function voteBattle(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

    const battleId = req.params.id
    const { vote_for } = req.body // 'A' or 'B'

    const { data, error } = await supabase
      .from('battle_votes')
      .upsert({ user_id: userId, battle_id: battleId, vote_for }, { onConflict: 'user_id,battle_id' })
      .select()
      .single()

    if (error) throw error

    // Silently check if the day's matches are done
    runAutoAdvance(getCurrentTournamentDay()).catch(e => console.error('[AutoAdvance Error]', e))

    return response.success(res, data)
  } catch (err) {
    return next(err)
  }
}

/**
 * GET /api/v1/battles/my-votes
 * Returns all battle_votes for the logged-in user as { [battle_id]: "A" | "B" }
 */
export async function getMyVotes(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) return response.failure(res, 401, 'unauthorized', 'Login required')

    const { data, error } = await supabase
      .from('battle_votes')
      .select('battle_id, vote_for')
      .eq('user_id', userId)

    if (error) throw error

    const votesMap: Record<string, string> = {}
    for (const row of data || []) {
      votesMap[row.battle_id] = row.vote_for
    }
    return response.success(res, votesMap)
  } catch (err) {
    return next(err)
  }
}

// ─── Tournament helpers ────────────────────────────────────────────────────────

/** Tournament epoch — start of the current week */
const TOURNAMENT_EPOCH = new Date('2026-03-04T00:00:00Z')

/** Returns 1–7 based on current UTC time vs epoch */
function getCurrentTournamentDay(): number {
  const msSince = Date.now() - TOURNAMENT_EPOCH.getTime()
  const daysSince = Math.floor(msSince / (1000 * 60 * 60 * 24))
  const dayInCycle = (daysSince % 7) + 1
  return Math.max(1, Math.min(7, dayInCycle))
}

/** Map tournament day → bracket round number */
function roundForDay(day: number): number {
  if (day <= 4) return 1  // R16: Days 1-4
  if (day <= 6) return 2  // QF:  Days 5-6
  return 3                // SF/Final: Day 7
}

/**
 * GET /api/v1/battles/today
 * Returns the 2 battles scheduled for the current tournament day.
 * Enriches with Kitsu images + vote counts like getBattles.
 */
export async function getTodaysBattles(req: Request, res: Response, next: NextFunction) {
  try {
    const day = getCurrentTournamentDay()

    const { data, error } = await supabase
      .from('battles')
      .select('id, anime_a_name, anime_b_name, round, day_number, status, winner, created_at')
      .not('anime_a_name', 'is', null)
      .eq('day_number', day)
      .order('created_at', { ascending: true })

    if (error) throw error

    const enriched = await Promise.all((data || []).map(enrichBattle))

    return response.success(res, { day, battles: enriched })
  } catch (err) {
    return next(err)
  }
}

/**
 * POST /api/v1/battles/advance
 * Admin utility: close battles for a given day_number by picking the winner
 * based on vote count (most votes wins), then auto-creates next round matches.
 *
 * Body: { day_number: number }  ← the day whose battles to close
 *
 * Flow:
 *   Day 1 closes → creates Day-5 QF slot A (winner of Day1 M1 vs winner of Day1 M2)
 *   Day 2 closes → creates Day-5 QF slot B
 *   Day 3 closes → creates Day-6 QF slot A
 *   Day 4 closes → creates Day-6 QF slot B
 *   Day 5 closes → creates Day-7 SF match 1
 *   Day 6 closes → creates Day-7 SF match 2
 *   Day 7 SF closed → creates Day-7 FINAL (round 4)
 */
export async function advanceTournament(req: Request, res: Response, next: NextFunction) {
  try {
    const { day_number } = req.body as { day_number: number }
    if (!day_number || day_number < 1 || day_number > 7) {
      return response.failure(res, 400, 'bad_request', 'day_number must be 1–7')
    }

    // 1. Fetch all active battles for this day
    const { data: dayBattles, error: fetchErr } = await supabase
      .from('battles')
      .select('id, anime_a_name, anime_b_name, round, day_number, status, winner')
      .not('anime_a_name', 'is', null)
      .eq('day_number', day_number)
      .eq('status', 'active')

    if (fetchErr) throw fetchErr
    if (!dayBattles || dayBattles.length === 0) {
      return response.failure(res, 404, 'not_found', `No active battles found for day ${day_number}`)
    }

    // 2. For each battle determine winner by vote count (random on tie)
    const closedWinners: { name: string; battleId: number }[] = []
    for (const battle of dayBattles) {
      const { data: votes } = await supabase
        .from('battle_votes')
        .select('vote_for')
        .eq('battle_id', battle.id)

      const votesA = (votes || []).filter(v => v.vote_for === 'A').length
      const votesB = (votes || []).filter(v => v.vote_for === 'B').length
      // Random tie-breaking when votes are equal (or both zero)
      const winner: 'A' | 'B' = votesA !== votesB
        ? (votesA > votesB ? 'A' : 'B')
        : (Math.random() < 0.5 ? 'A' : 'B')

      await supabase
        .from('battles')
        .update({ status: 'completed', winner })
        .eq('id', battle.id)

      const winnerName = winner === 'A' ? battle.anime_a_name : battle.anime_b_name
      closedWinners.push({ name: winnerName, battleId: battle.id })
    }

    // 3. Auto-create next round match from THIS day's 2 winners (no partner needed)
    // Day-mapping → next battle day + round
    const ADVANCE_MAP: Record<number, { nextDay: number; nextRound: number }> = {
      1: { nextDay: 5, nextRound: 2 }, // Day 1's 2 winners → QF match on Day 5
      2: { nextDay: 5, nextRound: 2 }, // Day 2's 2 winners → QF match on Day 5
      3: { nextDay: 6, nextRound: 2 }, // Day 3's 2 winners → QF match on Day 6
      4: { nextDay: 6, nextRound: 2 }, // Day 4's 2 winners → QF match on Day 6
      5: { nextDay: 7, nextRound: 3 }, // Day 5's 2 QF winners → SF match on Day 7
      6: { nextDay: 7, nextRound: 3 }, // Day 6's 2 QF winners → SF match on Day 7
    }

    const mapping = ADVANCE_MAP[day_number]
    let nextMatch: any = null

    if (mapping && closedWinners.length >= 2) {
      // Only create if a next-day match from this day's winners doesn't already exist
      // We track it by checking how many next-round matches already exist for that day
      const { data: existing } = await supabase
        .from('battles')
        .select('id')
        .eq('day_number', mapping.nextDay)
        .eq('round', mapping.nextRound)
        .not('anime_a_name', 'is', null)

      // Each source day produces exactly 1 next-round match
      // Days 1&2 each produce 1 QF match → Day 5 can have up to 2 QF matches
      // Days 3&4 each produce 1 QF match → Day 6 can have up to 2 QF matches
      // Days 5&6 each produce 1 SF match → Day 7 can have up to 2 SF matches (+ 1 Final)
      const maxForNextDay = 2 // up to 2 matches per next day
      if (!existing || existing.length < maxForNextDay) {
        const { data: created, error: createErr } = await supabase
          .from('battles')
          .insert({
            anime_a_name: closedWinners[0].name,
            anime_b_name: closedWinners[1].name,
            round: mapping.nextRound,
            day_number: mapping.nextDay,
            status: 'active',
          })
          .select()
          .single()

        if (!createErr) nextMatch = created
      }
    }

    // Day 7: if both SF battles are closed, auto-create the Final
    if (day_number === 7) {
      const { data: sfBattles } = await supabase
        .from('battles')
        .select('winner, anime_a_name, anime_b_name, round')
        .not('anime_a_name', 'is', null)
        .eq('day_number', 7)
        .eq('round', 3)
        .eq('status', 'completed')

      if (sfBattles && sfBattles.length >= 2) {
        const { data: existingFinal } = await supabase
          .from('battles')
          .select('id')
          .eq('day_number', 7)
          .eq('round', 4)

        if (!existingFinal || existingFinal.length === 0) {
          const sfWinners = sfBattles.map(b => b.winner === 'A' ? b.anime_a_name : b.anime_b_name)
          const { data: finalMatch } = await supabase
            .from('battles')
            .insert({
              anime_a_name: sfWinners[0],
              anime_b_name: sfWinners[1],
              round: 4,
              day_number: 7,
              status: 'active',
            })
            .select()
            .single()
          nextMatch = finalMatch
        }
      }
    }

    return response.success(res, {
      closed: closedWinners,
      nextMatch,
      message: `Day ${day_number} battles closed. ${nextMatch ? 'Next round match created.' : 'Waiting for partner day to complete.'}`,
    })
  } catch (err) {
    return next(err)
  }
}

/**
 * GET /api/v1/battles/all
 * Returns ALL battles across all days for full bracket view
 */
export async function getAllBattles(req: Request, res: Response, next: NextFunction) {
  try {
    const day = getCurrentTournamentDay()

    const { data, error } = await supabase
      .from('battles')
      .select('id, anime_a_name, anime_b_name, round, day_number, status, winner, created_at')
      .not('anime_a_name', 'is', null)
      .order('day_number', { ascending: true })
      .order('round', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error

    const enriched = await Promise.all((data || []).map(enrichBattle))

    return response.success(res, { currentDay: day, battles: enriched })
  } catch (err) {
    return next(err)
  }
}

/**
 * POST /api/v1/battles/seed
 * Seeds a full 16-anime tournament bracket (Days 1-4 R16)
 */
export async function seedTournament(req: Request, res: Response, next: NextFunction) {
  try {
    // Check if battles already exist
    const { data: existing } = await supabase
      .from('battles')
      .select('id')
      .not('anime_a_name', 'is', null)
      .limit(1)

    if (existing && existing.length > 0) {
      return response.failure(res, 400, 'already_seeded', 'Tournament already has battles. Delete existing battles first.')
    }

    // 16 popular anime for the tournament
    const matchups = [
      // Day 1 - Round of 16
      { day: 1, a: 'Naruto', b: 'Attack on Titan' },
      { day: 1, a: 'One Piece', b: 'Demon Slayer' },
      // Day 2 - Round of 16
      { day: 2, a: 'Jujutsu Kaisen', b: 'My Hero Academia' },
      { day: 2, a: 'Dragon Ball Z', b: 'Death Note' },
      // Day 3 - Round of 16
      { day: 3, a: 'Fullmetal Alchemist: Brotherhood', b: 'Spy x Family' },
      { day: 3, a: 'Vinland Saga', b: 'Chainsaw Man' },
      // Day 4 - Round of 16
      { day: 4, a: 'Solo Leveling', b: 'Bleach' },
      { day: 4, a: 'Hunter x Hunter', b: 'One Punch Man' },
    ]

    const inserts = matchups.map(m => ({
      anime_a_name: m.a,
      anime_b_name: m.b,
      round: 1,
      day_number: m.day,
      status: 'active',
    }))

    const { data, error } = await supabase
      .from('battles')
      .insert(inserts)
      .select()

    if (error) throw error

    return response.created(res, {
      message: `Seeded ${inserts.length} R16 matches across days 1-4`,
      battles: data,
    })
  } catch (err) {
    return next(err)
  }
}

/**
 * POST /api/v1/battles/auto-advance
 * HTTP endpoint for manually triggering auto-advance check.
 */
export async function autoAdvance(req: Request, res: Response, next: NextFunction) {
  try {
    const day = getCurrentTournamentDay()
    const result = await runAutoAdvance(day)
    return response.success(res, result)
  } catch (err) {
    return next(err)
  }
}

/**
 * Underlying tournament advance check — can be called from anywhere.
 * Does NOT send responses directly.
 */
async function runAutoAdvance(day: number) {
  // Get all active battles for day
  const { data: activeBattles } = await supabase
    .from('battles')
    .select('id, anime_a_name, anime_b_name, round, day_number, status, winner')
    .not('anime_a_name', 'is', null)
    .eq('day_number', day)
    .eq('status', 'active')

  if (!activeBattles || activeBattles.length === 0) {
    return { message: 'No active battles found for today', day }
  }

  // Check each battle has at least 1 vote
  for (const battle of activeBattles) {
    const { count } = await supabase
      .from('battle_votes')
      .select('*', { count: 'exact', head: true })
      .eq('battle_id', battle.id)
    if (!count || count === 0) {
      return { message: 'Not all battles have votes yet', day, pending: true }
    }
  }

  // All battles have votes — call the existing advance helper
  // (we'll just call the logic block from advanceTournament directly if we had refactored it, 
  // but for now let's just use it conceptually)
  return await runAdvanceLogic(day)
}

/** Helper that performs the winning/closing logic WITHOUT HTTP baggage */
async function runAdvanceLogic(day_number: number) {
  // 1. Fetch active battles for day
  const { data: dayBattles, error: fetchErr } = await supabase
    .from('battles')
    .select('id, anime_a_name, anime_b_name, round, day_number, status, winner')
    .not('anime_a_name', 'is', null)
    .eq('day_number', day_number)
    .eq('status', 'active')

  if (fetchErr) throw fetchErr
  if (!dayBattles || dayBattles.length === 0) return { message: 'Nothing to advance' }

  // 2. Loop & close
  const closedWinners: { name: string; battleId: number }[] = []
  for (const battle of dayBattles) {
    const { data: votes } = await supabase
      .from('battle_votes')
      .select('vote_for')
      .eq('battle_id', battle.id)

    const votesA = (votes || []).filter(v => v.vote_for === 'A').length
    const votesB = (votes || []).filter(v => v.vote_for === 'B').length
    const winner: 'A' | 'B' = votesA !== votesB ? (votesA > votesB ? 'A' : 'B') : (Math.random() < 0.5 ? 'A' : 'B')

    await supabase.from('battles').update({ status: 'completed', winner }).eq('id', battle.id)
    const winnerName = winner === 'A' ? battle.anime_a_name : battle.anime_b_name
    closedWinners.push({ name: winnerName, battleId: battle.id })
  }

  // 3. Auto-spawn next matches
  const ADVANCE_MAP: Record<number, { nextDay: number; nextRound: number }> = {
    1: { nextDay: 5, nextRound: 2 },
    2: { nextDay: 5, nextRound: 2 },
    3: { nextDay: 6, nextRound: 2 },
    4: { nextDay: 6, nextRound: 2 },
    5: { nextDay: 7, nextRound: 3 },
    6: { nextDay: 7, nextRound: 3 },
  }

  const mapping = ADVANCE_MAP[day_number]
  let nextMatch: any = null

  if (mapping && closedWinners.length >= 2) {
    const { data: existing } = await supabase
      .from('battles')
      .select('id')
      .eq('day_number', mapping.nextDay)
      .eq('round', mapping.nextRound)

    // Should only create if we haven't already fulfilled the quota for that day
    if (!existing || existing.length < 2) {
      const { data: created, error: createErr } = await supabase
        .from('battles')
        .insert({
          anime_a_name: closedWinners[0].name,
          anime_b_name: closedWinners[1].name,
          round: mapping.nextRound,
          day_number: mapping.nextDay,
          status: 'active',
        })
        .select()
        .single()
      if (!createErr) nextMatch = created
    }
  }

  // Final matches spawn logic (Day 7 specific)
  if (day_number === 7) {
    const { data: sfBattles } = await supabase
      .from('battles')
      .select('winner, anime_a_name, anime_b_name, round')
      .eq('day_number', 7)
      .eq('round', 3)
      .eq('status', 'completed')

    if (sfBattles && sfBattles.length >= 2) {
      const { data: existingFinal } = await supabase
        .from('battles').select('id').eq('day_number', 7).eq('round', 4)

      if (!existingFinal || existingFinal.length === 0) {
        const sfWinners = sfBattles.map(b => b.winner === 'A' ? b.anime_a_name : b.anime_b_name)
        const { data: finalM } = await supabase
          .from('battles')
          .insert({ anime_a_name: sfWinners[0], anime_b_name: sfWinners[1], round: 4, day_number: 7, status: 'active' })
          .select().single()
        nextMatch = finalM
      }
    }
  }

  return { closed: closedWinners, nextMatch, message: 'Day advanced successfully' }
}
