import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase-server';
import { richiedeAdmin } from '@/lib/api-guard';

const schemaSessione = z.object({
  id: z.string().uuid().optional(),
  eventoId: z.string().uuid(),
  categoriaId: z.string().uuid(),
  tipo: z.enum(['FP1', 'FP2', 'FP3', 'FP4', 'PR', 'Q1', 'Q2', 'SPR', 'RAC', 'WUP']),
  dataOraInizio: z.string().nullable(), // ISO datetime
  stato: z.enum(['programmata', 'in_corso', 'conclusa', 'annullata', 'rinviata']),
});

export async function POST(req: NextRequest) {
  const { sessione, risposta } = await richiedeAdmin();
  if (!sessione) return risposta;

  const body = await req.json().catch(() => null);
  const parsed = schemaSessione.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errore: 'Dati sessione non validi.' }, { status: 400 });
  }
  const d = parsed.data;
  const sb = supabaseServer();

  const payload = {
    evento_id: d.eventoId,
    categoria_id: d.categoriaId,
    tipo: d.tipo,
    data_ora_inizio: d.dataOraInizio,
    stato: d.stato,
  };

  if (d.id) {
    const { error } = await sb.from('motogp_sessioni').update(payload).eq('id', d.id);
    if (error) return NextResponse.json({ errore: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: d.id });
  }

  const uuidEsternoManuale = `manuale-${crypto.randomUUID()}`;
  const { data, error } = await sb
    .from('motogp_sessioni')
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
  const { error } = await sb.from('motogp_sessioni').delete().eq('id', id);
  if (error) return NextResponse.json({ errore: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
