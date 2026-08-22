'use client';

interface OpzionePilota {
  pilotaId: string;
  nome: string;
  numero: number | null;
  urlFoto?: string | null;
  coloreTeam?: string | null;
}

const COLORE_FALLBACK = '#71808a'; // grigio neutro se il team non ha un colore ufficiale noto

function IniziliPilota({ nome, colore }: { nome: string; colore: string }) {
  const iniziali = nome
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  return (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
      style={{ backgroundColor: colore }}
    >
      {iniziali || '?'}
    </div>
  );
}

export function SelettorePiloti({
  etichetta,
  opzioni,
  selezionati,
  maxSelezionabili,
  disabilitato,
  onCambia,
}: {
  etichetta: string;
  opzioni: OpzionePilota[];
  selezionati: string[];
  maxSelezionabili: number;
  disabilitato: boolean;
  onCambia: (nuoviSelezionati: string[]) => void;
}) {
  function handleClick(pilotaId: string) {
    if (disabilitato) return;
    const giaSelezionato = selezionati.includes(pilotaId);
    if (giaSelezionato) {
      onCambia(selezionati.filter((id) => id !== pilotaId));
      return;
    }
    if (selezionati.length >= maxSelezionabili) {
      // Mai ignorare silenziosamente un tap: l'utente si aspetta che
      // succeda qualcosa. Per max=1 il nuovo pilota prende il posto
      // dell'unico selezionato; per max>1 (es. MotoGP) si "fa scorrere la
      // fila" rimuovendo il primo scelto e aggiungendo il nuovo in coda,
      // così l'azione più recente dell'utente è sempre quella che vince.
      onCambia([...selezionati.slice(1), pilotaId]);
      return;
    }
    onCambia([...selezionati, pilotaId]);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-sm font-medium text-asfalto-200">{etichetta}</h3>
        <span className="text-xs text-asfalto-500">
          {selezionati.length}/{maxSelezionabili} schierati
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {opzioni.map((opzione) => {
          const selezionato = selezionati.includes(opzione.pilotaId);
          const colore = opzione.coloreTeam || COLORE_FALLBACK;
          return (
            <button
              key={opzione.pilotaId}
              type="button"
              disabled={disabilitato}
              onClick={() => handleClick(opzione.pilotaId)}
              aria-pressed={selezionato}
              className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ${
                disabilitato ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'
              } ${selezionato ? '' : 'bg-asfalto-800 border-white/10 hover:border-white/25'}`}
              style={
                selezionato
                  ? { backgroundColor: `${colore}26`, borderColor: `${colore}80` }
                  : undefined
              }
            >
              {opzione.urlFoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={opzione.urlFoto}
                  alt=""
                  className="w-11 h-11 rounded-full object-cover shrink-0 bg-asfalto-700"
                  style={selezionato ? { boxShadow: `0 0 0 2px ${colore}` } : undefined}
                  loading="lazy"
                />
              ) : (
                <IniziliPilota nome={opzione.nome} colore={colore} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{opzione.nome}</p>
                <p
                  className="numero-gara text-xs"
                  style={{ color: selezionato ? colore : '#71808a' }}
                >
                  #{opzione.numero ?? '–'}
                </p>
              </div>
              {selezionato && (
                <i
                  className="ti ti-circle-check-filled text-lg shrink-0"
                  style={{ color: colore }}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
