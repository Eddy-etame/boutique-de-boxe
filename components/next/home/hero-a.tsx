'use client';
import { useRef, useState } from 'react';
import type { Product } from '@/lib/catalog';
import { money } from '@/lib/catalog';
import { homeCopy as h } from '@/lib/next/copy/home';
import { globalCopy as g } from '@/lib/next/copy/global';

type MarkKey = 'closure' | 'palm' | 'weight';

/**
 * Hero A — la pièce, à la loupe.
 * Un gant réel en grand ; trois repères posés sur la photo ; la loupe montre la
 * vraie photo de près sous le pointeur, ou dit qu’il n’y en a pas.
 */
export function HeroA({ product }: { product: Product }) {
  const views = product.images;
  const [view, setView] = useState(0);
  const [mark, setMark] = useState<MarkKey | null>(null);
  const [looking, setLooking] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);

  // Repères : coordonnées réelles sur la photo de la paire ; la loupe utilise une vraie
  // photo de près quand elle existe.
  const marks: { key: MarkKey; x: number; y: number; n: string; macro?: string; label: string; note: string }[] = [
    { key: 'closure', x: 31, y: 74, n: '1', macro: views[1]?.src, label: h.heroA.marks.closure, note: h.heroA.notes.closure },
    { key: 'palm', x: 66, y: 58, n: '2', macro: '/products/hero-blade-paume-960.webp', label: h.heroA.marks.palm, note: h.heroA.notes.palm },
    { key: 'weight', x: 52, y: 18, n: '3', label: h.heroA.marks.weight, note: h.heroA.notes.weight },
  ];
  const active = marks.find((m) => m.key === mark) ?? null;
  const loupe = active?.macro ?? views[1]?.src ?? views[0].src;

  function place(clientX: number, clientY: number) {
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--x', `${((clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--y', `${((clientY - r.top) / r.height) * 100}%`);
  }
  function focusMark(m: (typeof marks)[number]) {
    const el = box.current;
    if (!el) return;
    el.style.setProperty('--x', `${m.x}%`);
    el.style.setProperty('--y', `${m.y}%`);
    setMark(m.key);
    setLooking(Boolean(m.macro));
  }

  const oz = product.sizes.filter((s) => /oz/i.test(s));
  return (
    <section className="ne ne-heroA" aria-labelledby="heroA-title">
      <div
        ref={box}
        className={'ne-object' + (looking ? ' is-looking' : '')}
        onPointerMove={(e) => {
          place(e.clientX, e.clientY);
          if (drag.current && Math.abs(e.clientX - drag.current.x) > 40 && !drag.current.moved) {
            drag.current.moved = true;
            setView((v) => (v + 1) % views.length);
          }
        }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, moved: false };
          place(e.clientX, e.clientY);
          if (e.pointerType !== 'mouse') setLooking(Boolean(active?.macro ?? views[1]));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerEnter={() => setLooking(Boolean(active?.macro ?? views[1]))}
        onPointerLeave={() => {
          drag.current = null;
          setLooking(false);
        }}
      >
        {views.map((img, i) => (
          <img
            key={img.src}
            src={img.src}
            alt={i === view ? img.alt : ''}
            width={img.width}
            height={img.height}
            data-hidden={i === view ? 'false' : 'true'}
            fetchPriority={i === 0 ? 'high' : undefined}
            aria-hidden={i !== view}
          />
        ))}
        <div className="ne-loupe" aria-hidden="true">
          <img src={loupe} alt="" width={960} height={960} loading="eager" />
          <span className="ne-loupe-ring" />
        </div>
        {marks.map((m) => (
          <button
            key={m.key}
            type="button"
            className="ne-mark"
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
            aria-pressed={mark === m.key}
            onPointerEnter={() => setMark(m.key)}
            onFocus={() => focusMark(m)}
            onClick={() => focusMark(m)}
          >
            <i aria-hidden="true">{m.n}</i>
            {m.label}
          </button>
        ))}
        {active && (
          <p className="ne-mark-note" role="status">
            {active.note}
            {!active.macro && ' ' + h.heroA.noMacro}
          </p>
        )}
      </div>
      <div className="ne-heroA-copy">
        <span className="ne-label">{h.heroA.kicker}</span>
        <h1 id="heroA-title">{h.heroA.title}</h1>
        <p className="ne-lead">{h.heroA.sentence}</p>
        <div className="ne-facts" aria-label={product.name}>
          <div className="ne-fact">
            <b>{oz.length ? oz.join(' · ') : '—'}</b>
            <span>{g.units.oz}</span>
          </div>
          <div className="ne-fact">
            <b>{product.specs['Fermeture'] ? product.specs['Fermeture'].split(' ').slice(0, 2).join(' ') : '—'}</b>
            <span>{h.heroA.marks.closure}</span>
          </div>
          <div className="ne-fact">
            <b>{money(product.price)}</b>
            <span>{g.status.pricePlanned}</span>
          </div>
        </div>
        <div className="ne-views" role="group" aria-label={product.name}>
          {views.map((v, i) => (
            <button key={v.src} type="button" className="ne-chip" aria-pressed={view === i} onClick={() => setView(i)}>
              {i + 1}
            </button>
          ))}
        </div>
        <div className="ne-heroA-actions">
          <a className="ne-btn" href={`/produits/${product.slug}/`}>
            {h.heroA.primary.label}
          </a>
          <a className="ne-btn is-secondary" href="/gants-de-boxe/">
            {h.heroA.secondary.label}
          </a>
        </div>
      </div>
    </section>
  );
}
