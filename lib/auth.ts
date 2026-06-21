// ============================================================================
// AUTENTICAZIONE (server, non-edge)
// ============================================================================
// Login persistente via cookie httpOnly contenente un JWT firmato.
// Niente terze parti (Auth0, NextAuth, ecc.): per 5-15 utenti un sistema
// semplice e auto-contenuto è più che sufficiente e più facile da capire/
// mantenere per chi non è uno sviluppatore esperto.
//
// Password: hashate con bcrypt (mai salvate in chiaro).
// Sessione: JWT firmato con JWT_SECRET, durata lunga (90 giorni) per
// soddisfare il requisito "resta loggato senza dover rifare login ogni volta".
//
// Questo file usa `next/headers` (cookies()) e `bcryptjs`, quindi va
// importato SOLO da API routes/server components, MAI da middleware.ts
// (Edge Runtime): per quel caso usa lib/sessione-edge.ts direttamente.
// ============================================================================

import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import {
  creaTokenSessione as creaTokenSessioneEdge,
  verificaTokenSessione,
  NOME_COOKIE_SESSIONE,
  DURATA_SESSIONE_SECONDI,
  type SessionePayload,
} from './sessione-edge';

export type { SessionePayload };
export { verificaTokenSessione };

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verificaPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function creaTokenSessione(payload: SessionePayload): Promise<string> {
  return creaTokenSessioneEdge(payload);
}

/** Imposta il cookie di sessione httpOnly dopo un login riuscito. */
export async function impostaCookieSessione(token: string) {
  const store = await cookies();
  store.set(NOME_COOKIE_SESSIONE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DURATA_SESSIONE_SECONDI,
  });
}

export async function rimuoviCookieSessione() {
  const store = await cookies();
  store.delete(NOME_COOKIE_SESSIONE);
}

/** Legge e verifica la sessione corrente dal cookie. Da usare nelle API routes/server components. */
export async function ottieniSessioneCorrente(): Promise<SessionePayload | null> {
  const store = await cookies();
  const token = store.get(NOME_COOKIE_SESSIONE)?.value;
  if (!token) return null;
  return verificaTokenSessione(token);
}
