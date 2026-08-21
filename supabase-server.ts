// ============================================================================
// Client Supabase lato server. Usa la SERVICE ROLE KEY: ha pieni privilegi sul
// database e va usata SOLO in codice server-side (API routes, server
// components, cron job) — non deve mai finire nel bundle del browser.
// ============================================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function supabaseServer(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Variabili ambiente mancanti: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devono essere impostate (vedi .env.example).'
    );
  }

  _client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _client;
}
