'use client';

import { useState, type FormEvent } from 'react';
import { PaginaProtetta } from '@/components/pagina-protetta';
import { useAuth } from '@/components/auth-provider';

const PALETTE_SUGGERITE = [
  '#E10600', '#FFD400', '#00A859', '#0066CC', '#FF6B00',
  '#9D4EDD', '#FF1493', '#00CED1', '#FFFFFF', '#1A1A1A',
];

function PaginaProfiloInterna() {
  const { utente, ricarica } = useAuth();
  const [username, setUsername] = useState(utente?.username ?? '');
  const [nomeSquadra, setNomeSquadra] = useState(utente?.nome_squadra ?? '');
  const [colorePrimario, setColorePrimario] = useState(utente?.colore_primario ?? '#E10600');
  const [coloreSecondario, setColoreSecondario] = useState(utente?.colore_secondario ?? '#1A1A1A');
  const [numeroGara, setNumeroGara] = useState<string>(utente?.numero_gara?.toString() ?? '');

  const [passwordAttuale, setPasswordAttuale] = useState('');
  const [nuovaPassword, setNuovaPassword] = useState('');

  const [errore, setErrore] = useState<string | null>(null);
  const [successo, setSuccesso] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState(false);

  async function handleSalvaProfilo(e: FormEvent) {
    e.preventDefault();
    setErrore(null);
    setSuccesso(null);
    setSalvataggio(true);
    try {
      const res = await fetch('/api/profilo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          nomeSquadra,
          colorePrimario,
          coloreSecondario,
          numeroGara: numeroGara ? parseInt(numeroGara, 10) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrore(data.errore ?? 'Errore nel salvataggio.');
        return;
      }
      setSuccesso('Profilo aggiornato.');
      await ricarica();
    } catch {
      setErrore('Errore di connessione.');
    } finally {
      setSalvataggio(false);
    }
  }

  async function handleCambiaPassword(e: FormEvent) {
    e.preventDefault();
    setErrore(null);
    setSuccesso(null);
    if (!passwordAttuale || !nuovaPassword) {
      setErrore('Inserisci sia la password attuale che la nuova.');
      return;
    }
    setSalvataggio(true);
    try {
      const res = await fetch('/api/profilo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwordAttuale, nuovaPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrore(data.errore ?? 'Errore nel cambio password.');
        return;
      }
      setSuccesso('Password aggiornata.');
      setPasswordAttuale('');
      setNuovaPassword('');
    } catch {
      setErrore('Errore di connessione.');
    } finally {
      setSalvataggio(false);
    }
  }

  if (!utente) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Il tuo profilo</h1>
        <p className="text-sm text-asfalto-400 mt-0.5">Personalizza la tua identità nel campionato</p>
      </div>

      {/* Anteprima live */}
      <div
        className="rounded-2xl border border-white/10 p-5 flex items-center gap-4"
        style={{ background: `linear-gradient(135deg, ${colorePrimario}22, transparent)` }}
      >
        <span
          className="numero-gara text-3xl w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
          style={{ color: colorePrimario, backgroundColor: `${colorePrimario}22`, border: `1px solid ${colorePrimario}55` }}
        >
          {numeroGara || '–'}
        </span>
        <div>
          <p className="font-semibold">{nomeSquadra || 'Nome squadra'}</p>
          <p className="text-sm text-asfalto-400">@{username || 'username'}</p>
        </div>
      </div>

      <form onSubmit={handleSalvaProfilo} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-asfalto-300 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg bg-asfalto-900 border border-white/10 px-3.5 py-2.5 text-white outline-none focus:border-bandiera-giallo/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-asfalto-300 mb-1.5">Numero di gara</label>
            <input
              type="number"
              min={1}
              max={999}
              value={numeroGara}
              onChange={(e) => setNumeroGara(e.target.value)}
              className="w-full rounded-lg bg-asfalto-900 border border-white/10 px-3.5 py-2.5 text-white outline-none focus:border-bandiera-giallo/50 transition-colors numero-gara"
              placeholder="es. 46"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-asfalto-300 mb-1.5">Nome squadra</label>
          <input
            type="text"
            value={nomeSquadra}
            onChange={(e) => setNomeSquadra(e.target.value)}
            className="w-full rounded-lg bg-asfalto-900 border border-white/10 px-3.5 py-2.5 text-white outline-none focus:border-bandiera-giallo/50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-asfalto-300 mb-2">Colore principale</label>
          <div className="flex flex-wrap gap-2 mb-2.5">
            {PALETTE_SUGGERITE.map((colore) => (
              <button
                key={colore}
                type="button"
                onClick={() => setColorePrimario(colore)}
                aria-label={`Scegli colore ${colore}`}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${
                  colorePrimario === colore ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: colore }}
              />
            ))}
          </div>
          <input
            type="color"
            value={colorePrimario}
            onChange={(e) => setColorePrimario(e.target.value)}
            className="h-10 w-20 rounded-lg bg-transparent border border-white/10 cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-sm text-asfalto-300 mb-2">Colore secondario</label>
          <input
            type="color"
            value={coloreSecondario}
            onChange={(e) => setColoreSecondario(e.target.value)}
            className="h-10 w-20 rounded-lg bg-transparent border border-white/10 cursor-pointer"
          />
        </div>

        <button
          type="submit"
          disabled={salvataggio}
          className="w-full sm:w-auto bg-bandiera-rosso hover:bg-red-600 disabled:opacity-50 transition-colors text-white font-medium rounded-lg px-6 py-2.5"
        >
          Salva profilo
        </button>
      </form>

      <div className="border-t border-white/10 pt-6">
        <h2 className="font-display text-lg font-semibold mb-4">Cambia password</h2>
        <form onSubmit={handleCambiaPassword} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-sm text-asfalto-300 mb-1.5">Password attuale</label>
            <input
              type="password"
              value={passwordAttuale}
              onChange={(e) => setPasswordAttuale(e.target.value)}
              className="w-full rounded-lg bg-asfalto-900 border border-white/10 px-3.5 py-2.5 text-white outline-none focus:border-bandiera-giallo/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-asfalto-300 mb-1.5">Nuova password</label>
            <input
              type="password"
              value={nuovaPassword}
              onChange={(e) => setNuovaPassword(e.target.value)}
              className="w-full rounded-lg bg-asfalto-900 border border-white/10 px-3.5 py-2.5 text-white outline-none focus:border-bandiera-giallo/50 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={salvataggio}
            className="w-full sm:w-auto bg-asfalto-700 hover:bg-asfalto-600 disabled:opacity-50 transition-colors text-white font-medium rounded-lg px-6 py-2.5"
          >
            Aggiorna password
          </button>
        </form>
      </div>

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
    </div>
  );
}

export default function PaginaProfilo() {
  return (
    <PaginaProtetta>
      <PaginaProfiloInterna />
    </PaginaProtetta>
  );
}
