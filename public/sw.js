// ============================================================================
// SERVICE WORKER MINIMO
// ============================================================================
// Questa app richiede sempre una connessione internet (dati live: punteggi,
// formazioni, classifica condivisa) quindi NON implementiamo una cache
// offline-first, che darebbe un falso senso di funzionalità offline e
// rischierebbe di mostrare dati stantii.
//
// Questo service worker esiste solo perché alcuni browser (in particolare
// Chrome su Android) richiedono un service worker registrato come uno dei
// criteri tecnici per considerare un sito "installabile" come PWA e quindi
// mostrare il prompt nativo di installazione. Senza questo file, su quei
// browser l'evento "beforeinstallprompt" non scatterebbe mai.
// ============================================================================

self.addEventListener('install', () => {
  // Attiva subito la nuova versione senza aspettare la chiusura di tutte le
  // schede aperte, così eventuali aggiornamenti futuri di questo file (se
  // mai servisse aggiungere funzionalità offline) si applicano rapidamente.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Nessun intercettamento di fetch: ogni richiesta va sempre in rete,
// normalmente, senza passare da una cache. Questo è intenzionale.
