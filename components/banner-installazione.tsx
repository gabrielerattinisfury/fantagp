'use client';

import { useEffect, useState } from 'react';

const CHIAVE_DISMISS = 'fantamotogp_install_banner_dismesso';

interface EventoInstallazione extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function rilevaPiattaforma(): 'ios' | 'android-desktop' | 'gia-installata' | 'non-supportato' {
  if (typeof window === 'undefined') return 'non-supportato';

  // App già installata e aperta in modalità standalone: nessun banner da mostrare.
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  if (standalone) return 'gia-installata';

  const ua = window.navigator.userAgent;
  const eIOS = /iPhone|iPad|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
  if (eIOS) return 'ios';

  return 'android-desktop';
}

export function BannerInstallazione() {
  const [piattaforma, setPiattaforma] = useState<ReturnType<typeof rilevaPiattaforma>>('non-supportato');
  const [promptEvento, setPromptEvento] = useState<EventoInstallazione | null>(null);
  const [visibile, setVisibile] = useState(false);
  const [mostraIstruzioniIOS, setMostraIstruzioniIOS] = useState(false);

  useEffect(() => {
    const dismesso = localStorage.getItem(CHIAVE_DISMISS);
    if (dismesso) return;

    const p = rilevaPiattaforma();
    setPiattaforma(p);
    if (p === 'ios') {
      setVisibile(true);
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setPromptEvento(e as EventoInstallazione);
      setVisibile(true);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  function chiudi() {
    setVisibile(false);
    setMostraIstruzioniIOS(false);
    localStorage.setItem(CHIAVE_DISMISS, '1');
  }

  async function handleInstallaClick() {
    if (piattaforma === 'ios') {
      setMostraIstruzioniIOS(true);
      return;
    }
    if (promptEvento) {
      await promptEvento.prompt();
      const scelta = await promptEvento.userChoice;
      if (scelta.outcome === 'accepted' || scelta.outcome === 'dismissed') {
        chiudi();
      }
    }
  }

  if (!visibile || piattaforma === 'gia-installata' || piattaforma === 'non-supportato') return null;

  return (
    <div className="fixed bottom-32 md:bottom-4 left-0 right-0 z-40 px-4 pb-2 md:pb-0">
      <div className="max-w-md mx-auto bg-asfalto-850 border border-white/15 rounded-2xl shadow-xl shadow-black/40 overflow-hidden">
        {!mostraIstruzioniIOS ? (
          <div className="flex items-center gap-3 p-4">
            <div className="numero-gara text-sm w-11 h-11 rounded-xl bg-bandiera-rosso/15 text-bandiera-rosso flex items-center justify-center shrink-0">
              FGP
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Installa FantaMotoGP</p>
              <p className="text-xs text-asfalto-400 mt-0.5">Accesso rapido dalla schermata Home</p>
            </div>
            <button
              onClick={chiudi}
              aria-label="Chiudi"
              className="text-asfalto-500 hover:text-white p-1.5 shrink-0"
            >
              <i className="ti ti-x text-base" aria-hidden="true" />
            </button>
            <button
              onClick={handleInstallaClick}
              className="bg-bandiera-rosso hover:bg-red-600 active:scale-[0.97] transition-all duration-200 text-white text-sm font-medium rounded-xl px-3.5 py-2 shrink-0"
            >
              Installa
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white">Come installare su iPhone/iPad</p>
              <button onClick={chiudi} aria-label="Chiudi" className="text-asfalto-500 hover:text-white p-1">
                <i className="ti ti-x text-base" aria-hidden="true" />
              </button>
            </div>
            <ol className="space-y-2 text-sm text-asfalto-300">
              <li className="flex items-center gap-2.5">
                <span className="numero-gara text-xs w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">1</span>
                Tocca l&apos;icona Condividi in basso
              </li>
              <li className="flex items-center gap-2.5">
                <span className="numero-gara text-xs w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">2</span>
                Scorri e tocca &quot;Aggiungi a Home&quot;
              </li>
              <li className="flex items-center gap-2.5">
                <span className="numero-gara text-xs w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">3</span>
                Tocca &quot;Aggiungi&quot; in alto a destra
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
