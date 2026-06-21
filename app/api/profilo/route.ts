import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase-server';
import { richiedeLogin } from '@/lib/api-guard';
import { hashPassword, verificaPassword } from '@/lib/auth';

const regexColoreHex = /^#[0-9A-Fa-f]{6}$/;

const schemaProfilo = z.object({
  username: z.string().min(3, 'Username troppo corto (minimo 3 caratteri)').max(24).optional(),
  nomeSquadra: z.string().min(1).max(40).optional(),
  colorePrimario: z.string().regex(regexColoreHex, 'Colore non valido, usa formato esadecimale #RRGGBB').optional(),
  coloreSecondario: z.string().regex(regexColoreHex, 'Colore non valido, usa formato esadecimale #RRGGBB').optional(),
  numeroGara: z.number().int().min(1).max(999).nullable().optional(),
  passwordAttuale: z.string().optional(),
  nuovaPassword: z.string().min(6, 'La nuova password deve avere almeno 6 caratteri').optional(),
});

export async function GET() {
  const { sessione, risposta } = await richiedeLogin();
  if (!sessione) return risposta;

  const sb = supabaseServer();
  const { data: utente } = await sb
    .from('fanta_utenti')
    .select('id, username, nome_squadra, colore_primario, colore_secondario, numero_gara, ruolo')
    .eq('id', sessione.utenteId)
    .single();

  return NextResponse.json({ utente });
}

export async function PATCH(req: NextRequest) {
  const { sessione, risposta } = await richiedeLogin();
  if (!sessione) return risposta;

  const body = await req.json().catch(() => null);
  const parsed = schemaProfilo.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errore: parsed.error.errors[0]?.message ?? 'Dati non validi.' },
      { status: 400 }
    );
  }

  const dati = parsed.data;
  const sb = supabaseServer();

  // Cambio password: richiede la verifica della password attuale
  if (dati.nuovaPassword) {
    if (!dati.passwordAttuale) {
      return NextResponse.json(
        { errore: 'Per cambiare la password devi inserire quella attuale.' },
        { status: 400 }
      );
    }
    const { data: utenteCorrente } = await sb
      .from('fanta_utenti')
      .select('password_hash')
      .eq('id', sessione.utenteId)
      .single();
    if (!utenteCorrente) {
      return NextResponse.json({ errore: 'Utente non trovato.' }, { status: 404 });
    }
    const valida = await verificaPassword(dati.passwordAttuale, utenteCorrente.password_hash);
    if (!valida) {
      return NextResponse.json({ errore: 'Password attuale non corretta.' }, { status: 401 });
    }
  }

  // Se cambia username, verifica unicità
  if (dati.username) {
    const { data: esistente } = await sb
      .from('fanta_utenti')
      .select('id')
      .ilike('username', dati.username)
      .neq('id', sessione.utenteId)
      .maybeSingle();
    if (esistente) {
      return NextResponse.json({ errore: 'Username già in uso da un altro fantamotociclista.' }, { status: 409 });
    }
  }

  // Se cambia numero di gara, verifica unicità
  if (dati.numeroGara != null) {
    const { data: esistente } = await sb
      .from('fanta_utenti')
      .select('id')
      .eq('numero_gara', dati.numeroGara)
      .neq('id', sessione.utenteId)
      .maybeSingle();
    if (esistente) {
      return NextResponse.json(
        { errore: 'Questo numero di gara è già scelto da un altro fantamotociclista.' },
        { status: 409 }
      );
    }
  }

  const aggiornamento: Record<string, unknown> = {};
  if (dati.username) aggiornamento.username = dati.username;
  if (dati.nomeSquadra) aggiornamento.nome_squadra = dati.nomeSquadra;
  if (dati.colorePrimario) aggiornamento.colore_primario = dati.colorePrimario;
  if (dati.coloreSecondario) aggiornamento.colore_secondario = dati.coloreSecondario;
  if (dati.numeroGara !== undefined) aggiornamento.numero_gara = dati.numeroGara;
  if (dati.nuovaPassword) aggiornamento.password_hash = await hashPassword(dati.nuovaPassword);

  if (Object.keys(aggiornamento).length === 0) {
    return NextResponse.json({ errore: 'Nessuna modifica da salvare.' }, { status: 400 });
  }

  const { error } = await sb.from('fanta_utenti').update(aggiornamento).eq('id', sessione.utenteId);
  if (error) {
    return NextResponse.json({ errore: `Errore salvataggio: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
