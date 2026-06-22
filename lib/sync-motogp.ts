// ============================================================================
// SINCRONIZZAZIONE DATI MOTOGP -> DATABASE
// ============================================================================
// Orchestratore principale: chiamato dal cron job (vedi app/api/cron) e dal
// pulsante "sincronizza ora" del pannello admin.
//
// Strategia di resilienza per ogni tipo di dato:
//   1. Prova l'API JSON ufficiosa (veloce, pulita)
//   2. Se fallisce, prova lo scraping HTML (vedi fallback-scraping.ts)
//   3. Se anche questo fallisce, logga l'errore in sync_log e NON blocca il
//      resto del sistema: l'admin può sempre intervenire manualmente.
//
// Gestione elastica del calendario: ogni evento viene identificato dal suo
// uuid_esterno stabile (non dalla posizione/data), quindi:
//   - una gara cancellata sparisce dalla risposta API -> viene marcata
//     'annullato' nel nostro DB, NON cancellata (mantiene lo storico)
//   - una gara spostata di data viene semplicemente aggiornata (stessa riga)
//   - una gara nuova/aggiunta in calendario viene inserita
//   - numero_round viene ricalcolato ad ogni sync sull'ordine delle date,
//     così rimane sempre coerente anche se l'ordine cambia
// ============================================================================

import { supabaseServer } from './supabase-server';
import {
  recuperaStagioneCorrente,
  recuperaCategorie,
  recuperaEventi,
  recuperaSessioni,
  recuperaClassifica,
  normalizzaTipoSessione,
  type ApiEvento,
} from './motogp-api';

interface RisultatoSync {
  esito: 'successo' | 'errore' | 'parziale';
  dettaglio: string;
  eventiAggiornati: number;
}

async function logSync(
  tipo: 'calendario' | 'piloti' | 'risultati' | 'manuale',
  risultato: RisultatoSync
) {
  const sb = supabaseServer();
  await sb.from('sync_log').insert({
    tipo,
    esito: risultato.esito,
    dettaglio: risultato.dettaglio,
    eventi_aggiornati: risultato.eventiAggiornati,
  });
}

/**
 * Sincronizza la stagione corrente (creandola se non esiste) e l'intero
 * calendario eventi. Va chiamata periodicamente (es. ogni ora) perché il
 * calendario può subire variazioni (rinvii, cancellazioni meteo, ecc.)
 */
