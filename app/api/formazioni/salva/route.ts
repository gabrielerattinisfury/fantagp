import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase-server';
import { richiedeLogin } from '@/lib/api-guard';
import { schieramentoApertoPer } from '@/lib/deadline';
import type { RosaAttivaRiga } from '@/lib/tipi';

const schemaFormazione = z.object({
  eventoId: z.string().uuid(),
  pilotaMoto3Id: z.string().uuid(),
  pilotaMoto2Id: z.string().uuid(),
  pilotaMotoGp1Id: z.string().uuid(),
  pilotaMotoGp2Id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const { sessione, risposta } = await richiedeLogin();
  if (!sessione) return risposta;

  const body = await req.json().catch(() => null);
  const parsed = schemaFormazione.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errore: 'Formazione incompleta: seleziona un pilota per ogni categoria.' },
      { status: 400 }
    );
  }

  const { eventoId, pilotaMoto3Id, pilotaMoto2Id, pilotaMotoGp1Id, pilotaMotoGp2Id } = parsed.data;

  if (pilotaMotoGp1Id === pilotaMotoGp2Id) {
    return NextResponse.json(
      { errore: 'Devi schierare due piloti MotoGP diversi.' },
      { status: 400 }
    );
  }

  const aperto = await schieramentoApertoPer(eventoId);
  if (!aperto) {
    return NextResponse.json(
      { errore: 'Lo schieramento per questo weekend è chiuso: la gara Moto3 è già partita (o sta per partire).' },
      { status: 403 }
    );
  }

  const sb = supabaseServer();
  const { data: evento } = await sb
    .from('motogp_eventi')
    .select('stagione_id, numero_round')
    .eq('id', eventoId)
    .single();
  if (!evento || evento.numero_round == null) {
    return NextResponse.json({ errore: 'Evento non trovato.' }, { status: 404 });
  }

  // Validazione cruciale: i piloti scelti devono appartenere davvero alla
  // rosa attiva dell'utente per questo round, ed essere della categoria giusta.
  const { data: rosaAttivaData } = await sb.rpc('fn_rosa_attiva', {
    p_utente_id: sessione.utenteId,
    p_stagione_id: evento.stagione_id,
    p_round: evento.numero_round,
  });
  const rosaAttiva = (rosaAttivaData ?? []) as RosaAttivaRiga[];
  const idInRosa = new Set(rosaAttiva.map((r) => r.pilota_id));

  const idMoto3InRosa = new Set(
    rosaAttiva.filter((r) => r.slot === 'moto3_a' || r.slot === 'moto3_b').map((r) => r.pilota_id)
  );
  const idMoto2InRosa = new Set(
    rosaAttiva.filter((r) => r.slot === 'moto2_a' || r.slot === 'moto2_b').map((r) => r.pilota_id)
  );
  const idMotoGpInRosa = new Set(
    rosaAttiva
      .filter((r) => r.slot === 'motogp_a' || r.slot === 'motogp_b' || r.slot === 'motogp_c')
      .map((r) => r.pilota_id)
  );

  if (!idMoto3InRosa.has(pilotaMoto3Id)) {
    return NextResponse.json({ errore: 'Il pilota Moto3 scelto non è nella tua rosa.' }, { status: 400 });
  }
  if (!idMoto2InRosa.has(pilotaMoto2Id)) {
    return NextResponse.json({ errore: 'Il pilota Moto2 scelto non è nella tua rosa.' }, { status: 400 });
  }
  if (!idMotoGpInRosa.has(pilotaMotoGp1Id) || !idMotoGpInRosa.has(pilotaMotoGp2Id)) {
    return NextResponse.json({ errore: 'I piloti MotoGP scelti non sono nella tua rosa.' }, { status: 400 });
  }
  if (!idInRosa.size) {
    return NextResponse.json({ errore: 'Rosa non trovata per questa stagione.' }, { status: 400 });
  }

  const { error } = await sb.from('fanta_formazioni').upsert(
    {
      utente_id: sessione.utenteId,
      evento_id: eventoId,
      pilota_moto3_id: pilotaMoto3Id,
      pilota_moto2_id: pilotaMoto2Id,
      pilota_motogp_1_id: pilotaMotoGp1Id,
      pilota_motogp_2_id: pilotaMotoGp2Id,
      auto_riproposta: false,
      // "bloccata" qui è sempre false: questo endpoint viene raggiunto solo
      // se schieramentoApertoPer() ha già confermato che la deadline (inizio
      // gara Moto3) non è ancora passata. Il fantamotociclista può quindi
      // salvare/modificare la formazione tutte le volte che vuole (es.
      // schiera il venerdì, cambia idea il sabato): ogni salvataggio
      // sovrascrive semplicemente quello precedente fino alla deadline. Il
      // valore diventa true solo per le formazioni auto-riproposte da
      // applicaAutoRiproposizioni() dopo che la deadline è scaduta.
      bloccata: false,
      modificata_il: new Date().toISOString(),
    },
    { onConflict: 'utente_id,evento_id' }
  );

  if (error) {
    return NextResponse.json({ errore: `Errore salvataggio: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
