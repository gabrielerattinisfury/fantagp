import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { richiedeLogin } from '@/lib/api-guard';

/**
 * Classifica "di categoria": quanti punti fanta ha portato ciascun
 * fantamotociclista SOLO dalla casella Moto3, SOLO da Moto2, o SOLO da
 * MotoGP (gara + sprint) durante la stagione corrente. Utile per vedere chi
 * sceglie meglio in una singola classe, indipendentemente dal totale generale.
 */
export async function GET(req: NextRequest) {
  const { sessione, risposta } = await richiedeLogin();
  if (!sessione) return risposta;

  const codice = req.nextUrl.searchParams.get('codice');
  if (!codice || !['MotoGP', 'Moto2', 'Moto3'].includes(codice)) {
    return NextResponse.json(
      { errore: 'Parametro codice mancante o non valido: usa MotoGP, Moto2 o Moto3.' },
      { status: 400 }
    );
  }

  const sb = supabaseServer();

  const { data: stagione } = await sb.from('motogp_stagioni').select('id').eq('corrente', true).maybeSingle();
  if (!stagione) {
    return NextResponse.json({ errore: 'Nessuna stagione corrente sincronizzata.' }, { status: 404 });
  }

  const { data: eventi } = await sb.from('motogp_eventi').select('id').eq('stagione_id', stagione.id);
  const idEventi = (eventi ?? []).map((e) => e.id);

  // L'account admin compete anch'esso in classifica (deciso con Gabriele il
  // 22/08/2026): niente filtro su ruolo, solo sugli account disattivati.
  const { data: utenti } = await sb
    .from('fanta_utenti')
    .select('id, username, nome_squadra, colore_primario, colore_secondario, numero_gara')
    .eq('attivo', true);

  if (!utenti) {
    return NextResponse.json({ classifica: [] });
  }

  const mappaPunti = new Map<string, number>(utenti.map((u) => [u.id, 0]));

  if (idEventi.length > 0) {
    const { data: punteggi } = await sb
      .from('fanta_punteggi_weekend')
      .select(
        'utente_id, punti_moto3_gara, punti_moto2_gara, punti_motogp1_gara, punti_motogp2_gara, sprint_pilota1_punti, sprint_pilota2_punti'
      )
      .in('evento_id', idEventi);

    for (const p of punteggi ?? []) {
      const attuale = mappaPunti.get(p.utente_id) ?? 0;
      let delta = 0;
      if (codice === 'Moto3') delta = Number(p.punti_moto3_gara ?? 0);
      else if (codice === 'Moto2') delta = Number(p.punti_moto2_gara ?? 0);
      else {
        // MotoGP: gara (2 caselle) + l'intera sprint (che è comunque solo MotoGP)
        delta =
          Number(p.punti_motogp1_gara ?? 0) +
          Number(p.punti_motogp2_gara ?? 0) +
          Number(p.sprint_pilota1_punti ?? 0) +
          Number(p.sprint_pilota2_punti ?? 0);
      }
      mappaPunti.set(p.utente_id, attuale + delta);
    }
  }

  const classifica = utenti
    .map((u) => ({ ...u, punti_categoria: mappaPunti.get(u.id) ?? 0 }))
    .sort((a, b) => b.punti_categoria - a.punti_categoria);

  return NextResponse.json({ codice, classifica });
}
