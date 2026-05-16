import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[supabase] Додайте VITE_SUPABASE_URL та VITE_SUPABASE_ANON_KEY у .env (див. Supabase → Settings → API).')
}

/** Клієнт Supabase для браузера (anon / publishable key). */
export const supabase = createClient(String(supabaseUrl ?? ''), String(supabaseAnonKey ?? ''), {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})
