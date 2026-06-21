'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';

const VOCI_NAV = [
  { href: '/formazione', label: 'Formazione', icona: 'ti-flag-2' },
  { href: '/classifica', label: 'Classifica', icona: 'ti-trophy' },
  { href: '/calendario', label: 'Calendario', icona: 'ti-calendar' },
  { href: '/profilo', label: 'Profilo', icona: 'ti-user' },
];

export function NavigazionePrincipale() {
  const pathname = usePathname();
  const router = useRouter();
  const { utente, logout } = useAuth();

  if (!utente) return null;

  const voci = utente.ruolo === 'admin' ? [...VOCI_NAV, { href: '/admin', label: 'Admin', icona: 'ti-settings' }] : VOCI_NAV;

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/tabler-icons/3.1.0/iconfont/tabler-icons.min.css"
      />

      <header className="hidden md:flex sticky top-0 z-30 items-center justify-between px-6 py-3 bg-asfalto-900/90 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-8">
          <Link href="/formazione" className="flex items-center gap-2">
            <span
              className="numero-gara text-xl px-2 rounded"
              style={{ color: utente.colore_primario }}
            >
              FGP
            </span>
            <span className="font-display font-semibold tracking-tight text-lg">FantaMotoGP</span>
          </Link>
          <nav className="flex items-center gap-1">
            {voci.map((voce) => {
              const attivo = pathname?.startsWith(voce.href);
              return (
                <Link
                  key={voce.href}
                  href={voce.href}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                    attivo ? 'bg-white/10' : 'text-asfalto-300 hover:text-white hover:bg-white/5'
                  }`}
                  style={attivo ? { color: utente.colore_primario } : undefined}
                >
                  <i className={`ti ${voce.icona} text-base`} aria-hidden="true" />
                  {voce.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-asfalto-300">
            {utente.nome_squadra}
            {utente.numero_gara != null && (
              <span className="numero-gara ml-2" style={{ color: utente.colore_primario }}>
                #{utente.numero_gara}
              </span>
            )}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-asfalto-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors"
          >
            Esci
          </button>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-asfalto-900/95 backdrop-blur border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16">
          {voci.map((voce) => {
            const attivo = pathname?.startsWith(voce.href);
            return (
              <Link
                key={voce.href}
                href={voce.href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs font-medium transition-colors text-asfalto-400"
                style={attivo ? { color: utente.colore_primario } : undefined}
              >
                <i className={`ti ${voce.icona} text-xl`} aria-hidden="true" />
                {voce.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
