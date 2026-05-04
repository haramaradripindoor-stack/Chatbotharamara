import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy singletons — se crean la primera vez que se usan, no al importar el módulo.
// Esto evita el error "supabaseUrl is required" durante el build de Vercel,
// donde las env vars no están disponibles en tiempo de compilación.

let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _supabase
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )
  }
  return _supabaseAdmin
}

// Aliases para compatibilidad con el panel admin (client-side usa getSupabase())
export const supabase = { get: getSupabase }
