'use client';
import { useMemo } from 'react';
import { parseSession, useSessionRaw, writeSession } from '@/lib/next/store';
import type { Product } from '@/lib/catalog';
import { cleanName, money } from '@/lib/catalog';
import selection from '@/lib/data/selection.json';
import { homeCopy as h } from '@/lib/next/copy/home';
import { globalCopy as g } from '@/lib/next/copy/global';
import { sessionsCopy as sc } from '@/lib/next/copy/sessions';

type Context = 'premiere' | 'technique' | 'enfant';
type Discipline = 'boxe' | 'mma';
type Stored = { discipline: Discipline; context: Context; owned: string[]; kept?: string[] };

function read(raw: string): Stored {
  const d = parseSession(raw) as Partial<Stored>;
  return {
    discipline: d.discipline === 'mma' ? 'mma' : 'boxe',
    context: (['premiere', 'technique', 'enfant'] as Context[]).includes(d.context as Context) ? (d.context as Context) : 'premiere',
    owned: Array.isArray(d.owned) ? d.owned.filter((v): v is string => typeof v === 'string') : [],
  };
}

function transition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
  if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(update);
  else update();
}

/**
 * Hero B — le vestiaire. Les pièces d’une séance posées à plat ; trois choix
 * en mots simples recomposent le lot sur place ; le sac de séance suit partout.
 */
export function HeroB({ items }: { items: Product[] }) {
  const raw = useSessionRaw();
  const state = useMemo(() => read(raw), [raw]);

  const session = useMemo(
    () => selection.sessions.find((s) => s.key === `${state.discipline}:${state.context}`) ?? selection.sessions[0],
    [state.discipline, state.context],
  );
  const pieces = session.products.flatMap((r) => {
    const product = items.find((p) => p.id === r.id);
    const copy = sc.items[session.key]?.[r.id];
    return product ? [{ ...r, label: copy?.label ?? r.label, reason: copy?.reason ?? r.reason, product }] : [];
  });
  const kept = pieces.filter((p) => !state.owned.includes(p.id));
  const total = kept.reduce((sum, p) => sum + p.product.price, 0);

  function save(next: Stored) {
    const keptIds = (
      selection.sessions.find((s) => s.key === `${next.discipline}:${next.context}`)?.products ?? []
    )
      .map((p) => p.id)
      .filter((id) => !next.owned.includes(id) && items.some((p) => p.id === id));
    transition(() => writeSession({ ...parseSession(raw), ...next, kept: keptIds }));
  }

  const choices: { value: Context; label: string }[] = [
    { value: 'premiere', label: h.heroB.choices.start },
    { value: 'technique', label: h.heroB.choices.train },
    { value: 'enfant', label: h.heroB.choices.child },
  ];

  return (
    <section className="ne ne-heroB" aria-labelledby="heroB-title">
      <div className="ne-heroB-head">
        <div>
          <span className="ne-label">{h.heroB.kicker}</span>
          <h1 id="heroB-title">{h.heroB.title}</h1>
        </div>
        <div>
          <p className="ne-lead">{h.heroB.sentence}</p>
          <div className="ne-choices" role="group" aria-label={sc.disciplines.boxe + ' / ' + sc.disciplines.mma} style={{ marginTop: 16 }}>
            {(['boxe', 'mma'] as Discipline[]).map((d) => (
              <button
                key={d}
                type="button"
                className="ne-chip"
                aria-pressed={state.discipline === d}
                onClick={() => save({ ...state, discipline: d })}
              >
                {sc.disciplines[d]}
              </button>
            ))}
          </div>
          <div className="ne-choices" role="group" aria-label={h.heroB.kicker} style={{ marginTop: 10 }}>
            {choices.map((c) => (
              <button
                key={c.value}
                type="button"
                className="ne-chip"
                aria-pressed={state.context === c.value}
                onClick={() => save({ ...state, context: c.value })}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ne-locker" aria-live="polite">
        {pieces.length === 0 && <p className="ne-lead">{sc.empty}</p>}
        {pieces.map((p, i) => {
          const owned = state.owned.includes(p.id);
          return (
            <article
              key={p.id}
              className={'ne-piece' + (owned ? ' is-owned' : '')}
              style={{ viewTransitionName: `piece-${p.id}` } as React.CSSProperties}
            >
              <a href={`/produits/${p.product.slug}/`} aria-label={cleanName(p.product)}>
                <img src={p.product.images[0].small} alt="" width={480} height={480} loading={i ? 'lazy' : 'eager'} />
              </a>
              <div className="ne-piece-body">
                <span className="ne-label">{p.label}</span>
                <h3>
                  <a href={`/produits/${p.product.slug}/`}>{cleanName(p.product)}</a>
                </h3>
                <p>
                  {h.heroB.reasonPrefix} {p.reason}
                </p>
                <strong>{money(p.product.price)}</strong>
                <label className="ne-own">
                  <input
                    type="checkbox"
                    checked={owned}
                    onChange={(e) =>
                      save({
                        ...state,
                        owned: e.target.checked ? [...state.owned, p.id] : state.owned.filter((id) => id !== p.id),
                      })
                    }
                  />
                  {g.status.inBag}
                </label>
              </div>
            </article>
          );
        })}
      </div>

      <div className="ne-total">
        <span>{h.heroB.totalLabel}</span>
        <b>{money(total)}</b>
        <span className="ne-muted" style={{ color: 'inherit', opacity: 0.8 }}>
          {h.heroB.lentByGym}
        </span>
        <a className="ne-btn" href={`/guides/${session.guide}/`}>
          {h.heroB.primary.label}
        </a>
      </div>
    </section>
  );
}
