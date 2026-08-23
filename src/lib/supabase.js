import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly in dev rather than silently making broken requests later.
  console.error(
    'Missing Supabase environment variables. Check that .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
