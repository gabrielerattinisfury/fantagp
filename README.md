# FantaMotoGP

App di fantacampionato MotoGP/Moto2/Moto3, con sincronizzazione automatica
di calendario, orari e risultati dal sito ufficiale MotoGP.

---

## Installazione rapida (consigliata) — un bottone, pochi minuti

1. **Crea il database** su supabase.com (account gratuito, bastano email + password):
   - **New project** -> dai un nome (es. "fantamotogp") -> scegli una password per il database (annotala) -> crea
   - Aspetta 1-2 minuti, poi vai su **SQL Editor** (menu a sinistra)
   - Apri il file `supabase/migrations/0001_init.sql` di questo progetto, copia **tutto** il contenuto, incollalo nell'editor SQL di Supabase e premi **Run**
   - Vai su **Project Settings -> API**: ti serviranno tra un minuto il **Project URL** e la **service_role secret key** (clicca per rivelarla)

2. **Clicca il bottone Deploy** qui sotto (richiede un account Vercel, gratuito, puoi crearlo al volo con GitHub):

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/TUO-USERNAME/fantamotogp&env=SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,JWT_SECRET,CRON_SECRET,SETUP_CODE&envDescription=Valori%20necessari%20per%20far%20funzionare%20FantaMotoGP&envLink=https://github.com/TUO-USERNAME/fantamotogp/blob/main/README.md)

   *(Il link sopra presume che tu abbia già caricato questo progetto su un tuo repository GitHub **pubblico** — il bottone Deploy funziona in modo affidabile solo con repository pubblici. Non è un problema di sicurezza: il codice non contiene segreti, tutte le chiavi vere restano nelle Environment Variables di Vercel, mai nel codice. Vedi "Se non hai ancora un repository" più sotto se è la prima volta)*

   Vercel ti guiderà a:
   - Collegare/creare il repository su GitHub (un clic)
   - Inserire le variabili richieste — eccole, con dove trovarle:

     | Variabile | Dove trovarla |
     |---|---|
     | `SUPABASE_URL` | Supabase -> Project Settings -> API -> Project URL |
     | `SUPABASE_SERVICE_ROLE_KEY` | Supabase -> Project Settings -> API -> service_role secret |
     | `JWT_SECRET` | Una stringa a caso, lunga: scrivila tu stesso (almeno 32 caratteri, può essere qualunque cosa purché lunga e non indovinabile) |
     | `CRON_SECRET` | Un'altra stringa a caso diversa dalla precedente, stesse regole |
     | `SETUP_CODE` | Un'altra stringa a caso ancora — ti servirà tra un minuto per creare il tuo account, sceglila facile da ricordare/copiare ma non banale |

   - Premi **Deploy** e aspetta 2-3 minuti

3. **Crea il tuo account amministratore dal browser**, senza terminale:
   - Vai su `https://il-tuo-progetto.vercel.app/setup`
   - Inserisci il `SETUP_CODE` scelto sopra, scegli username/password/nome squadra
   - Fatto: sei dentro come amministratore

4. **Sincronizza i dati MotoGP**: dal menu **Admin**, premi **Sincronizza ora**. Popola calendario, piloti, foto e colori team in automatico.

5. **Crea i tuoi amici fantamotociclisti**: da **Admin -> Nuovo fantamotociclista**, assegna a ciascuno username/password e la sua rosa. Da quel momento ognuno accede dal proprio telefono/pc su `https://il-tuo-progetto.vercel.app` e resta loggato.

Da qui in poi non devi fare più nulla: la sincronizzazione gira da sola ogni 15 minuti.

### Se non hai ancora un repository GitHub con questo codice

Il bottone Deploy ha bisogno che il codice sia su un tuo repository GitHub. Se non l'hai ancora fatto:

1. Vai su github.com/new, crea un repository (es. "fantamotogp"), **pubblico** (necessario per il bottone Deploy automatico — se preferisci tenerlo privato, usa l'installazione manuale più sotto, dove questo vincolo non c'è)
2. Sul tuo computer, apri il Terminale (Mac) o PowerShell (Windows) nella cartella del progetto:

