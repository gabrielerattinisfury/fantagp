import type { Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/auth-provider';
import { RegistraServiceWorker } from '@/components/registra-service-worker';
import { supabaseServer } from '@/lib/supabase-server';

export async function generateMetadata() {
  // Anno letto dal database (stagione marcata "corrente" dalla sincronizzazione
  // MotoGP), mai scritto fisso: così il titolo del sito si aggiorna da solo
  // quando inizia una nuova stagione, senza bisogno di un nuovo deploy.
  let anno: number | null = null;
  try {
    const sb = supabaseServer();
    const { data } = await sb.from('motogp_stagioni').select('anno').eq('corrente', true).maybeSingle();
    anno = data?.anno ?? null;
  } catch {
    // Se il database non è ancora raggiungibile/popolato (es. primissimo
    // deploy prima della prima sincronizzazione), si mostra un titolo
    // generico invece di far fallire il rendering della pagina.
  }

  const suffisso = anno ? ` ${anno}` : '';
  return {
    title: `FantaGP${suffisso}`,
    description: `Il fantacampionato MotoGP, Moto2 e Moto3 della stagione${suffisso ? ` ${anno}` : ' in corso'}`,
    manifest: '/manifest.json',
    icons: {
      // Nota: la cartella reale in public/ si chiama "icon" (singolare, vedi
      // scripts/genera-icone.py) — qui puntava a "/icons/" (plurale, non
      // esistente) e quindi favicon/apple-touch-icon erano sempre in 404.
      icon: [
        { url: '/icon/favicon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/icon/favicon-16.png', sizes: '16x16', type: 'image/png' },
      ],
      apple: [{ url: '/icon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    // iOS non legge manifest.json per l'installazione "Aggiungi alla
    // schermata Home": richiede questi meta tag dedicati per comportarsi
    // come una vera app a schermo intero invece di aprire Safari.
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'FantaGP',
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#121417',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="bg-asfalto-900 text-asfalto-50 font-sans antialiased min-h-screen">
        <RegistraServiceWorker />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
