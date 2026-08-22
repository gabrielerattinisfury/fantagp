'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';
import { NavigazionePrincipale } from './navigazione';
import { BannerInstallazione } from './banner-installazione';

export function PaginaProtetta({
  children,
  soloAdmin = false,
}: {
  children: React.ReactNode;
  soloAdmin?: boolean;
}) {
  const { utente, caricamento } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (caricamento) return;
    if (!utente) {
      router.replace('/login');
      return;
    }
    if (soloAdmin && utente.ruolo !== 'admin') {
      router.replace('/formazione');
    }
  }, [utente, caricamento, soloAdmin, router]);

  if (caricamento || !utente || (soloAdmin && utente.ruolo !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-asfalto-400 text-sm flex items-center gap-2">
          <i className="ti ti-loader-2 animate-spin" aria-hidden="true" />
          Caricamento…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <NavigazionePrincipale />
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
      <BannerInstallazione />
    </div>
  );
}
