-- ============================================================================
-- 0003: l'account admin compete anche lui in classifica
-- ============================================================================
-- Deciso con Gabriele il 22/08/2026: l'admin non è solo un account
-- gestionale, ha una sua rosa e i suoi punti devono comparire in classifica
-- come chiunque altro. Fino a questa migrazione vista_classifica_generale
-- escludeva esplicitamente `ruolo = 'utente'`, quindi anche assegnando una
-- rosa all'admin (via /admin/modifica-utente) i suoi punti non sarebbero
-- MAI comparsi in nessuna classifica generale. Idempotente: rieseguibile
-- senza effetti collaterali.
-- ============================================================================

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
where u.attivo = true
group by u.id, u.username, u.nome_squadra, u.colore_primario, u.colore_secondario, u.numero_gara, u.stelle_mondiali
order by punti_totali desc;

-- Nota: /api/classifica/categoria/route.ts è stato aggiornato in parallelo
-- (rimosso lo stesso filtro .eq('ruolo', 'utente') lato applicazione), così
-- anche le classifiche per singola categoria (MotoGP/Moto2/Moto3) includono
-- l'admin in modo coerente con questa vista.
