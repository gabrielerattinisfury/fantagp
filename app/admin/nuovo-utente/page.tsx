'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
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
        required
        className="w-full rounded-lg bg-asfalto-900 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-bandiera-giallo/50"
      >
        <option value="">Seleziona pilota…</option>
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

function PaginaNuovoUtenteInterna() {
  const router = useRouter();
  const [piloti, setPiloti] = useState<Pilota[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [stagioneId, setStagioneId] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nomeSquadra, setNomeSquadra] = useState('');
  const [numeroGara, setNumeroGara] = useState('');
  const [colorePrimario, setColorePrimario] = useState('#E10600');

  const [moto3A, setMoto3A] = useState('');
  const [moto3B, setMoto3B] = useState('');
  const [moto2A, setMoto2A] = useState('');
  const [moto2B, setMoto2B] = useState('');
  const [motoGpA, setMotoGpA] = useState('');
  const [motoGpB, setMotoGpB] = useState('');
  const [motoGpC, setMotoGpC] = useState('');

  const [errore, setErrore] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState(false);

  useEffect(() => {
    fetch('/api/admin/dati', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setPiloti(data.piloti ?? []);
        setCategorie(data.categorie ?? []);
        setStagioneId(data.stagione?.id ?? null);
      });
  }, []);

  const idCat = (codice: string) => categorie.find((c) => c.codice === codice)?.id;
  const pilotiMoto3 = piloti.filter((p) => p.categoria_id === idCat('Moto3'));
  const pilotiMoto2 = piloti.filter((p) => p.categoria_id === idCat('Moto2'));
  const pilotiMotoGp = piloti.filter((p) => p.categoria_id === idCat('MotoGP'));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrore(null);

    if (!stagioneId) {
      setErrore('Nessuna stagione sincronizzata: esegui prima una sincronizzazione dal pannello admin.');
      return;
    }
    if (motoGpA === motoGpB || motoGpA === motoGpC || motoGpB === motoGpC) {
      setErrore('I 3 piloti MotoGP devono essere tutti diversi.');
      return;
    }
    if (moto3A === moto3B) {
      setErrore('I 2 piloti Moto3 devono essere diversi.');
      return;
    }
    if (moto2A === moto2B) {
      setErrore('I 2 piloti Moto2 devono essere diversi.');
      return;
    }

    setSalvataggio(true);
    try {
      const res = await fetch('/api/admin/utenti/crea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          nomeSquadra,
          colorePrimario,
          numeroGara: numeroGara ? parseInt(numeroGara, 10) : null,
          stagioneId,
          rosa: { moto3A, moto3B, moto2A, moto2B, motoGpA, motoGpB, motoGpC },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrore(data.errore ?? 'Errore nella creazione.');
        return;
      }
      router.push('/admin');
    } catch {
      setErrore('Errore di connessione.');
    } finally {
      setSalvataggio(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-semibold">Nuovo fantamotociclista</h1>
        <p className="text-sm text-asfalto-400 mt-0.5">Crea l&apos;account e assegna la rosa iniziale (2+2+3)</p>
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
              type="password"
              placeholder="Password iniziale"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-asfalto-400">Colore</label>
            <input
              type="color"
              value={colorePrimario}
              onChange={(e) => setColorePrimario(e.target.value)}
              className="h-9 w-16 rounded-lg bg-transparent border border-white/10 cursor-pointer"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-asfalto-850 p-5 space-y-4">
          <h2 className="font-display font-semibold text-sm">Rosa Moto3 (2 piloti)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectPilota label="Pilota A" piloti={pilotiMoto3} value={moto3A} onChange={setMoto3A} />
            <SelectPilota label="Pilota B" piloti={pilotiMoto3} value={moto3B} onChange={setMoto3B} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-asfalto-850 p-5 space-y-4">
          <h2 className="font-display font-semibold text-sm">Rosa Moto2 (2 piloti)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectPilota label="Pilota A" piloti={pilotiMoto2} value={moto2A} onChange={setMoto2A} />
            <SelectPilota label="Pilota B" piloti={pilotiMoto2} value={moto2B} onChange={setMoto2B} />
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

        {errore && (
          <p className="text-sm text-bandiera-rosso bg-bandiera-rosso/10 border border-bandiera-rosso/30 rounded-lg px-3 py-2">
            {errore}
          </p>
        )}

        <button
          type="submit"
          disabled={salvataggio}
          className="w-full bg-bandiera-rosso hover:bg-red-600 disabled:opacity-50 transition-colors text-white font-medium rounded-xl py-3"
        >
          {salvataggio ? 'Creazione…' : 'Crea fantamotociclista'}
        </button>
      </form>
    </div>
  );
}

export default function PaginaNuovoUtente() {
  return (
    <PaginaProtetta soloAdmin>
      <PaginaNuovoUtenteInterna />
    </PaginaProtetta>
  );
}
