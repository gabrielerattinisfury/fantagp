import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase-server';
import { richiedeAdmin } from '@/lib/api-guard';
import { hashPassword } from '@/lib/auth';

const regexColoreHex = /^#[0-9A-Fa-f]{6}$/;

/**
 * Restituisce i dati di un fantamotociclista (profilo + rosa attualmente
 * attiva della stagione corrente) per precompilare il form di modifica.
 * La rosa restituita è quella con valido_a_round IS NULL, cioè il possesso
 * corrente per ciascuno dei 9 slot (se già assegnato).
 */
export async function GET(req: NextRequest) {
  const { sessione, risposta } = await richiedeAdmin();
  if (!sessione) return risposta;

  const utenteId = req.nextUrl.searchParams.get('utenteId');
  if (!utenteId) {
    return NextResponse.json({ errore: 'Parametro utenteId mancante.' }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data: utente, error: errUtente } = await sb
    .from('fanta_utenti')
    .select('id, username, nome_squadra, colore_primario, colore_secondario, numero_gara, attivo, stelle_mondiali')
    .eq('id', utenteId)
    .single();

  if (errUtente || !utente) {
    return NextResponse.json({ errore: 'Fantamotociclista non trovato.' }, { status: 404 });
  }

  const { data: stagione } = await sb
    .from('motogp_stagioni')
    .select('id')
    .eq('corrente', true)
    .maybeSingle();

  let rosa: { slot: string; pilota_id: string }[] = [];
  if (stagione) {
    const { data: rosaData } = await sb
      .from('fanta_rose')
      .select('slot, pilota_id')
      .eq('utente_id', utenteId)
      .eq('stagione_id', stagione.id)
      .is('valido_a_round', null);
    rosa = rosaData ?? [];
  }

  return NextResponse.json({ utente, rosa, stagioneId: stagione?.id ?? null });
}

const schemaModifica = z.object({
  utenteId: z.string().uuid(),
  username: z.string().min(3).max(24).optional(),
  nomeSquadra: z.string().min(1).max(40).optional(),
  colorePrimario: z.string().regex(regexColoreHex).optional(),
  coloreSecondario: z.string().regex(regexColoreHex).optional(),
  numeroGara: z.number().int().min(1).max(999).nullable().optional(),
  nuovaPassword: z.string().min(6).optional(),
  // Rosa: correzione DIRETTA (non storicizzata) dello slot attualmente attivo.
  // Per una sostituzione a partire da un round specifico durante la stagione
  // (che mantiene lo storico dei punteggi già calcolati) usare invece
  // /api/admin/rosa/sostituisci dal pannello override.
  rosa: z
    .object({
      moto3A: z.string().uuid().optional(),
      moto3B: z.string().uuid().optional(),
      moto3C: z.string().uuid().optional(),
      moto2A: z.string().uuid().optional(),
      moto2B: z.string().uuid().optional(),
      moto2C: z.string().uuid().optional(),
      motoGpA: z.string().uuid().optional(),
      motoGpB: z.string().uuid().optional(),
      motoGpC: z.string().uuid().optional(),
    })
    .optional(),
});

export async function PATCH(req: NextRequest) {
  const { sessione, risposta } = await richiedeAdmin();
  if (!sessione) return risposta;

  const body = await req.json().catch(() => null);
  const parsed = schemaModifica.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errore: parsed.error.errors[0]?.message ?? 'Dati non validi.' },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const sb = supabaseServer();

  if (d.username) {
    const { data: esistente } = await sb
      .from('fanta_utenti')
      .select('id')
      .ilike('username', d.username)
      .neq('id', d.utenteId)
      .maybeSingle();
    if (esistente) {
      return NextResponse.json({ errore: 'Username già in uso da un altro fantamotociclista.' }, { status: 409 });
    }
  }

  const aggiornamentoProfilo: Record<string, unknown> = {};
  if (d.username) aggiornamentoProfilo.username = d.username;
  if (d.nomeSquadra) aggiornamentoProfilo.nome_squadra = d.nomeSquadra;
  if (d.colorePrimario) aggiornamentoProfilo.colore_primario = d.colorePrimario;
  if (d.coloreSecondario) aggiornamentoProfilo.colore_secondario = d.coloreSecondario;
  if (d.numeroGara !== undefined) aggiornamentoProfilo.numero_gara = d.numeroGara;
  if (d.nuovaPassword) aggiornamentoProfilo.password_hash = await hashPassword(d.nuovaPassword);

  if (Object.keys(aggiornamentoProfilo).length > 0) {
    const { error } = await sb.from('fanta_utenti').update(aggiornamentoProfilo).eq('id', d.utenteId);
    if (error) return NextResponse.json({ errore: `Errore salvataggio profilo: ${error.message}` }, { status: 500 });
  }

  if (d.rosa) {
    const { data: stagione } = await sb.from('motogp_stagioni').select('id').eq('corrente', true).maybeSingle();
    if (!stagione) {
      return NextResponse.json(
        { errore: 'Nessuna stagione corrente sincronizzata: impossibile aggiornare la rosa.' },
        { status: 400 }
      );
    }
    const { data: categorie } = await sb.from('motogp_categorie').select('id, codice');
    const idCategoria = (codice: string) => categorie?.find((c) => c.codice === codice)?.id;

    const mappaSlot: [string, string | undefined, string][] = [
      ['moto3_a', d.rosa.moto3A, 'Moto3'],
      ['moto3_b', d.rosa.moto3B, 'Moto3'],
      ['moto3_c', d.rosa.moto3C, 'Moto3'],
      ['moto2_a', d.rosa.moto2A, 'Moto2'],
      ['moto2_b', d.rosa.moto2B, 'Moto2'],
      ['moto2_c', d.rosa.moto2C, 'Moto2'],
      ['motogp_a', d.rosa.motoGpA, 'MotoGP'],
      ['motogp_b', d.rosa.motoGpB, 'MotoGP'],
      ['motogp_c', d.rosa.motoGpC, 'MotoGP'],
    ];

    for (const [slot, pilotaId, codiceCategoria] of mappaSlot) {
      if (!pilotaId) continue; // slot non incluso nella richiesta: non toccarlo

      const { data: rigaAttiva } = await sb
        .from('fanta_rose')
        .select('id, pilota_id')
        .eq('utente_id', d.utenteId)
        .eq('stagione_id', stagione.id)
        .eq('slot', slot)
        .is('valido_a_round', null)
        .maybeSingle();

      if (rigaAttiva) {
        if (rigaAttiva.pilota_id === pilotaId) continue; // nessuna modifica
        const { error } = await sb.from('fanta_rose').update({ pilota_id: pilotaId }).eq('id', rigaAttiva.id);
        if (error) {
          return NextResponse.json({ errore: `Errore aggiornamento slot ${slot}: ${error.message}` }, { status: 500 });
        }
      } else {
        const categoriaId = idCategoria(codiceCategoria);
        if (!categoriaId) {
          return NextResponse.json(
            { errore: 'Categorie MotoGP/Moto2/Moto3 non trovate in database: esegui prima una sincronizzazione.' },
            { status: 500 }
          );
        }
        const { error } = await sb.from('fanta_rose').insert({
          utente_id: d.utenteId,
          stagione_id: stagione.id,
          pilota_id: pilotaId,
          categoria_id: categoriaId,
          slot,
          valido_da_round: 1,
          valido_a_round: null,
        });
        if (error) {
          return NextResponse.json({ errore: `Errore creazione slot ${slot}: ${error.message}` }, { status: 500 });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
