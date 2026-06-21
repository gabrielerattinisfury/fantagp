import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase-server';
import { richiedeAdmin } from '@/lib/api-guard';

const schemaEvento = z.object({
  id: z.string().uuid().optional(), // assente = crea nuovo
  stagioneId: z.string().uuid(),
  nome: z.string().min(1),
  paese: z.string().nullable().optional(),
  circuito: z.string().nullable().optional(),
  numeroRound: z.number().int().min(1).nullable().optional(),
  dataInizio: z.string().nullable().optional(), // YYYY-MM-DD
  dataFine: z.string().nullable().optional(),
  stato: z.enum(['programmato', 'in_corso', 'concluso', 'annullato', 'rinviato']),
});

export async function POST(req: NextRequest) {
  const { sessione, risposta } = await richiedeAdmin();
  if (!sessione) return risposta;

  const body = await req.json().catch(() => null);
  const parsed = schemaEvento.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errore: parsed.error.errors[0]?.message ?? 'Dati evento non validi.' },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const sb = supabaseServer();

  const payload = {
    stagione_id: d.stagioneId,
    nome: d.nome,
    paese: d.paese ?? null,
    circuito: d.circuito ?? null,
    numero_round: d.numeroRound ?? null,
    data_inizio: d.dataInizio ?? null,
    data_fine: d.dataFine ?? null,
    stato: d.stato,
    annullato: d.stato === 'annullato',
  };

  if (d.id) {
    const { error } = await sb.from('motogp_eventi').update(payload).eq('id', d.id);
    if (error) return NextResponse.json({ errore: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: d.id });
  }

  // Evento creato manualmente: serve comunque un uuid_esterno univoco; ne
  // generiamo uno con prefisso "manuale-" per non confliggere mai con quelli
  // reali forniti dall'API MotoGP.
  const uuidEsternoManuale = `manuale-${crypto.randomUUID()}`;
  const { data, error } = await sb
    .from('motogp_eventi')
    .insert({ ...payload, uuid_esterno: uuidEsternoManuale })
    .select('id')
    .single();

  if (error) return NextResponse.json({ errore: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function DELETE(req: NextRequest) {
  const { sessione, risposta } = await richiedeAdmin();
  if (!sessione) return risposta;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ errore: 'Parametro id mancante.' }, { status: 400 });

  const sb = supabaseServer();
  const { error } = await sb.from('motogp_eventi').delete().eq('id', id);
  if (error) return NextResponse.json({ errore: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
