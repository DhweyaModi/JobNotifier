-- Enable UUID extension if not already enabled (useful for user IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Jobs Table
-- Stores all scraped jobs. Unique constraint on external_uid allows duplicate prevention.
CREATE TABLE IF NOT EXISTS jobs (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    external_uid TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    country TEXT NOT NULL, -- 'canada', 'usa', 'both', or 'other'
    url TEXT,
    posted_at TIMESTAMPTZ,
    first_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Index for fast lookup by external_uid (created automatically by UNIQUE constraint, but good to note)
-- Index for query performance when filtering/sorting by status, country, or post date
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_country ON jobs(country);
CREATE INDEX IF NOT EXISTS idx_jobs_first_seen ON jobs(first_seen_at DESC);

-- 2. Job Duplicates Table
-- Links duplicates across different sources (e.g. for cross-source merging/dedup in Week 2)
CREATE TABLE IF NOT EXISTS job_duplicates (
    job_id BIGINT REFERENCES jobs(id) ON DELETE CASCADE,
    duplicate_of_job_id BIGINT REFERENCES jobs(id) ON DELETE CASCADE,
    PRIMARY KEY (job_id, duplicate_of_job_id)
);

-- 3. Users Table
-- Supports multiple users/subscribers for webhooks and authenticated web dashboard users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    webhook_url TEXT,
    platform TEXT DEFAULT 'web',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_sign_in_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_users_platform ON users(platform);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 4. User Filters Table
-- User-specific criteria for job delivery
CREATE TABLE IF NOT EXISTS user_filters (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    keywords TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    countries TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    roles TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    min_grad_year INT
);

-- 5. Applications Table
-- Tracks job application status per user
CREATE TABLE IF NOT EXISTS applications (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('saved', 'applied', 'oa', 'interview', 'interviewing', 'rejected', 'offer')),
    applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, job_id)
);

-- Automatic updated_at trigger helper for applications table
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_applications_modtime
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- The scraper / GitHub Actions MUST use the service_role key (SUPABASE_KEY),
-- which bypasses RLS. The public Next.js frontend uses the anon key and is
-- limited by the policies below. Never expose the service_role key client-side.
-- This section is idempotent and safe to re-run on an existing project.

ALTER TABLE jobs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_duplicates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_filters    ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications    ENABLE ROW LEVEL SECURITY;

-- jobs: public read-only (writes only via service_role)
DROP POLICY IF EXISTS "jobs_public_read" ON jobs;
CREATE POLICY "jobs_public_read" ON jobs
    FOR SELECT TO anon, authenticated USING (true);

-- job_duplicates: no policies => only service_role can access.

-- users: contains emails + webhook URLs. Each signed-in user sees/edits only their own row.
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users
    FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users
    FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users
    FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Guests (no Supabase auth session) may only register a bare 'guest' row; no webhook, no reads.
DROP POLICY IF EXISTS "users_guest_insert" ON users;
CREATE POLICY "users_guest_insert" ON users
    FOR INSERT TO anon
    WITH CHECK (platform = 'guest' AND webhook_url IS NULL);

-- user_filters / applications: strictly per-user.
DROP POLICY IF EXISTS "user_filters_own" ON user_filters;
CREATE POLICY "user_filters_own" ON user_filters
    FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "applications_own" ON applications;
CREATE POLICY "applications_own" ON applications
    FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Public community counter (the frontend can no longer COUNT the users table directly).
CREATE OR REPLACE FUNCTION get_user_count()
RETURNS BIGINT
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT count(*) FROM users $$;
REVOKE ALL ON FUNCTION get_user_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_count() TO anon, authenticated;
