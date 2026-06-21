import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { richiedeAdmin } from '@/lib/api-guard';

export async function GET() {
  const { sessione, risposta } = await richiedeAdmin();
  if (!sessione) return risposta;

  const sb = supabaseServer();

  const [
    { data: stagione },
    { data: utenti },
    { data: categorie },
    { data: syncLog },
  ] = await Promise.all([
    sb.from('motogp_stagioni').select('id, anno, corrente').eq('corrente', true).maybeSingle(),
    sb
      .from('fanta_utenti')
      .select('id, username, nome_squadra, colore_primario, colore_secondario, numero_gara, ruolo, attivo')
      .order('nome_squadra', { ascending: true }),
    sb.from('motogp_categorie').select('id, codice, nome'),
    sb.from('sync_log').select('*').order('eseguito_il', { ascending: false }).limit(20),
  ]);

  let eventi: unknown[] = [];
  let piloti: unknown[] = [];
  if (stagione) {
    const { data: eventiData } = await sb
      .from('motogp_eventi')
      .select('*')
      .eq('stagione_id', stagione.id)
      .order('numero_round', { ascending: true });
    eventi = eventiData ?? [];

    const { data: pilotiData } = await sb
      .from('motogp_piloti')
      .select('id, nome_completo, numero, categoria_id, team, attivo')
      .order('nome_completo', { ascending: true });
    piloti = pilotiData ?? [];
  }

  return NextResponse.json({
    stagione: stagione ?? null,
    utenti: utenti ?? [],
    categorie: categorie ?? [],
    eventi,
    piloti,
    syncLog: syncLog ?? [],
  });
}
