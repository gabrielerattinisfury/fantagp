'use client';

import { useEffect, useState, type FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PaginaProtetta } from '@/components/pagina-protetta';

interface Pilota {
  id: string;
  nome_completo: string;
  numero: number | null;
  categoria_id: string;
}
interface Categoria {
  id: string;
  codice: string;
}

function SelectPilota({
  label,
  piloti,
  value,
  onChange,
}: {
  label: string;
  piloti: Pilota[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-asfalto-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-bandiera-giallo/50"
      >
        <option value="">Non assegnato…</option>
        {piloti.map((p) => (
          <option key={p.id} value={p.id}>
            {p.numero ? `#${p.numero} ` : ''}
            {p.nome_completo}
          </option>
        ))}
      </select>
    </div>
  );
}

function PaginaModificaUtenteInterna() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utenteId = searchParams.get('utenteId');

  const [piloti, setPiloti] = useState<Pilota[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [caricamento, setCaricamento] = useState(true);

  const [username, setUsername] = useState('');
  const [nomeSquadra, setNomeSquadra] = useState('');
  const [numeroGara, setNumeroGara] = useState('');
  const [colorePrimario, setColorePrimario] = useState('#E10600');
  const [coloreSecondario, setColoreSecondario] = useState('#1A1A1A');
  const [stelleMondiali, setStelleMondiali] = useState('0');
  const [nuovaPassword, setNuovaPassword] = useState('');

  const [moto3A, setMoto3A] = useState('');
  const [moto3B, setMoto3B] = useState('');
  const [moto3C, setMoto3C] = useState('');
  const [moto2A, setMoto2A] = useState('');
  const [moto2B, setMoto2B] = useState('');
  const [moto2C, setMoto2C] = useState('');
  const [motoGpA, setMotoGpA] = useState('');
  const [motoGpB, setMotoGpB] = useState('');
  const [motoGpC, setMotoGpC] = useState('');

  const [errore, setErrore] = useState<string | null>(null);
  const [successo, setSuccesso] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState(false);

  useEffect(() => {
    if (!utenteId) {
      setErrore('Nessun fantamotociclista selezionato.');
      setCaricamento(false);
      return;
    }
    Promise.all([
      fetch('/api/admin/dati', { cache: 'no-store' }).then((r) => r.json()),
      fetch(`/api/admin/utenti/modifica?utenteId=${utenteId}`, { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([dati, datiUtente]) => {
        if (datiUtente.errore) {
          setErrore(datiUtente.errore);
          return;
        }
        setPiloti(dati.piloti ?? []);
        setCategorie(dati.categorie ?? []);

        const u = datiUtente.utente;
        setUsername(u.username);
        setNomeSquadra(u.nome_squadra);
        setNumeroGara(u.numero_gara?.toString() ?? '');
        setColorePrimario(u.colore_primario);
        setColoreSecondario(u.colore_secondario);
        setStelleMondiali((u.stelle_mondiali ?? 0).toString());

        const rosaPerSlot = new Map<string, string>(
          (datiUtente.rosa ?? []).map((r: { slot: string; pilota_id: string }) => [r.slot, r.pilota_id])
        );
        setMoto3A(rosaPerSlot.get('moto3_a') ?? '');
        setMoto3B(rosaPerSlot.get('moto3_b') ?? '');
        setMoto3C(rosaPerSlot.get('moto3_c') ?? '');
        setMoto2A(rosaPerSlot.get('moto2_a') ?? '');
        setMoto2B(rosaPerSlot.get('moto2_b') ?? '');
        setMoto2C(rosaPerSlot.get('moto2_c') ?? '');
        setMotoGpA(rosaPerSlot.get('motogp_a') ?? '');
        setMotoGpB(rosaPerSlot.get('motogp_b') ?? '');
        setMotoGpC(rosaPerSlot.get('motogp_c') ?? '');
      })
      .catch(() => setErrore('Errore di connessione.'))
      .finally(() => setCaricamento(false));
  }, [utenteId]);

  const idCat = (codice: string) => categorie.find((c) => c.codice === codice)?.id;
  const pilotiMoto3 = piloti.filter((p) => p.categoria_id === idCat('Moto3'));
  const pilotiMoto2 = piloti.filter((p) => p.categoria_id === idCat('Moto2'));
  const pilotiMotoGp = piloti.filter((p) => p.categoria_id === idCat('MotoGP'));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrore(null);
    setSuccesso(null);

    const scelte = [moto3A, moto3B, moto3C].filter(Boolean);
    if (new Set(scelte).size !== scelte.length) {
      setErrore('I piloti Moto3 selezionati devono essere diversi tra loro.');
      return;
    }
    const scelteMoto2 = [moto2A, moto2B, moto2C].filter(Boolean);
    if (new Set(scelteMoto2).size !== scelteMoto2.length) {
      setErrore('I piloti Moto2 selezionati devono essere diversi tra loro.');
      return;
    }
    const scelteMotoGp = [motoGpA, motoGpB, motoGpC].filter(Boolean);
    if (new Set(scelteMotoGp).size !== scelteMotoGp.length) {
      setErrore('I piloti MotoGP selezionati devono essere diversi tra loro.');
      return;
    }

    setSalvataggio(true);
    try {
      const res = await fetch('/api/admin/utenti/modifica', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utenteId,
          username,
          nomeSquadra,
          colorePrimario,
          coloreSecondario,
          numeroGara: numeroGara ? parseInt(numeroGara, 10) : null,
          nuovaPassword: nuovaPassword || undefined,
          rosa: {
            moto3A: moto3A || undefined,
            moto3B: moto3B || undefined,
            moto3C: moto3C || undefined,
            moto2A: moto2A || undefined,
            moto2B: moto2B || undefined,
            moto2C: moto2C || undefined,
            motoGpA: motoGpA || undefined,
            motoGpB: motoGpB || undefined,
            motoGpC: motoGpC || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrore(data.errore ?? 'Errore nel salvataggio.');
        return;
      }

      const resStelle = await fetch('/api/admin/utenti/stelle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utenteId, stelleMondiali: parseInt(stelleMondiali, 10) || 0 }),
      });
      if (!resStelle.ok) {
        const dataStelle = await resStelle.json();
        setErrore(dataStelle.errore ?? 'Profilo salvato, ma errore nel salvataggio delle stelle mondiali.');
        return;
      }

      setSuccesso('Modifiche salvate.');
      setNuovaPassword('');
    } catch {
      setErrore('Errore di connessione.');
    } finally {
      setSalvataggio(false);
    }
  }

  if (caricamento) {
    return (
      <div className="text-asfalto-400 text-sm flex items-center gap-2 py-12 justify-center">
        <i className="ti ti-loader-2 animate-spin" aria-hidden="true" />
        Caricamento…
      </div>
    );
  }

  if (!utenteId || (errore && !username)) {
    return (
      <div className="rounded-2xl bg-bandiera-rosso/10 border border-bandiera-rosso/30 px-4 py-3 text-sm">
        {errore ?? 'Fantamotociclista non trovato.'}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-asfalto-400 hover:text-white">
          <i className="ti ti-arrow-left text-xl" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold">Modifica fantamotociclista</h1>
          <p className="text-sm text-asfalto-400 mt-0.5">
            Correggi profilo, rosa (3+3+3) e stelle mondiali di @{username}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-asfalto-850 p-5 space-y-4">
          <h2 className="font-display font-semibold text-sm">Account e profilo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              required
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-bandiera-giallo/50"
            />
            <input
              required
              placeholder="Nome squadra"
              value={nomeSquadra}
              onChange={(e) => setNomeSquadra(e.target.value)}
              className="rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-bandiera-giallo/50"
            />
            <input
              type="number"
              min={1}
              max={999}
              placeholder="Numero di gara"
              value={numeroGara}
              onChange={(e) => setNumeroGara(e.target.value)}
              className="rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-bandiera-giallo/50"
            />
            <div>
              <label className="block text-xs text-asfalto-400 mb-1">Stelle mondiali</label>
              <input
                type="number"
                min={0}
                max={20}
                value={stelleMondiali}
                onChange={(e) => setStelleMondiali(e.target.value)}
                className="w-full rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-bandiera-giallo/50 numero-gara"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <label className="text-xs text-asfalto-400">Colore primario</label>
              <input
                type="color"
                value={colorePrimario}
                onChange={(e) => setColorePrimario(e.target.value)}
                className="h-9 w-16 rounded-lg bg-transparent border border-white/10 cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-asfalto-400">Colore secondario</label>
              <input
                type="color"
                value={coloreSecondario}
                onChange={(e) => setColoreSecondario(e.target.value)}
                className="h-9 w-16 rounded-lg bg-transparent border border-white/10 cursor-pointer"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-asfalto-400 mb-1">Nuova password (lascia vuoto per non cambiarla)</label>
            <input
              type="password"
              value={nuovaPassword}
              onChange={(e) => setNuovaPassword(e.target.value)}
              className="w-full rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-bandiera-giallo/50"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-asfalto-850 p-5 space-y-4">
          <h2 className="font-display font-semibold text-sm">Rosa Moto3 (3 piloti)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SelectPilota label="Pilota A" piloti={pilotiMoto3} value={moto3A} onChange={setMoto3A} />
            <SelectPilota label="Pilota B" piloti={pilotiMoto3} value={moto3B} onChange={setMoto3B} />
            <SelectPilota label="Pilota C" piloti={pilotiMoto3} value={moto3C} onChange={setMoto3C} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-asfalto-850 p-5 space-y-4">
          <h2 className="font-display font-semibold text-sm">Rosa Moto2 (3 piloti)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SelectPilota label="Pilota A" piloti={pilotiMoto2} value={moto2A} onChange={setMoto2A} />
            <SelectPilota label="Pilota B" piloti={pilotiMoto2} value={moto2B} onChange={setMoto2B} />
            <SelectPilota label="Pilota C" piloti={pilotiMoto2} value={moto2C} onChange={setMoto2C} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-asfalto-850 p-5 space-y-4">
          <h2 className="font-display font-semibold text-sm">Rosa MotoGP (3 piloti)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SelectPilota label="Pilota A" piloti={pilotiMotoGp} value={motoGpA} onChange={setMotoGpA} />
            <SelectPilota label="Pilota B" piloti={pilotiMotoGp} value={motoGpB} onChange={setMotoGpB} />
            <SelectPilota label="Pilota C" piloti={pilotiMotoGp} value={motoGpC} onChange={setMotoGpC} />
          </div>
        </div>

        <p className="text-xs text-asfalto-500">
          Questa correzione è diretta e non storicizzata: non modifica i punteggi già calcolati nei weekend
          passati. Per sostituire un pilota a partire da un round specifico durante la stagione, mantenendo lo
          storico, usa invece il{' '}
          <Link href="/admin/override" className="text-bandiera-giallo hover:underline">
            pannello override
          </Link>
          .
        </p>

        {errore && (
          <p className="text-sm text-bandiera-rosso bg-bandiera-rosso/10 border border-bandiera-rosso/30 rounded-lg px-3 py-2">
            {errore}
          </p>
        )}
        {successo && (
          <p className="text-sm text-bandiera-verde bg-bandiera-verde/10 border border-bandiera-verde/30 rounded-lg px-3 py-2">
            {successo}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={salvataggio}
            className="flex-1 bg-bandiera-rosso hover:bg-red-600 disabled:opacity-50 transition-colors text-white font-medium rounded-xl py-3"
          >
            {salvataggio ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="px-5 rounded-xl border border-white/10 text-sm text-asfalto-300 hover:bg-white/5 transition-colors"
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PaginaModificaUtente() {
  return (
    <PaginaProtetta soloAdmin>
      <Suspense fallback={null}>
        <PaginaModificaUtenteInterna />
      </Suspense>
    </PaginaProtetta>
  );
}
