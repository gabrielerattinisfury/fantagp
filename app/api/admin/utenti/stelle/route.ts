import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase-server';
import { richiedeAdmin } from '@/lib/api-guard';

const schemaStelle = z.object({
  utenteId: z.string().uuid(),
  stelleMondiali: z.number().int().min(0).max(20),
});

/**
 * Assegna manualmente le stelle mondiali (riconoscimento onorifico
 * decorativo, es. titoli vinti in stagioni precedenti) a un fantamotociclista.
 * Non ha alcun effetto sul calcolo punti.
 */
export async function PATCH(req: NextRequest) {
  const { sessione, risposta } = await richiedeAdmin();
  if (!sessione) return risposta;

  const body = await req.json().catch(() => null);
  const parsed = schemaStelle.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errore: parsed.error.errors[0]?.message ?? 'Dati non validi.' },
      { status: 400 }
    );
  }

  const sb = supabaseServer();
  const { error } = await sb
    .from('fanta_utenti')
    .update({ stelle_mondiali: parsed.data.stelleMondiali })
    .eq('id', parsed.data.utenteId);

  if (error) return NextResponse.json({ errore: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