```bash
git init
git add .
git commit -m "Prima versione FantaMotoGP"
git branch -M main
git remote add origin https://github.com/TUO-USERNAME/fantamotogp.git
git push -u origin main
```

3. Sostituisci `TUO-USERNAME` nel link del bottone Deploy qui sopra con il tuo username GitHub reale, poi clicca il bottone

---

## Installazione manuale (alternativa, più controllo passo-passo)

Se preferisci capire/controllare ogni passaggio invece di usare il bottone Deploy, segui questa via equivalente ma più granulare.

### 1. Account necessari

1. **GitHub** (github.com/signup) — qui caricherai il codice
2. **Supabase** (supabase.com) — il database dell'app (piano Free)
3. **Vercel** (vercel.com/signup) — dove l'app girerà online (piano Hobby, gratuito)

### 2. Crea il database su Supabase

Segui i passaggi 1 della sezione "Installazione rapida" qui sopra: sono identici.

### 3. Carica il codice su GitHub

Stessi comandi della sezione "Se non hai ancora un repository GitHub" qui sopra, con una differenza: qui puoi tranquillamente creare il repository **privato** su github.com/new, dato che il vincolo "deve essere pubblico" riguarda solo il bottone Deploy automatico, non il flusso manuale di import in Vercel.

### 4. Genera i segreti dell'app

Servono tre stringhe casuali lunghe e segrete (`JWT_SECRET`, `CRON_SECRET`, `SETUP_CODE`). Se hai un Mac o Linux, apri il Terminale e digita tre volte:

```bash
openssl rand -base64 32
```

Se sei su Windows, puoi generarle su un sito come generate-secret.vercel.app/32, oppure con PowerShell:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 5. Deploy su Vercel (manuale)

1. Vai su vercel.com/new, collega GitHub, seleziona il repository -> **Import**
2. Nella sezione **Environment Variables**, aggiungi le 5 variabili:

   | Nome | Valore |
   |---|---|
   | `SUPABASE_URL` | il Project URL di Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | la service_role key di Supabase |
   | `JWT_SECRET` | la prima stringa casuale generata |
   | `CRON_SECRET` | la seconda stringa casuale generata |
   | `SETUP_CODE` | la terza stringa casuale generata |

