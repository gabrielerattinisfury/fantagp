import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { richiedeLogin } from '@/lib/api-guard';

export async function GET() {
  const { sessione, risposta } = await richiedeLogin();
  if (!sessione) return risposta;

  const sb = supabaseServer();
  const { data: stagione } = await sb.from('motogp_stagioni').select('id, anno').eq('corrente', true).single();
  if (!stagione) {
    return NextResponse.json({ errore: 'Nessuna stagione corrente sincronizzata.' }, { status: 404 });
  }

  const { data: eventi } = await sb
    .from('motogp_eventi')
    .select('id, nome, paese, circuito, numero_round, data_inizio, data_fine, stato, annullato')
    .eq('stagione_id', stagione.id)
    .order('numero_round', { ascending: true });

  return NextResponse.json({ stagione, eventi: eventi ?? [] });
}