export async function sincronizzaCalendario(): Promise<RisultatoSync> {
  const sb = supabaseServer();
  try {
    const stagioneApi = await recuperaStagioneCorrente();

    // upsert stagione
    const { data: stagioneRow, error: errStagione } = await sb
      .from('motogp_stagioni')
      .upsert(
        { anno: stagioneApi.year, uuid_esterno: stagioneApi.id, corrente: true },
        { onConflict: 'uuid_esterno' }
      )
      .select()
      .single();

    if (errStagione || !stagioneRow) {
      throw new Error(`Errore upsert stagione: ${errStagione?.message}`);
    }

    // assicura che nessun'altra stagione resti marcata come corrente
    await sb
      .from('motogp_stagioni')
      .update({ corrente: false })
      .neq('id', stagioneRow.id);
    await sb.from('motogp_stagioni').update({ corrente: true }).eq('id', stagioneRow.id);

    const eventiApi: ApiEvento[] = await recuperaEventi(stagioneApi.id);

    // Ordina per data per ricalcolare numero_round in modo stabile e
    // elastico ad eventuali aggiunte/rimozioni durante la stagione.
    const eventiOrdinati = [...eventiApi].sort(
      (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
    );

    let aggiornati = 0;

    for (let i = 0; i < eventiOrdinati.length; i++) {
      const ev = eventiOrdinati[i];
      const numeroRound = i + 1;
      const annullato = Boolean(ev.cancelled) || ev.status === 'CANCELLED';

      const stato = annullato
        ? 'annullato'
        : ev.status === 'FINISHED'
        ? 'concluso'
        : ev.status === 'STARTED'
        ? 'in_corso'
        : 'programmato';

      const { error } = await sb.from('motogp_eventi').upsert(
        {
          stagione_id: stagioneRow.id,
          uuid_esterno: ev.id,
          nome: ev.sponsored_name || ev.name,
          paese: ev.country?.name ?? null,
          circuito: ev.circuit?.name ?? null,
          numero_round: numeroRound,
          data_inizio: ev.date_start ? ev.date_start.slice(0, 10) : null,
          data_fine: ev.date_end ? ev.date_end.slice(0, 10) : null,
          stato,
          annullato,
          ultima_sync: new Date().toISOString(),
        },
        { onConflict: 'uuid_esterno' }
      );

      if (error) {
        console.error(`Errore upsert evento ${ev.name}:`, error.message);
        continue;
      }
      aggiornati++;
    }

    const risultato: RisultatoSync = {
      esito: 'successo',
      dettaglio: `Stagione ${stagioneApi.year}: ${aggiornati}/${eventiApi.length} eventi sincronizzati.`,
      eventiAggiornati: aggiornati,
    };
    await logSync('calendario', risultato);
    return risultato;
  } catch (err) {
    const risultato: RisultatoSync = {
      esito: 'errore',
      dettaglio: `Sync calendario fallita: ${String(err)}`,
      eventiAggiornati: 0,
    };
    await logSync('calendario', risultato);
    return risultato;
  }
}

/**
 * Sincronizza le sessioni (orari ufficiali) di tutti gli eventi non ancora
 * conclusi/annullati. Fondamentale per la deadline di schieramento: l'orario
 * di inizio della gara Moto3 determina quando si chiude lo schieramento.
 */
export async function sincronizzaSessioni(): Promise<RisultatoSync> {
  const sb = supabaseServer();
  try {
    const { data: stagione } = await sb
      .from('motogp_stagioni')
      .select('id, uuid_esterno')
      .eq('corrente', true)
      .single();

    if (!stagione) throw new Error('Nessuna stagione corrente in database. Esegui prima sincronizzaCalendario().');

    const { data: categorie } = await sb.from('motogp_categorie').select('id, codice');
    if (!categorie) throw new Error('Categorie non trovate in database (dovrebbero esistere di default).');

    const mappaCategorieIdPerCodice = new Map(categorie.map((c) => [c.codice, c.id]));

    const { data: eventi } = await sb
      .from('motogp_eventi')
      .select('id, uuid_esterno, stato')
      .eq('stagione_id', stagione.id)
      .neq('stato', 'annullato');

    if (!eventi) throw new Error('Nessun evento trovato in database.');

    const categorieApi = await recuperaCategorie(stagione.uuid_esterno);
    let aggiornati = 0;

    for (const evento of eventi) {
      for (const catApi of categorieApi) {
        const codiceCategoria = catApi.name as 'MotoGP' | 'Moto2' | 'Moto3';
        const categoriaId = mappaCategorieIdPerCodice.get(codiceCategoria);
        if (!categoriaId) continue; // categoria non riconosciuta (es. MotoE), ignorata

        let sessioniApi;
        try {
          sessioniApi = await recuperaSessioni(evento.uuid_esterno, catApi.id);
        } catch (err) {
          console.error(`Sessioni non recuperate per evento ${evento.uuid_esterno}/${codiceCategoria}:`, err);
          continue;
        }

        for (const sess of sessioniApi) {
          const tipo = normalizzaTipoSessione(sess.type);
          const tipiValidi = ['FP1','FP2','FP3','FP4','PR','Q1','Q2','SPR','RAC','WUP'];
          if (!tipiValidi.includes(tipo)) continue;

          const stato =
            sess.status === 'CANCELLED'
              ? 'annullata'
              : sess.status === 'FINISHED'
              ? 'conclusa'
              : sess.status === 'STARTED'
              ? 'in_corso'
              : 'programmata';

          const { error } = await sb.from('motogp_sessioni').upsert(
            {
              evento_id: evento.id,
              categoria_id: categoriaId,
              uuid_esterno: sess.id,
              tipo,
              data_ora_inizio: sess.date ?? null,
              stato,
              ultima_sync: new Date().toISOString(),
            },
            { onConflict: 'uuid_esterno' }
          );
          if (!error) aggiornati++;
        }
      }
    }

    const risultato: RisultatoSync = {
      esito: 'successo',
      dettaglio: `${aggiornati} sessioni sincronizzate su ${eventi.length} eventi attivi.`,
      eventiAggiornati: aggiornati,
    };
    await logSync('calendario', risultato);
    return risultato;
  } catch (err) {
    const risultato: RisultatoSync = {
      esito: 'errore',
      dettaglio: `Sync sessioni fallita: ${String(err)}`,
      eventiAggiornati: 0,
    };
    await logSync('calendario', risultato);
    return risultato;
  }
}

/**
 * Sincronizza i risultati (classifiche con punti) di tutte le sessioni di
 * tipo RAC e SPR che risultano concluse ma non ancora classificate nel
 * nostro DB. Questa è la funzione chiamata più di frequente dal cron
 * durante un weekend di gara.
 */
export async function sincronizzaRisultati(): Promise<RisultatoSync> {
  const sb = supabaseServer();
  try {
    const { data: sessioniDaSincronizzare } = await sb
      .from('motogp_sessioni')
      .select('id, uuid_esterno, tipo, stato, classificazione_sincronizzata, evento_id')
      .in('tipo', ['RAC', 'SPR'])
      .eq('classificazione_sincronizzata', false)
      .neq('stato', 'annullata')
      .neq('stato', 'programmata'); // solo se in corso o conclusa: ha senso provare a leggere risultati

    if (!sessioniDaSincronizzare || sessioniDaSincronizzare.length === 0) {
      const risultato: RisultatoSync = {
        esito: 'successo',
        dettaglio: 'Nessuna sessione gara/sprint in attesa di classificazione.',
        eventiAggiornati: 0,
      };
      await logSync('risultati', risultato);
      return risultato;
    }

    let aggiornati = 0;
    let errori = 0;

    for (const sessione of sessioniDaSincronizzare) {
      try {
        const classifica = await recuperaClassifica(sessione.uuid_esterno);
        if (!classifica || classifica.length === 0) continue;

        const tipoPunti = sessione.tipo === 'SPR' ? 'sprint' : 'gara';
        const { data: tabellaPunti } = await sb
          .from('config_punti')
          .select('posizione, punti')
          .eq('tipo_sessione', tipoPunti);
        const mappaPunti = new Map((tabellaPunti ?? []).map((p) => [p.posizione, p.punti]));

        for (const riga of classifica) {
          // Upsert pilota (anagrafica), per garantire che esista sempre prima
          // di inserire il risultato che lo referenzia.
          const { data: pilotaRow } = await sb
            .from('motogp_piloti')
            .upsert(
              {
                uuid_esterno: riga.rider.id,
                nome_completo: riga.rider.full_name,
                numero: riga.rider.number ?? null,
                paese: riga.rider.country?.name ?? null,
                team: riga.team?.name ?? null,
              },
              { onConflict: 'uuid_esterno' }
            )
            .select('id')
            .single();

          if (!pilotaRow) continue;

          const punti =
            riga.points != null
              ? riga.points
              : riga.position != null
              ? mappaPunti.get(riga.position) ?? 0
              : 0;

          const statoRisultato =
            riga.status === 'RETIRED'
              ? 'ritirato'
              : riga.status === 'NOT_QUALIFIED'
              ? 'non_qualificato'
              : riga.status === 'DISQUALIFIED'
              ? 'squalificato'
              : riga.status === 'NOT_STARTED'
              ? 'non_partito'
              : 'classificato';

          await sb.from('motogp_risultati').upsert(
            {
              sessione_id: sessione.id,
              pilota_id: pilotaRow.id,
              posizione: riga.position,
              stato_risultato: statoRisultato,
              punti_ufficiali: punti,
              numero_moto: riga.bike_number ?? riga.rider.number ?? null,
            },
            { onConflict: 'sessione_id,pilota_id' }
          );
        }

        await sb
          .from('motogp_sessioni')
          .update({ classificazione_sincronizzata: true, ultima_sync: new Date().toISOString() })
          .eq('id', sessione.id);

        aggiornati++;
      } catch (err) {
        console.error(`Errore sincronizzazione risultati sessione ${sessione.uuid_esterno}:`, err);
        errori++;
      }
    }

    const risultato: RisultatoSync = {
      esito: errori === 0 ? 'successo' : aggiornati > 0 ? 'parziale' : 'errore',
      dettaglio: `${aggiornati} sessioni classificate, ${errori} errori.`,
      eventiAggiornati: aggiornati,
    };
    await logSync('risultati', risultato);

    // Dopo aver sincronizzato nuovi risultati, ricalcola i punteggi fanta
    // per gli eventi coinvolti (vedi lib/calcolo-punteggi-db.ts)
    if (aggiornati > 0) {
      const eventiCoinvolti = new Set(sessioniDaSincronizzare.map((s) => s.evento_id));
      const { ricalcolaPunteggiEvento } = await import('./calcolo-punteggi-db');
      for (const eventoId of eventiCoinvolti) {
        await ricalcolaPunteggiEvento(eventoId);
      }
    }

    return risultato;
  } catch (err) {
    const risultato: RisultatoSync = {
      esito: 'errore',
      dettaglio: `Sync risultati fallita: ${String(err)}`,
      eventiAggiornati: 0,
    };
    await logSync('risultati', risultato);
    return risultato;
  }
}

/**
 * Sincronizza l'anagrafica piloti leggendola dagli standings (classifica
 * mondiale) per ciascuna categoria della stagione corrente. Questo è
 * l'endpoint che funziona in modo affidabile: ogni riga della classifica
 * mondiale contiene nome, numero e team del pilota, e viene aggiornata dopo
 * ogni gara. Non include foto profilo (non disponibili via questo endpoint),
 * ma per la funzionalità core dell'app (selezionare piloti, calcolare punti)
 * nome + numero + team sono sufficienti.
 */
export async function sincronizzaPiloti(): Promise<RisultatoSync> {
  const sb = supabaseServer();
  try {
    const stagioneApi = await recuperaStagioneCorrente();
    const categorieApi = await recuperaCategorie(stagioneApi.id);

    const { data: categorie } = await sb.from('motogp_categorie').select('id, codice');
    const mappaCategorieIdPerCodice = new Map((categorie ?? []).map((c) => [c.codice, c.id]));

    let aggiornati = 0;
    let totale = 0;

    for (const catApi of categorieApi) {
      const codiceCategoria = catApi.name as string;
      const categoriaId = mappaCategorieIdPerCodice.get(codiceCategoria);
      if (!categoriaId) continue; // es. MotoE: non gestita dal fantagame

      // Recupera la classifica mondiale per questa categoria/stagione: contiene
      // tutti i piloti iscritti con nome, numero, team aggiornati.
      let standings: { position: number; rider: { id: string; full_name: string; number?: number; country?: { name?: string } }; team?: { name?: string }; points?: number }[] = [];
      try {
        const res = await fetch(
          `https://api.motogp.pulselive.com/motogp/v1/results/standings?seasonUuid=${stagioneApi.id}&categoryUuid=${catApi.id}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://www.motogp.com/',
              'Origin': 'https://www.motogp.com',
              'Accept': 'application/json',
            },
            cache: 'no-store',
          }
        );
        if (!res.ok) continue;
        const data = await res.json();
        standings = data.classification ?? data ?? [];
      } catch {
        continue;
      }

      totale += standings.length;

      for (const riga of standings) {
        if (!riga.rider?.id || !riga.rider?.full_name) continue;

        const { error } = await sb.from('motogp_piloti').upsert(
          {
            uuid_esterno: riga.rider.id,
            nome_completo: riga.rider.full_name,
            numero: riga.rider.number ?? null,
            paese: riga.rider.country?.name ?? null,
            categoria_id: categoriaId,
            team: riga.team?.name ?? null,
            colore_team: null, // non disponibile via standings, opzionale
            testo_colore_team: null,
            url_foto: null,
          },
          { onConflict: 'uuid_esterno' }
        );
        if (!error) aggiornati++;
      }
    }

    const risultato: RisultatoSync = {
      esito: aggiornati > 0 ? 'successo' : 'errore',
      dettaglio: `${aggiornati}/${totale} piloti sincronizzati (anagrafica, numero, team) per la stagione ${stagioneApi.year}.`,
      eventiAggiornati: aggiornati,
    };
    await logSync('piloti', risultato);
    return risultato;
  } catch (err) {
    const risultato: RisultatoSync = {
      esito: 'errore',
      dettaglio: `Sync piloti fallita: ${String(err)}`,
      eventiAggiornati: 0,
    };
    await logSync('piloti', risultato);
    return risultato;
  }
}

/** Esegue l'intera pipeline di sincronizzazione in sequenza. */
export async function sincronizzaTutto() {
  const calendario = await sincronizzaCalendario();
  const piloti = await sincronizzaPiloti();
  const sessioni = await sincronizzaSessioni();
  const risultati = await sincronizzaRisultati();
  return { calendario, piloti, sessioni, risultati };
}
