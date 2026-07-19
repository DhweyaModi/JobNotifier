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
-- Supports multiple users/subscribers for webhooks
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    webhook_url TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('slack', 'discord')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_users_platform ON users(platform);

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
    job_id BIGINT REFERENCES jobs(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('applied', 'oa', 'interview', 'rejected', 'offer')),
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

-- Disable Row Level Security (RLS) on all tables since this database is accessed by a backend scraper using the anon key.
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_duplicates DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_filters DISABLE ROW LEVEL SECURITY;
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;

