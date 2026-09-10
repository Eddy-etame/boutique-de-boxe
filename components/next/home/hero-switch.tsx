'use client';
import type { ReactNode } from 'react';
import { useLocal, writeLocal } from '@/lib/next/store';

/** Comparaison en direct des deux heros ; le choix est mémorisé sur ce navigateur. */
export function HeroSwitch({ a, b }: { a: ReactNode; b: ReactNode }) {
  const hero: 'A' | 'B' = useLocal('hero-variant') === 'B' ? 'B' : 'A';
  function choose(next: 'A' | 'B') {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
    const apply = () => writeLocal('hero-variant', next);
    if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(apply);
    else apply();
  }
  return (
    <>
      <div className="ne ne-hero-switch" role="group" aria-label="Deux versions de l’accueil">
        <button type="button" className="ne-chip" aria-pressed={hero === 'A'} onClick={() => choose('A')}>
          A · La pièce, à la loupe
        </button>
        <button type="button" className="ne-chip" aria-pressed={hero === 'B'} onClick={() => choose('B')}>
          B · Votre liste
        </button>
      </div>
      {hero === 'A' ? a : b}
    </>
  );
}
