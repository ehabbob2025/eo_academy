import { createClient } from '@supabase/supabase-js'

// Capture recovery before the auth client consumes the URL fragment.
export const isRecoveryRedirect = typeof window !== 'undefined' && new URLSearchParams(window.location.hash.slice(1)).get('type')

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
}) as any
