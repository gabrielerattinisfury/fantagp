// ============================================================================
// Tipi condivisi - rispecchiano lo schema in supabase/migrations/0001_init.sql
// ============================================================================

export type CodiceCategoria = 'MotoGP' | 'Moto2' | 'Moto3';

export type TipoSessione =
  | 'FP1' | 'FP2' | 'FP3' | 'FP4' | 'PR' | 'Q1' | 'Q2' | 'SPR' | 'RAC' | 'WUP';

export type StatoEvento = 'programmato' | 'in_corso' | 'concluso' | 'annullato' | 'rinviato';
export type StatoSessione = 'programmata' | 'in_corso' | 'conclusa' | 'annullata' | 'rinviata';
export type StatoRisultato = 'classificato' | 'ritirato' | 'non_partito' | 'squalificato' | 'non_qualificato';

export type SlotRosa =
  | 'moto3_a' | 'moto3_b'
  | 'moto2_a' | 'moto2_b'
  | 'motogp_a' | 'motogp_b' | 'motogp_c';

export const SLOT_PER_CATEGORIA: Record<CodiceCategoria, SlotRosa[]> = {
  Moto3: ['moto3_a', 'moto3_b'],
  Moto2: ['moto2_a', 'moto2_b'],
  MotoGP: ['motogp_a', 'motogp_b', 'motogp_c'],
};

export interface MotogpStagione {
  id: string;
  anno: number;
  uuid_esterno: string;
  corrente: boolean;
}

export interface MotogpEvento {
  id: string;
  stagione_id: string;
  uuid_esterno: string;
  nome: string;
  paese: string | null;
  circuito: string | null;
  numero_round: number | null;
  data_inizio: string | null; // ISO date
  data_fine: string | null;
  stato: StatoEvento;
  annullato: boolean;
}

export interface MotogpSessione {
  id: string;
  evento_id: string;
  categoria_id: string;
  uuid_esterno: string;
  tipo: TipoSessione;
  data_ora_inizio: string | null; // ISO datetime con timezone
  stato: StatoSessione;
  classificazione_sincronizzata: boolean;
}

export interface MotogpPilota {
  id: string;
  uuid_esterno: string | null;
  nome_completo: string;
  numero: number | null;
  paese: string | null;
  categoria_id: string | null;
  team: string | null;
  colore_team: string | null;
  testo_colore_team: string | null;
  url_foto: string | null;
  attivo: boolean;
}

export interface MotogpRisultato {
  id: string;
  sessione_id: string;
  pilota_id: string;
  posizione: number | null;
  stato_risultato: StatoRisultato;
  punti_ufficiali: number;
  numero_moto: number | null;
  e_sostituto: boolean;
  pilota_sostituito_id: string | null;
}

export interface FantaUtente {
  id: string;
  username: string;
  nome_squadra: string;
  colore_primario: string;
  colore_secondario: string;
  numero_gara: number | null;
  ruolo: 'utente' | 'admin';
  attivo: boolean;
}

export interface FantaRosaRiga {
  id: string;
  utente_id: string;
  stagione_id: string;
  pilota_id: string;
  categoria_id: string;
  slot: SlotRosa;
  valido_da_round: number;
  valido_a_round: number | null;
  motivo_sostituzione: string | null;
}

export interface FantaFormazione {
  id: string;
  utente_id: string;
  evento_id: string;
  pilota_moto3_id: string | null;
  pilota_moto2_id: string | null;
  pilota_motogp_1_id: string | null;
  pilota_motogp_2_id: string | null;
  auto_riproposta: boolean;
  bloccata: boolean;
  modificata_il: string;
}

export interface FantaPunteggioWeekend {
  id: string;
  utente_id: string;
  evento_id: string;
  punti_moto3_gara: number;
  punti_moto2_gara: number;
  punti_motogp1_gara: number;
  punti_motogp2_gara: number;
  sprint_pilota1_id: string | null;
  sprint_pilota1_punti: number;
  sprint_pilota2_id: string | null;
  sprint_pilota2_punti: number;
  totale_weekend: number;
  modificato_manualmente: boolean;
  note_admin: string | null;
}

export interface RosaAttivaRiga {
  slot: SlotRosa;
  pilota_id: string;
  categoria_id: string;
  nome_completo: string;
  numero: number | null;
  url_foto: string | null;
  colore_team: string | null;
  testo_colore_team: string | null;
}

// Riepilogo dettagliato del punteggio di un weekend, usato sia dal motore di
// calcolo sia dalla UI per mostrare "da dove arrivano i punti".
export interface DettaglioPunteggioWeekend {
  utente_id: string;
  evento_id: string;
  caselle: {
    slot: 'moto3' | 'moto2' | 'motogp_1' | 'motogp_2';
    pilota_id: string | null;
    nome_pilota: string | null;
    punti: number;
    sostituito_da?: { pilota_id: string; nome_pilota: string } | null;
  }[];
  sprint: {
    pilota_id: string;
    nome_pilota: string;
    punti: number;
    conteggiato: boolean; // true se rientra nei 2 migliori
  }[];
  totale_weekend: number;
}
