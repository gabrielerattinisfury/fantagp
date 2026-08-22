'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PaginaProtetta } from '@/components/pagina-protetta';
import type { MotogpEvento } from '@/lib/tipi';

const ETICHETTA_STATO: Record<string, { testo: string; classe: string }> = {
  programmato: { testo: 'Da disputare', classe: 'text-asfalto-400 bg-asfalto-700' },
  in_corso: { testo: 'In corso', classe: 'text-bandiera-giallo bg-bandiera-giallo/15' },
  concluso: { testo: 'Concluso', classe: 'text-bandiera-verde bg-bandiera-verde/15' },
  annullato: { testo: 'Annullato', classe: 'text-bandiera-rosso bg-bandiera-rosso/15' },
  rinviato: { testo: 'Rinviato', classe: 'text-bandiera-giallo bg-bandiera-giallo/15' },
};

// Range di date leggibile per il weekend di gara: "23–25 gen" se nello stesso
// mese, "30 gen – 1 feb" se lo attraversa. Se manca la data di fine, mostra
// solo il giorno di inizio.
function rangeDateWeekend(dataInizio: string | null, dataFine: string | null): string {
  if (!dataInizio) return '';
  const inizio = new Date(dataInizio);
  if (!dataFine) {
    return inizio.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  }
  const fine = new Date(dataFine);
  const stessoMese = inizio.getMonth() === fine.getMonth() && inizio.getFullYear() === fine.getFullYear();
  const giornoInizio = inizio.toLocaleDateString('it-IT', { day: 'numeric' });
  const fineFormattata = fine.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  return stessoMese ? `${giornoInizio}–${fineFormattata}` : `${inizio.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} – ${fineFormattata}`;
}

function PaginaCalendarioInterna() {
  const [eventi, setEventi] = useState<MotogpEvento[] | null>(null);
  const [annoStagione, setAnnoStagione] = useState<number | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/calendario', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.errore) {
          setErrore(data.errore);
          return;
        }
        setEventi(data.eventi ?? []);
        setAnnoStagione(data.stagione?.anno ?? null);
      })
      .catch(() => setErrore('Errore di connessione.'));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          Calendario {annoStagione ?? ''}
        </h1>
        <p className="text-sm text-asfalto-400 mt-0.5">
          Tocca un weekend concluso per vedere il dettaglio punti di tutti i fantamotociclisti
        </p>
      </div>

      {errore && (
        <div className="rounded-2xl bg-bandiera-rosso/10 border border-bandiera-rosso/30 px-4 py-3 text-sm">
          {errore}
        </div>
      )}

      {!eventi && !errore && (
        <div className="text-asfalto-400 text-sm flex items-center gap-2 py-12 justify-center">
          <i className="ti ti-loader-2 animate-spin" aria-hidden="true" />
          Caricamento calendario…
        </div>
      )}

      {eventi && (
        <ul className="space-y-2">
          {eventi.map((evento) => {
            const stato = ETICHETTA_STATO[evento.stato] ?? ETICHETTA_STATO.programmato;
            const cliccabile = evento.stato === 'concluso' || evento.stato === 'in_corso';
            const range = rangeDateWeekend(evento.data_inizio, evento.data_fine);
            const contenuto = (
              <div
                className={`glass-hover flex items-center gap-4 rounded-2xl px-4 py-3.5 ${
                  cliccabile ? 'glass' : 'bg-white/[0.02] border border-white/10'
                }`}
              >
                <span className="numero-gara text-lg w-8 text-center shrink-0 text-asfalto-500">
                  {evento.numero_round ?? '–'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug break-words">{evento.nome}</p>
                  <p className="text-xs text-asfalto-500 truncate mt-0.5">
                    {evento.circuito}
                    {evento.paese ? ` · ${evento.paese}` : ''}
                  </p>
                  {range && (
                    <p className="text-[11px] text-asfalto-600 mt-0.5 flex items-center gap-1">
                      <i className="ti ti-calendar-event text-xs" aria-hidden="true" />
                      {range}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${stato.classe}`}>
                  {stato.testo}
                </span>
                {cliccabile && <i className="ti ti-chevron-right text-asfalto-500 shrink-0" aria-hidden="true" />}
              </div>
            );

            return (
              <li key={evento.id}>
                {cliccabile ? (
                  <Link href={`/calendario/${evento.id}`}>{contenuto}</Link>
                ) : (
                  contenuto
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function PaginaCalendario() {
  return (
    <PaginaProtetta>
      <PaginaCalendarioInterna />
    </PaginaProtetta>
  );
}
