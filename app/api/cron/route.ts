import { NextRequest, NextResponse } from 'next/server';
import { sincronizzaTutto } from '@/lib/sync-motogp';
import { applicaAutoRiproposizioni } from '@/lib/deadline';

/**
 * Endpoint chiamato periodicamente (vedi vercel.json per la configurazione
 * del cron, oppure un servizio esterno come cron-job.org se non si usa
 * Vercel). Protetto da un header di autorizzazione con un segreto condiviso,
 * per evitare che chiunque possa scatenare sync arbitrarie.
 */
export async function GET(req: NextRequest) {
  const segreto = req.headers.get('authorization');
  const atteso = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || segreto !== atteso) {
    return NextResponse.json({ errore: 'Non autorizzato.' }, { status: 401 });
  }

  const risultatoSync = await sincronizzaTutto();
  const risultatoAutoRiproposizioni = await applicaAutoRiproposizioni();

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    sync: risultatoSync,
    autoRiproposizioni: risultatoAutoRiproposizioni,
  });
}
