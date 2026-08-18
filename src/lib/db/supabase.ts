import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const isValidSupabaseKey = (key: string | undefined): boolean => {
  if (!key) return false
  return key.startsWith('eyJ') || key.startsWith('sb_')
}

if (!supabaseUrl || !isValidSupabaseKey(supabaseAnonKey)) {
 
  throw new Error('Missing or invalid Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be valid Supabase keys.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey!)

export const supabaseAdmin = isValidSupabaseKey(supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : supabase
