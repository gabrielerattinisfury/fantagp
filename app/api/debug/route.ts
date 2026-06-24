import { NextResponse } from 'next/server';
import { ottieniSessioneCorrente } from '@/lib/auth';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': 'https://www.motogp.com/',
  'Origin': 'https://www.motogp.com',
  'Accept': 'application/json',
};

export async function GET() {
  const sessione = await ottieniSessioneCorrente();
  if (!sessione || sessione.ruolo !== 'admin') {
    return NextResponse.json({ errore: 'Solo admin' }, { status: 403 });
  }

  const risultati: Record<string, unknown> = {};

  // 1. Recupera stagione corrente
  try {
    const res = await fetch('https://api.motogp.pulselive.com/motogp/v1/results/seasons', {
      headers: HEADERS, cache: 'no-store',
    });
    const data = await res.json();
    const stagione = data.find((s: { current: boolean; id: string; year: number }) => s.current);
    risultati.stagione = stagione;

    if (stagione) {
      // 2. Recupera categorie
      try {
        const resCat = await fetch(
          `https://api.motogp.pulselive.com/motogp/v1/results/categories?seasonUuid=${stagione.id}`,
          { headers: HEADERS, cache: 'no-store' }
        );
        risultati.categorie_status = resCat.status;
        if (resCat.ok) {
          const cat = await resCat.json();
          risultati.categorie = cat;

          // 3. Per la prima categoria, prova gli standings
          if (cat.length > 0) {
            const primaCat = cat[0];
            const resStand = await fetch(
              `https://api.motogp.pulselive.com/motogp/v1/results/standings?seasonUuid=${stagione.id}&categoryUuid=${primaCat.id}`,
              { headers: HEADERS, cache: 'no-store' }
            );
            risultati.standings_status = resStand.status;
            risultati.standings_categoria = primaCat.name;
            if (resStand.ok) {
              const stand = await resStand.json();
              // Mostra solo i primi 3 per non appesantire la risposta
              risultati.standings_esempio = Array.isArray(stand)
                ? stand.slice(0, 3)
                : { keys: Object.keys(stand), primo: JSON.stringify(stand).slice(0, 500) };
            } else {
              risultati.standings_errore = await resStand.text();
            }
          }
        } else {
          risultati.categorie_errore = await resCat.text();
        }
      } catch (err) {
        risultati.categorie_eccezione = String(err);
      }
    }
  } catch (err) {
    risultati.stagione_eccezione = String(err);
  }

  return NextResponse.json(risultati, { status: 200 });
}
