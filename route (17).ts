import { NextResponse } from 'next/server';
import { richiedeAdmin } from '@/lib/api-guard';
import { sincronizzaTutto } from '@/lib/sync-motogp';
import { applicaAutoRiproposizioni } from '@/lib/deadline';

export async function POST() {
  const { sessione, risposta } = await richiedeAdmin();
  if (!sessione) return risposta;

  const risultatoSync = await sincronizzaTutto();
  const risultatoAutoRiproposizioni = await applicaAutoRiproposizioni();

  return NextResponse.json({
    ok: true,
    sync: risultatoSync,
    autoRiproposizioni: risultatoAutoRiproposizioni,
  });
}
