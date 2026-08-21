// ============================================================================
// SESSIONE - parte edge-safe
// ============================================================================
// Questo modulo contiene SOLO la logica di firma/verifica JWT (libreria
// `jose`, compatibile con l'Edge Runtime di Next.js). Non importa
// `next/headers` né `bcryptjs`: questo lo rende sicuro da usare anche dentro
// middleware.ts, che gira sull'Edge Runtime e non supporta tutte le API
// Node.js standard. La gestione dei cookie (che richiede next/headers, solo
// disponibile in contesti request-scoped delle API routes/server components)
// vive invece in lib/auth.ts, che importa questo modulo.
// ============================================================================

import { SignJWT, jwtVerify } from 'jose';

const DURATA_SESSIONE_GIORNI = 90;

function chiaveSegreta(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'JWT_SECRET mancante o troppo corto. Impostalo nelle variabili ambiente (almeno 32 caratteri casuali).'
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionePayload {
  utenteId: string;
  username: string;
  ruolo: 'utente' | 'admin';
}

export async function creaTokenSessione(payload: SessionePayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${DURATA_SESSIONE_GIORNI}d`)
    .sign(chiaveSegreta());
}

export async function verificaTokenSessione(token: string): Promise<SessionePayload | null> {
  try {
    const { payload } = await jwtVerify(token, chiaveSegreta());
    if (
      typeof payload.utenteId === 'string' &&
      typeof payload.username === 'string' &&
      (payload.ruolo === 'utente' || payload.ruolo === 'admin')
    ) {
      return {
        utenteId: payload.utenteId,
        username: payload.username,
        ruolo: payload.ruolo,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const NOME_COOKIE_SESSIONE = 'fantamotogp_sessione';
export const DURATA_SESSIONE_SECONDI = DURATA_SESSIONE_GIORNI * 24 * 60 * 60;
