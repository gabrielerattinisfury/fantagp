// ============================================================================
// Test del motore di calcolo punteggi.
// Eseguibili con: npx tsx lib/__tests__/calcolo-punteggi.test.ts
// (oppure integrabili in vitest/jest una volta installate le dipendenze)
// ============================================================================

import { calcolaPunteggioWeekend, type InputCalcoloWeekend } from '../calcolo-punteggi';
import type { MotogpRisultato, RosaAttivaRiga, FantaFormazione } from '../tipi';

let testEseguiti = 0;
let testFalliti = 0;

function assertEqual(actual: unknown, expected: unknown, messaggio: string) {
  testEseguiti++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    testFalliti++;
    console.error(`FALLITO: ${messaggio}\n  atteso:  ${e}\n  ottenuto: ${a}`);
  } else {
    console.log(`OK: ${messaggio}`);
  }
}

function risultato(parziale: Partial<MotogpRisultato> & { pilota_id: string }): MotogpRisultato {
  return {
    id: `r-${parziale.pilota_id}`,
    sessione_id: 'sess-1',
    posizione: null,
    stato_risultato: 'classificato',
    punti_ufficiali: 0,
    numero_moto: null,
    e_sostituto: false,
    pilota_sostituito_id: null,
    ...parziale,
  };
}

const rosaBase: RosaAttivaRiga[] = [
  { slot: 'moto3_a', pilota_id: 'm3-1', categoria_id: 'cat-moto3', nome_completo: 'Pilota Moto3 Uno', numero: 11 },
  { slot: 'moto3_b', pilota_id: 'm3-2', categoria_id: 'cat-moto3', nome_completo: 'Pilota Moto3 Due', numero: 22 },
  { slot: 'moto2_a', pilota_id: 'm2-1', categoria_id: 'cat-moto2', nome_completo: 'Pilota Moto2 Uno', numero: 33 },
  { slot: 'moto2_b', pilota_id: 'm2-2', categoria_id: 'cat-moto2', nome_completo: 'Pilota Moto2 Due', numero: 44 },
  { slot: 'motogp_a', pilota_id: 'mgp-1', categoria_id: 'cat-motogp', nome_completo: 'Pilota MotoGP Uno', numero: 1 },
  { slot: 'motogp_b', pilota_id: 'mgp-2', categoria_id: 'cat-motogp', nome_completo: 'Pilota MotoGP Due', numero: 2 },
  { slot: 'motogp_c', pilota_id: 'mgp-3', categoria_id: 'cat-motogp', nome_completo: 'Pilota MotoGP Tre', numero: 3 },
];

const numeroMotoAbituale = new Map<string, number>([
  ['m3-1', 11], ['m3-2', 22],
  ['m2-1', 33], ['m2-2', 44],
  ['mgp-1', 1], ['mgp-2', 2], ['mgp-3', 3],
]);

const nomePilota = new Map<string, string>(rosaBase.map((r) => [r.pilota_id, r.nome_completo]));

function formazioneBase(parziale?: Partial<FantaFormazione>): FantaFormazione {
  return {
    id: 'f-1',
    utente_id: 'u-1',
    evento_id: 'ev-1',
    pilota_moto3_id: 'm3-1',
    pilota_moto2_id: 'm2-1',
    pilota_motogp_1_id: 'mgp-1',
    pilota_motogp_2_id: 'mgp-2',
    auto_riproposta: false,
    bloccata: true,
    modificata_il: new Date().toISOString(),
    ...parziale,
  };
}

function inputBase(parziale?: Partial<InputCalcoloWeekend>): InputCalcoloWeekend {
  return {
    utenteId: 'u-1',
    eventoId: 'ev-1',
    formazione: formazioneBase(),
    rosaAttiva: rosaBase,
    risultatiGaraPerCategoria: { moto3: [], moto2: [], motogp: [] },
    risultatiSprintMotoGP: [],
    numeroMotoAbitualePerPilota: numeroMotoAbituale,
    nomePilotaPerId: nomePilota,
    ...parziale,
  };
}

// ---------------------------------------------------------------------------
// TEST 1: caso semplice, tutti i piloti schierati corrono e prendono punti
// ---------------------------------------------------------------------------
{
  const input = inputBase({
    risultatiGaraPerCategoria: {
      moto3: [risultato({ pilota_id: 'm3-1', posizione: 1, punti_ufficiali: 25, numero_moto: 11 })],
      moto2: [risultato({ pilota_id: 'm2-1', posizione: 3, punti_ufficiali: 16, numero_moto: 33 })],
      motogp: [
        risultato({ pilota_id: 'mgp-1', posizione: 1, punti_ufficiali: 25, numero_moto: 1 }),
        risultato({ pilota_id: 'mgp-2', posizione: 2, punti_ufficiali: 20, numero_moto: 2 }),
      ],
    },
  });
  const out = calcolaPunteggioWeekend(input);
  assertEqual(out.totale_weekend, 25 + 16 + 25 + 20, 'Test 1: somma punti gara semplice (86)');
}

// ---------------------------------------------------------------------------
// TEST 2: pilota schierato NON ha corso, ma un sostituto sulla stessa moto sì
//          -> il fantamotociclista prende i punti del sostituto
// ---------------------------------------------------------------------------
{
  const input = inputBase({
    risultatiGaraPerCategoria: {
      moto3: [],
      moto2: [],
      motogp: [
        // mgp-1 NON compare (infortunato). Sostituto "Test Rider" guida la moto n.1
        risultato({ pilota_id: 'sostituto-x', posizione: 14, punti_ufficiali: 2, numero_moto: 1 }),
        risultato({ pilota_id: 'mgp-2', posizione: 5, punti_ufficiali: 11, numero_moto: 2 }),
      ],
    },
  });
  const out = calcolaPunteggioWeekend(input);
  const casellaMotoGp1 = out.caselle.find((c) => c.slot === 'motogp_1')!;
  assertEqual(casellaMotoGp1.punti, 2, 'Test 2: punti del sostituto sulla stessa moto (2pt)');
  assertEqual(
    casellaMotoGp1.sostituito_da?.pilota_id,
    'sostituto-x',
    'Test 2: il dettaglio riporta correttamente chi ha sostituito'
  );
}

