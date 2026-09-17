'use client';
import { useState, useSyncExternalStore } from 'react';
import { money, type Product } from '@/lib/catalog';

/**
 * Banc d’essai de la scène produit : les mêmes modèles détourés, trois scènes et deux
 * dispositions, pour choisir à l’œil. Page interne, hors index et hors plan de site.
 */
const STAGES = [
  ['toile', 'Toile', 'Un tapis clair, une lumière douce, la même pour tous les modèles.'],
  ['teinte', 'Teinte', 'Le fond prend une nuance tirée du modèle lui-même, à luminosité égale.'],
  ['ring', 'Ring', 'Le noir de la salle, un projecteur, le modèle seul dans la lumière.'],
] as const;
const LAYOUTS = [
  ['grille', 'Grille', 'Tous les modèles à la même taille.'],
  ['rythme', 'Rythme', 'Un modèle en grand tous les sept, le reste autour.'],
] as const;

// Le choix tient d’une visite à l’autre : on compare en revenant, pas en se souvenant.
// Sans stockage local (navigation privée), il tient au moins le temps de la page.
let memory = '';
const labStore = {
  subscribe: (notify: () => void) => {
    window.addEventListener('boutique:labo', notify);
    return () => window.removeEventListener('boutique:labo', notify);
  },
  read: () => {
    try {
      return localStorage.getItem('boutique-labo') || memory;
    } catch {
      return memory;
    }
  },
  write: (value: string) => {
    memory = value;
    try {
      localStorage.setItem('boutique-labo', value);
    } catch {}
    window.dispatchEvent(new Event('boutique:labo'));
  },
};

export function StageLab({ items }: { items: Product[] }) {
  const saved = useSyncExternalStore(labStore.subscribe, labStore.read, () => '');
  let choice: { stage?: string; layout?: string } = {};
  try {
    choice = saved ? JSON.parse(saved) : {};
  } catch {}
  const stage = STAGES.some(([id]) => id === choice.stage) ? choice.stage! : 'toile';
  const layout = LAYOUTS.some(([id]) => id === choice.layout) ? choice.layout! : 'grille';
  const setStage = (id: string) => labStore.write(JSON.stringify({ stage: id, layout }));
  const setLayout = (id: string) => labStore.write(JSON.stringify({ stage, layout: id }));
  const [original, setOriginal] = useState(false);

  return (
    <div className="labo">
      <div className="labo-controls">
        <fieldset>
          <legend>La scène</legend>
          {STAGES.map(([id, label, note]) => (
            <button
              key={id}
              type="button"
              aria-pressed={stage === id}
              onClick={() => setStage(id)}
              title={note}
            >
              {label}
            </button>
          ))}
        </fieldset>
        <fieldset>
          <legend>La disposition</legend>
          {LAYOUTS.map(([id, label, note]) => (
            <button
              key={id}
              type="button"
              aria-pressed={layout === id}
              onClick={() => setLayout(id)}
              title={note}
            >
              {label}
            </button>
          ))}
        </fieldset>
        <label className="labo-before">
          <input
            type="checkbox"
            checked={original}
            onChange={(e) => setOriginal(e.target.checked)}
          />
          Voir les photos d’origine
        </label>
      </div>
      <p className="labo-note" aria-live="polite">
        {STAGES.find(([id]) => id === stage)?.[2]}{' '}
        {LAYOUTS.find(([id]) => id === layout)?.[2]}
      </p>
      <div className="labo-grid" data-stage={stage} data-layout={layout}>
        {items.map((p, i) => (
          <article
            key={p.id}
            className="labo-card"
            data-mode={p.cut?.mode}
            data-vivid={p.cut?.vivid ? '' : undefined}
            data-bright={p.cut && p.cut.lum > 0.72 ? '' : undefined}
            data-dark={p.cut && p.cut.lum < 0.24 ? '' : undefined}
            style={{ '--tint': p.cut?.tint ?? '#d9dccf' } as React.CSSProperties}
          >
            <a href={`/produits/${p.slug}/`} className="labo-stage">
              <span className="labo-index">{String(i + 1).padStart(2, '0')}</span>
              <span className="labo-family">{p.brand}</span>
              {original || !p.cut ? (
                <img
                  className="labo-original"
                  src={p.images[0]?.small}
                  alt={p.images[0]?.alt || p.name}
                  width={480}
                  height={480}
                  loading="lazy"
                />
              ) : (
                <img
                  className="labo-cut"
                  src={p.cut.small}
                  srcSet={`${p.cut.small} 480w, ${p.cut.large} 960w`}
                  sizes="(max-width: 600px) 46vw, (max-width: 1000px) 31vw, 24vw"
                  alt={p.images[0]?.alt || p.name}
                  width={480}
                  height={480}
                  loading={i < 4 ? 'eager' : 'lazy'}
                />
              )}
            </a>
            <h3>
              <a href={`/produits/${p.slug}/`}>{p.name.split(' — ')[0]}</a>
            </h3>
            <p>
              <strong>{money(p.price)}</strong> <span>prix prévu</span>
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
