'use client';

import { useEffect } from 'react';

/**
 * Registra il service worker minimo (vedi public/sw.js) richiesto da alcuni
 * browser come criterio di installabilità PWA. Nessuna UI: componente
 * "invisibile" montato una volta nel layout root.
 */
export function RegistraServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Se la registrazione fallisce (es. browser non supportato), l'app
        // funziona comunque normalmente: il service worker qui è solo per
        // abilitare il prompt di installazione, non per funzionalità critiche.
      });
    }
  }, []);

  return null;
}
