'use client';
import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from 'lucide-react';
import { money, type Product } from '@/lib/catalog';

/**
 * Le ring de l’accueil : quatre modèles, un par round, sous un projecteur qui suit le pointeur.
 * Chaque modèle est présenté comme un boxeur avant le combat : sa « fiche de pesée » (marque,
 * tailles, prix prévu). Le round avance seul tant que le visiteur ne prend pas la main ; il
 * s’arrête au survol, au focus, sur le bouton pause, et n’avance jamais en mouvement réduit.
 */
export function HeroRing({ items, labels = [] }: { items: Product[]; labels?: string[] }) {
  const [round, setRound] = useState(0);
  // Dès que le visiteur choisit un round, la rotation s’arrête et les changements sont annoncés.
  const [auto, setAuto] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  if (!items.length) return null;
  const p = items[round];
  const go = (n: number, byUser = true) => {
    if (byUser) setAuto(false);
    setRound((n + items.length) % items.length);
  };
  const two = (n: number) => String(n).padStart(2, '0');
  const short = (x: Product) => labels[items.indexOf(x)] || x.name.split(' — ')[0];

  return (
    <div
      ref={stage}
      className="hero-ring"
      role="group"
      aria-roledescription="carrousel"
      aria-label="Quatre modèles à la une"
      data-auto={auto ? '' : undefined}
      style={{ '--tint': p.cut?.tint ?? '#dded76' } as React.CSSProperties}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const el = stage.current;
        if (!el) return;
        const { clientX, clientY } = e;
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          el.style.setProperty('--lx', ((clientX - r.left) / r.width) * 100 + '%');
          el.style.setProperty('--ly', ((clientY - r.top) / r.height) * 100 + '%');
          el.dataset.lit = '';
        });
      }}
      onPointerLeave={() => {
        const el = stage.current;
        if (!el) return;
        cancelAnimationFrame(frame.current);
        el.style.removeProperty('--lx');
        el.style.removeProperty('--ly');
        delete el.dataset.lit;
      }}
    >
      <div className="hero-ring-floor" aria-hidden="true" />
      <div className="hero-ring-ropes" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="hero-ring-light" aria-hidden="true" />
      <span className="hero-ring-count" aria-hidden="true">
        {two(round + 1)}
      </span>
      {items.map((x, n) => (
        <a
          key={x.id}
          href={`/produits/${x.slug}/`}
          className="hero-ring-product"
          data-active={n === round ? '' : undefined}
          data-mode={x.cut?.mode}
          aria-hidden={n !== round}
          tabIndex={n === round ? 0 : -1}
        >
          <img
            src={x.cut?.large ?? x.images[0]?.src}
            alt={x.images[0]?.alt || x.name}
            width={960}
            height={960}
            loading={n === 0 ? 'eager' : 'lazy'}
            fetchPriority={n === 0 ? 'high' : 'auto'}
            decoding="async"
          />
        </a>
      ))}
      <div className="hero-tape" aria-live={auto ? 'off' : 'polite'}>
        <span className="hero-tape-round">
          ROUND {two(round + 1)} <i>/ {two(items.length)}</i>
        </span>
        <strong>{short(p)}</strong>
        <dl>
          <div>
            <dt>Marque</dt>
            <dd>{p.brand}</dd>
          </div>
          <div>
            <dt>Tailles</dt>
            <dd>{p.sizes.length ? p.sizes.slice(0, 4).map((s) => s.split(' (')[0]).join(' · ') : 'Taille unique'}</dd>
          </div>
          <div>
            <dt>Prix prévu</dt>
            <dd className="hero-tape-price">{money(p.price)}</dd>
          </div>
        </dl>
        <a className="hero-tape-link" href={`/produits/${p.slug}/`}>
          Voir la fiche <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </div>
      <div className="hero-ring-controls">
        <button type="button" onClick={() => go(round - 1)} aria-label="Modèle précédent">
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div className="hero-ticks" role="group" aria-label="Choisir un round">
          {items.map((x, n) => (
            <button
              key={x.id}
              type="button"
              aria-label={`Round ${n + 1} : ${short(x)}`}
              aria-current={n === round ? 'true' : undefined}
              onClick={() => go(n)}
            >
              {/* La barre du round en cours se remplit ; quand elle est pleine, le round suivant commence. */}
              <i
                key={n === round ? 'on-' + round : 'off'}
                onAnimationEnd={n === round && auto ? () => go(round + 1, false) : undefined}
              />
            </button>
          ))}
        </div>
        <button type="button" onClick={() => go(round + 1)} aria-label="Modèle suivant">
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="hero-ring-pause"
          onClick={() => setAuto((a) => !a)}
          aria-label={auto ? 'Arrêter le défilement des modèles' : 'Relancer le défilement des modèles'}
        >
          {auto ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
