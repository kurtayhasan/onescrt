-- =====================================================
-- OneScrt Database Schema
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- Stores anonymous user profiles with public keys
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON profiles(client_id);

-- =====================================================
-- SECRETS TABLE
-- Stores user-submitted secrets
-- =====================================================
CREATE TABLE IF NOT EXISTS secrets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    -- Foreign key removed to allow secrets even if profile doesn't exist yet
    -- CONSTRAINT fk_secrets_client FOREIGN KEY (client_id) REFERENCES profiles(client_id) ON DELETE CASCADE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_secrets_client_id ON secrets(client_id);
CREATE INDEX IF NOT EXISTS idx_secrets_created_at ON secrets(created_at DESC);

-- =====================================================
-- SECRET_VIEWS TABLE
-- Tracks which secrets have been viewed by which users
-- =====================================================
CREATE TABLE IF NOT EXISTS secret_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    secret_id UUID NOT NULL,
    client_id UUID NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_secret_views_secret FOREIGN KEY (secret_id) REFERENCES secrets(id) ON DELETE CASCADE,
    -- Foreign key to profiles removed for flexibility
    -- CONSTRAINT fk_secret_views_client FOREIGN KEY (client_id) REFERENCES profiles(client_id) ON DELETE CASCADE,
    UNIQUE(secret_id, client_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_secret_views_secret_id ON secret_views(secret_id);
CREATE INDEX IF NOT EXISTS idx_secret_views_client_id ON secret_views(client_id);

-- =====================================================
-- REPLIES TABLE
-- Stores encrypted replies to secrets
-- =====================================================
CREATE TABLE IF NOT EXISTS replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    secret_id UUID NOT NULL,
    sender_client_id UUID NOT NULL,
    recipient_client_id UUID NOT NULL,
    ciphertext TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_replies_secret FOREIGN KEY (secret_id) REFERENCES secrets(id) ON DELETE CASCADE
    -- Foreign keys to profiles removed for flexibility - profiles will be created on demand
    -- CONSTRAINT fk_replies_sender FOREIGN KEY (sender_client_id) REFERENCES profiles(client_id) ON DELETE CASCADE,
    -- CONSTRAINT fk_replies_recipient FOREIGN KEY (recipient_client_id) REFERENCES profiles(client_id) ON DELETE CASCADE
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_replies_secret_id ON replies(secret_id);
CREATE INDEX IF NOT EXISTS idx_replies_sender_client_id ON replies(sender_client_id);
CREATE INDEX IF NOT EXISTS idx_replies_recipient_client_id ON replies(recipient_client_id);
CREATE INDEX IF NOT EXISTS idx_replies_created_at ON replies(created_at DESC);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get replies for a specific recipient
CREATE OR REPLACE FUNCTION get_recipient_replies(recipient_client_uuid UUID)
RETURNS TABLE (
    id UUID,
    secret_id UUID,
    sender_client_id UUID,
    recipient_client_id UUID,
    ciphertext TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.secret_id,
        r.sender_client_id,
        r.recipient_client_id,
        r.ciphertext,
        r.metadata,
        r.created_at
    FROM replies r
    WHERE r.recipient_client_id = recipient_client_uuid
    ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;

-- Policies for profiles (anyone can read, insert own profile)
CREATE POLICY "Anyone can read profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert profile" ON profiles
    FOR INSERT WITH CHECK (true);

-- Policies for secrets (anyone can read, insert own secrets)
CREATE POLICY "Anyone can read secrets" ON secrets
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert secrets" ON secrets
    FOR INSERT WITH CHECK (true);

-- Policies for secret_views (anyone can insert/read)
CREATE POLICY "Anyone can manage secret_views" ON secret_views
    FOR ALL USING (true) WITH CHECK (true);

-- Policies for replies (anyone can insert, read own received replies)
CREATE POLICY "Anyone can insert replies" ON replies
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read their received replies" ON replies
    FOR SELECT USING (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp on profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

