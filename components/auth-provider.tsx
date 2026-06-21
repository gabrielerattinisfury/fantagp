'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface UtenteAutenticato {
  id: string;
  username: string;
  nome_squadra: string;
  colore_primario: string;
  colore_secondario: string;
  numero_gara: number | null;
  ruolo: 'utente' | 'admin';
}

interface AuthContextValue {
  utente: UtenteAutenticato | null;
  caricamento: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; errore?: string }>;
  logout: () => Promise<void>;
  ricarica: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [utente, setUtente] = useState<UtenteAutenticato | null>(null);
  const [caricamento, setCaricamento] = useState(true);

  const ricarica = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await res.json();
      setUtente(data.utente ?? null);
    } catch {
      setUtente(null);
    } finally {
      setCaricamento(false);
    }
  }, []);

  useEffect(() => {
    ricarica();
  }, [ricarica]);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, errore: data.errore ?? 'Errore di accesso.' };
      }
      await ricarica();
      return { ok: true };
    },
    [ricarica]
  );

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUtente(null);
  }, []);

  return (
    <AuthContext.Provider value={{ utente, caricamento, login, logout, ricarica }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro <AuthProvider>');
  return ctx;
}
