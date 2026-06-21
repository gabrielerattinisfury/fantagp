'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { PaginaProtetta } from '@/components/pagina-protetta';

interface UtenteAdmin {
  id: string;
  username: string;
  nome_squadra: string;
  ruolo?: string;
  attivo: boolean;
}
interface EventoAdmin {
  id: string;
  nome: string;
  numero_round: number | null;
  stato: string;
  data_inizio: string | null;
}
interface Categoria {
  id: string;
  codice: string;
}
interface Pilota {
  id: string;
  nome_completo: string;
  numero: number | null;
  categoria_id: string;
}

type Sezione = 'formazione' | 'punteggio' | 'calendario' | 'utenti';

function TabSezione({
  sezione,
  attiva,
  onClick,
  icona,
  label,
}: {
  sezione: Sezione;
  attiva: boolean;
  onClick: (s: Sezione) => void;
  icona: string;
  label: string;
}) {
  return (
    <button
      onClick={() => onClick(sezione)}
      className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
        attiva
          ? 'bg-bandiera-rosso/20 text-white border border-bandiera-rosso/40'
          : 'text-asfalto-400 hover:text-white hover:bg-white/5 border border-transparent'
      }`}
    >
      <i className={`ti ${icona}`} aria-hidden="true" />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sezione: override formazione
// ---------------------------------------------------------------------------
function SezioneFormazione({ utenti, eventi }: { utenti: UtenteAdmin[]; eventi: EventoAdmin[] }) {
  const [utenteId, setUtenteId] = useState('');
  const [eventoId, setEventoId] = useState('');
  const [piloti, setPiloti] = useState<Pilota[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [moto3, setMoto3] = useState('');
  const [moto2, setMoto2] = useState('');
  const [motoGp1, setMotoGp1] = useState('');
  const [motoGp2, setMotoGp2] = useState('');
  const [esito, setEsito] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/dati', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setPiloti(d.piloti ?? []);
        setCategorie(d.categorie ?? []);
      });
  }, []);

  const idCat = (codice: string) => categorie.find((c) => c.codice === codice)?.id;

  async function handleSalva() {
    setEsito(null);
    setErrore(null);
    const res = await fetch('/api/admin/override/formazione', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        utenteId,
        eventoId,
        pilotaMoto3Id: moto3 || null,
        pilotaMoto2Id: moto2 || null,
        pilotaMotoGp1Id: motoGp1 || null,
        pilotaMotoGp2Id: motoGp2 || null,
        ricalcolaPunteggio: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrore(data.errore ?? 'Errore.');
      return;
    }
    setEsito('Formazione sovrascritta e punteggio ricalcolato.');
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-asfalto-400">
        Sovrascrive la formazione di un fantamotociclista per un weekend specifico, ignorando deadline e
        controlli normali. Il punteggio viene ricalcolato subito dopo.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          value={utenteId}
          onChange={(e) => setUtenteId(e.target.value)}
          className="rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm outline-none"
        >
          <option value="">Fantamotociclista…</option>
          {utenti.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome_squadra} (@{u.username})
            </option>
          ))}
        </select>
        <select
          value={eventoId}
          onChange={(e) => setEventoId(e.target.value)}
          className="rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm outline-none"
        >
          <option value="">Weekend…</option>
          {eventi.map((ev) => (
            <option key={ev.id} value={ev.id}>
              Round {ev.numero_round} — {ev.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select value={moto3} onChange={(e) => setMoto3(e.target.value)} className="rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm outline-none">
          <option value="">Pilota Moto3…</option>
          {piloti.filter((p) => p.categoria_id === idCat('Moto3')).map((p) => (
            <option key={p.id} value={p.id}>{p.nome_completo}</option>
          ))}
        </select>
        <select value={moto2} onChange={(e) => setMoto2(e.target.value)} className="rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm outline-none">
          <option value="">Pilota Moto2…</option>
          {piloti.filter((p) => p.categoria_id === idCat('Moto2')).map((p) => (
            <option key={p.id} value={p.id}>{p.nome_completo}</option>
          ))}
        </select>
        <select value={motoGp1} onChange={(e) => setMotoGp1(e.target.value)} className="rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm outline-none">
          <option value="">Pilota MotoGP 1…</option>
          {piloti.filter((p) => p.categoria_id === idCat('MotoGP')).map((p) => (
            <option key={p.id} value={p.id}>{p.nome_completo}</option>
          ))}
        </select>
        <select value={motoGp2} onChange={(e) => setMotoGp2(e.target.value)} className="rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm outline-none">
          <option value="">Pilota MotoGP 2…</option>
          {piloti.filter((p) => p.categoria_id === idCat('MotoGP')).map((p) => (
            <option key={p.id} value={p.id}>{p.nome_completo}</option>
          ))}
        </select>
      </div>

      {errore && <p className="text-sm text-bandiera-rosso bg-bandiera-rosso/10 border border-bandiera-rosso/30 rounded-lg px-3 py-2">{errore}</p>}
      {esito && <p className="text-sm text-bandiera-verde bg-bandiera-verde/10 border border-bandiera-verde/30 rounded-lg px-3 py-2">{esito}</p>}

      <button
        onClick={handleSalva}
        disabled={!utenteId || !eventoId}
        className="bg-bandiera-rosso hover:bg-red-600 disabled:opacity-40 transition-colors text-white font-medium rounded-lg px-5 py-2.5 text-sm"
      >
        Sovrascrivi formazione
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sezione: override punteggio
// ---------------------------------------------------------------------------
function SezionePunteggio({ utenti, eventi }: { utenti: UtenteAdmin[]; eventi: EventoAdmin[] }) {
  const [utenteId, setUtenteId] = useState('');
  const [eventoId, setEventoId] = useState('');
  const [p, setP] = useState({ moto3: 0, moto2: 0, mgp1: 0, mgp2: 0, spr1: 0, spr2: 0 });
  const [note, setNote] = useState('');
  const [esito, setEsito] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  async function handleSalva() {
    setEsito(null);
    setErrore(null);
    const res = await fetch('/api/admin/risultati', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        utenteId,
        eventoId,
        puntiMoto3Gara: p.moto3,
        puntiMoto2Gara: p.moto2,
        puntiMotoGp1Gara: p.mgp1,
        puntiMotoGp2Gara: p.mgp2,
        sprintPunti1: p.spr1,
        sprintPunti2: p.spr2,
        noteAdmin: note || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrore(data.errore ?? 'Errore.');
      return;
    }
    setEsito('Punteggio corretto manualmente e bloccato (non verrà più ricalcolato in automatico).');
  }

  async function handleRipristina() {
    setEsito(null);
    setErrore(null);
    const res = await fetch(`/api/admin/risultati?utenteId=${utenteId}&eventoId=${eventoId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setErrore(data.errore ?? 'Errore.');
      return;
    }
    setEsito('Correzione manuale rimossa: il punteggio torna ad essere calcolato automaticamente.');
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-asfalto-400">
        Sovrascrive il punteggio totale di un weekend con valori scelti a mano. Una volta corretto
        manualmente, quel punteggio <strong>non</strong> verrà più toccato dalla sincronizzazione automatica,
        finché non lo ripristini.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select value={utenteId} onChange={(e) => setUtenteId(e.target.value)} className="rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm outline-none">
          <option value="">Fantamotociclista…</option>
          {utenti.map((u) => <option key={u.id} value={u.id}>{u.nome_squadra} (@{u.username})</option>)}
        </select>
        <select value={eventoId} onChange={(e) => setEventoId(e.target.value)} className="rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm outline-none">
          <option value="">Weekend…</option>
          {eventi.map((ev) => <option key={ev.id} value={ev.id}>Round {ev.numero_round} — {ev.nome}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {([
          ['moto3', 'Moto3 gara'], ['moto2', 'Moto2 gara'], ['mgp1', 'MotoGP 1 gara'],
          ['mgp2', 'MotoGP 2 gara'], ['spr1', 'Sprint pilota 1'], ['spr2', 'Sprint pilota 2'],
        ] as const).map(([campo, label]) => (
          <div key={campo}>
            <label className="block text-xs text-asfalto-400 mb-1">{label}</label>
            <input
              type="number"
              step="0.5"
              value={p[campo]}
              onChange={(e) => setP((prev) => ({ ...prev, [campo]: parseFloat(e.target.value) || 0 }))}
              className="w-full rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm outline-none numero-gara"
            />
          </div>
        ))}
      </div>

      <input
        placeholder="Nota (motivo della correzione, facoltativo)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm outline-none"
      />

      {errore && <p className="text-sm text-bandiera-rosso bg-bandiera-rosso/10 border border-bandiera-rosso/30 rounded-lg px-3 py-2">{errore}</p>}
      {esito && <p className="text-sm text-bandiera-verde bg-bandiera-verde/10 border border-bandiera-verde/30 rounded-lg px-3 py-2">{esito}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSalva}
          disabled={!utenteId || !eventoId}
          className="bg-bandiera-rosso hover:bg-red-600 disabled:opacity-40 transition-colors text-white font-medium rounded-lg px-5 py-2.5 text-sm"
        >
          Sovrascrivi punteggio
        </button>
        <button
          onClick={handleRipristina}
          disabled={!utenteId || !eventoId}
          className="bg-asfalto-700 hover:bg-asfalto-600 disabled:opacity-40 transition-colors text-white font-medium rounded-lg px-5 py-2.5 text-sm"
        >
          Ripristina calcolo automatico
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sezione: override calendario
// ---------------------------------------------------------------------------
function SezioneCalendario({
  eventi,
  stagioneId,
  ricarica,
}: {
  eventi: EventoAdmin[];
  stagioneId: string | null;
  ricarica: () => void;
}) {
  const [nome, setNome] = useState('');
  const [round, setRound] = useState('');
  const [dataInizio, setDataInizio] = useState('');
  const [stato, setStato] = useState('programmato');
  const [esito, setEsito] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  async function handleCrea() {
    setEsito(null);
    setErrore(null);
    if (!stagioneId) {
      setErrore('Nessuna stagione corrente trovata.');
      return;
    }
    const res = await fetch('/api/admin/override/evento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stagioneId,
        nome,
        numeroRound: round ? parseInt(round, 10) : null,
        dataInizio: dataInizio || null,
        stato,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrore(data.errore ?? 'Errore.');
      return;
    }
    setEsito('Evento creato/aggiornato.');
    setNome('');
    setRound('');
    setDataInizio('');
    ricarica();
  }

  async function handleCambiaStato(eventoId: string, nuovoStato: string) {
    await fetch('/api/admin/override/evento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: eventoId,
        stagioneId,
        nome: eventi.find((e) => e.id === eventoId)?.nome,
        stato: nuovoStato,
      }),
    });
    ricarica();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-asfalto-400 mb-3">
          Crea manualmente un evento mancante dal calendario ufficiale (uso raro: serve solo se la
          sincronizzazione non ha trovato una gara per qualche motivo).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            placeholder="Nome GP"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm outline-none sm:col-span-2"
          />
          <input
            placeholder="Round"
            type="number"
            value={round}
            onChange={(e) => setRound(e.target.value)}
            className="rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm outline-none"
          />
          <input
            type="date"
            value={dataInizio}
            onChange={(e) => setDataInizio(e.target.value)}
            className="rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm outline-none"
          />
        </div>
        <div className="flex items-center gap-3 mt-3">
          <select value={stato} onChange={(e) => setStato(e.target.value)} className="rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm outline-none">
            <option value="programmato">Programmato</option>
            <option value="in_corso">In corso</option>
            <option value="concluso">Concluso</option>
            <option value="annullato">Annullato</option>
            <option value="rinviato">Rinviato</option>
          </select>
          <button
            onClick={handleCrea}
            disabled={!nome}
            className="bg-bandiera-rosso hover:bg-red-600 disabled:opacity-40 transition-colors text-white text-sm font-medium rounded-lg px-4 py-2"
          >
            Crea evento
          </button>
        </div>
      </div>

      {errore && <p className="text-sm text-bandiera-rosso bg-bandiera-rosso/10 border border-bandiera-rosso/30 rounded-lg px-3 py-2">{errore}</p>}
      {esito && <p className="text-sm text-bandiera-verde bg-bandiera-verde/10 border border-bandiera-verde/30 rounded-lg px-3 py-2">{esito}</p>}

      <div className="space-y-1.5 border-t border-white/10 pt-4">
        <p className="text-xs text-asfalto-500 mb-2">Cambia rapidamente lo stato di un evento esistente:</p>
        {eventi.map((ev) => (
          <div key={ev.id} className="flex items-center gap-3 text-sm">
            <span className="text-asfalto-500 w-8 shrink-0">R{ev.numero_round}</span>
            <span className="flex-1 truncate">{ev.nome}</span>
            <select
              value={ev.stato}
              onChange={(e) => handleCambiaStato(ev.id, e.target.value)}
              className="rounded-lg bg-asfalto-900 border border-white/10 px-2 py-1 text-xs outline-none"
            >
              <option value="programmato">Programmato</option>
              <option value="in_corso">In corso</option>
              <option value="concluso">Concluso</option>
              <option value="annullato">Annullato</option>
              <option value="rinviato">Rinviato</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sezione: override utenti (disattiva / elimina definitivamente)
// ---------------------------------------------------------------------------
function SezioneUtenti({ utenti, ricarica }: { utenti: UtenteAdmin[]; ricarica: () => void }) {
  const [confermaEliminazione, setConfermaEliminazione] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  async function handleElimina(utenteId: string) {
    setErrore(null);
    const res = await fetch(`/api/admin/override/utente?utenteId=${utenteId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setErrore(data.errore ?? 'Errore.');
      return;
    }
    setConfermaEliminazione(null);
    ricarica();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-asfalto-400">
        L&apos;eliminazione è <strong>definitiva</strong> e cancella anche rosa, formazioni e punteggi storici
        di quel fantamotociclista. Per disattivazioni reversibili usa la dashboard admin principale.
      </p>

      {errore && (
        <p className="text-sm text-bandiera-rosso bg-bandiera-rosso/10 border border-bandiera-rosso/30 rounded-lg px-3 py-2">
          {errore}
        </p>
      )}

      <ul className="space-y-2">
        {utenti.map((u) => (
          <li key={u.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-asfalto-900/50 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{u.nome_squadra}</p>
              <p className="text-xs text-asfalto-500">@{u.username}</p>
            </div>
            {confermaEliminazione === u.id ? (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-bandiera-rosso">Sei sicuro?</span>
                <button onClick={() => handleElimina(u.id)} className="text-xs bg-bandiera-rosso text-white rounded-lg px-3 py-1.5">
                  Sì, elimina
                </button>
                <button onClick={() => setConfermaEliminazione(null)} className="text-xs bg-asfalto-700 text-white rounded-lg px-3 py-1.5">
                  Annulla
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfermaEliminazione(u.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-bandiera-rosso/40 text-bandiera-rosso hover:bg-bandiera-rosso/10 transition-colors shrink-0"
              >
                Elimina definitivamente
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagina principale
// ---------------------------------------------------------------------------
function PaginaOverrideInterna() {
  const [sezione, setSezione] = useState<Sezione>('formazione');
  const [utenti, setUtenti] = useState<UtenteAdmin[]>([]);
  const [eventi, setEventi] = useState<EventoAdmin[]>([]);
  const [stagioneId, setStagioneId] = useState<string | null>(null);

  const carica = useCallback(() => {
    fetch('/api/admin/dati', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setUtenti((d.utenti ?? []).filter((u: { ruolo: string }) => u.ruolo === 'utente'));
        setEventi(d.eventi ?? []);
        setStagioneId(d.stagione?.id ?? null);
      });
  }, []);

  useEffect(() => {
    carica();
  }, [carica]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-asfalto-400 hover:text-white">
          <i className="ti ti-arrow-left text-xl" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold text-bandiera-rosso flex items-center gap-2">
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            Pannello override
          </h1>
          <p className="text-sm text-asfalto-400 mt-0.5">
            Zona riservata a interventi eccezionali. Bypassa le regole normali dell&apos;app.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        <TabSezione sezione="formazione" attiva={sezione === 'formazione'} onClick={setSezione} icona="ti-flag-2" label="Formazioni" />
        <TabSezione sezione="punteggio" attiva={sezione === 'punteggio'} onClick={setSezione} icona="ti-trophy" label="Punteggi" />
        <TabSezione sezione="calendario" attiva={sezione === 'calendario'} onClick={setSezione} icona="ti-calendar" label="Calendario" />
        <TabSezione sezione="utenti" attiva={sezione === 'utenti'} onClick={setSezione} icona="ti-user-x" label="Utenti" />
      </div>

      <div className="rounded-2xl border border-bandiera-rosso/20 bg-asfalto-850 p-5">
        {sezione === 'formazione' && <SezioneFormazione utenti={utenti} eventi={eventi} />}
        {sezione === 'punteggio' && <SezionePunteggio utenti={utenti} eventi={eventi} />}
        {sezione === 'calendario' && <SezioneCalendario eventi={eventi} stagioneId={stagioneId} ricarica={carica} />}
        {sezione === 'utenti' && <SezioneUtenti utenti={utenti} ricarica={carica} />}
      </div>
    </div>
  );
}

export default function PaginaOverride() {
  return (
    <PaginaProtetta soloAdmin>
      <PaginaOverrideInterna />
    </PaginaProtetta>
  );
}
