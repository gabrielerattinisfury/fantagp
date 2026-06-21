-- ============================================================================
-- FANTAMOTOGP - SCHEMA DATABASE INIZIALE
-- ============================================================================
-- Questo schema è pensato per Postgres (Supabase). Convenzioni:
--  - tutte le tabelle "anagrafiche MotoGP ufficiali" hanno prefisso motogp_
--  - tutte le tabelle "fantagame" hanno prefisso fanta_
--  - gli id esterni (UUID forniti dall'API ufficiale MotoGP) sono salvati
--    come testo in colonne *_uuid_esterno, per poterli ricollegare ad ogni sync
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ANAGRAFICA UFFICIALE MOTOGP (alimentata dal job di sincronizzazione)
-- ----------------------------------------------------------------------------

create table motogp_stagioni (
  id uuid primary key default gen_random_uuid(),
  anno integer not null unique,
  uuid_esterno text not null unique, -- seasonUuid dell'API motogp
  corrente boolean not null default false,
  creato_il timestamptz not null default now()
);

create table motogp_categorie (
  id uuid primary key default gen_random_uuid(),
  codice text not null unique check (codice in ('MotoGP', 'Moto2', 'Moto3')),
  nome text not null
);

insert into motogp_categorie (codice, nome) values
  ('MotoGP', 'MotoGP'),
  ('Moto2', 'Moto2'),
  ('Moto3', 'Moto3');

create table motogp_eventi (
  id uuid primary key default gen_random_uuid(),
  stagione_id uuid not null references motogp_stagioni(id) on delete cascade,
  uuid_esterno text not null unique, -- event uuid dell'API motogp
  nome text not null, -- es. "Gran Premio d'Italia"
  paese text,
  circuito text,
  numero_round integer, -- ordine nel calendario, ricalcolato ad ogni sync (gestisce cancellazioni)
  data_inizio date,
  data_fine date,
  stato text not null default 'programmato'
    check (stato in ('programmato', 'in_corso', 'concluso', 'annullato', 'rinviato')),
  annullato boolean not null default false,
  ultima_sync timestamptz,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

create index idx_motogp_eventi_stagione on motogp_eventi(stagione_id);
create index idx_motogp_eventi_data on motogp_eventi(data_inizio);

-- Sessioni del weekend: FP1, FP2, Q1, Q2, Sprint (solo MotoGP), Gara -- per categoria
create table motogp_sessioni (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references motogp_eventi(id) on delete cascade,
  categoria_id uuid not null references motogp_categorie(id),
  uuid_esterno text not null unique, -- session id dell'API motogp
  tipo text not null
    check (tipo in ('FP1','FP2','FP3','FP4','PR','Q1','Q2','SPR','RAC','WUP')),
  -- SPR = Sprint Race, RAC = Gara principale
  data_ora_inizio timestamptz, -- orario UFFICIALE di partenza, usato per le deadline
  stato text not null default 'programmata'
    check (stato in ('programmata', 'in_corso', 'conclusa', 'annullata', 'rinviata')),
  classificazione_sincronizzata boolean not null default false,
  ultima_sync timestamptz,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  unique (evento_id, categoria_id, tipo)
);

create index idx_motogp_sessioni_evento on motogp_sessioni(evento_id);
create index idx_motogp_sessioni_data on motogp_sessioni(data_ora_inizio);

-- Anagrafica piloti ufficiale (cambia raramente, ma i team/sostituzioni possono variare a weekend)
create table motogp_piloti (
  id uuid primary key default gen_random_uuid(),
  uuid_esterno text unique, -- rider id dell'API motogp, se disponibile
  nome_completo text not null,
  numero integer, -- numero di gara CORRENTE: va risincronizzato ogni stagione,
                   -- può cambiare anno per anno (es. il campione in carica
                   -- corre con #1 l'anno successivo al titolo)
  paese text,
  categoria_id uuid references motogp_categorie(id), -- categoria "abituale" corrente
  team text,
  colore_team text, -- colore ufficiale del team (es. "#CC0000" Ducati), da API
  testo_colore_team text, -- colore testo leggibile sopra colore_team, da API
  url_foto text, -- foto ufficiale del pilota, se disponibile dall'API/sito MotoGP
  attivo boolean not null default true,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

create unique index idx_motogp_piloti_nome on motogp_piloti(nome_completo);

-- Risultato di un pilota in una sessione (gara o sprint). Qui vive il punteggio ufficiale.
create table motogp_risultati (
  id uuid primary key default gen_random_uuid(),
  sessione_id uuid not null references motogp_sessioni(id) on delete cascade,
  pilota_id uuid not null references motogp_piloti(id),
  posizione integer, -- null se ritirato/non classificato/non partito
  stato_risultato text not null default 'classificato'
    check (stato_risultato in ('classificato', 'ritirato', 'non_partito', 'squalificato', 'non_qualificato')),
  punti_ufficiali numeric(5,1) not null default 0, -- punti Mondiale ufficiali ottenuti
  -- Numero moto/sella: serve per la logica di "sostituzione" lato fantagame.
  -- Se un pilota titolare di una squadra fanta è infortunato, il fantamotociclista
  -- prende i punti di chi guida la STESSA moto/team in sua vece in quel weekend.
  numero_moto integer,
  e_sostituto boolean not null default false, -- true se questo pilota corre al posto di un titolare
  pilota_sostituito_id uuid references motogp_piloti(id), -- titolare sostituito, se noto
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  unique (sessione_id, pilota_id)
);

create index idx_motogp_risultati_sessione on motogp_risultati(sessione_id);
create index idx_motogp_risultati_pilota on motogp_risultati(pilota_id);

-- ----------------------------------------------------------------------------
-- 2. UTENTI / FANTAMOTOCICLISTI
-- ----------------------------------------------------------------------------

create table fanta_utenti (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  nome_squadra text not null,
  colore_primario text not null default '#E10600', -- colore personalizzabile
  colore_secondario text not null default '#1A1A1A',
  numero_gara integer, -- numero "di gara" del fantamotociclista, personalizzabile (1-999)
  ruolo text not null default 'utente' check (ruolo in ('utente', 'admin')),
  attivo boolean not null default true,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

create unique index idx_fanta_utenti_numero_gara on fanta_utenti(numero_gara) where numero_gara is not null;

-- Rosa stagionale, STORICIZZATA: ogni riga rappresenta un "possesso" di un pilota
-- da parte di un fantamotociclista, valido in un intervallo di round.
-- Normalmente un pilota resta posseduto per tutta la stagione (valido_da_round = 1,
-- valido_a_round = null = "fino a fine stagione"). In caso di sostituzione admin
-- (es. pilota infortunato a lungo termine, ritiro), si chiude la riga del vecchio
-- pilota con un valido_a_round e si apre una nuova riga per il nuovo pilota a
-- partire dal round successivo. Questo mantiene coerenti i calcoli storici:
-- un weekend passato continua a usare il pilota che era davvero posseduto allora.
create table fanta_rose (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references fanta_utenti(id) on delete cascade,
  stagione_id uuid not null references motogp_stagioni(id) on delete cascade,
  pilota_id uuid not null references motogp_piloti(id),
  categoria_id uuid not null references motogp_categorie(id),
  -- "slot" identifica la casella di rosa (es. moto3_a, moto3_b, moto2_a, moto2_b,
  -- motogp_a, motogp_b, motogp_c). Permette di sapere quale pilota ha sostituito
  -- quale, mantenendo sempre 2+2+3 slot distinti per ogni utente/stagione.
  slot text not null check (slot in (
    'moto3_a','moto3_b','moto2_a','moto2_b','motogp_a','motogp_b','motogp_c'
  )),
  valido_da_round integer not null default 1,
  valido_a_round integer, -- null = valido fino a fine stagione
  motivo_sostituzione text, -- compilato solo se questa riga chiude un possesso precedente
  sostituito_da_admin_id uuid references fanta_utenti(id), -- chi ha fatto la modifica (per audit)
  creato_il timestamptz not null default now(),
  check (valido_a_round is null or valido_a_round >= valido_da_round)
);

create index idx_fanta_rose_utente on fanta_rose(utente_id, stagione_id);
create index idx_fanta_rose_slot on fanta_rose(utente_id, stagione_id, slot);

-- Vincolo applicativo (verificato a livello di codice, vedi lib/validazioni):
-- per ogni round, ogni utente deve avere esattamente 1 pilota per slot attivo
-- (7 slot totali: 2 moto3 + 2 moto2 + 3 motogp), senza sovrapposizioni di
-- valido_da_round/valido_a_round sullo stesso slot.

-- ----------------------------------------------------------------------------
-- 3. FORMAZIONI SETTIMANALI
-- ----------------------------------------------------------------------------

-- Una riga per ogni weekend di gara (= evento) e ogni utente: i piloti schierati.
create table fanta_formazioni (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references fanta_utenti(id) on delete cascade,
  evento_id uuid not null references motogp_eventi(id) on delete cascade,
  pilota_moto3_id uuid references motogp_piloti(id),
  pilota_moto2_id uuid references motogp_piloti(id),
  pilota_motogp_1_id uuid references motogp_piloti(id),
  pilota_motogp_2_id uuid references motogp_piloti(id),
  -- true se questa formazione è stata copiata automaticamente dal weekend precedente
  -- perché l'utente non ha schierato in tempo
  auto_riproposta boolean not null default false,
  bloccata boolean not null default false, -- true dopo il via della gara Moto3 (lock automatico)
  modificata_il timestamptz not null default now(),
  creato_il timestamptz not null default now(),
  unique (utente_id, evento_id)
);

create index idx_fanta_formazioni_evento on fanta_formazioni(evento_id);
create index idx_fanta_formazioni_utente on fanta_formazioni(utente_id);

-- ----------------------------------------------------------------------------
-- 4. PUNTEGGI CALCOLATI (cache di calcolo, ricostruibile dai risultati ufficiali)
-- ----------------------------------------------------------------------------

-- Punteggio del fantamotociclista per ogni weekend, scomposto per trasparenza:
-- in caso di contestazioni si vede esattamente da dove arriva ogni punto.
create table fanta_punteggi_weekend (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references fanta_utenti(id) on delete cascade,
  evento_id uuid not null references motogp_eventi(id) on delete cascade,

  -- dettaglio gara principale (piloti schierati)
  punti_moto3_gara numeric(5,1) not null default 0,
  punti_moto2_gara numeric(5,1) not null default 0,
  punti_motogp1_gara numeric(5,1) not null default 0,
  punti_motogp2_gara numeric(5,1) not null default 0,

  -- dettaglio sprint MotoGP (sempre i 2 migliori dell'INTERA rosa MotoGP, non solo schierati)
  sprint_pilota1_id uuid references motogp_piloti(id),
  sprint_pilota1_punti numeric(5,1) not null default 0,
  sprint_pilota2_id uuid references motogp_piloti(id),
  sprint_pilota2_punti numeric(5,1) not null default 0,

  totale_weekend numeric(6,1) not null default 0,

  -- traccia se il calcolo è stato corretto manualmente dall'admin
  modificato_manualmente boolean not null default false,
  note_admin text,

  calcolato_il timestamptz not null default now(),
  unique (utente_id, evento_id)
);

create index idx_fanta_punteggi_utente on fanta_punteggi_weekend(utente_id);
create index idx_fanta_punteggi_evento on fanta_punteggi_weekend(evento_id);

-- ----------------------------------------------------------------------------
-- 5. LOG DI SINCRONIZZAZIONE (per debug e trasparenza sullo stato dei job)
-- ----------------------------------------------------------------------------

create table sync_log (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('calendario', 'piloti', 'risultati', 'manuale')),
  esito text not null check (esito in ('successo', 'errore', 'parziale')),
  dettaglio text,
  eventi_aggiornati integer default 0,
  eseguito_il timestamptz not null default now()
);

create index idx_sync_log_eseguito on sync_log(eseguito_il desc);

-- ----------------------------------------------------------------------------
-- 6. TABELLA PUNTI UFFICIALI (configurabile, default = punti Mondiale reali)
-- ----------------------------------------------------------------------------

create table config_punti (
  id uuid primary key default gen_random_uuid(),
  tipo_sessione text not null check (tipo_sessione in ('gara', 'sprint')),
  posizione integer not null,
  punti numeric(5,1) not null,
  unique (tipo_sessione, posizione)
);

-- Punti GARA ufficiali MotoGP/Moto2/Moto3 (primi 15 classificati)
insert into config_punti (tipo_sessione, posizione, punti) values
  ('gara', 1, 25), ('gara', 2, 20), ('gara', 3, 16), ('gara', 4, 13), ('gara', 5, 11),
  ('gara', 6, 10), ('gara', 7, 9), ('gara', 8, 8), ('gara', 9, 7), ('gara', 10, 6),
  ('gara', 11, 5), ('gara', 12, 4), ('gara', 13, 3), ('gara', 14, 2), ('gara', 15, 1);

-- Punti SPRINT ufficiali MotoGP (solo classe regina ha la sprint, primi 9 classificati)
insert into config_punti (tipo_sessione, posizione, punti) values
  ('sprint', 1, 12), ('sprint', 2, 9), ('sprint', 3, 7), ('sprint', 4, 6),
  ('sprint', 5, 5), ('sprint', 6, 4), ('sprint', 7, 3), ('sprint', 8, 2), ('sprint', 9, 1);

-- ----------------------------------------------------------------------------
-- 7. TRIGGER: aggiorna automaticamente "aggiornato_il"
-- ----------------------------------------------------------------------------

create or replace function trigger_set_timestamp()
returns trigger as $$
begin
  new.aggiornato_il = now();
  return new;
end;
$$ language plpgsql;

create trigger set_timestamp_motogp_eventi
  before update on motogp_eventi
  for each row execute procedure trigger_set_timestamp();

create trigger set_timestamp_motogp_sessioni
  before update on motogp_sessioni
  for each row execute procedure trigger_set_timestamp();

create trigger set_timestamp_motogp_piloti
  before update on motogp_piloti
  for each row execute procedure trigger_set_timestamp();

create trigger set_timestamp_motogp_risultati
  before update on motogp_risultati
  for each row execute procedure trigger_set_timestamp();

create trigger set_timestamp_fanta_utenti
  before update on fanta_utenti
  for each row execute procedure trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- 8. VISTA: classifica generale (somma di tutti i punteggi weekend per utente)
-- ----------------------------------------------------------------------------

create or replace view vista_classifica_generale as
select
  u.id as utente_id,
  u.username,
  u.nome_squadra,
  u.colore_primario,
  u.colore_secondario,
  u.numero_gara,
  coalesce(sum(p.totale_weekend), 0) as punti_totali,
  count(p.id) as weekend_disputati
from fanta_utenti u
left join fanta_punteggi_weekend p on p.utente_id = u.id
where u.attivo = true and u.ruolo = 'utente'
group by u.id, u.username, u.nome_squadra, u.colore_primario, u.colore_secondario, u.numero_gara
order by punti_totali desc;

-- ----------------------------------------------------------------------------
-- 9. FUNZIONE: rosa attiva di un utente per un determinato round
-- ----------------------------------------------------------------------------
-- Restituisce esattamente i 7 piloti posseduti da un utente in un certo round,
-- tenendo conto di eventuali sostituzioni admin avvenute nel tempo.
-- Usata sia dalla UI di formazione (cosa posso schierare?) sia dal motore di
-- calcolo punteggi (chi era davvero in rosa quel weekend?).

create or replace function fn_rosa_attiva(p_utente_id uuid, p_stagione_id uuid, p_round integer)
returns table (
  slot text,
  pilota_id uuid,
  categoria_id uuid,
  nome_completo text,
  numero integer,
  url_foto text,
  colore_team text,
  testo_colore_team text
) as $$
  select r.slot, r.pilota_id, r.categoria_id, p.nome_completo, p.numero, p.url_foto,
         p.colore_team, p.testo_colore_team
  from fanta_rose r
  join motogp_piloti p on p.id = r.pilota_id
  where r.utente_id = p_utente_id
    and r.stagione_id = p_stagione_id
    and r.valido_da_round <= p_round
    and (r.valido_a_round is null or r.valido_a_round >= p_round)
$$ language sql stable;
