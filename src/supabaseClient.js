import { createClient } from '@supabase/supabase-js';

const fallbackSupabaseUrl = 'https://bzajsqxtaypgkejbmtxi.supabase.co';
const fallbackSupabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6YWpzcXh0YXlwZ2tlamJtdHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTA3NTIsImV4cCI6MjA4NTAyNjc1Mn0.0qaYcj89jXUI54fbo0JHpEuWHFEw4oSoajuqOFG-vok';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackSupabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

