'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type Seance = { key: string; name: string; reason: string };

/** « Dans votre sac de séance » : affiché quand la fiche est ouverte depuis une séance (?seance=). */
function Context({ seances }: { seances: Seance[] }) {
  const key = useSearchParams().get('seance');
  const s = seances.find((x) => x.key === key);
  if (!s) return null;
  return (
    <aside className="product-context">
      <span className="eyebrow">DANS VOTRE SAC DE SÉANCE</span>
      <strong>{s.name}</strong>
      <p>{s.reason}</p>
      <a href="/#preparer">Revoir ma préparation ↗</a>
    </aside>
  );
}

/** Lu dans le navigateur, sous Suspense : la fiche reste un HTML statique, et rien d’autre n’attend ce bloc. */
export function SeanceContext({ seances }: { seances: Seance[] }) {
  return (
    <Suspense fallback={null}>
      <Context seances={seances} />
    </Suspense>
  );
}
