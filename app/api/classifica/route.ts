import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { richiedeLogin } from '@/lib/api-guard';

export async function GET() {
  const { sessione, risposta } = await richiedeLogin();
  if (!sessione) return risposta;

  const sb = supabaseServer();
  const { data: classifica, error } = await sb.from('vista_classifica_generale').select('*');

  if (error) {
    return NextResponse.json({ errore: error.message }, { status: 500 });
  }

  // Calcola il trend di posizione: classifica generale ESCLUSO l'ultimo
  // weekend concluso, per sapere "dove eri prima dell'ultima gara" e quindi
  // mostrare frecce su/giù. Approccio leggero: sottrae il punteggio
  // dell'ultimo evento concluso da ogni utente e riordina in memoria,
  // evitando una seconda vista SQL dedicata per un dato puramente cosmetico.
  const { data: stagione } = await sb.from('motogp_stagioni').select('id').eq('corrente', true).maybeSingle();
  let classificaConTrend = (classifica ?? []).map((r) => ({ ...r, posizione_precedente: null as number | null }));

  if (stagione) {
    const { data: ultimoEventoConcluso } = await sb
      .from('motogp_eventi')
      .select('id')
      .eq('stagione_id', stagione.id)
      .eq('stato', 'concluso')
      .order('numero_round', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ultimoEventoConcluso) {
      const { data: puntiUltimoEvento } = await sb
        .from('fanta_punteggi_weekend')
        .select('utente_id, totale_weekend')
        .eq('evento_id', ultimoEventoConcluso.id);

      const mappaPuntiUltimo = new Map((puntiUltimoEvento ?? []).map((p) => [p.utente_id, p.totale_weekend]));

      const classificaPrecedente = (classifica ?? [])
        .map((r) => ({
          utente_id: r.utente_id,
          punti_precedenti: Number(r.punti_totali) - (mappaPuntiUltimo.get(r.utente_id) ?? 0),
        }))
        .sort((a, b) => b.punti_precedenti - a.punti_precedenti);

      const posizionePrecedentePerUtente = new Map(
        classificaPrecedente.map((r, i) => [r.utente_id, i + 1])
      );

      classificaConTrend = classificaConTrend.map((r) => ({
        ...r,
        posizione_precedente: posizionePrecedentePerUtente.get(r.utente_id) ?? null,
      }));
    }
  }

  return NextResponse.json({ classifica: classificaConTrend });
}
