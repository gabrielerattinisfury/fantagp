'use client';

import { useEffect } from 'react';

// Registra il service worker minimo (public/sw.js). Non serve per funzionare
// offline (l'app richiede sempre una connessione: dati live), ma è uno dei
// requisiti tecnici che alcuni browser (Chrome su Android) controllano prima
// di considerare il sito installabile come PWA e mostrare il prompt di
// installazione. Componente client, non renderizza nulla.
export function RegistraServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Silenzioso: se la registrazione fallisce (es. browser che non
      // supporta service worker, o pagina servita non in HTTPS/localhost)
      // l'app deve continuare a funzionare normalmente, semplicemente senza
      // il prompt di installazione nativo.
    });
  }, []);

  return null;
}
