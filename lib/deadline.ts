// ============================================================================
// GESTIONE DEADLINE E AUTO-RIPROPOSTA FORMAZIONE
// ============================================================================
// Ci sono due momenti distinti nel weekend, da non confondere:
//  - INIZIO WEEKEND: l'orario della primissima sessione in assoluto (di
//    norma FP1 Moto3 del venerdì, ma va sempre letto dinamicamente perché
//    l'ordine ufficiale dei turni può avere eccezioni). È puramente
//    informativo per l'utente (mostrato nel banner come "il weekend inizia
//    tra..."): NON blocca né apre lo schieramento.
//  - CHIUSURA SCHIERAMENTO (deadline vera): l'orario ufficiale di partenza
//    della gara Moto3. Da quel momento la formazione si blocca. Prima di
//    quel momento il fantamotociclista può schierare/modificare liberamente
//    in qualsiasi momento, anche durante la settimana prima del weekend.
//
// Se un fantamotociclista non ha schierato nulla per il weekend N, si
// ripropone automaticamente l'ultima formazione valida del weekend N-1
// (auto_riproposta = true, per essere trasparenti che non è stata una scelta
// esplicita dell'utente per quel weekend specifico).
// ============================================================================

import { supabaseServer } from './supabase-server';

/**
 * Orario (ISO) di chiusura schieramento per un evento: inizio ufficiale
 * della gara (RAC) di Moto3. Letto sempre dal calendario sincronizzato, mai
 * hardcoded, perché può variare weekend per weekend.
 */
export async function deadlineSchieramento(eventoId: string): Promise<string | null> {
  const sb = supabaseServer();
  const { data: categoria } = await sb
    .from('motogp_categorie')
    .select('id')
    .eq('codice', 'Moto3')
    .single();
  if (!categoria) return null;

  const { data: sessione } = await sb
    .from('motogp_sessioni')
    .select('data_ora_inizio')
    .eq('evento_id', eventoId)
    .eq('categoria_id', categoria.id)
    .eq('tipo', 'RAC')
    .maybeSingle();

  return sessione?.data_ora_inizio ?? null;
}

/**
 * Orario (ISO) di inizio della primissima sessione in assoluto del weekend,
 * qualunque essa sia (qualunque categoria, qualunque tipo). Puramente
 * informativo: usato dalla UI per mostrare "il weekend inizia tra...",
 * calcolato dinamicamente per restare corretto anche se l'ordine ufficiale
 * dei turni cambia da un weekend all'altro.
 */
export async function inizioWeekend(eventoId: string): Promise<string | null> {
  const sb = supabaseServer();
  const { data: primaSessione } = await sb
    .from('motogp_sessioni')
    .select('data_ora_inizio')
    .eq('evento_id', eventoId)
    .not('data_ora_inizio', 'is', null)
    .neq('stato', 'annullata')
    .order('data_ora_inizio', { ascending: true })
    .limit(1)
    .maybeSingle();

  return primaSessione?.data_ora_inizio ?? null;
}

export async function schieramentoApertoPer(eventoId: string): Promise<boolean> {
  const deadline = await deadlineSchieramento(eventoId);
  if (!deadline) return true; // se non conosciamo ancora l'orario, non blocchiamo
  return new Date() < new Date(deadline);
}

/**
 * Per ogni evento la cui deadline (gara Moto3) è già passata e che non ha
 * ancora una formazione bloccata salvata per un dato utente, propone
 * automaticamente l'ultima formazione valida del weekend precedente.
 * Va chiamata dal cron poco dopo ogni deadline (es. ogni 15 minuti durante
 * i weekend di gara è sufficiente, dato il margine naturale tra Moto3 e le
 * altre sessioni).
 */
export async function applicaAutoRiproposizioni(): Promise<{ formazioniCreate: number }> {
  const sb = supabaseServer();

  const { data: stagione } = await sb
    .from('motogp_stagioni')
    .select('id')
    .eq('corrente', true)
    .single();
  if (!stagione) return { formazioniCreate: 0 };

  const { data: eventi } = await sb
    .from('motogp_eventi')
    .select('id, numero_round, data_inizio')
    .eq('stagione_id', stagione.id)
    .neq('stato', 'annullato')
    .order('numero_round', { ascending: true });
  if (!eventi) return { formazioniCreate: 0 };

  const { data: utenti } = await sb
    .from('fanta_utenti')
    .select('id')
    .eq('ruolo', 'utente')
    .eq('attivo', true);
  if (!utenti) return { formazioniCreate: 0 };

  let formazioniCreate = 0;

  for (const evento of eventi) {
    const aperto = await schieramentoApertoPer(evento.id);
    if (aperto) continue; // deadline non ancora passata: niente da fare

    for (const utente of utenti) {
      const { data: formazioneEsistente } = await sb
        .from('fanta_formazioni')
        .select('id')
        .eq('utente_id', utente.id)
        .eq('evento_id', evento.id)
        .maybeSingle();

      if (formazioneEsistente) continue; // l'utente ha già schierato (o già auto-riproposto)

      // Cerca l'ultima formazione valida tra gli eventi precedenti, in
      // ordine di round decrescente, partendo dal round corrente - 1.
      const eventiPrecedenti = eventi
        .filter((e) => (e.numero_round ?? 0) < (evento.numero_round ?? 0))
        .sort((a, b) => (b.numero_round ?? 0) - (a.numero_round ?? 0));

      let formazionePrecedente: {
        pilota_moto3_id: string | null;
        pilota_moto2_id: string | null;
        pilota_motogp_1_id: string | null;
        pilota_motogp_2_id: string | null;
      } | null = null;

      for (const eventoPrec of eventiPrecedenti) {
        const { data } = await sb
          .from('fanta_formazioni')
          .select('pilota_moto3_id, pilota_moto2_id, pilota_motogp_1_id, pilota_motogp_2_id')
          .eq('utente_id', utente.id)
          .eq('evento_id', eventoPrec.id)
          .maybeSingle();
        if (data) {
          formazionePrecedente = data;
          break;
        }
      }

      if (!formazionePrecedente) continue; // primo weekend della stagione: niente da riproporre

      const { error } = await sb.from('fanta_formazioni').insert({
        utente_id: utente.id,
        evento_id: evento.id,
        pilota_moto3_id: formazionePrecedente.pilota_moto3_id,
        pilota_moto2_id: formazionePrecedente.pilota_moto2_id,
        pilota_motogp_1_id: formazionePrecedente.pilota_motogp_1_id,
        pilota_motogp_2_id: formazionePrecedente.pilota_motogp_2_id,
        auto_riproposta: true,
        bloccata: true,
      });

      if (!error) formazioniCreate++;
    }
  }

  return { formazioniCreate };
}
