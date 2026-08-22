import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase-server';
import { richiedeAdmin } from '@/lib/api-guard';

const schemaStato = z.object({
  utenteId: z.string().uuid(),
  attivo: z.boolean(),
});

/** Disattiva/riattiva un utente, mantenendo intatto tutto lo storico. */
export async function PATCH(req: NextRequest) {
  const { sessione, risposta } = await richiedeAdmin();
  if (!sessione) return risposta;

  const body = await req.json().catch(() => null);
  const parsed = schemaStato.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errore: 'Dati non validi.' }, { status: 400 });
  }

  const sb = supabaseServer();
  const { error } = await sb
    .from('fanta_utenti')
    .update({ attivo: parsed.data.attivo })
    .eq('id', parsed.data.utenteId);

  if (error) return NextResponse.json({ errore: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * Elimina DEFINITIVAMENTE un utente e tutti i suoi dati collegati (rosa,
 * formazioni, punteggi). Operazione irreversibile: il frontend deve chiedere
 * conferma esplicita prima di chiamare questo endpoint.
 */
export async function DELETE(req: NextRequest) {
  const { sessione, risposta } = await richiedeAdmin();
  if (!sessione) return risposta;

  const utenteId = req.nextUrl.searchParams.get('utenteId');
  if (!utenteId) {
    return NextResponse.json({ errore: 'Parametro utenteId mancante.' }, { status: 400 });
  }
  if (utenteId === sessione.utenteId) {
    return NextResponse.json({ errore: 'Non puoi eliminare il tuo stesso account admin.' }, { status: 400 });
  }

  const sb = supabaseServer();

  // Le foreign key sono in CASCADE per fanta_rose, fanta_formazioni,
  // fanta_punteggi_weekend (vedi schema), quindi eliminare l'utente
  // ripulisce automaticamente anche tutti i suoi dati collegati.
  const { error } = await sb.from('fanta_utenti').delete().eq('id', utenteId);

  if (error) return NextResponse.json({ errore: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
