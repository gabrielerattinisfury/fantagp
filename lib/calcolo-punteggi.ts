// ============================================================================
// MOTORE DI CALCOLO PUNTEGGI
// ============================================================================
// Implementa le regole concordate:
//  1. Gara: il fantamotociclista prende i punti ufficiali del pilota schierato.
//     Se il pilota schierato non ha un risultato in quella sessione (non ha
//     corso), si cercano i punti di chi ha guidato la STESSA moto (numero_moto)
//     in sua vece quel weekend ("sostituto"). Se non esiste nemmeno quello: 0.
//  2. Sprint (solo MotoGP): si prendono SEMPRE i 2 migliori risultati tra TUTTI
//     E 3 i piloti MotoGP posseduti in rosa quel weekend (non solo i 2
//     schierati in gara). Un pilota assente vale 0 punti e resta comunque nel
//     confronto a 3 (può semplicemente non rientrare tra i 2 migliori).
//  3. Le sessioni non disputate (gara annullata, ecc.) semplicemente non hanno
//     risultati: l'assenza di risultato produce naturalmente 0 punti, senza
//     bisogno di logica speciale aggiuntiva, rispecchiando l'ufficialità del
//     Mondiale MotoGP.
//
// Questo modulo è puro (nessuna chiamata di rete/db diretta): riceve i dati
// già caricati e restituisce il dettaglio calcolato. Chi lo chiama (vedi
// lib/calcolo-punteggi-db.ts) si occupa di leggere/scrivere su Supabase.
// ============================================================================

import type {
  MotogpRisultato,
  FantaFormazione,
  RosaAttivaRiga,
  DettaglioPunteggioWeekend,
} from './tipi';

interface MappaRisultati {
  // chiave: pilota_id -> risultato in quella sessione
  perPilota: Map<string, MotogpRisultato>;
  // chiave: numero_moto -> risultato (utile per trovare il sostituto)
  perNumeroMoto: Map<number, MotogpRisultato>;
}

function indicizzaRisultati(risultati: MotogpRisultato[]): MappaRisultati {
  const perPilota = new Map<string, MotogpRisultato>();
  const perNumeroMoto = new Map<number, MotogpRisultato>();
  for (const r of risultati) {
    perPilota.set(r.pilota_id, r);
    if (r.numero_moto != null) {
      perNumeroMoto.set(r.numero_moto, r);
    }
  }
  return { perPilota, perNumeroMoto };
}

/**
 * Calcola i punti ottenuti da un pilota in una sessione, applicando la regola
 * di sostituzione: se il pilota titolare non ha un risultato diretto, si cerca
 * chi guida la stessa moto/numero in sua vece.
 *
 * numeroMotoTitolare: il numero di moto "atteso" per il pilota, ricavato
 * dall'anagrafica (motogp_piloti.numero). Serve come chiave di ricerca nel
 * caso il pilota titolare non compaia affatto tra i risultati (es. nemmeno
 * iscritto quel weekend) e si debba comunque risalire a chi ha preso la sua
 * moto a partire dal numero abituale.
 */
function calcolaPuntiPilota(
  pilotaId: string | null,
  numeroMotoTitolare: number | null,
  risultati: MappaRisultati
): { punti: number; pilotaEffettivoId: string | null; eraSostituito: boolean } {
  if (!pilotaId) {
    return { punti: 0, pilotaEffettivoId: null, eraSostituito: false };
  }

  // 1. Il pilota ha corso lui stesso: punti diretti.
  const risultatoDiretto = risultati.perPilota.get(pilotaId);
  if (risultatoDiretto) {
    return {
      punti: risultatoDiretto.punti_ufficiali,
      pilotaEffettivoId: pilotaId,
      eraSostituito: false,
    };
  }

  // 2. Il pilota non ha un risultato diretto: cerco un sostituto sulla stessa
  //    moto. Il sostituto è identificato perché un altro pilota compare nei
  //    risultati con lo stesso numero_moto del titolare.
  if (numeroMotoTitolare != null) {
    const risultatoSostituto = risultati.perNumeroMoto.get(numeroMotoTitolare);
    if (risultatoSostituto && risultatoSostituto.pilota_id !== pilotaId) {
      return {
        punti: risultatoSostituto.punti_ufficiali,
        pilotaEffettivoId: risultatoSostituto.pilota_id,
        eraSostituito: true,
      };
    }
  }

  // 3. Nessun risultato, nessun sostituto rintracciabile: 0 punti.
  return { punti: 0, pilotaEffettivoId: null, eraSostituito: false };
}

export interface InputCalcoloWeekend {
  utenteId: string;
  eventoId: string;
  formazione: FantaFormazione | null; // null = nessuna formazione trovata per niente
  rosaAttiva: RosaAttivaRiga[]; // i 7 piloti posseduti in quel round (con numero moto da anagrafica)
  risultatiGaraPerCategoria: {
    moto3: MotogpRisultato[];
    moto2: MotogpRisultato[];
    motogp: MotogpRisultato[];
  };
  risultatiSprintMotoGP: MotogpRisultato[];
  // numero di moto "abituale" di ciascun pilota, per la ricerca del sostituto
  // quando il pilota titolare non compare affatto nei risultati
  numeroMotoAbitualePerPilota: Map<string, number>;
  nomePilotaPerId: Map<string, string>;
}

