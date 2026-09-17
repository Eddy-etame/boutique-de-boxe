'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from 'lucide-react';
import { money, type Product } from '@/lib/catalog';

/**
 * Le ring de l’accueil : quatre modèles, un par round, sous un projecteur qui suit le pointeur.
 * Chaque modèle est présenté comme un boxeur avant le combat : sa « fiche de pesée » (marque,
 * tailles, prix prévu).
 *
 * Les modèles glissent comme n’importe quelle surface tactile : la piste est un défilement natif
 * à crans (scroll-snap). Le doigt, le pavé tactile, la molette horizontale, le clavier et les
 * flèches pilotent tous la même piste ; le round affiché se lit sur la position de défilement.
 * Le round avance seul tant que le visiteur ne prend pas la main ; il s’arrête au survol, au
 * focus, au toucher, sur le bouton pause, et n’avance jamais en mouvement réduit.
 */
export function HeroRing({ items, labels = [] }: { items: Product[]; labels?: string[] }) {
  const [round, setRound] = useState(0);
  const [auto, setAuto] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  // La piste : le round suit sa position, d’où qu’elle vienne (doigt, pavé tactile, flèches) ; à la
  // souris, elle suit la main puis se cale sur le modèle le plus proche. Écouteurs posés ici et non
  // dans le JSX : la piste est une surface de défilement, pas un contrôle.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const width = () => Math.max(1, el.clientWidth);
    const calm = () =>
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.motion === 'reduce';
    const snapTo = (n: number) =>
      el.scrollTo({ left: Math.max(0, Math.min(items.length - 1, n)) * width(), behavior: calm() ? 'auto' : 'smooth' });
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const n = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollLeft / width())));
        setRound((r) => (r === n ? r : n));
      });
    };
    const d = { active: false, moved: false, x: 0, left: 0 };
    const onDown = (ev: PointerEvent) => {
      setAuto(false);
      if (ev.pointerType !== 'mouse' || ev.button !== 0) return;
      Object.assign(d, { active: true, moved: false, x: ev.clientX, left: el.scrollLeft });
    };
    const onMove = (ev: PointerEvent) => {
      if (!d.active) return;
      const dx = ev.clientX - d.x;
      if (!d.moved && Math.abs(dx) < 5) return;
      d.moved = true;
      el.dataset.dragging = '';
      el.scrollLeft = d.left - dx;
    };
    const onUp = () => {
      if (!d.active) return;
      d.active = false;
      if (!d.moved) return;
      delete el.dataset.dragging;
      // Un geste franc (un cinquième de la largeur) suffit à passer au modèle voisin.
      const moved = (el.scrollLeft - d.left) / width();
      snapTo(Math.round(d.left / width()) + (moved > 0.2 ? 1 : moved < -0.2 ? -1 : 0));
    };
    // Un glissement n’est pas un clic : le lien du modèle ne s’ouvre pas en fin de geste.
    const onClick = (ev: MouseEvent) => {
      if (!d.moved) return;
      ev.preventDefault();
      ev.stopPropagation();
      d.moved = false;
    };
    const onWheel = (ev: WheelEvent) => {
      if (Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) setAuto(false);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onUp);
    el.addEventListener('click', onClick, true);
    el.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onUp);
      el.removeEventListener('click', onClick, true);
      el.removeEventListener('wheel', onWheel);
    };
  }, [items.length]);

  if (!items.length) return null;
  const p = items[round] ?? items[0];
  const go = (n: number, byUser = true) => {
    if (byUser) setAuto(false);
    const el = track.current;
    if (!el) return;
    const next = (n + items.length) % items.length;
    const calm =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.motion === 'reduce';
    el.scrollTo({ left: next * el.clientWidth, behavior: calm ? 'auto' : 'smooth' });
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
      {/* La piste : défilement natif à crans. Le geste du visiteur arrête la rotation automatique. */}
      <div ref={track} className="hero-ring-track">
        {items.map((x, n) => (
          <a
            key={x.id}
            href={`/produits/${x.slug}/`}
            className="hero-ring-product"
            data-active={n === round ? '' : undefined}
            data-mode={x.cut?.mode}
            aria-label={short(x)}
            tabIndex={n === round ? 0 : -1}
            draggable={false}
          >
            <img
              src={x.cut?.large ?? x.images[0]?.src}
              alt={x.images[0]?.alt || x.name}
              width={960}
              height={960}
              loading={n === 0 ? 'eager' : 'lazy'}
              fetchPriority={n === 0 ? 'high' : 'auto'}
              decoding="async"
              draggable={false}
            />
          </a>
        ))}
      </div>
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
