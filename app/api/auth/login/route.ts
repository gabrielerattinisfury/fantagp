import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase-server';
import { creaTokenSessione, impostaCookieSessione } from '@/lib/auth';

const schemaLogin = z.object({
  username: z.string().min(1, 'Username obbligatorio'),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schemaLogin.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errore: 'Dati di login non validi.' }, { status: 400 });
  }

  const { username } = parsed.data;
  const sb = supabaseServer();

  const { data: utente } = await sb
    .from('fanta_utenti')
    .select('id, username, ruolo, attivo')
    .ilike('username', username)
    .maybeSingle();

  if (!utente || !utente.attivo) {
    return NextResponse.json({ errore: 'Username non trovato.' }, { status: 401 });
  }

  const token = await creaTokenSessione({
    utenteId: utente.id,
    username: utente.username,
    ruolo: utente.ruolo,
  });
  await impostaCookieSessione(token);

  return NextResponse.json({
    ok: true,
    utente: { id: utente.id, username: utente.username, ruolo: utente.ruolo },
  });
}