/**
 * Calcola il dettaglio completo del punteggio di un fantamotociclista per un
 * singolo weekend di gara (evento). Funzione pura, facilmente testabile.
 */
export function calcolaPunteggioWeekend(input: InputCalcoloWeekend): DettaglioPunteggioWeekend {
  const {
    utenteId,
    eventoId,
    formazione,
    rosaAttiva,
    risultatiGaraPerCategoria,
    risultatiSprintMotoGP,
    numeroMotoAbitualePerPilota,
    nomePilotaPerId,
  } = input;

  const idxMoto3 = indicizzaRisultati(risultatiGaraPerCategoria.moto3);
  const idxMoto2 = indicizzaRisultati(risultatiGaraPerCategoria.moto2);
  const idxMotoGp = indicizzaRisultati(risultatiGaraPerCategoria.motogp);
  const idxSprint = indicizzaRisultati(risultatiSprintMotoGP);

  const caselle: DettaglioPunteggioWeekend['caselle'] = [];

  function calcolaCasella(
    slot: 'moto3' | 'moto2' | 'motogp_1' | 'motogp_2',
    pilotaId: string | null,
    indice: MappaRisultati
  ) {
    const numeroMoto = pilotaId ? numeroMotoAbitualePerPilota.get(pilotaId) ?? null : null;
    const { punti, pilotaEffettivoId, eraSostituito } = calcolaPuntiPilota(
      pilotaId,
      numeroMoto,
      indice
    );
    caselle.push({
      slot,
      pilota_id: pilotaId,
      nome_pilota: pilotaId ? nomePilotaPerId.get(pilotaId) ?? null : null,
      punti,
      sostituito_da:
        eraSostituito && pilotaEffettivoId
          ? {
              pilota_id: pilotaEffettivoId,
              nome_pilota: nomePilotaPerId.get(pilotaEffettivoId) ?? 'Sconosciuto',
            }
          : null,
    });
  }

  calcolaCasella('moto3', formazione?.pilota_moto3_id ?? null, idxMoto3);
  calcolaCasella('moto2', formazione?.pilota_moto2_id ?? null, idxMoto2);
  calcolaCasella('motogp_1', formazione?.pilota_motogp_1_id ?? null, idxMotoGp);
  calcolaCasella('motogp_2', formazione?.pilota_motogp_2_id ?? null, idxMotoGp);

  const puntiGaraTotali = caselle.reduce((acc, c) => acc + c.punti, 0);

  // --- Sprint: SEMPRE i 2 migliori tra tutti e 3 i piloti MotoGP in rosa ---
  const pilotiMotoGpInRosa = rosaAttiva.filter(
    (r) => r.slot === 'motogp_a' || r.slot === 'motogp_b' || r.slot === 'motogp_c'
  );

  const risultatiSprintCalcolati = pilotiMotoGpInRosa.map((rigaRosa) => {
    const numeroMoto = numeroMotoAbitualePerPilota.get(rigaRosa.pilota_id) ?? null;
    const { punti } = calcolaPuntiPilota(rigaRosa.pilota_id, numeroMoto, idxSprint);
    return {
      pilota_id: rigaRosa.pilota_id,
      nome_pilota: nomePilotaPerId.get(rigaRosa.pilota_id) ?? rigaRosa.nome_completo,
      punti,
    };
  });

  // Ordino dal punteggio più alto e marco i primi 2 come "conteggiati"
  const sprintOrdinato = [...risultatiSprintCalcolati].sort((a, b) => b.punti - a.punti);
  const idMiglioriDue = new Set(sprintOrdinato.slice(0, 2).map((r) => r.pilota_id));

  const sprint: DettaglioPunteggioWeekend['sprint'] = risultatiSprintCalcolati.map((r) => ({
    ...r,
    conteggiato: idMiglioriDue.has(r.pilota_id),
  }));

  const puntiSprintTotali = sprint
    .filter((r) => r.conteggiato)
    .reduce((acc, r) => acc + r.punti, 0);

  const totaleWeekend = puntiGaraTotali + puntiSprintTotali;

  return {
    utente_id: utenteId,
    evento_id: eventoId,
    caselle,
    sprint,
    totale_weekend: totaleWeekend,
  };
}

/**
 * Determina se la sprint conta per questo evento: solo se esiste almeno un
 * risultato sprint registrato (cioè la sessione SPR si è davvero disputata).
 * Se la sprint non è prevista o è stata annullata, semplicemente
 * risultatiSprintMotoGP sarà vuoto e puntiSprintTotali sarà 0: nessuna
 * logica speciale necessaria, coerente con l'ufficialità del Mondiale.
 */
