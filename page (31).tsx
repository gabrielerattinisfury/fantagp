'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';

export default function PaginaHome() {
  const { utente, caricamento } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (caricamento) return;
    router.replace(utente ? '/formazione' : '/login');
  }, [utente, caricamento, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-asfalto-400 text-sm flex items-center gap-2">
        <i className="ti ti-loader-2 animate-spin" aria-hidden="true" />
        Caricamento…
      </div>
    </div>
  );
}
