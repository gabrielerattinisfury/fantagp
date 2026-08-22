// ============================================================================
// FALLBACK: SCRAPING HTML (piano B)
// ============================================================================
// ATTENZIONE - DIPENDENZA NON INSTALLATA DI DEFAULT: questo file importa
// `playwright`, che NON è elencato in package.json (pesa ~300MB con il
// browser Chromium incluso: non ha senso forzarlo su tutti se il piano A,
// l'API JSON in lib/motogp-api.ts, funziona). Questo modulo oggi NON è
// importato da nessuna parte del codice attivo (vedi sync-motogp.ts, che lo
// cita solo nei commenti) quindi il progetto compila e gira normalmente
// senza Playwright installato.
//
// Se in futuro l'API JSON dovesse diventare inaffidabile e serve attivare
// davvero questo piano B:
//   1. npm install playwright
//   2. npx playwright install chromium
//   3. Collegare le funzioni qui sotto da sync-motogp.ts dove indicato nei
//      commenti di quel file
//
// motogp.com è una Single Page Application: il contenuto (calendario, orari,
// risultati) viene iniettato via JavaScript dopo il caricamento iniziale.
// Un semplice fetch() dell'HTML NON basta — serve un browser headless che
// esegua il JavaScript della pagina, come Playwright o Puppeteer.
//
// QUESTO MODULO SI ATTIVA SOLO SE lib/motogp-api.ts fallisce ripetutamente,
// perché è più lento e più fragile (dipende dalla struttura del DOM, che può
// cambiare). L'ordine di tentativo (vedi lib/sync-motogp.ts) è:
//   1. API JSON pulselive (veloce, dati puliti)
//   2. Questo scraping HTML (più lento, ma resiliente se l'API cambia/blocca)
//   3. Se anche questo fallisce: l'evento/sessione resta "in attesa di
//      sincronizzazione" e l'admin può inserire/correggere a mano dal pannello.
//
// NOTA OPERATIVA: Playwright richiede un browser Chromium scaricato (~300MB)
// e funziona bene su un server Node tradizionale (es. Railway, Render, una VM)
// ma NON funziona sull'edge runtime di Vercel e ha bisogno di configurazione
// extra anche sulle Vercel serverless functions tradizionali (serve il
// pacchetto @sparticuz/chromium per stare sotto i limiti di dimensione).
// Per questo, se scegli Vercel, valuta di eseguire SOLO questo fallback come
// job separato su un piccolo worker esterno (es. un cron su Railway) che
// scrive poi su Supabase — il resto dell'app (login, formazioni, classifica)
// può comunque restare su Vercel.
// ============================================================================

import { chromium, type Browser } from 'playwright';

let browserCondiviso: Browser | null = null;

async function ottieniBrowser(): Promise<Browser> {
  if (browserCondiviso) return browserCondiviso;
  browserCondiviso = await chromium.launch({ headless: true });
  return browserCondiviso;
}

export async function chiudiBrowser() {
  if (browserCondiviso) {
    await browserCondiviso.close();
    browserCondiviso = null;
  }
}

export interface RigaClassificaScraped {
  posizione: number | null;
  nomePilota: string;
  numeroMoto: number | null;
  punti: number;
  stato: string | null; // testo grezzo per debug, es "DNF", "DNS", "DSQ"
}

/**
 * Esegue lo scraping della pagina pubblica dei risultati di una sessione.
 * URL atteso, esempio (con {anno} = stagione corrente, mai hardcoded):
 * https://www.motogp.com/it/gp-results/{anno}/ITA/MotoGP/RAC/Classification
 * Il pattern URL ufficiale va confermato/aggiornato osservando il sito al
 * momento del deploy, perché Dorna a volte modifica gli slug.
 */
export async function scrapeClassificaSessione(url: string): Promise<RigaClassificaScraped[]> {
  const browser = await ottieniBrowser();
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Attende che la tabella risultati sia effettivamente renderizzata dal JS.
    // Il selettore va verificato/aggiornato ispezionando il sito reale: questo
    // è un punto di partenza basato sulla struttura tipica dei siti Dorna
    // (tabella con classe "results-table" o componente "classification").
    await page.waitForSelector('table', { timeout: 15000 }).catch(() => null);

    const righe = await page.evaluate(() => {
      const tabella = document.querySelector('table');
      if (!tabella) return [];
      const trs = Array.from(tabella.querySelectorAll('tbody tr'));
      return trs.map((tr) => {
        const celle = Array.from(tr.querySelectorAll('td')).map((td) =>
          (td.textContent || '').trim()
        );
        return celle;
      });
    });

    // Il mapping esatto colonna->campo va calibrato osservando l'HTML reale
    // al momento dell'implementazione finale (le colonne tipiche sono:
    // posizione, numero, pilota, team, moto, tempo/distacco, punti).
    return righe
      .map((celle): RigaClassificaScraped | null => {
        if (celle.length < 3) return null;
        const posizione = parseInt(celle[0], 10);
        const numeroMoto = parseInt(celle[1], 10);
        const nomePilota = celle[2] ?? '';
        const punti = parseFloat(celle[celle.length - 1]);
        return {
          posizione: Number.isFinite(posizione) ? posizione : null,
          numeroMoto: Number.isFinite(numeroMoto) ? numeroMoto : null,
          nomePilota,
          punti: Number.isFinite(punti) ? punti : 0,
          stato: null,
        };
      })
      .filter((r): r is RigaClassificaScraped => r !== null && r.nomePilota.length > 0);
  } finally {
    await page.close();
  }
}

/**
 * Esegue lo scraping della pagina calendario pubblica, per recuperare round,
 * date e nomi evento in caso l'API JSON non sia disponibile.
 * @param anno L'anno della stagione corrente (mai hardcoded: va sempre
 * passato dinamicamente, letto da motogp_stagioni dove corrente = true, o
 * dall'anno solare corrente come fallback estremo).
 */
export async function scrapeCalendario(anno: number): Promise<
  { nomeEvento: string; dataInizio: string | null; dataFine: string | null }[]
> {
  const url = `https://www.motogp.com/it/calendar/${anno}`;
  const browser = await ottieniBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('[class*="calendar"]', { timeout: 15000 }).catch(() => null);

    // Selettori indicativi: da calibrare sull'HTML reale del sito al momento
    // del deploy (ispezionare con gli strumenti per sviluppatori del browser).
    return await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('[class*="event"]'));
      return card
        .map((el) => {
          const nome = el.querySelector('[class*="title"], h3, h4')?.textContent?.trim() ?? '';
          const data = el.querySelector('time')?.getAttribute('datetime') ?? null;
          return { nomeEvento: nome, dataInizio: data, dataFine: null };
        })
        .filter((e) => e.nomeEvento.length > 0);
    });
  } finally {
    await page.close();
  }
}
