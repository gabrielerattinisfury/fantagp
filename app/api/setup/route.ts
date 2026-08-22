import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase-server';
import { hashPassword } from '@/lib/auth';

const schemaSetup = z.object({
  codiceSetup: z.string().min(1),
  username: z.string().min(3).max(24),
  password: z.string().min(6),
  nomeSquadra: z.string().min(1).max(40),
});

/**
 * Endpoint di setup guidato, usato UNA SOLA VOLTA dopo il primo deploy per
 * creare l'account amministratore senza dover aprire un terminale o scrivere
 * SQL a mano (vedi app/setup/page.tsx per la schermata che lo chiama).
 *
 * Protezione: richiede SETUP_CODE, una variabile ambiente che l'admin imposta
 * lui stesso su Vercel durante il deploy (vedi README). Funziona solo se NON
 * esiste già nessun utente admin nel database: una volta creato il primo
 * admin, questo endpoint si autodisabilita per sempre, anche conoscendo il
 * codice, così non resta una porta sul retro nel sistema.
 */
export async function POST(req: NextRequest) {
  const setupCode = process.env.SETUP_CODE;
  if (!setupCode) {
    return NextResponse.json(
      { errore: 'Setup guidato non disponibile: variabile SETUP_CODE non configurata.' },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schemaSetup.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errore: parsed.error.errors[0]?.message ?? 'Dati non validi.' },
      { status: 400 }
    );
  }

  if (parsed.data.codiceSetup !== setupCode) {
    return NextResponse.json({ errore: 'Codice di setup non corretto.' }, { status: 401 });
  }

  const sb = supabaseServer();

  // Autodisabilitazione: se esiste già un admin, il setup è considerato
  // concluso per sempre, indipendentemente da chi conosce ancora il codice.
  const { data: adminEsistente } = await sb
    .from('fanta_utenti')
    .select('id')
    .eq('ruolo', 'admin')
    .limit(1)
    .maybeSingle();

  if (adminEsistente) {
    return NextResponse.json(
      { errore: 'Il setup iniziale è già stato completato in precedenza.' },
      { status: 409 }
    );
  }

  const { username, password, nomeSquadra } = parsed.data;
  const passwordHash = await hashPassword(password);

  const { error } = await sb.from('fanta_utenti').insert({
    username,
    password_hash: passwordHash,
    nome_squadra: nomeSquadra,
    ruolo: 'admin',
    numero_gara: 1,
    colore_primario: '#E10600',
    colore_secondario: '#1A1A1A',
  });

  if (error) {
    return NextResponse.json({ errore: `Errore creazione admin: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * GET: indica al frontend se il setup è ancora necessario (nessun admin
 * esiste) o già concluso, per decidere se mostrare la schermata di setup o
 * reindirizzare al login.
 */
export async function GET() {
  const sb = supabaseServer();
  const { data: adminEsistente } = await sb
    .from('fanta_utenti')
    .select('id')
    .eq('ruolo', 'admin')
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ setupNecessario: !adminEsistente });
}
