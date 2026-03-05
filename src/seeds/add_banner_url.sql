-- Migration: add banner_url column to profiles table
-- Run this in your Supabase project → SQL Editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS banner_url TEXT DEFAULT NULL;
