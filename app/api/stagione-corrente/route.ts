import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

/**
 * Endpoint volutamente pubblico (nessun richiedeLogin): la pagina di login
 * non ha ancora una sessione attiva, ma ha comunque bisogno di sapere l'anno
 * della stagione corrente per mostrarlo nel titolo ("FantaMotoGP " + anno,
 * poi "FantaMotoGP 2027", ecc. senza mai hardcodare l'anno nel codice).
 * Espone SOLO l'anno, nessun dato sensibile.
 */
export async function GET() {
  const sb = supabaseServer();
  const { data: stagione } = await sb
    .from('motogp_stagioni')
    .select('anno')
    .eq('corrente', true)
    .maybeSingle();

  return NextResponse.json({ anno: stagione?.anno ?? null });
}
