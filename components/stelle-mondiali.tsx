// ============================================================================
// STELLE MONDIALI
// ============================================================================
// Riconoscimento onorifico decorativo (es. titoli vinti in stagioni fanta
// precedenti), assegnato manualmente dall'admin — vedi
// app/api/admin/utenti/stelle/route.ts e app/admin/modifica-utente. Non entra
// nel calcolo punti: è solo un badge visivo accanto all'identità dell'utente.
// ============================================================================

export function StelleMondiali({
  n,
  colore = '#FFD400',
  taglia = 'sm',
}: {
  n: number;
  colore?: string;
  taglia?: 'xs' | 'sm' | 'md';
}) {
  if (!n || n <= 0) return null;

  const dimensioneTesto = taglia === 'xs' ? 'text-[10px]' : taglia === 'md' ? 'text-sm' : 'text-xs';

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${dimensioneTesto} shrink-0`}
      style={{ color: colore }}
      title={`${n} stella mondiale${n === 1 ? '' : 'i'}`}
      aria-label={`${n} stella mondiale${n === 1 ? '' : 'i'}`}
    >
      {Array.from({ length: n }).map((_, i) => (
        <i key={i} className="ti ti-star-filled" aria-hidden="true" />
      ))}
    </span>
  );
}
