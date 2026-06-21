'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { PaginaProtetta } from '@/components/pagina-protetta';

interface UtenteAdmin {
  id: string;
  username: string;
  nome_squadra: string;
  colore_primario: string;
  numero_gara: number | null;
  ruolo: string;
  attivo: boolean;
}

interface VoceSyncLog {
  id: string;
  tipo: string;
  esito: 'successo' | 'errore' | 'parziale';
  dettaglio: string;
  eventi_aggiornati: number;
  eseguito_il: string;
}

interface DatiAdmin {
  stagione: { id: string; anno: number } | null;
  utenti: UtenteAdmin[];
  syncLog: VoceSyncLog[];
}

const STILE_ESITO: Record<string, string> = {
  successo: 'text-bandiera-verde bg-bandiera-verde/15',
  errore: 'text-bandiera-rosso bg-bandiera-rosso/15',
  parziale: 'text-bandiera-giallo bg-bandiera-giallo/15',
};

function PaginaAdminInterna() {
  const [dati, setDati] = useState<DatiAdmin | null>(null);
  const [sincronizzando, setSincronizzando] = useState(false);
  const [messaggioSync, setMessaggioSync] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const carica = useCallback(async () => {
    const res = await fetch('/api/admin/dati', { cache: 'no-store' });
    const data = await res.json();
    if (res.ok) setDati(data);
    else setErrore(data.errore);
  }, []);

  useEffect(() => {
    carica();
  }, [carica]);

  async function handleSync() {
    setSincronizzando(true);
    setMessaggioSync(null);
    setErrore(null);
    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setErrore(data.errore ?? 'Sincronizzazione fallita.');
        return;
      }
      setMessaggioSync(
        `Calendario: ${data.sync.calendario.dettaglio} · Sessioni: ${data.sync.sessioni.dettaglio} · Risultati: ${data.sync.risultati.dettaglio}`
      );
      await carica();
    } catch {
      setErrore('Errore di connessione durante la sincronizzazione.');
    } finally {
      setSincronizzando(false);
    }
  }

  async function handleToggleAttivo(utenteId: string, attivoAttuale: boolean) {
    await fetch('/api/admin/override/utente', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ utenteId, attivo: !attivoAttuale }),
    });
    await carica();
  }

  if (!dati) {
    return (
      <div className="text-asfalto-400 text-sm flex items-center gap-2 py-12 justify-center">
        <i className="ti ti-loader-2 animate-spin" aria-hidden="true" />
        Caricamento pannello admin…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-semibold">Pannello amministratore</h1>
          <p className="text-sm text-asfalto-400 mt-0.5">
            Gestione operativa della lega · Stagione {dati.stagione?.anno ?? '—'}
          </p>
        </div>
        <Link
          href="/admin/override"
          className="text-sm flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-bandiera-rosso/40 text-bandiera-rosso hover:bg-bandiera-rosso/10 transition-colors"
        >
          <i className="ti ti-alert-triangle text-base" aria-hidden="true" />
          Pannello override (uso eccezionale)
        </Link>
      </div>

      {/* Sincronizzazione */}
      <section className="rounded-2xl border border-white/10 bg-asfalto-850 p-5">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="font-display font-semibold">Sincronizzazione dati MotoGP</h2>
          <button
            onClick={handleSync}
            disabled={sincronizzando}
            className="text-sm bg-bandiera-rosso hover:bg-red-600 disabled:opacity-50 transition-colors text-white font-medium rounded-lg px-4 py-2 flex items-center gap-2 shrink-0"
          >
            <i className={`ti ti-refresh ${sincronizzando ? 'animate-spin' : ''}`} aria-hidden="true" />
            {sincronizzando ? 'Sincronizzo…' : 'Sincronizza ora'}
          </button>
        </div>
        <p className="text-sm text-asfalto-400 mb-4">
          In automatico avviene ogni 15 minuti. Usa questo pulsante per forzare un aggiornamento immediato.
        </p>

        {messaggioSync && (
          <p className="text-sm bg-asfalto-900/60 rounded-lg px-3 py-2 mb-3 text-asfalto-300">{messaggioSync}</p>
        )}
        {errore && (
          <p className="text-sm text-bandiera-rosso bg-bandiera-rosso/10 border border-bandiera-rosso/30 rounded-lg px-3 py-2 mb-3">
            {errore}
          </p>
        )}

        <div className="space-y-1.5">
          {dati.syncLog.slice(0, 6).map((voce) => (
            <div key={voce.id} className="flex items-center gap-3 text-xs text-asfalto-400">
              <span className={`px-2 py-0.5 rounded-full font-medium ${STILE_ESITO[voce.esito]}`}>
                {voce.esito}
              </span>
              <span className="capitalize">{voce.tipo}</span>
              <span className="flex-1 truncate">{voce.dettaglio}</span>
              <span className="shrink-0">
                {new Date(voce.eseguito_il).toLocaleString('it-IT', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Fantamotociclisti */}
      <section className="rounded-2xl border border-white/10 bg-asfalto-850 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-display font-semibold">Fantamotociclisti ({dati.utenti.length})</h2>
          <Link
            href="/admin/nuovo-utente"
            className="text-sm bg-asfalto-700 hover:bg-asfalto-600 transition-colors text-white font-medium rounded-lg px-4 py-2 flex items-center gap-2"
          >
            <i className="ti ti-plus" aria-hidden="true" />
            Nuovo fantamotociclista
          </Link>
        </div>

        <ul className="space-y-2">
          {dati.utenti
            .filter((u) => u.ruolo === 'utente')
            .map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-asfalto-900/50 px-4 py-3"
              >
                <span
                  className="numero-gara text-base w-10 text-center shrink-0 rounded-md py-0.5"
                  style={{ color: u.colore_primario, backgroundColor: `${u.colore_primario}1A` }}
                >
                  {u.numero_gara ?? '–'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.nome_squadra}</p>
                  <p className="text-xs text-asfalto-500 truncate">@{u.username}</p>
                </div>
                {!u.attivo && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-asfalto-700 text-asfalto-400 shrink-0">
                    Disattivato
                  </span>
                )}
                <button
                  onClick={() => handleToggleAttivo(u.id, u.attivo)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors shrink-0"
                >
                  {u.attivo ? 'Disattiva' : 'Riattiva'}
                </button>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

export default function PaginaAdmin() {
  return (
    <PaginaProtetta soloAdmin>
      <PaginaAdminInterna />
    </PaginaProtetta>
  );
}
