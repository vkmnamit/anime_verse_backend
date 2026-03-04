-- =====================================================
-- AnimeVerse Community Tables Migration (FINAL)
-- Drop and recreate everything for sync
-- =====================================================

-- Drop in reverse dependency order
DROP TABLE IF EXISTS community_members CASCADE;
DROP TABLE IF EXISTS comment_likes CASCADE;
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS post_comments CASCADE;
DROP TABLE IF EXISTS community_posts CASCADE;
DROP TABLE IF EXISTS communities CASCADE;

-- 0. communities — categories/subreddits
CREATE TABLE communities (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    member_count INTEGER DEFAULT 1,
    created_by UUID, 
    avatar_url TEXT,
    banner_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 0.1 community_members — tracks users in communities
CREATE TABLE community_members (
    id BIGSERIAL PRIMARY KEY,
    community_id BIGINT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(community_id, user_id)
);

-- 1. community_posts — main posts
CREATE TABLE community_posts (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    community_id BIGINT REFERENCES communities(id) ON DELETE SET NULL,
    community_name TEXT,
    community_slug TEXT,
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    is_spoiler BOOLEAN DEFAULT FALSE,
    meta_tag TEXT,
    votes INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. post_comments — comments and replies
CREATE TABLE post_comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID,
    parent_id BIGINT REFERENCES post_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    username TEXT,
    avatar_url TEXT,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. post_likes — tracks who liked which post
CREATE TABLE post_likes (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- 4. comment_likes — tracks who liked which comment
CREATE TABLE comment_likes (
    id BIGSERIAL PRIMARY KEY,
    comment_id BIGINT NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Indexes
CREATE INDEX idx_communities_slug ON communities(slug);
CREATE INDEX idx_community_members_user_id ON community_members(user_id);
CREATE INDEX idx_community_posts_community_id ON community_posts(community_id);
CREATE INDEX idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX idx_post_comments_parent_id ON post_comments(parent_id);
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);

-- RPC: increment community member count
CREATE OR REPLACE FUNCTION increment_community_member_count(community_id_input BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE communities
    SET member_count = member_count + 1
    WHERE id = community_id_input;
END;
$$ LANGUAGE plpgsql;

-- RPC: decrement community member count
CREATE OR REPLACE FUNCTION decrement_community_member_count(community_id_input BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE communities
    SET member_count = GREATEST(member_count - 1, 0)
    WHERE id = community_id_input;
END;
$$ LANGUAGE plpgsql;

-- RPC: increment comment count on a post
CREATE OR REPLACE FUNCTION increment_post_comment_count(post_id_input BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE community_posts
    SET comment_count = comment_count + 1
    WHERE id = post_id_input;
END;
$$ LANGUAGE plpgsql;

-- RPC: decrement comment count on a post
CREATE OR REPLACE FUNCTION decrement_post_comment_count(post_id_input BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE community_posts
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = post_id_input;
END;
$$ LANGUAGE plpgsql;

-- RPC: increment vote count on a post
CREATE OR REPLACE FUNCTION increment_post_votes(post_id_input BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE community_posts
    SET votes = votes + 1
    WHERE id = post_id_input;
END;
$$ LANGUAGE plpgsql;

-- RPC: decrement vote count on a post
CREATE OR REPLACE FUNCTION decrement_post_votes(post_id_input BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE community_posts
    SET votes = GREATEST(votes - 1, 0)
    WHERE id = post_id_input;
END;
$$ LANGUAGE plpgsql;

-- RPC: increment comment likes
CREATE OR REPLACE FUNCTION increment_comment_likes(comment_id_input BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE post_comments
    SET likes = likes + 1
    WHERE id = comment_id_input;
END;
$$ LANGUAGE plpgsql;

-- RPC: decrement comment likes
CREATE OR REPLACE FUNCTION decrement_comment_likes(comment_id_input BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE post_comments
    SET likes = GREATEST(likes - 1, 0)
    WHERE id = comment_id_input;
END;
$$ LANGUAGE plpgsql;

-- RPC: increment share count on a post
CREATE OR REPLACE FUNCTION increment_post_share_count(post_id_input BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE community_posts
    SET share_count = share_count + 1
    WHERE id = post_id_input;
END;
$$ LANGUAGE plpgsql;