3. Premi **Deploy** e aspetta 2-3 minuti
4. Vai su `https://il-tuo-progetto.vercel.app/setup` e crea il tuo account admin (vedi punto 3 dell'installazione rapida)

La sincronizzazione automatica (`/api/cron`, configurata in `vercel.json`) partirà da sola ogni 15 minuti una volta che il progetto è online — inclusa nel piano gratuito di Vercel per questo volume di chiamate.

---

## Manutenzione ordinaria

- La sincronizzazione gira da sola ogni 15 minuti: di norma non devi fare nulla
- In caso di dati mancanti/errati dopo un weekend di gara (capita raramente, dipende dalla disponibilità del sito MotoGP), usa **Admin -> Sincronizza ora** per un tentativo immediato
- Per casi eccezionali (formazione da correggere a mano, punteggio da rettificare, gara da segnare manualmente annullata) usa il **Pannello override** raggiungibile da Admin: è pensato per essere usato raramente e con cautela, dato che bypassa i controlli normali dell'app

---

## Installazione per i fantamotociclisti (come un'app vera, dal browser)

FantaMotoGP è una **Progressive Web App (PWA)**: si installa come un'app
nativa — icona sulla schermata Home, si apre a schermo intero senza barra
del browser — ma senza passare da App Store o Play Store e senza pesare
nulla in più del normale caricamento del sito (qualche decina di KB).

Basta che ogni fantamotociclista visiti il link del sito (es.
`https://il-tuo-progetto.vercel.app`) col proprio telefono o pc:

- **Android/Chrome/desktop**: dopo il login compare un banner in basso
  "Installa FantaMotoGP" — un tocco e l'icona appare sulla Home/Dock
- **iPhone/iPad (Safari)**: iOS non permette l'installazione automatica con
  un click (limite di Apple, non di questa app); il banner mostra 3 passaggi
  semplici: Condividi → "Aggiungi a Home" → Aggiungi
- **Su PC** (Windows/Mac): dalla barra degli indirizzi di Chrome/Edge compare
  un'icona di installazione, oppure si può comunque usare normalmente dal
  browser, senza alcuna differenza funzionale

Da quel momento l'app si comporta come qualunque altra app installata: icona
propria, niente barra del browser, accesso rapido. Resta comunque sempre lo
stesso sito web dietro le quinte (non esiste un "file da installare" da
scaricare): aggiornamenti e correzioni si propagano automaticamente a tutti,
senza che nessuno debba reinstallare nulla.

---



- Puoi schierare/modificare la tua formazione (1 Moto3, 1 Moto2, 2 MotoGP) in qualsiasi momento, quante volte vuoi, finché la gara Moto3 del weekend non è partita
- Ogni nuovo salvataggio sovrascrive semplicemente il precedente: nessun vincolo "una sola scelta", puoi cambiare idea fino all'ultimo minuto utile
- Se dimentichi di schierare, viene ripresa automaticamente la tua ultima formazione valida
- Nella Sprint Race (solo MotoGP) prendi sempre i punti dei 2 migliori piloti dell'intera tua rosa MotoGP (3 piloti), indipendentemente da chi hai schierato per la gara

---

## Struttura del progetto (per riferimento)

```
app/                    Pagine e API routes (Next.js App Router)
  api/                  Backend: autenticazione, formazioni, sync, admin
  setup/                Creazione guidata del primo account admin
  formazione/           Schermata principale: schierare i piloti
  classifica/           Classifica generale
  calendario/           Calendario stagione + dettaglio punteggi weekend
  profilo/              Personalizzazione utente
  admin/                Pannello amministratore + override
components/             Componenti React condivisi
lib/                    Logica di business (motore punteggi, sync MotoGP, auth)
  calcolo-punteggi.ts   Motore di calcolo punteggi (funzione pura, testata)
  __tests__/            Test del motore di calcolo
  sync-motogp.ts        Sincronizzazione calendario/piloti/risultati
  motogp-api.ts         Client per l'API ufficiosa di motogp.com
  fallback-scraping.ts  Piano B se l'API non risponde (richiede Playwright)
  sessione-edge.ts      Verifica JWT compatibile con l'Edge Runtime
supabase/migrations/    Schema del database
public/                  Manifest PWA, icone, service worker (installabilità)
scripts/                 Script di utilità (es. generazione icone)
middleware.ts           Protezione route (autenticazione/autorizzazione)
```

## Note tecniche importanti

- **Adattabilità multi-stagione**: l'app non ha mai un anno scritto fisso nel
  codice. Calendario, piloti, numeri di gara e colori team vengono sempre
  letti dalla stagione marcata "corrente" dal sito MotoGP stesso: quando
  inizierà una nuova stagione, la sincronizzazione la rileverà da sola.
- **Fonte dati**: l'app usa l'API JSON che il sito motogp.com utilizza
  internamente (non è un'API ufficialmente documentata da Dorna, ma è
  stabile e ampiamente usata da progetti simili). Se in futuro dovesse
  diventare inaffidabile, lib/fallback-scraping.ts contiene un piano B
  basato su scraping del sito pubblico. Non è attivo di default e non fa
  parte della build standard (richiede Playwright, ~300MB con il browser
  incluso, volutamente non installato finché non serve davvero): le
  istruzioni per attivarlo sono commentate in cima al file stesso.
- **Setup guidato**: l'endpoint /api/setup e la pagina /setup permettono di
  creare il primo account admin dal browser, senza terminale. Si
  autodisabilitano per sempre non appena esiste un admin nel database, anche
  conoscendo ancora SETUP_CODE.
- **Test del motore punteggi**: lib/__tests__/calcolo-punteggi.test.ts
  copre i casi concordati (sostituzione pilota, calcolo sprint sui 2
  migliori, formazione dimenticata). Eseguibile con
  `npx tsx lib/__tests__/calcolo-punteggi.test.ts` dopo `npm install`.
