'use client';

import { useEffect, useState } from 'react';

function formattaResiduo(msResidui: number): string {
  if (msResidui <= 0) return 'Schieramento chiuso';
  const totSec = Math.floor(msResidui / 1000);
  const giorni = Math.floor(totSec / 86400);
  const ore = Math.floor((totSec % 86400) / 3600);
  const minuti = Math.floor((totSec % 3600) / 60);
  const secondi = totSec % 60;

  if (giorni > 0) return `${giorni}g ${ore}h ${minuti}m`;
  if (ore > 0) return `${ore}h ${minuti}m ${secondi}s`;
  return `${minuti}m ${secondi}s`;
}

export function CountdownDeadline({
  deadline,
  inizioWeekend,
}: {
  deadline: string | null;
  inizioWeekend?: string | null;
}) {
  const [adesso, setAdesso] = useState<number>(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setAdesso(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!deadline) {
    return (
      <div className="rounded-2xl bg-asfalto-800 border border-white/10 px-4 py-3 text-sm text-asfalto-300 flex items-center gap-2">
        <i className="ti ti-clock-question text-base" aria-hidden="true" />
        Orario della gara Moto3 non ancora disponibile dal calendario ufficiale.
      </div>
    );
  }

  const msResidui = new Date(deadline).getTime() - adesso;
  const chiuso = msResidui <= 0;
  const urgente = !chiuso && msResidui < 1000 * 60 * 60 * 3; // sotto le 3 ore

  const dataLeggibile = new Date(deadline).toLocaleString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Il weekend non è ancora iniziato (inizioWeekend è nel futuro): mostriamo
  // un piccolo richiamo informativo in più, senza che questo blocchi nulla.
  const weekendNonAncoraIniziato =
    inizioWeekend && !chiuso && new Date(inizioWeekend).getTime() > adesso;
  const dataInizioLeggibile = weekendNonAncoraIniziato
    ? new Date(inizioWeekend!).toLocaleString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      role={urgente ? 'alert' : undefined}
      className={`rounded-2xl px-4 py-3.5 border ${
        chiuso
          ? 'bg-asfalto-800 border-white/10 text-asfalto-400'
          : urgente
          ? 'bg-bandiera-rosso/15 border-bandiera-rosso/40 text-white'
          : 'bg-bandiera-giallo/10 border-bandiera-giallo/30 text-white'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <i
            className={`ti ${chiuso ? 'ti-lock' : 'ti-clock'} text-xl ${
              urgente ? 'text-bandiera-rosso' : chiuso ? 'text-asfalto-500' : 'text-bandiera-giallo'
            }`}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium">
              {chiuso ? 'Schieramento chiuso' : 'Schieramento aperto'}
            </p>
            <p className="text-xs text-asfalto-300 mt-0.5">
              {chiuso ? 'La gara Moto3 è già partita' : `Si chiude alla partenza Moto3 · ${dataLeggibile}`}
            </p>
          </div>
        </div>
        {!chiuso && (
          <div className="numero-gara text-lg whitespace-nowrap" style={{ color: urgente ? '#E10600' : '#FFD400' }}>
            {formattaResiduo(msResidui)}
          </div>
        )}
      </div>

      {weekendNonAncoraIniziato && (
        <p className="text-xs text-asfalto-400 mt-2.5 pt-2.5 border-t border-white/10 flex items-center gap-1.5">
          <i className="ti ti-flag-2 text-sm" aria-hidden="true" />
          Il weekend inizia {dataInizioLeggibile}
        </p>
      )}
    </div>
  );
}
