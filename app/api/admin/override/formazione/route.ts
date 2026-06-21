import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase-server';
import { richiedeAdmin } from '@/lib/api-guard';
import { ricalcolaPunteggiEvento } from '@/lib/calcolo-punteggi-db';

// NOTA: questo endpoint è volutamente "permissivo" — è la valvola di
// emergenza dell'admin. Non applica i controlli normali (deadline, pilota
// effettivamente in rosa) perché in uno scenario eccezionale potrebbe servire
// bypassarli (es. errore palese da correggere a freddo). Per questo motivo
// vive sotto /admin/override e non sotto /formazioni.
const schema = z.object({
  utenteId: z.string().uuid(),
  eventoId: z.string().uuid(),
  pilotaMoto3Id: z.string().uuid().nullable(),
  pilotaMoto2Id: z.string().uuid().nullable(),
  pilotaMotoGp1Id: z.string().uuid().nullable(),
  pilotaMotoGp2Id: z.string().uuid().nullable(),
  ricalcolaPunteggio: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const { sessione, risposta } = await richiedeAdmin();
  if (!sessione) return risposta;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errore: 'Dati non validi.' }, { status: 400 });
  }
  const d = parsed.data;

  const sb = supabaseServer();
  const { error } = await sb.from('fanta_formazioni').upsert(
    {
      utente_id: d.utenteId,
      evento_id: d.eventoId,
      pilota_moto3_id: d.pilotaMoto3Id,
      pilota_moto2_id: d.pilotaMoto2Id,
      pilota_motogp_1_id: d.pilotaMotoGp1Id,
      pilota_motogp_2_id: d.pilotaMotoGp2Id,
      auto_riproposta: false,
      bloccata: true,
      modificata_il: new Date().toISOString(),
    },
    { onConflict: 'utente_id,evento_id' }
  );

  if (error) {
    return NextResponse.json({ errore: error.message }, { status: 500 });
  }

  // Se il punteggio era stato corretto manualmente, l'override formazione da
  // solo non lo tocca: l'admin deve esplicitamente "sganciare" la correzione
  // manuale (vedi PATCH /api/admin/risultati) se vuole tornare al calcolo
  // automatico basato sulla nuova formazione.
  if (d.ricalcolaPunteggio) {
    await ricalcolaPunteggiEvento(d.eventoId);
  }

  return NextResponse.json({ ok: true });
}
