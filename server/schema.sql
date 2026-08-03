-- PostgreSQL Database Schema for CogniWell AI Platform
-- File: server/schema.sql

-- Drop table if exists during fresh setup (optional)
-- DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- Options: 'user', 'coach', 'admin'
    oauth_provider VARCHAR(50) DEFAULT NULL,   -- e.g. 'google', 'github'
    oauth_id VARCHAR(255) DEFAULT NULL,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);

-- Insert Default Seed Accounts for Testing
INSERT INTO users (name, email, password_hash, role, avatar_url)
VALUES 
  ('John Doe', 'user@cogniwell.com', '$2a$10$eE61K7l04lY8N7gQhFkUue4A3y5xJ5tJ2P1L6Q4M9N8B7V6C5Z4X3', 'user', 'JD'),
  ('Dr. Sarah Wilson', 'coach@cogniwell.com', '$2a$10$eE61K7l04lY8N7gQhFkUue4A3y5xJ5tJ2P1L6Q4M9N8B7V6C5Z4X3', 'coach', 'SW'),
  ('Admin User', 'admin@cogniwell.com', '$2a$10$eE61K7l04lY8N7gQhFkUue4A3y5xJ5tJ2P1L6Q4M9N8B7V6C5Z4X3', 'admin', 'AU')
ON CONFLICT (email) DO NOTHING;
