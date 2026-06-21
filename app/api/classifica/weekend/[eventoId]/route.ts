import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { richiedeLogin } from '@/lib/api-guard';

export async function GET(req: NextRequest, { params }: { params: { eventoId: string } }) {
  const { sessione, risposta } = await richiedeLogin();
  if (!sessione) return risposta;

  const sb = supabaseServer();
  const { eventoId } = params;

  const { data: evento } = await sb
    .from('motogp_eventi')
    .select('id, nome, numero_round, data_inizio, stato')
    .eq('id', eventoId)
    .single();

  if (!evento) {
    return NextResponse.json({ errore: 'Evento non trovato.' }, { status: 404 });
  }

  const [{ data: punteggi }, { data: formazioni }] = await Promise.all([
    sb
      .from('fanta_punteggi_weekend')
      .select(
        `
        *,
        utente:fanta_utenti(id, username, nome_squadra, colore_primario, colore_secondario, numero_gara),
        sprint_pilota1:motogp_piloti!fanta_punteggi_weekend_sprint_pilota1_id_fkey(nome_completo, colore_team, url_foto),
        sprint_pilota2:motogp_piloti!fanta_punteggi_weekend_sprint_pilota2_id_fkey(nome_completo, colore_team, url_foto)
      `
      )
      .eq('evento_id', eventoId)
      .order('totale_weekend', { ascending: false }),
    // Le caselle gara (chi è stato effettivamente schierato) non vivono nella
    // tabella punteggi ma nella formazione: le recuperiamo a parte e le
    // ricongiungiamo per utente, così il dettaglio mostra anche QUALE pilota
    // ha generato ciascun punteggio, non solo il numero.
    sb
      .from('fanta_formazioni')
      .select(
        `
        utente_id,
        moto3:motogp_piloti!fanta_formazioni_pilota_moto3_id_fkey(nome_completo, colore_team, url_foto),
        moto2:motogp_piloti!fanta_formazioni_pilota_moto2_id_fkey(nome_completo, colore_team, url_foto),
        motogp1:motogp_piloti!fanta_formazioni_pilota_motogp_1_id_fkey(nome_completo, colore_team, url_foto),
        motogp2:motogp_piloti!fanta_formazioni_pilota_motogp_2_id_fkey(nome_completo, colore_team, url_foto)
      `
      )
      .eq('evento_id', eventoId),
  ]);

  const formazionePerUtente = new Map((formazioni ?? []).map((f) => [f.utente_id, f]));
  const punteggiArricchiti = (punteggi ?? []).map((p) => ({
    ...p,
    formazione: formazionePerUtente.get(p.utente_id) ?? null,
  }));

  return NextResponse.json({ evento, punteggi: punteggiArricchiti });
}
