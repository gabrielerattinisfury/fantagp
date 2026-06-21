// ============================================================================
// CLIENT API MOTOGP
// ============================================================================
// motogp.com è una Single Page Application: il sito pubblico non espone dati
// nell'HTML statico. Il sito stesso, però, chiama internamente una API REST
// pubblica (non ufficialmente documentata da Dorna, ma stabile e usata anche
// da diversi progetti open source di terze parti) all'indirizzo
// api.motogp.pulselive.com.
//
// IMPORTANTE: durante lo sviluppo, le chiamate a questa API senza header da
// browser (User-Agent, Referer, Origin) hanno restituito errori 400 su
// endpoint con parametri. Per questo qui impostiamo sempre header realistici.
// Se in futuro l'API cambiasse forma o iniziasse a bloccare in modo più
// aggressivo, vedi fallback-scraping.ts per il piano B (scraping con browser
// headless sulle pagine pubbliche).
// ============================================================================

const BASE_URL = 'https://api.motogp.pulselive.com/motogp/v1';
const BROADCAST_BASE_URL = 'https://api.motogp.pulselive.com/motogp/v1/results';

const HEADER_BROWSER = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: 'https://www.motogp.com/',
  Origin: 'https://www.motogp.com',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
};

async function fetchJson<T>(url: string, tentativi = 3): Promise<T> {
  let ultimoErrore: unknown;
  for (let i = 0; i < tentativi; i++) {
    try {
      const res = await fetch(url, {
        headers: HEADER_BROWSER,
        // Evita cache stantia: i risultati possono cambiare durante un weekend
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`MotoGP API ${res.status} ${res.statusText} su ${url}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      ultimoErrore = err;
      // backoff esponenziale semplice prima del prossimo tentativo
      if (i < tentativi - 1) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** i));
      }
    }
  }
  throw new Error(
    `Impossibile contattare l'API MotoGP dopo ${tentativi} tentativi: ${String(ultimoErrore)}`
  );
}

// --- Tipi delle risposte API MotoGP (semplificati al necessario) ----------

export interface ApiStagione {
  id: string;
  year: number;
  current: boolean;
}

export interface ApiCategoria {
  id: string;
  name: string; // "MotoGP", "Moto2", "Moto3"
  legacy_id?: number;
}

export interface ApiEvento {
  id: string;
  name: string;
  short_name?: string;
  sponsored_name?: string;
  country?: { name?: string };
  circuit?: { name?: string };
  date_start: string;
  date_end: string;
  status?: string; // es. "FINISHED", "FUTURE", "STARTED"
  cancelled?: boolean;
  sequence?: number; // ordine round, utile se cambia per cancellazioni
}

export interface ApiSessione {
  id: string;
  type: string; // "RAC", "SPR", "Q2", "FP1" ecc.
  date: string; // data/ora inizio ISO
  status?: string;
  category?: { id: string; name: string };
}

export interface ApiClassificaRiga {
  position: number | null;
  rider: {
    id: string;
    full_name: string;
    number?: number;
    country?: { name?: string };
  };
  team?: { name?: string };
  points?: number;
  status?: string; // es. "RETIRED", "NOT_QUALIFIED", "DISQUALIFIED" ecc.
  // Numero moto: in alcune risposte coincide con rider.number, ma teniamo
  // un campo separato perché in caso di sostituzione il numero sulla carena
  // può differire da quello abituale del sostituto.
  bike_number?: number;
}

export interface ApiPilotaCompleto {
  id: string;
  full_name: string;
  surname?: string;
  country?: { name?: string; iso?: string };
  birth_date?: string;
  // STRUTTURA REALE confermata: l'API espone "current_career_step" come
  // oggetto singolo (non un array di stagioni), che riflette sempre la
  // situazione presente del pilota in quel momento - numero di gara, team,
  // categoria possono cambiare da una stagione all'altra (es. il campione in
  // carica corre con #1 l'anno dopo il titolo, poi torna al proprio numero
  // abituale), quindi questo campo va sempre riletto ad ogni sincronizzazione.
  current_career_step?: {
    season: number;
    number?: number;
    sponsored_team?: string;
    team?: {
      id?: string;
      name?: string;
      constructor?: { name?: string };
      color?: string; // colore ufficiale del team, es. "#cc0000" per Ducati
      text_color?: string; // colore testo leggibile sopra "color", es. "#ffffff"
    };
    category?: { id: string; name: string };
    current?: boolean;
    pictures?: {
      profile?: { main?: string | null; secondary?: string | null } | null;
      portrait?: string | null;
    };
  };
}

/** Recupera l'anagrafica completa piloti (tutte le categorie) della stagione corrente, incluse le foto profilo e i colori team ufficiali. */
export async function recuperaPilotiCompleti(seasonUuid: string): Promise<ApiPilotaCompleto[]> {
  return fetchJson<ApiPilotaCompleto[]>(`${BASE_URL}/riders?seasonUuid=${seasonUuid}`);
}

// --- Funzioni pubbliche -----------------------------------------------------

export async function recuperaStagioni(): Promise<ApiStagione[]> {
  return fetchJson<ApiStagione[]>(`${BASE_URL}/results/seasons`);
}

export async function recuperaStagioneCorrente(): Promise<ApiStagione> {
  const stagioni = await recuperaStagioni();
  const corrente = stagioni.find((s) => s.current);
  if (!corrente) {
    throw new Error('Nessuna stagione corrente trovata nella risposta API MotoGP.');
  }
  return corrente;
}

export async function recuperaCategorie(seasonUuid: string): Promise<ApiCategoria[]> {
  return fetchJson<ApiCategoria[]>(`${BASE_URL}/results/categories?seasonUuid=${seasonUuid}`);
}

export async function recuperaEventi(seasonUuid: string): Promise<ApiEvento[]> {
  return fetchJson<ApiEvento[]>(`${BASE_URL}/results/events?seasonUuid=${seasonUuid}`);
}

export async function recuperaSessioni(eventUuid: string, categoryUuid: string): Promise<ApiSessione[]> {
  return fetchJson<ApiSessione[]>(
    `${BASE_URL}/results/sessions?eventUuid=${eventUuid}&categoryUuid=${categoryUuid}`
  );
}

export async function recuperaClassifica(sessionUuid: string): Promise<ApiClassificaRiga[]> {
  return fetchJson<ApiClassificaRiga[]>(`${BROADCAST_BASE_URL}/classifications?sessionUuid=${sessionUuid}`);
}

/**
 * Mappa il tipo sessione restituito dall'API MotoGP (es. "RAC", "SPR", "Q2")
 * al nostro enum interno. Le sigle ufficiali sono già allineate, ma questa
 * funzione centralizza l'eventuale normalizzazione (es. maiuscole/minuscole)
 * così se Dorna cambia leggermente le sigle basta aggiornare qui.
 */
export function normalizzaTipoSessione(tipoApi: string): string {
  const t = tipoApi.toUpperCase().trim();
  const mappa: Record<string, string> = {
    RAC: 'RAC',
    RACE: 'RAC',
    SPR: 'SPR',
    SPRINT: 'SPR',
    Q1: 'Q1',
    Q2: 'Q2',
    FP1: 'FP1',
    FP2: 'FP2',
    FP3: 'FP3',
    FP4: 'FP4',
    PR: 'PR',
    WUP: 'WUP',
  };
  return mappa[t] ?? t;
}
