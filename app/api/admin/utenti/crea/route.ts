import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase-server';
import { richiedeAdmin } from '@/lib/api-guard';
import { hashPassword } from '@/lib/auth';

const regexColoreHex = /^#[0-9A-Fa-f]{6}$/;

const schemaNuovoUtente = z.object({
  username: z.string().min(3).max(24),
  password: z.string().min(6),
  nomeSquadra: z.string().min(1).max(40),
  colorePrimario: z.string().regex(regexColoreHex).default('#E10600'),
  coloreSecondario: z.string().regex(regexColoreHex).default('#1A1A1A'),
  numeroGara: z.number().int().min(1).max(999).nullable().optional(),
  stagioneId: z.string().uuid(),
  rosa: z.object({
    moto3A: z.string().uuid(),
    moto3B: z.string().uuid(),
    moto2A: z.string().uuid(),
    moto2B: z.string().uuid(),
    motoGpA: z.string().uuid(),
    motoGpB: z.string().uuid(),
    motoGpC: z.string().uuid(),
  }),
});

export async function POST(req: NextRequest) {
  const { sessione, risposta } = await richiedeAdmin();
  if (!sessione) return risposta;

  const body = await req.json().catch(() => null);
  const parsed = schemaNuovoUtente.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errore: parsed.error.errors[0]?.message ?? 'Dati non validi.' },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const sb = supabaseServer();

  const { data: esistente } = await sb
    .from('fanta_utenti')
    .select('id')
    .ilike('username', d.username)
    .maybeSingle();
  if (esistente) {
    return NextResponse.json({ errore: 'Username già in uso.' }, { status: 409 });
  }

  const { data: categorie } = await sb.from('motogp_categorie').select('id, codice');
  const idCategoria = (codice: string) => categorie?.find((c) => c.codice === codice)?.id;

  const passwordHash = await hashPassword(d.password);

  const { data: nuovoUtente, error: errUtente } = await sb
    .from('fanta_utenti')
    .insert({
      username: d.username,
      password_hash: passwordHash,
      nome_squadra: d.nomeSquadra,
      colore_primario: d.colorePrimario,
      colore_secondario: d.coloreSecondario,
      numero_gara: d.numeroGara ?? null,
      ruolo: 'utente',
    })
    .select('id')
    .single();

  if (errUtente || !nuovoUtente) {
    return NextResponse.json({ errore: `Errore creazione utente: ${errUtente?.message}` }, { status: 500 });
  }

  const righeRosa = [
    { slot: 'moto3_a', pilota_id: d.rosa.moto3A, categoria_id: idCategoria('Moto3') },
    { slot: 'moto3_b', pilota_id: d.rosa.moto3B, categoria_id: idCategoria('Moto3') },
    { slot: 'moto2_a', pilota_id: d.rosa.moto2A, categoria_id: idCategoria('Moto2') },
    { slot: 'moto2_b', pilota_id: d.rosa.moto2B, categoria_id: idCategoria('Moto2') },
    { slot: 'motogp_a', pilota_id: d.rosa.motoGpA, categoria_id: idCategoria('MotoGP') },
    { slot: 'motogp_b', pilota_id: d.rosa.motoGpB, categoria_id: idCategoria('MotoGP') },
    { slot: 'motogp_c', pilota_id: d.rosa.motoGpC, categoria_id: idCategoria('MotoGP') },
  ].map((r) => ({
    utente_id: nuovoUtente.id,
    stagione_id: d.stagioneId,
    pilota_id: r.pilota_id,
    categoria_id: r.categoria_id,
    slot: r.slot,
    valido_da_round: 1,
    valido_a_round: null,
  }));

  if (righeRosa.some((r) => !r.categoria_id)) {
    return NextResponse.json(
      { errore: 'Categorie MotoGP/Moto2/Moto3 non trovate in database: esegui prima una sincronizzazione.' },
      { status: 500 }
    );
  }

  const { error: errRosa } = await sb.from('fanta_rose').insert(righeRosa);
  if (errRosa) {
    // rollback manuale: rimuovo l'utente appena creato per non lasciare dati orfani
    await sb.from('fanta_utenti').delete().eq('id', nuovoUtente.id);
    return NextResponse.json({ errore: `Errore creazione rosa: ${errRosa.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, utenteId: nuovoUtente.id });
}
