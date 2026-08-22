'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PaginaProtetta } from '@/components/pagina-protetta';
import { useAuth } from '@/components/auth-provider';
import type { CodiceCategoria } from '@/lib/tipi';

interface RigaCategoria {
  id: string;
  username: string;
  nome_squadra: string;
  colore_primario: string;
  numero_gara: number | null;
  punti_categoria: number;
}

const CATEGORIE: { codice: CodiceCategoria; etichetta: string }[] = [
  { codice: 'MotoGP', etichetta: 'MotoGP' },
  { codice: 'Moto2', etichetta: 'Moto2' },
  { codice: 'Moto3', etichetta: 'Moto3' },
];

// Pagina volutamente più piccola/contenuta della classifica generale: un
// passaggio in più per arrivarci (link da /classifica) e grafiche meno
// imponenti (niente frecce di trend, niente stelle mondiali, righe più
// compatte), così la gerarchia visiva resta chiara: qui c'è "una curiosità
// in più", non la classifica che conta per la lega.
function PaginaClassificaCategoriaInterna() {
  const { utente } = useAuth();
  const [categoria, setCategoria] = useState<CodiceCategoria>('MotoGP');
  const [classifica, setClassifica] = useState<RigaCategoria[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    setClassifica(null);
    setErrore(null);
    fetch(`/api/classifica/categoria?codice=${categoria}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.errore) {
          setErrore(data.errore);
          return;
        }
        setClassifica(data.classifica ?? []);
      })
      .catch(() => setErrore('Errore di connessione.'));
  }, [categoria]);

  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/classifica" className="text-asfalto-400 hover:text-white">
          <i className="ti ti-arrow-left text-lg" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="font-display text-lg font-semibold">Classifiche di categoria</h1>
          <p className="text-xs text-asfalto-500 mt-0.5">
            Solo i punti fatti in una singola classe, indipendentemente dal totale generale
          </p>
        </div>
      </div>

      <div className="flex gap-1.5">
        {CATEGORIE.map((c) => (
          <button
            key={c.codice}
            type="button"
            onClick={() => setCategoria(c.codice)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              categoria === c.codice
                ? 'bg-bandiera-rosso text-white'
                : 'bg-white/5 text-asfalto-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {c.etichetta}
          </button>
        ))}
      </div>

      {errore && (
        <div className="rounded-xl bg-bandiera-rosso/10 border border-bandiera-rosso/30 px-3 py-2.5 text-xs">
          {errore}
        </div>
      )}

      {!classifica && !errore && (
        <div className="text-asfalto-400 text-xs flex items-center gap-2 py-8 justify-center">
          <i className="ti ti-loader-2 animate-spin" aria-hidden="true" />
          Caricamento…
        </div>
      )}

      {classifica && classifica.length === 0 && (
        <div className="text-center py-8 text-asfalto-400 text-xs">Nessun dato ancora disponibile.</div>
      )}

      {classifica && classifica.length > 0 && (
        <ol className="space-y-1.5">
          {classifica.map((riga, indice) => {
            const posizione = indice + 1;
            const sonIo = riga.id === utente?.id;
            return (
              <li
                key={riga.id}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm ${
                  sonIo ? 'bg-bandiera-giallo/10 border-bandiera-giallo/30' : 'bg-white/[0.03] border-white/10'
                }`}
              >
                <span className="numero-gara text-sm w-5 text-center shrink-0 text-asfalto-500">{posizione}</span>
                <span
                  className="numero-gara text-xs w-8 text-center shrink-0 rounded-md py-0.5"
                  style={{ color: riga.colore_primario, backgroundColor: `${riga.colore_primario}1A` }}
                >
                  {riga.numero_gara ?? '–'}
                </span>
                <span className="flex-1 min-w-0 truncate">
                  {riga.nome_squadra}
                  {sonIo && <span className="text-asfalto-500 font-normal"> (tu)</span>}
                </span>
                <span className="numero-gara text-base shrink-0">{riga.punti_categoria}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default function PaginaClassificaCategoria() {
  return (
    <PaginaProtetta>
      <PaginaClassificaCategoriaInterna />
    </PaginaProtetta>
  );
}
