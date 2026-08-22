import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { richiedeLogin } from '@/lib/api-guard';

/**
 * Fun facts della stagione corrente: record di weekend, medie punti,
 * piloti più schierati, formazioni dimenticate. Tutto calcolato al volo
 * dai dati già sincronizzati/salvati (nessuna tabella dedicata).
 */
export async function GET() {
  const { sessione, risposta } = await richiedeLogin();
  if (!sessione) return risposta;

  const sb = supabaseServer();

  const { data: stagione } = await sb.from('motogp_stagioni').select('id, anno').eq('corrente', true).maybeSingle();
  if (!stagione) {
    return NextResponse.json({ errore: 'Nessuna stagione corrente sincronizzata.' }, { status: 404 });
  }

  const { data: eventi } = await sb
    .from('motogp_eventi')
    .select('id, nome, numero_round')
    .eq('stagione_id', stagione.id)
    .eq('stato', 'concluso');
  const idEventi = (eventi ?? []).map((e) => e.id);
  const eventoPerId = new Map((eventi ?? []).map((e) => [e.id, e]));

  if (idEventi.length === 0) {
    return NextResponse.json({
      stagione,
      weekendDisputati: 0,
      weekendMigliore: null,
      mediaPuntiPerUtente: [],
      pilotiPiuSchierati: [],
      formazioniDimenticate: [],
    });
  }

  const [{ data: punteggi }, { data: formazioni }, { data: utenti }] = await Promise.all([
    sb
      .from('fanta_punteggi_weekend')
      .select('utente_id, evento_id, totale_weekend')
      .in('evento_id', idEventi),
    sb
      .from('fanta_formazioni')
      .select('utente_id, evento_id, pilota_moto3_id, pilota_moto2_id, pilota_motogp_1_id, pilota_motogp_2_id, auto_riproposta')
      .in('evento_id', idEventi),
    sb
      .from('fanta_utenti')
      .select('id, username, nome_squadra, colore_primario, numero_gara')
      .eq('attivo', true)
      .eq('ruolo', 'utente'),
  ]);

  const utentePerId = new Map((utenti ?? []).map((u) => [u.id, u]));

  // --- Weekend migliore in assoluto (singolo punteggio più alto) -----------
  let weekendMigliore: {
    utente: { username: string; nome_squadra: string; colore_primario: string } | null;
    evento: { nome: string; numero_round: number | null } | null;
    punti: number;
  } | null = null;

  for (const p of punteggi ?? []) {
    if (!weekendMigliore || p.totale_weekend > weekendMigliore.punti) {
      weekendMigliore = {
        utente: utentePerId.get(p.utente_id) ?? null,
        evento: eventoPerId.get(p.evento_id) ?? null,
        punti: p.totale_weekend,
      };
    }
  }

  // --- Media punti per utente ------------------------------------------------
  const sommaPerUtente = new Map<string, { somma: number; conteggio: number }>();
  for (const p of punteggi ?? []) {
    const attuale = sommaPerUtente.get(p.utente_id) ?? { somma: 0, conteggio: 0 };
    sommaPerUtente.set(p.utente_id, { somma: attuale.somma + Number(p.totale_weekend ?? 0), conteggio: attuale.conteggio + 1 });
  }
  const mediaPuntiPerUtente = Array.from(sommaPerUtente.entries())
    .map(([utenteId, { somma, conteggio }]) => ({
      utente: utentePerId.get(utenteId) ?? null,
      media: conteggio > 0 ? Math.round((somma / conteggio) * 10) / 10 : 0,
      weekendDisputati: conteggio,
    }))
    .filter((r) => r.utente)
    .sort((a, b) => b.media - a.media);

  // --- Piloti più schierati (in tutta la lega) --------------------------
  const conteggioPilota = new Map<string, number>();
  const formazioniDimenticatePerUtente = new Map<string, number>();

  for (const f of formazioni ?? []) {
    for (const pilotaId of [f.pilota_moto3_id, f.pilota_moto2_id, f.pilota_motogp_1_id, f.pilota_motogp_2_id]) {
      if (!pilotaId) continue;
      conteggioPilota.set(pilotaId, (conteggioPilota.get(pilotaId) ?? 0) + 1);
    }
    if (f.auto_riproposta) {
      formazioniDimenticatePerUtente.set(f.utente_id, (formazioniDimenticatePerUtente.get(f.utente_id) ?? 0) + 1);
    }
  }

  const idPilotiTop = Array.from(conteggioPilota.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  let pilotiPiuSchierati: { nome_completo: string; numero: number | null; colore_team: string | null; volte: number }[] = [];
  if (idPilotiTop.length > 0) {
    const { data: pilotiTop } = await sb
      .from('motogp_piloti')
      .select('id, nome_completo, numero, colore_team')
      .in('id', idPilotiTop);
    const pilotaPerId = new Map((pilotiTop ?? []).map((p) => [p.id, p]));
    pilotiPiuSchierati = idPilotiTop
      .map((id) => {
        const p = pilotaPerId.get(id);
        if (!p) return null;
        return { nome_completo: p.nome_completo, numero: p.numero, colore_team: p.colore_team, volte: conteggioPilota.get(id) ?? 0 };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  const formazioniDimenticate = Array.from(formazioniDimenticatePerUtente.entries())
    .map(([utenteId, volte]) => ({ utente: utentePerId.get(utenteId) ?? null, volte }))
    .filter((r) => r.utente)
    .sort((a, b) => b.volte - a.volte);

  return NextResponse.json({
    stagione,
    weekendDisputati: idEventi.length,
    weekendMigliore,
    mediaPuntiPerUtente,
    pilotiPiuSchierati,
    formazioniDimenticate,
  });
}
