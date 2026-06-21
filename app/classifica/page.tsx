'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PaginaProtetta } from '@/components/pagina-protetta';
import { useAuth } from '@/components/auth-provider';

interface RigaClassifica {
  utente_id: string;
  username: string;
  nome_squadra: string;
  colore_primario: string;
  colore_secondario: string;
  numero_gara: number | null;
  punti_totali: number;
  weekend_disputati: number;
  posizione_precedente: number | null;
}

function IndicatoreTrend({ posizioneAttuale, posizionePrecedente }: { posizioneAttuale: number; posizionePrecedente: number | null }) {
  // Nessun dato di confronto (es. primo weekend della stagione): nessuna freccia,
  // per non mostrare un trend fittizio.
  if (posizionePrecedente === null) return <span className="w-4 shrink-0" aria-hidden="true" />;

  const differenza = posizionePrecedente - posizioneAttuale;
  if (differenza === 0) {
    return (
      <span className="w-4 text-center shrink-0 text-asfalto-600 text-xs" aria-label="Posizione invariata">
        <i className="ti ti-minus" aria-hidden="true" />
      </span>
    );
  }
  const salito = differenza > 0;
  return (
    <span
      className={`w-4 text-center shrink-0 text-xs ${salito ? 'text-bandiera-verde' : 'text-bandiera-rosso'}`}
      aria-label={salito ? `Salito di ${differenza} posizioni` : `Sceso di ${Math.abs(differenza)} posizioni`}
    >
      <i className={`ti ${salito ? 'ti-chevron-up' : 'ti-chevron-down'}`} aria-hidden="true" />
    </span>
  );
}

function PaginaClassificaInterna() {
  const { utente } = useAuth();
  const [classifica, setClassifica] = useState<RigaClassifica[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/classifica', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.errore) {
          setErrore(data.errore);
          return;
        }
        setClassifica(data.classifica ?? []);
      })
      .catch(() => setErrore('Errore di connessione.'));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Classifica generale</h1>
          <p className="text-sm text-asfalto-400 mt-0.5">Aggiornata automaticamente dopo ogni weekend</p>
        </div>
        <Link
          href="/calendario"
          className="text-sm text-asfalto-300 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors"
        >
          Per weekend <i className="ti ti-chevron-right text-base" aria-hidden="true" />
        </Link>
      </div>

      {errore && (
        <div className="rounded-2xl bg-bandiera-rosso/10 border border-bandiera-rosso/30 px-4 py-3 text-sm">
          {errore}
        </div>
      )}

      {!classifica && !errore && (
        <div className="text-asfalto-400 text-sm flex items-center gap-2 py-12 justify-center">
          <i className="ti ti-loader-2 animate-spin" aria-hidden="true" />
          Caricamento classifica…
        </div>
      )}

      {classifica && classifica.length === 0 && (
        <div className="text-center py-12 text-asfalto-400 text-sm">
          Nessun fantamotociclista ancora iscritto, oppure nessun weekend ancora disputato.
        </div>
      )}

      {classifica && classifica.length > 0 && (
        <ol className="space-y-2">
          {classifica.map((riga, indice) => {
            const posizione = indice + 1;
            const sonIo = riga.utente_id === utente?.id;
            return (
              <li
                key={riga.utente_id}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-colors ${
                  sonIo ? 'bg-bandiera-giallo/10 border-bandiera-giallo/40' : 'bg-asfalto-800 border-white/10'
                }`}
              >
                <span
                  className={`numero-gara text-lg w-7 text-center shrink-0 ${
                    posizione === 1
                      ? 'text-bandiera-giallo'
                      : posizione === 2
                      ? 'text-asfalto-200'
                      : posizione === 3
                      ? 'text-amber-700'
                      : 'text-asfalto-500'
                  }`}
                >
                  {posizione}
                </span>

                <IndicatoreTrend posizioneAttuale={posizione} posizionePrecedente={riga.posizione_precedente} />

                <span
                  className="numero-gara text-base w-10 text-center shrink-0 rounded-lg py-0.5"
                  style={{
                    color: riga.colore_primario,
                    backgroundColor: `${riga.colore_primario}1A`,
                  }}
                >
                  {riga.numero_gara ?? '–'}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {riga.nome_squadra}
                    {sonIo && <span className="text-asfalto-500 font-normal"> (tu)</span>}
                  </p>
                  <p className="text-xs text-asfalto-500 truncate">
                    {riga.username} · {riga.weekend_disputati} weekend disputati
                  </p>
                </div>

                <span className="numero-gara text-xl shrink-0">{riga.punti_totali}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default function PaginaClassifica() {
  return (
    <PaginaProtetta>
      <PaginaClassificaInterna />
    </PaginaProtetta>
  );
}
