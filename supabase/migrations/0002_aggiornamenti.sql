-- ============================================================================
-- FANTAGP - AGGIORNAMENTI SCHEMA (da eseguire su un progetto Supabase che ha
-- già eseguito 0001_init.sql nella sua versione precedente)
-- ============================================================================
-- Idempotente: sicuro da rieseguire più volte. Applica in sequenza:
--   1. Rosa 3+3+3: nuovi slot moto3_c e moto2_c (erano 2+2+3)
--   2. Stelle mondiali (fanta_utenti.stelle_mondiali)
--   3. Flag test pre-stagionali (motogp_eventi.e_test)
--   4. Tipo sessione RAC2 (gara ripartita dopo bandiera rossa)
--   5. Vista classifica generale aggiornata con stelle_mondiali
-- ============================================================================

-- 1. Rosa 3+3+3 -----------------------------------------------------------
alter table fanta_rose drop constraint if exists fanta_rose_slot_check;
alter table fanta_rose add constraint fanta_rose_slot_check
  check (slot in (
    'moto3_a','moto3_b','moto3_c','moto2_a','moto2_b','moto2_c','motogp_a','motogp_b','motogp_c'
  ));

-- 2. Stelle mondiali --------------------------------------------------------
alter table fanta_utenti add column if not exists stelle_mondiali integer not null default 0;

-- 3. Test pre-stagionali ------------------------------------------------
alter table motogp_eventi add column if not exists e_test boolean not null default false;

-- 4. RAC2 --------------------------------------------------------------------
alter table motogp_sessioni drop constraint if exists motogp_sessioni_tipo_check;
alter table motogp_sessioni add constraint motogp_sessioni_tipo_check
  check (tipo in ('FP1','FP2','FP3','FP4','PR','Q1','Q2','SPR','RAC','RAC2','WUP'));

-- 5. Vista classifica generale -----------------------------------------------
create or replace view vista_classifica_generale as
select
  u.id as utente_id,
  u.username,
  u.nome_squadra,
  u.colore_primario,
  u.colore_secondario,
  u.numero_gara,
  u.stelle_mondiali,
  coalesce(sum(p.totale_weekend), 0) as punti_totali,
  count(p.id) as weekend_disputati
from fanta_utenti u
left join fanta_punteggi_weekend p on p.utente_id = u.id
where u.attivo = true and u.ruolo = 'utente'
group by u.id, u.username, u.nome_squadra, u.colore_primario, u.colore_secondario, u.numero_gara, u.stelle_mondiali
order by punti_totali desc;

-- ============================================================================
-- NOTA IMPORTANTE per gli utenti già creati prima di questa migration:
-- avranno una rosa da 7 piloti (senza moto3_c/moto2_c). Vai su
-- /admin/modifica-utente per ciascuno e assegna il pilota mancante nei nuovi
-- slot Moto3 C e Moto2 C, altrimenti lo schieramento formazione continuerà a
-- funzionare (usa solo 1 Moto3 + 1 Moto2) ma la rosa risulterà incompleta.
-- ============================================================================
