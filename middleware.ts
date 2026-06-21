import { NextRequest, NextResponse } from 'next/server';
import { verificaTokenSessione, NOME_COOKIE_SESSIONE } from '@/lib/sessione-edge';

// Percorsi pubblici: non richiedono sessione attiva.
const PERCORSI_PUBBLICI = [
  '/login',
  '/setup',
  '/api/auth/login',
  '/api/auth/me',
  '/api/stagione-corrente',
  '/api/cron',
  '/api/setup',
];

function ePubblico(pathname: string): boolean {
  return PERCORSI_PUBBLICI.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function eRottaAdmin(pathname: string): boolean {
  return pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Asset statici, file interni Next.js, e risorse PWA (manifest, service
  // worker, icone): sempre passanti, anche senza sessione attiva, perché il
  // browser le richiede per valutare l'installabilità prima ancora che la
  // persona abbia fatto login.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/icons/')
  ) {
    return NextResponse.next();
  }

  if (ePubblico(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(NOME_COOKIE_SESSIONE)?.value;
  const sessione = token ? await verificaTokenSessione(token) : null;

  if (!sessione) {
    // Le chiamate API non autenticate ricevono un 401 pulito invece di un
    // redirect HTML (il client le gestisce già correttamente); le pagine
    // invece vengono rimandate al login.
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ errore: 'Devi effettuare il login.' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (eRottaAdmin(pathname) && sessione.ruolo !== 'admin') {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ errore: 'Funzione riservata agli amministratori.' }, { status: 403 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/formazione';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Esclude asset statici dal middleware per performance; tutto il resto
  // (pagine e API) passa dal controllo sessione sopra.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
