import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase-server';
import { richiedeAdmin } from '@/lib/api-guard';

const schemaCorrezione = z.object({
  utenteId: z.string().uuid(),
  eventoId: z.string().uuid(),
  puntiMoto3Gara: z.number(),
  puntiMoto2Gara: z.number(),
  puntiMotoGp1Gara: z.number(),
  puntiMotoGp2Gara: z.number(),
  sprintPunti1: z.number(),
  sprintPunti2: z.number(),
  noteAdmin: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { sessione, risposta } = await richiedeAdmin();
  if (!sessione) return risposta;

  const eventoId = req.nextUrl.searchParams.get('eventoId');
  if (!eventoId) {
    return NextResponse.json({ errore: 'Parametro eventoId mancante.' }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data } = await sb
    .from('fanta_punteggi_weekend')
    .select('*, utente:fanta_utenti(username, nome_squadra)')
    .eq('evento_id', eventoId);

  return NextResponse.json({ punteggi: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const { sessione, risposta } = await richiedeAdmin();
  if (!sessione) return risposta;

  const body = await req.json().catch(() => null);
  const parsed = schemaCorrezione.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errore: 'Dati di correzione non validi.' }, { status: 400 });
  }

  const d = parsed.data;
  const totale =
    d.puntiMoto3Gara + d.puntiMoto2Gara + d.puntiMotoGp1Gara + d.puntiMotoGp2Gara + d.sprintPunti1 + d.sprintPunti2;

  const sb = supabaseServer();
  const { error } = await sb.from('fanta_punteggi_weekend').upsert(
    {
      utente_id: d.utenteId,
      evento_id: d.eventoId,
      punti_moto3_gara: d.puntiMoto3Gara,
      punti_moto2_gara: d.puntiMoto2Gara,
      punti_motogp1_gara: d.puntiMotoGp1Gara,
      punti_motogp2_gara: d.puntiMotoGp2Gara,
      sprint_pilota1_punti: d.sprintPunti1,
      sprint_pilota2_punti: d.sprintPunti2,
      totale_weekend: totale,
      modificato_manualmente: true,
      note_admin: d.noteAdmin ?? `Corretto manualmente da ${sessione.username}`,
      calcolato_il: new Date().toISOString(),
    },
    { onConflict: 'utente_id,evento_id' }
  );

  if (error) {
    return NextResponse.json({ errore: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Rimuove lo stato "modificato manualmente" da un punteggio e lo ricalcola
 * subito secondo le regole automatiche standard. Usato per tornare indietro
 * da una correzione manuale fatta in precedenza.
 */
export async function DELETE(req: NextRequest) {
  const { sessione, risposta } = await richiedeAdmin();
  if (!sessione) return risposta;

  const utenteId = req.nextUrl.searchParams.get('utenteId');
  const eventoId = req.nextUrl.searchParams.get('eventoId');
  if (!utenteId || !eventoId) {
    return NextResponse.json({ errore: 'Parametri utenteId/eventoId mancanti.' }, { status: 400 });
  }

  const sb = supabaseServer();
  const { error } = await sb
    .from('fanta_punteggi_weekend')
    .update({ modificato_manualmente: false, note_admin: null })
    .eq('utente_id', utenteId)
    .eq('evento_id', eventoId);

  if (error) {
    return NextResponse.json({ errore: error.message }, { status: 500 });
  }

  const { ricalcolaPunteggiEvento } = await import('@/lib/calcolo-punteggi-db');
  await ricalcolaPunteggiEvento(eventoId);

  return NextResponse.json({ ok: true });
}
