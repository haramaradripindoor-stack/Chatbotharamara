import { createClient } from '@supabase/supabase-js'

// Cliente público (anon) — para panel admin client-side
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Cliente con service_role — SOLO usar en rutas API (server-side)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
