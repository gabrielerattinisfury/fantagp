import { NextResponse } from 'next/server';
import { ottieniSessioneCorrente } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const sessione = await ottieniSessioneCorrente();
  if (!sessione) {
    return NextResponse.json({ utente: null }, { status: 200 });
  }

  const sb = supabaseServer();
  const { data: utente } = await sb
    .from('fanta_utenti')
    .select('id, username, nome_squadra, colore_primario, colore_secondario, numero_gara, ruolo')
    .eq('id', sessione.utenteId)
    .single();

  if (!utente) {
    return NextResponse.json({ utente: null }, { status: 200 });
  }

  return NextResponse.json({ utente });
}
