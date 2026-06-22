import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { richiedeLogin } from '@/lib/api-guard';
import { deadlineSchieramento, schieramentoApertoPer, inizioWeekend } from '@/lib/deadline';
import type { RosaAttivaRiga } from '@/lib/tipi';

/**
 * GET /api/formazioni?eventoId=...
 * Se eventoId non è specificato, usa il prossimo evento non concluso/annullato
 * della stagione corrente (quello per cui ha senso schierare ora).
 */
export async function GET(req: NextRequest) {
  const { sessione, risposta } = await richiedeLogin();
  if (!sessione) return risposta;

  const sb = supabaseServer();
  const eventoIdParam = req.nextUrl.searchParams.get('eventoId');

  let eventoId = eventoIdParam;

  if (!eventoId) {
    const { data: stagione } = await sb.from('motogp_stagioni').select('id').eq('corrente', true).single();
    if (!stagione) {
      return NextResponse.json({ errore: 'Nessuna stagione corrente sincronizzata.' }, { status: 404 });
    }
    const { data: prossimoEvento } = await sb
      .from('motogp_eventi')
      .select('id')
      .eq('stagione_id', stagione.id)
      .neq('stato', 'annullato')
      .neq('stato', 'concluso')
      .order('numero_round', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!prossimoEvento) {
      return NextResponse.json({ errore: 'Nessun prossimo evento trovato.' }, { status: 404 });
    }
    eventoId = prossimoEvento.id;
  }

  if (!eventoId) {
    return NextResponse.json({ errore: 'Evento non trovato.' }, { status: 404 });
  }

  const { data: evento } = await sb
    .from('motogp_eventi')
    .select('id, nome, paese, circuito, data_inizio, stagione_id, numero_round, stato')
    .eq('id', eventoId)
    .single();

  if (!evento) {
    return NextResponse.json({ errore: 'Evento non trovato.' }, { status: 404 });
  }

  const { data: rosaAttivaData } = await sb.rpc('fn_rosa_attiva', {
    p_utente_id: sessione.utenteId,
    p_stagione_id: evento.stagione_id,
    p_round: evento.numero_round,
  });
  const rosaAttiva = (rosaAttivaData ?? []) as RosaAttivaRiga[];

  const { data: formazione } = await sb
    .from('fanta_formazioni')
    .select('*')
    .eq('utente_id', sessione.utenteId)
    .eq('evento_id', eventoId)
    .maybeSingle();

  const deadline = await deadlineSchieramento(eventoId);
  const inizioWeekendData = await inizioWeekend(eventoId);
  const aperto = await schieramentoApertoPer(eventoId);

  return NextResponse.json({
    evento,
    rosaAttiva,
    formazione: formazione ?? null,
    deadline,
    inizioWeekend: inizioWeekendData,
    schieramentoAperto: aperto,
  });
}
