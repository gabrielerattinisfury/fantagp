import { NextResponse } from 'next/server';
import { ottieniSessioneCorrente, type SessionePayload } from './auth';

/**
 * Restituisce la sessione corrente, oppure null + una risposta 401 pronta da
 * ritornare se non autenticato. Pattern usato in tutte le API protette:
 *
 *   const { sessione, risposta } = await richiedeLogin();
 *   if (!sessione) return risposta;
 */
export async function richiedeLogin(): Promise<
  { sessione: SessionePayload; risposta: null } | { sessione: null; risposta: NextResponse }
> {
  const sessione = await ottieniSessioneCorrente();
  if (!sessione) {
    return {
      sessione: null,
      risposta: NextResponse.json({ errore: 'Devi effettuare il login.' }, { status: 401 }),
    };
  }
  return { sessione, risposta: null };
}

export async function richiedeAdmin(): Promise<
  { sessione: SessionePayload; risposta: null } | { sessione: null; risposta: NextResponse }
> {
  const sessione = await ottieniSessioneCorrente();
  if (!sessione) {
    return {
      sessione: null,
      risposta: NextResponse.json({ errore: 'Devi effettuare il login.' }, { status: 401 }),
    };
  }
  if (sessione.ruolo !== 'admin') {
    return {
      sessione: null,
      risposta: NextResponse.json({ errore: 'Funzione riservata agli amministratori.' }, { status: 403 }),
    };
  }
  return { sessione, risposta: null };
}
