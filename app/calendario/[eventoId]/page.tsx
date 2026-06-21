'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PaginaProtetta } from '@/components/pagina-protetta';

interface PilotaRif {
  nome_completo: string;
  colore_team: string | null;
  url_foto: string | null;
}

interface PunteggioRiga {
  utente_id: string;
  utente: { username: string; nome_squadra: string; colore_primario: string; numero_gara: number | null };
  punti_moto3_gara: number;
  punti_moto2_gara: number;
  punti_motogp1_gara: number;
  punti_motogp2_gara: number;
  sprint_pilota1_punti: number;
  sprint_pilota2_punti: number;
  sprint_pilota1?: PilotaRif | null;
  sprint_pilota2?: PilotaRif | null;
  formazione?: {
    moto3?: PilotaRif | null;
    moto2?: PilotaRif | null;
    motogp1?: PilotaRif | null;
    motogp2?: PilotaRif | null;
  } | null;
  totale_weekend: number;
  modificato_manualmente: boolean;
}

const COLORE_FALLBACK = '#71808a';

function RigaCasella({ etichetta, pilota, punti }: { etichetta: string; pilota?: PilotaRif | null; punti: number }) {
  const colore = pilota?.colore_team || COLORE_FALLBACK;
  return (
    <div className="flex items-center gap-2.5 bg-asfalto-900/60 rounded-xl px-3 py-2.5">
      <span
        className="w-1.5 h-8 rounded-full shrink-0"
        style={{ backgroundColor: pilota ? colore : 'transparent' }}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-asfalto-500">{etichetta}</p>
        <p className="text-xs text-asfalto-200 truncate">{pilota?.nome_completo ?? '— nessuno schierato'}</p>
      </div>
      <span className="numero-gara text-sm shrink-0">{punti}</span>
    </div>
  );
}

function RigaPunteggio({ riga, indice }: { riga: PunteggioRiga; indice: number }) {
  const [espanso, setEspanso] = useState(false);
  const puntiGaraTot =
    riga.punti_moto3_gara + riga.punti_moto2_gara + riga.punti_motogp1_gara + riga.punti_motogp2_gara;
  const puntiSprintTot = riga.sprint_pilota1_punti + riga.sprint_pilota2_punti;
  const podio = indice < 3;

  return (
    <li
      className={`rounded-2xl border overflow-hidden transition-colors ${
        podio ? 'bg-asfalto-800 border-white/15' : 'bg-asfalto-800/60 border-white/10'
      }`}
    >
      <button
        type="button"
        onClick={() => setEspanso((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-white/[0.03] transition-colors"
      >
        <span
          className={`numero-gara text-lg w-7 text-center shrink-0 ${
            indice === 0
              ? 'text-bandiera-giallo'
              : indice === 1
              ? 'text-asfalto-200'
              : indice === 2
              ? 'text-amber-700'
              : 'text-asfalto-500'
          }`}
        >
          {indice + 1}
        </span>
        <span
          className="numero-gara text-base w-10 text-center shrink-0 rounded-lg py-0.5"
          style={{ color: riga.utente.colore_primario, backgroundColor: `${riga.utente.colore_primario}1A` }}
        >
          {riga.utente.numero_gara ?? '–'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{riga.utente.nome_squadra}</p>
          {riga.modificato_manualmente && (
            <p className="text-[11px] text-bandiera-giallo flex items-center gap-1 mt-0.5">
              <i className="ti ti-edit text-xs" aria-hidden="true" />
              Corretto dall&apos;admin
            </p>
          )}
        </div>
        <span className="numero-gara text-xl shrink-0">{riga.totale_weekend}</span>
        <i
          className={`ti ti-chevron-down text-asfalto-500 shrink-0 transition-transform duration-200 ${
            espanso ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {espanso && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-white/10">
          <div>
            <p className="text-xs uppercase tracking-wide text-asfalto-500 mb-2">
              Gara · {puntiGaraTot} pt
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <RigaCasella etichetta="Moto3" pilota={riga.formazione?.moto3} punti={riga.punti_moto3_gara} />
              <RigaCasella etichetta="Moto2" pilota={riga.formazione?.moto2} punti={riga.punti_moto2_gara} />
              <RigaCasella etichetta="MotoGP" pilota={riga.formazione?.motogp1} punti={riga.punti_motogp1_gara} />
              <RigaCasella etichetta="MotoGP" pilota={riga.formazione?.motogp2} punti={riga.punti_motogp2_gara} />
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-asfalto-500 mb-2">
              Sprint MotoGP · 2 migliori della rosa · {puntiSprintTot} pt
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <RigaCasella etichetta="1°" pilota={riga.sprint_pilota1} punti={riga.sprint_pilota1_punti} />
              <RigaCasella etichetta="2°" pilota={riga.sprint_pilota2} punti={riga.sprint_pilota2_punti} />
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

function PaginaDettaglioWeekendInterna() {
  const params = useParams<{ eventoId: string }>();
  const [evento, setEvento] = useState<{ nome: string; numero_round: number | null } | null>(null);
  const [punteggi, setPunteggi] = useState<PunteggioRiga[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/classifica/weekend/${params.eventoId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.errore) {
          setErrore(data.errore);
          return;
        }
        setEvento(data.evento);
        setPunteggi(data.punteggi ?? []);
      })
      .catch(() => setErrore('Errore di connessione.'));
  }, [params.eventoId]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-asfalto-500 mb-1">
          {evento?.numero_round ? `Round ${evento.numero_round}` : 'Dettaglio weekend'}
        </p>
        <h1 className="font-display text-2xl font-semibold">{evento?.nome ?? 'Caricamento…'}</h1>
      </div>

      {errore && (
        <div className="rounded-2xl bg-bandiera-rosso/10 border border-bandiera-rosso/30 px-4 py-3 text-sm">
          {errore}
        </div>
      )}

      {!punteggi && !errore && (
        <div className="text-asfalto-400 text-sm flex items-center gap-2 py-12 justify-center">
          <i className="ti ti-loader-2 animate-spin" aria-hidden="true" />
          Caricamento punteggi…
        </div>
      )}

      {punteggi && punteggi.length === 0 && (
        <div className="text-center py-12 text-asfalto-400 text-sm">
          Punteggi non ancora disponibili per questo weekend.
        </div>
      )}

      {punteggi && punteggi.length > 0 && (
        <ul className="space-y-2">
          {punteggi.map((riga, indice) => (
            <RigaPunteggio key={riga.utente_id} riga={riga} indice={indice} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PaginaDettaglioWeekend() {
  return (
    <PaginaProtetta>
      <PaginaDettaglioWeekendInterna />
    </PaginaProtetta>
  );
}
