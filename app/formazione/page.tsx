'use client';

import { useEffect, useState, useCallback } from 'react';
import { PaginaProtetta } from '@/components/pagina-protetta';
import { CountdownDeadline } from '@/components/countdown-deadline';
import { SelettorePiloti } from '@/components/selettore-piloti';
import type { RosaAttivaRiga, FantaFormazione, MotogpEvento } from '@/lib/tipi';

interface RispostaFormazione {
  evento: MotogpEvento;
  rosaAttiva: RosaAttivaRiga[];
  formazione: FantaFormazione | null;
  deadline: string | null;
  inizioWeekend: string | null;
  schieramentoAperto: boolean;
}

function PaginaFormazioneInterna() {
  const [dati, setDati] = useState<RispostaFormazione | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState(false);

  const [moto3Sel, setMoto3Sel] = useState<string[]>([]);
  const [moto2Sel, setMoto2Sel] = useState<string[]>([]);
  const [motoGpSel, setMotoGpSel] = useState<string[]>([]);

  const carica = useCallback(async () => {
    setCaricamento(true);
    setErrore(null);
    try {
      const res = await fetch('/api/formazioni', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setErrore(data.errore ?? 'Errore nel caricamento della formazione.');
        setCaricamento(false);
        return;
      }
      setDati(data);
      setMoto3Sel(data.formazione?.pilota_moto3_id ? [data.formazione.pilota_moto3_id] : []);
      setMoto2Sel(data.formazione?.pilota_moto2_id ? [data.formazione.pilota_moto2_id] : []);
      setMotoGpSel(
        [data.formazione?.pilota_motogp_1_id, data.formazione?.pilota_motogp_2_id].filter(
          (x: string | null): x is string => Boolean(x)
        )
      );
    } catch {
      setErrore('Errore di connessione. Riprova.');
    } finally {
      setCaricamento(false);
    }
  }, []);

  useEffect(() => {
    carica();
  }, [carica]);

  async function handleSalva() {
    if (!dati) return;
    setSalvataggio(true);
    setErrore(null);
    try {
      const res = await fetch('/api/formazioni/salva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventoId: dati.evento.id,
          pilotaMoto3Id: moto3Sel[0],
          pilotaMoto2Id: moto2Sel[0],
          pilotaMotoGp1Id: motoGpSel[0],
          pilotaMotoGp2Id: motoGpSel[1],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrore(data.errore ?? 'Errore nel salvataggio.');
        return;
      }
      await carica();
    } catch {
      setErrore('Errore di connessione. Riprova.');
    } finally {
      setSalvataggio(false);
    }
  }

  if (caricamento) {
    return (
      <div className="text-asfalto-400 text-sm flex items-center gap-2 py-12 justify-center">
        <i className="ti ti-loader-2 animate-spin" aria-hidden="true" />
        Caricamento formazione…
      </div>
    );
  }

  if (errore && !dati) {
    return (
      <div className="rounded-2xl bg-bandiera-rosso/10 border border-bandiera-rosso/30 px-4 py-3 text-sm text-white">
        {errore}
      </div>
    );
  }

  if (!dati) return null;

  const opzioniMoto3 = dati.rosaAttiva
    .filter((r) => r.slot === 'moto3_a' || r.slot === 'moto3_b')
    .map((r) => ({
      pilotaId: r.pilota_id,
      nome: r.nome_completo,
      numero: r.numero,
      urlFoto: r.url_foto,
      coloreTeam: r.colore_team,
    }));
  const opzioniMoto2 = dati.rosaAttiva
    .filter((r) => r.slot === 'moto2_a' || r.slot === 'moto2_b')
    .map((r) => ({
      pilotaId: r.pilota_id,
      nome: r.nome_completo,
      numero: r.numero,
      urlFoto: r.url_foto,
      coloreTeam: r.colore_team,
    }));
  const opzioniMotoGp = dati.rosaAttiva
    .filter((r) => r.slot === 'motogp_a' || r.slot === 'motogp_b' || r.slot === 'motogp_c')
    .map((r) => ({
      pilotaId: r.pilota_id,
      nome: r.nome_completo,
      numero: r.numero,
      urlFoto: r.url_foto,
      coloreTeam: r.colore_team,
    }));

  const formazioneCompleta = moto3Sel.length === 1 && moto2Sel.length === 1 && motoGpSel.length === 2;
  const disabilitato = !dati.schieramentoAperto;

  // Rileva se la selezione corrente differisce da quanto già salvato, per
  // distinguere "formazione già confermata" da "ho appena cambiato idea e
  // non ho ancora premuto salva" — feedback importante per evitare che
  // l'utente esca dalla pagina pensando di aver salvato quando non l'ha fatto.
  const formazioneSalvata = dati.formazione;
  const modificheNonSalvate =
    formazioneCompleta &&
    (moto3Sel[0] !== formazioneSalvata?.pilota_moto3_id ||
      moto2Sel[0] !== formazioneSalvata?.pilota_moto2_id ||
      motoGpSel[0] !== formazioneSalvata?.pilota_motogp_1_id ||
      motoGpSel[1] !== formazioneSalvata?.pilota_motogp_2_id);

  return (
    <div className="pb-24 md:pb-4">
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-asfalto-500 mb-1">
            {dati.evento.numero_round ? `Round ${dati.evento.numero_round}` : 'Prossimo weekend'}
          </p>
          <h1 className="font-display text-2xl font-semibold">{dati.evento.nome}</h1>
          {dati.evento.circuito && (
            <p className="text-sm text-asfalto-400 mt-0.5">
              {dati.evento.circuito}
              {dati.evento.paese ? ` · ${dati.evento.paese}` : ''}
            </p>
          )}
        </div>

        <CountdownDeadline deadline={dati.deadline} inizioWeekend={dati.inizioWeekend} />

        {dati.formazione?.auto_riproposta && (
          <div className="rounded-2xl bg-bandiera-giallo/10 border border-bandiera-giallo/30 px-4 py-3 text-sm flex items-start gap-2.5">
            <i className="ti ti-info-circle text-bandiera-giallo text-base mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              Non hai schierato in tempo: è stata riproposta automaticamente la tua ultima formazione valida.
            </span>
          </div>
        )}

        <div className="space-y-5">
          <SelettorePiloti
            etichetta="Moto3 — schiera 1 pilota"
            opzioni={opzioniMoto3}
            selezionati={moto3Sel}
            maxSelezionabili={1}
            disabilitato={disabilitato}
            onCambia={setMoto3Sel}
          />
          <SelettorePiloti
            etichetta="Moto2 — schiera 1 pilota"
            opzioni={opzioniMoto2}
            selezionati={moto2Sel}
            maxSelezionabili={1}
            disabilitato={disabilitato}
            onCambia={setMoto2Sel}
          />
          <SelettorePiloti
            etichetta="MotoGP — schiera 2 piloti"
            opzioni={opzioniMotoGp}
            selezionati={motoGpSel}
            maxSelezionabili={2}
            disabilitato={disabilitato}
            onCambia={setMotoGpSel}
          />
        </div>

        <div className="rounded-2xl bg-asfalto-800/60 border border-white/10 px-4 py-3 text-xs text-asfalto-400 flex items-start gap-2">
          <i className="ti ti-bolt text-bandiera-giallo text-sm mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Promemoria: nella Sprint Race MotoGP prendi automaticamente i punti dei 2 migliori piloti
            dell&apos;intera tua rosa MotoGP (3 piloti), indipendentemente da chi schieri qui sopra per la gara.
          </span>
        </div>

        {errore && (
          <p className="text-sm text-bandiera-rosso bg-bandiera-rosso/10 border border-bandiera-rosso/30 rounded-xl px-3 py-2">
            {errore}
          </p>
        )}
      </div>

      {/* CTA primaria sticky: resta raggiungibile col pollice anche con rosa
          lunga da scorrere, pattern standard delle app iOS per azioni
          principali che richiedono conferma. */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-3 md:px-0 md:py-4 md:static md:mt-6 bg-gradient-to-t from-asfalto-900 via-asfalto-900/95 to-transparent md:bg-none">
        <div className="max-w-4xl mx-auto">
          <button
            type="button"
            onClick={handleSalva}
            disabled={disabilitato || !formazioneCompleta || salvataggio}
            className={`w-full active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 text-white font-medium rounded-2xl py-3.5 ${
              modificheNonSalvate || !formazioneSalvata
                ? 'bg-bandiera-rosso hover:bg-red-600 shadow-lg shadow-bandiera-rosso/20'
                : 'bg-asfalto-700'
            }`}
          >
            {salvataggio
              ? 'Salvataggio…'
              : disabilitato
              ? 'Schieramento chiuso'
              : modificheNonSalvate || !formazioneSalvata
              ? 'Salva formazione'
              : 'Formazione salvata'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaginaFormazione() {
  return (
    <PaginaProtetta>
      <PaginaFormazioneInterna />
    </PaginaProtetta>
  );
}
