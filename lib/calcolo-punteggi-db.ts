// ============================================================================
// CALCOLO PUNTEGGI - integrazione con il database
// ============================================================================
// Fa da ponte tra lib/calcolo-punteggi.ts (logica pura) e Supabase: carica i
// dati necessari, chiama il motore, salva il risultato in
// fanta_punteggi_weekend. Rispetta sempre eventuali correzioni manuali admin
// (modificato_manualmente = true) NON sovrascrivendole automaticamente.
// ============================================================================

import { supabaseServer } from './supabase-server';
import { calcolaPunteggioWeekend } from './calcolo-punteggi';
import type { MotogpRisultato, FantaFormazione, RosaAttivaRiga } from './tipi';

export async function ricalcolaPunteggiEvento(eventoId: string): Promise<void> {
  const sb = supabaseServer();

  const { data: evento } = await sb
    .from('motogp_eventi')
    .select('id, stagione_id, numero_round')
    .eq('id', eventoId)
    .single();
  if (!evento || evento.numero_round == null) return;

  const { data: categorie } = await sb.from('motogp_categorie').select('id, codice');
  const catMoto3 = categorie?.find((c) => c.codice === 'Moto3')?.id;
  const catMoto2 = categorie?.find((c) => c.codice === 'Moto2')?.id;
  const catMotoGp = categorie?.find((c) => c.codice === 'MotoGP')?.id;

  // Sessioni gara per ciascuna categoria + sprint MotoGP
  const { data: sessioni } = await sb
    .from('motogp_sessioni')
    .select('id, categoria_id, tipo')
    .eq('evento_id', eventoId)
    .in('tipo', ['RAC', 'SPR']);

  const sessioneRacMoto3 = sessioni?.find((s) => s.categoria_id === catMoto3 && s.tipo === 'RAC')?.id;
  const sessioneRacMoto2 = sessioni?.find((s) => s.categoria_id === catMoto2 && s.tipo === 'RAC')?.id;
  const sessioneRacMotoGp = sessioni?.find((s) => s.categoria_id === catMotoGp && s.tipo === 'RAC')?.id;
  const sessioneSprMotoGp = sessioni?.find((s) => s.categoria_id === catMotoGp && s.tipo === 'SPR')?.id;

  async function risultatiSessione(sessioneId: string | undefined): Promise<MotogpRisultato[]> {
    if (!sessioneId) return [];
    const { data } = await sb.from('motogp_risultati').select('*').eq('sessione_id', sessioneId);
    return (data ?? []) as MotogpRisultato[];
  }

  const risultatiMoto3 = await risultatiSessione(sessioneRacMoto3);
  const risultatiMoto2 = await risultatiSessione(sessioneRacMoto2);
  const risultatiMotoGp = await risultatiSessione(sessioneRacMotoGp);
  const risultatiSprint = await risultatiSessione(sessioneSprMotoGp);

  // Anagrafica piloti coinvolti, per numero moto abituale e nome
  const { data: tuttiPiloti } = await sb.from('motogp_piloti').select('id, nome_completo, numero');
  const numeroMotoAbitualePerPilota = new Map<string, number>(
    (tuttiPiloti ?? [])
      .filter((p) => p.numero != null)
      .map((p) => [p.id, p.numero as number])
  );
  const nomePilotaPerId = new Map<string, string>((tuttiPiloti ?? []).map((p) => [p.id, p.nome_completo]));

  // Tutti gli utenti attivi (fantamotociclisti)
  const { data: utenti } = await sb
    .from('fanta_utenti')
    .select('id')
    .eq('ruolo', 'utente')
    .eq('attivo', true);
  if (!utenti) return;

  for (const utente of utenti) {
    const { data: rosaAttivaData } = await sb.rpc('fn_rosa_attiva', {
      p_utente_id: utente.id,
      p_stagione_id: evento.stagione_id,
      p_round: evento.numero_round,
    });
    const rosaAttiva = (rosaAttivaData ?? []) as RosaAttivaRiga[];

    const { data: formazioneData } = await sb
      .from('fanta_formazioni')
      .select('*')
      .eq('utente_id', utente.id)
      .eq('evento_id', eventoId)
      .maybeSingle();

    // Verifico se questo punteggio è stato corretto manualmente: in tal caso
    // NON lo sovrascrivo con il ricalcolo automatico.
    const { data: punteggioEsistente } = await sb
      .from('fanta_punteggi_weekend')
      .select('modificato_manualmente')
      .eq('utente_id', utente.id)
      .eq('evento_id', eventoId)
      .maybeSingle();

    if (punteggioEsistente?.modificato_manualmente) continue;

    const dettaglio = calcolaPunteggioWeekend({
      utenteId: utente.id,
      eventoId,
      formazione: (formazioneData as FantaFormazione | null) ?? null,
      rosaAttiva,
      risultatiGaraPerCategoria: {
        moto3: risultatiMoto3,
        moto2: risultatiMoto2,
        motogp: risultatiMotoGp,
      },
      risultatiSprintMotoGP: risultatiSprint,
      numeroMotoAbitualePerPilota,
      nomePilotaPerId,
    });

    const casellaMoto3 = dettaglio.caselle.find((c) => c.slot === 'moto3');
    const casellaMoto2 = dettaglio.caselle.find((c) => c.slot === 'moto2');
    const casellaMotoGp1 = dettaglio.caselle.find((c) => c.slot === 'motogp_1');
    const casellaMotoGp2 = dettaglio.caselle.find((c) => c.slot === 'motogp_2');

    const sprintConteggiati = dettaglio.sprint.filter((s) => s.conteggiato);

    await sb.from('fanta_punteggi_weekend').upsert(
      {
        utente_id: utente.id,
        evento_id: eventoId,
        punti_moto3_gara: casellaMoto3?.punti ?? 0,
        punti_moto2_gara: casellaMoto2?.punti ?? 0,
        punti_motogp1_gara: casellaMotoGp1?.punti ?? 0,
        punti_motogp2_gara: casellaMotoGp2?.punti ?? 0,
        sprint_pilota1_id: sprintConteggiati[0]?.pilota_id ?? null,
        sprint_pilota1_punti: sprintConteggiati[0]?.punti ?? 0,
        sprint_pilota2_id: sprintConteggiati[1]?.pilota_id ?? null,
        sprint_pilota2_punti: sprintConteggiati[1]?.punti ?? 0,
        totale_weekend: dettaglio.totale_weekend,
        calcolato_il: new Date().toISOString(),
      },
      { onConflict: 'utente_id,evento_id' }
    );
  }
}

/** Ricalcola i punteggi di TUTTI gli eventi della stagione corrente (uso raro: es. dopo una correzione retroattiva). */
export async function ricalcolaPunteggiStagione(stagioneId: string): Promise<void> {
  const sb = supabaseServer();
  const { data: eventi } = await sb
    .from('motogp_eventi')
    .select('id')
    .eq('stagione_id', stagioneId)
    .order('numero_round', { ascending: true });
  if (!eventi) return;
  for (const evento of eventi) {
    await ricalcolaPunteggiEvento(evento.id);
  }
}
