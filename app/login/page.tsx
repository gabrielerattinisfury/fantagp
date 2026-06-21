'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';

export default function PaginaLogin() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [caricamento, setCaricamento] = useState(false);
  const [annoStagione, setAnnoStagione] = useState<number | null>(null);

  // L'anno mostrato nel titolo viene letto dalla stagione corrente
  // sincronizzata in database (mai scritto fisso nel codice), così l'app
  // mostra automaticamente "2027", "2028" ecc. senza bisogno di redeploy
  // quando inizia una nuova stagione MotoGP.
  useEffect(() => {
    fetch('/api/stagione-corrente', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setAnnoStagione(data.anno ?? null))
      .catch(() => setAnnoStagione(null));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrore(null);
    setCaricamento(true);
    const risultato = await login(username, password);
    setCaricamento(false);
    if (!risultato.ok) {
      setErrore(risultato.errore ?? 'Errore di accesso.');
      return;
    }
    router.push('/formazione');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="numero-gara text-4xl text-bandiera-rosso mb-1">FGP</div>
          <h1 className="font-display text-xl font-semibold">
            FantaMotoGP{annoStagione ? ` ${annoStagione}` : ''}
          </h1>
          <p className="text-asfalto-400 text-sm mt-1">Accedi alla tua squadra</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-asfalto-850 border border-white/10 rounded-2xl p-6 space-y-4"
        >
          <div>
            <label htmlFor="username" className="block text-sm text-asfalto-300 mb-1.5">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg bg-asfalto-900 border border-white/10 px-3.5 py-2.5 text-white placeholder-asfalto-500 focus:border-bandiera-giallo/50 outline-none transition-colors"
              placeholder="es. marco89"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-asfalto-300 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-asfalto-900 border border-white/10 px-3.5 py-2.5 text-white placeholder-asfalto-500 focus:border-bandiera-giallo/50 outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          {errore && (
            <p className="text-sm text-bandiera-rosso bg-bandiera-rosso/10 border border-bandiera-rosso/30 rounded-lg px-3 py-2">
              {errore}
            </p>
          )}

          <button
            type="submit"
            disabled={caricamento}
            className="w-full bg-bandiera-rosso hover:bg-red-600 disabled:opacity-50 transition-colors text-white font-medium rounded-lg py-2.5"
          >
            {caricamento ? 'Accesso in corso…' : 'Accedi'}
          </button>
        </form>

        <p className="text-center text-xs text-asfalto-500 mt-6">
          Non hai ancora un account? Chiedi all&apos;amministratore della lega di crearti la squadra.
        </p>
      </div>
    </div>
  );
}
