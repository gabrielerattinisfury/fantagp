'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function PaginaSetup() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [setupNecessario, setSetupNecessario] = useState(false);

  const [codiceSetup, setCodiceSetup] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nomeSquadra, setNomeSquadra] = useState('');

  const [errore, setErrore] = useState<string | null>(null);
  const [completato, setCompletato] = useState(false);
  const [salvataggio, setSalvataggio] = useState(false);

  useEffect(() => {
    fetch('/api/setup', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setSetupNecessario(Boolean(data.setupNecessario)))
      .catch(() => setSetupNecessario(true))
      .finally(() => setVerificando(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrore(null);
    setSalvataggio(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codiceSetup, username, password, nomeSquadra }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrore(data.errore ?? 'Errore durante il setup.');
        return;
      }
      setCompletato(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch {
      setErrore('Errore di connessione. Riprova.');
    } finally {
      setSalvataggio(false);
    }
  }

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-asfalto-400 text-sm flex items-center gap-2">
          <i className="ti ti-loader-2 animate-spin" aria-hidden="true" />
          Verifica in corso…
        </div>
      </div>
    );
  }

  if (!setupNecessario && !completato) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <i className="ti ti-circle-check text-bandiera-verde text-4xl mb-3" aria-hidden="true" />
          <h1 className="font-display text-xl font-semibold mb-2">Setup già completato</h1>
          <p className="text-sm text-asfalto-400 mb-6">
            L&apos;account amministratore esiste già. Questa pagina di setup è ora disattivata.
          </p>
          <a
            href="/login"
            className="inline-block bg-bandiera-rosso hover:bg-red-600 transition-colors text-white font-medium rounded-2xl px-6 py-2.5 text-sm"
          >
            Vai al login
          </a>
        </div>
      </div>
    );
  }

  if (completato) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <i className="ti ti-flag-2 text-bandiera-verde text-4xl mb-3" aria-hidden="true" />
          <h1 className="font-display text-xl font-semibold mb-2">Tutto pronto!</h1>
          <p className="text-sm text-asfalto-400">
            Il tuo account amministratore è stato creato. Ti porto al login…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="numero-gara text-4xl text-bandiera-rosso mb-1">FGP</div>
          <h1 className="font-display text-xl font-semibold">Benvenuto in FantaMotoGP</h1>
          <p className="text-asfalto-400 text-sm mt-1">
            Ultimo passaggio: crea il tuo account amministratore
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-asfalto-850 border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <label htmlFor="codiceSetup" className="block text-sm text-asfalto-300 mb-1.5">
              Codice di setup
            </label>
            <input
              id="codiceSetup"
              type="text"
              required
              value={codiceSetup}
              onChange={(e) => setCodiceSetup(e.target.value)}
              className="w-full rounded-xl bg-asfalto-900 border border-white/10 px-3.5 py-2.5 text-white placeholder-asfalto-500 focus:border-bandiera-giallo/50 outline-none transition-colors font-mono text-sm"
              placeholder="Il valore di SETUP_CODE su Vercel"
            />
            <p className="text-xs text-asfalto-500 mt-1.5">
              Lo trovi nelle Environment Variables del tuo progetto Vercel (l&apos;hai impostato tu durante il deploy).
            </p>
          </div>

          <div>
            <label htmlFor="username" className="block text-sm text-asfalto-300 mb-1.5">
              Il tuo username
            </label>
            <input
              id="username"
              type="text"
              required
              minLength={3}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl bg-asfalto-900 border border-white/10 px-3.5 py-2.5 text-white placeholder-asfalto-500 focus:border-bandiera-giallo/50 outline-none transition-colors"
              placeholder="es. admin"
            />
          </div>

          <div>
            <label htmlFor="nomeSquadra" className="block text-sm text-asfalto-300 mb-1.5">
              Nome della tua squadra
            </label>
            <input
              id="nomeSquadra"
              type="text"
              required
              value={nomeSquadra}
              onChange={(e) => setNomeSquadra(e.target.value)}
              className="w-full rounded-xl bg-asfalto-900 border border-white/10 px-3.5 py-2.5 text-white placeholder-asfalto-500 focus:border-bandiera-giallo/50 outline-none transition-colors"
              placeholder="es. Box Numero Uno"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-asfalto-300 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-asfalto-900 border border-white/10 px-3.5 py-2.5 text-white placeholder-asfalto-500 focus:border-bandiera-giallo/50 outline-none transition-colors"
              placeholder="Minimo 6 caratteri"
            />
          </div>

          {errore && (
            <p className="text-sm text-bandiera-rosso bg-bandiera-rosso/10 border border-bandiera-rosso/30 rounded-xl px-3 py-2">
              {errore}
            </p>
          )}

          <button
            type="submit"
            disabled={salvataggio}
            className="w-full bg-bandiera-rosso hover:bg-red-600 active:scale-[0.98] disabled:opacity-50 transition-all duration-200 text-white font-medium rounded-2xl py-2.5"
          >
            {salvataggio ? 'Creazione in corso…' : 'Crea account amministratore'}
          </button>
        </form>

        <p className="text-center text-xs text-asfalto-500 mt-6">
          Dopo aver creato l&apos;admin, ricordati di premere &quot;Sincronizza ora&quot; dal pannello Admin
          per popolare calendario e piloti.
        </p>
      </div>
    </div>
  );
}
