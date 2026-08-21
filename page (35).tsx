'use client';

import { useEffect, useState } from 'react';
import { PaginaProtetta } from '@/components/pagina-protetta';

interface UtenteRif {
  id?: string;
  username: string;
  nome_squadra: string;
  colore_primario: string;
  numero_gara?: number | null;
}

interface DatiStatistiche {
  stagione: { anno: number };
  weekendDisputati: number;
  weekendMigliore: {
    utente: UtenteRif | null;
    evento: { nome: string; numero_round: number | null } | null;
    punti: number;
  } | null;
  mediaPuntiPerUtente: { utente: UtenteRif | null; media: number; weekendDisputati: number }[];
  pilotiPiuSchierati: { nome_completo: string; numero: number | null; colore_team: string | null; volte: number }[];
  formazioniDimenticate: { utente: UtenteRif | null; volte: number }[];
}

function CardStatistica({
  icona,
  titolo,
  children,
}: {
  icona: string;
  titolo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-asfalto-850 p-5">
      <h2 className="font-display font-semibold text-sm flex items-center gap-2 mb-4">
        <i className={`ti ${icona} text-bandiera-giallo`} aria-hidden="true" />
        {titolo}
      </h2>
      {children}
    </section>
  );
}

function PaginaStatisticheInterna() {
  const [dati, setDati] = useState<DatiStatistiche | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/statistiche', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.errore) {
          setErrore(data.errore);
          return;
        }
        setDati(data);
      })
      .catch(() => setErrore('Errore di connessione.'));
  }, []);

  if (errore) {
    return (
      <div className="rounded-2xl bg-bandiera-rosso/10 border border-bandiera-rosso/30 px-4 py-3 text-sm">
        {errore}
      </div>
    );
  }

  if (!dati) {
    return (
      <div className="text-asfalto-400 text-sm flex items-center gap-2 py-12 justify-center">
        <i className="ti ti-loader-2 animate-spin" aria-hidden="true" />
        Caricamento statistiche…
      </div>
    );
  }

  if (dati.weekendDisputati === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Statistiche {dati.stagione.anno}</h1>
        </div>
        <div className="text-center py-12 text-asfalto-400 text-sm">
          Nessun weekend ancora concluso: le statistiche compariranno dopo la prima gara.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Statistiche {dati.stagione.anno}</h1>
        <p className="text-sm text-asfalto-400 mt-0.5">
          {dati.weekendDisputati} weekend disputati finora
        </p>
      </div>

      {dati.weekendMigliore && dati.weekendMigliore.utente && (
        <CardStatistica icona="ti-trophy" titolo="Miglior weekend della stagione">
          <div className="flex items-center gap-3">
            <span
              className="numero-gara text-lg w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                color: dati.weekendMigliore.utente.colore_primario,
                backgroundColor: `${dati.weekendMigliore.utente.colore_primario}22`,
              }}
            >
              {dati.weekendMigliore.utente.numero_gara ?? '–'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{dati.weekendMigliore.utente.nome_squadra}</p>
              <p className="text-xs text-asfalto-500 truncate">
                {dati.weekendMigliore.evento
                  ? `Round ${dati.weekendMigliore.evento.numero_round ?? '–'} — ${dati.weekendMigliore.evento.nome}`
                  : ''}
              </p>
            </div>
            <span className="numero-gara text-2xl shrink-0">{dati.weekendMigliore.punti}</span>
          </div>
        </CardStatistica>
      )}

      <CardStatistica icona="ti-chart-bar" titolo="Media punti a weekend">
        <ul className="space-y-2">
          {dati.mediaPuntiPerUtente.map((riga, i) => (
            <li key={riga.utente?.username ?? i} className="flex items-center gap-3">
              <span className="numero-gara text-sm w-6 text-center shrink-0 text-asfalto-500">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{riga.utente?.nome_squadra}</p>
              </div>
              <span className="text-xs text-asfalto-500 shrink-0">{riga.weekendDisputati} weekend</span>
              <span className="numero-gara text-base shrink-0 w-14 text-right">{riga.media}</span>
            </li>
          ))}
        </ul>
      </CardStatistica>

      {dati.pilotiPiuSchierati.length > 0 && (
        <CardStatistica icona="ti-motorbike" titolo="Piloti più schierati dalla lega">
          <ul className="space-y-2">
            {dati.pilotiPiuSchierati.map((p) => (
              <li key={p.nome_completo} className="flex items-center gap-3">
                <span
                  className="w-1.5 h-6 rounded-full shrink-0"
                  style={{ backgroundColor: p.colore_team || '#71808a' }}
                  aria-hidden="true"
                />
                <span className="flex-1 min-w-0 text-sm truncate">
                  {p.numero ? `#${p.numero} ` : ''}
                  {p.nome_completo}
                </span>
                <span className="text-xs text-asfalto-500 shrink-0">{p.volte}x schierato</span>
              </li>
            ))}
          </ul>
        </CardStatistica>
      )}

      {dati.formazioniDimenticate.length > 0 && (
        <CardStatistica icona="ti-alarm-off" titolo="Formazioni dimenticate">
          <p className="text-xs text-asfalto-500 mb-3">
            Weekend in cui la formazione è stata riproposta automaticamente perché non schierata in tempo.
          </p>
          <ul className="space-y-2">
            {dati.formazioniDimenticate.map((riga, i) => (
              <li key={riga.utente?.username ?? i} className="flex items-center gap-3">
                <span className="flex-1 min-w-0 text-sm truncate">{riga.utente?.nome_squadra}</span>
                <span className="text-xs text-bandiera-giallo shrink-0">{riga.volte}x</span>
              </li>
            ))}
          </ul>
        </CardStatistica>
      )}
    </div>
  );
}

export default function PaginaStatistiche() {
  return (
    <PaginaProtetta>
      <PaginaStatisticheInterna />
    </PaginaProtetta>
  );
}
