import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase-server';
import { richiedeAdmin } from '@/lib/api-guard';

const schemaSostituzione = z.object({
  utenteId: z.string().uuid(),
  stagioneId: z.string().uuid(),
  slot: z.enum(['moto3_a', 'moto3_b', 'moto2_a', 'moto2_b', 'motogp_a', 'motogp_b', 'motogp_c']),
  nuovoPilotaId: z.string().uuid(),
  daRound: z.number().int().min(1),
  motivo: z.string().min(1, 'Specifica un motivo per la sostituzione (es. infortunio, ritiro).'),
});

/**
 * Sostituisce un pilota in rosa a partire da un round specifico:
 *  1. Chiude la riga attualmente attiva per quello slot (valido_a_round = daRound - 1)
 *  2. Crea una nuova riga per il nuovo pilota (valido_da_round = daRound, aperta)
 * Questo mantiene intatta la storia dei punteggi già calcolati per i round
 * precedenti, che continuano a riferirsi al vecchio pilota.
 */
export async function POST(req: NextRequest) {
  const { sessione, risposta } = await richiedeAdmin();
  if (!sessione) return risposta;

  const body = await req.json().catch(() => null);
  const parsed = schemaSostituzione.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errore: parsed.error.errors[0]?.message ?? 'Dati non validi.' },
      { status: 400 }
    );
  }

  const { utenteId, stagioneId, slot, nuovoPilotaId, daRound, motivo } = parsed.data;
  const sb = supabaseServer();

  const { data: rigaAttiva } = await sb
    .from('fanta_rose')
    .select('id, valido_da_round, categoria_id')
    .eq('utente_id', utenteId)
    .eq('stagione_id', stagioneId)
    .eq('slot', slot)
    .is('valido_a_round', null)
    .maybeSingle();

  if (!rigaAttiva) {
    return NextResponse.json(
      { errore: 'Nessun pilota attivo trovato per questo slot: verifica utente/stagione/slot.' },
      { status: 404 }
    );
  }

  if (daRound <= rigaAttiva.valido_da_round) {
    return NextResponse.json(
      { errore: 'Il round di decorrenza deve essere successivo all\'inizio del possesso attuale.' },
      { status: 400 }
    );
  }

  const { error: errChiusura } = await sb
    .from('fanta_rose')
    .update({ valido_a_round: daRound - 1 })
    .eq('id', rigaAttiva.id);

  if (errChiusura) {
    return NextResponse.json({ errore: `Errore chiusura riga storica: ${errChiusura.message}` }, { status: 500 });
  }

  const { error: errInserimento } = await sb.from('fanta_rose').insert({
    utente_id: utenteId,
    stagione_id: stagioneId,
    pilota_id: nuovoPilotaId,
    categoria_id: rigaAttiva.categoria_id,
    slot,
    valido_da_round: daRound,
    valido_a_round: null,
    motivo_sostituzione: motivo,
    sostituito_da_admin_id: sessione.utenteId,
  });

  if (errInserimento) {
    return NextResponse.json({ errore: `Errore inserimento nuovo pilota: ${errInserimento.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