// ---------------------------------------------------------------------------
// TEST 3: pilota schierato NON ha corso e NESSUN sostituto sulla sua moto
//          -> 0 punti per quella casella
// ---------------------------------------------------------------------------
{
  const input = inputBase({
    risultatiGaraPerCategoria: {
      moto3: [],
      moto2: [],
      motogp: [
        // mgp-1 non compare affatto, nessuno guida la moto n.1 quel weekend
        risultato({ pilota_id: 'mgp-2', posizione: 5, punti_ufficiali: 11, numero_moto: 2 }),
      ],
    },
  });
  const out = calcolaPunteggioWeekend(input);
  const casellaMotoGp1 = out.caselle.find((c) => c.slot === 'motogp_1')!;
  assertEqual(casellaMotoGp1.punti, 0, 'Test 3: 0 punti se nessun sostituto rintracciabile');
}

// ---------------------------------------------------------------------------
// TEST 4: Sprint - si prendono i 2 migliori tra TUTTI E 3 i piloti MotoGP in
//          rosa, indipendentemente da quali sono stati schierati in gara
// ---------------------------------------------------------------------------
{
  const input = inputBase({
    risultatiSprintMotoGP: [
      risultato({ pilota_id: 'mgp-1', posizione: 8, punti_ufficiali: 2, numero_moto: 1 }),
      risultato({ pilota_id: 'mgp-2', posizione: 10, punti_ufficiali: 0, numero_moto: 2 }),
      // mgp-3 NON è stato schierato in gara (non è tra i pilota_motogp_1/2)
      // ma essendo posseduto in rosa partecipa comunque al conteggio sprint
      risultato({ pilota_id: 'mgp-3', posizione: 1, punti_ufficiali: 12, numero_moto: 3 }),
    ],
  });
  const out = calcolaPunteggioWeekend(input);
  // I 2 migliori sono mgp-3 (12) e mgp-1 (2) = 14. mgp-2 (0) escluso.
  assertEqual(
    out.sprint.find((s) => s.pilota_id === 'mgp-3')?.conteggiato,
    true,
    'Test 4: mgp-3 (non schierato in gara, ma in rosa) conta per la sprint'
  );
  assertEqual(
    out.sprint.find((s) => s.pilota_id === 'mgp-2')?.conteggiato,
    false,
    'Test 4: il terzo punteggio sprint più basso viene escluso'
  );
  const puntiSprintAttesi = 12 + 2;
  assertEqual(
    out.totale_weekend,
    puntiSprintAttesi, // nessun risultato gara in questo test -> solo sprint
    'Test 4: totale weekend = somma dei 2 migliori sprint (14)'
  );
}

// ---------------------------------------------------------------------------
// TEST 5: Sprint - un pilota della rosa non ha disputato la sprint (0 punti)
//          ma resta comunque nel confronto a 3, come da regola concordata
// ---------------------------------------------------------------------------
{
  const input = inputBase({
    risultatiSprintMotoGP: [
      risultato({ pilota_id: 'mgp-1', posizione: 3, punti_ufficiali: 7, numero_moto: 1 }),
      risultato({ pilota_id: 'mgp-2', posizione: 4, punti_ufficiali: 6, numero_moto: 2 }),
      // mgp-3 assente, nessun sostituto -> 0 punti, ma resta nel confronto
    ],
  });
  const out = calcolaPunteggioWeekend(input);
  const mgp3 = out.sprint.find((s) => s.pilota_id === 'mgp-3')!;
  assertEqual(mgp3.punti, 0, 'Test 5: pilota assente alla sprint vale 0 punti');
  assertEqual(mgp3.conteggiato, false, 'Test 5: viene escluso dai 2 migliori (0 < 7 e 0 < 6)');
  assertEqual(out.totale_weekend, 7 + 6, 'Test 5: totale = somma dei 2 migliori reali (13)');
}

// ---------------------------------------------------------------------------
// TEST 6: formazione assente (weekend dimenticato, nessuna formazione
//          neppure auto-riproposta trovata) -> 0 punti gara, ma la sprint
//          si calcola comunque sull'intera rosa (la sprint non dipende dalla
//          formazione schierata)
// ---------------------------------------------------------------------------
{
  const input = inputBase({
    formazione: null,
    risultatiSprintMotoGP: [
      risultato({ pilota_id: 'mgp-1', posizione: 1, punti_ufficiali: 12, numero_moto: 1 }),
      risultato({ pilota_id: 'mgp-2', posizione: 2, punti_ufficiali: 9, numero_moto: 2 }),
      risultato({ pilota_id: 'mgp-3', posizione: 3, punti_ufficiali: 7, numero_moto: 3 }),
    ],
  });
  const out = calcolaPunteggioWeekend(input);
  const puntiGara = out.caselle.reduce((acc, c) => acc + c.punti, 0);
  assertEqual(puntiGara, 0, 'Test 6: nessuna formazione -> 0 punti gara');
  assertEqual(out.totale_weekend, 12 + 9, 'Test 6: la sprint si calcola comunque sui 2 migliori (21)');
}

console.log(`\n${testEseguiti - testFalliti}/${testEseguiti} test superati.`);
if (testFalliti > 0) {
  process.exit(1);
}
