'use client';
import { useMemo, useState } from 'react';
import { replaceSearch, useSearch } from '@/lib/next/store';
import type { Category, Product } from '@/lib/catalog';
import { cleanName, money } from '@/lib/catalog';
import { matchesSearch } from '@/lib/catalog-tools';
import { categoryCopy as c } from '@/lib/next/copy/category';
import { globalCopy as g } from '@/lib/next/copy/global';

type Answers = { use?: string; level?: string; budget?: string };
const PAGE = 36;

/* Les réponses reposent uniquement sur des données présentes dans les fiches. */
function keep(p: Product, a: Answers): boolean {
  if (a.budget && a.budget !== 'plus' && p.price > Number(a.budget) * 100) return false;
  if (a.level === 'enfant' && !/enfant|junior|kid/i.test(p.audience + ' ' + p.name)) return false;
  if (a.level && a.level !== 'enfant' && /enfant|junior|kid/i.test(p.audience)) return false;
  if (a.use) {
    const text = (p.name + ' ' + p.short + ' ' + Object.values(p.specs).join(' ')).toLowerCase();
    const rules: Record<string, RegExp> = {
      sac: /sac|training|entra[iî]nement|bag/,
      technique: /technique|patte|cible|pao|corde|pr[ée]cision/,
      partenaire: /sparring|partenaire|protection|casque|prot[èe]ge/,
      competition: /comp[ée]tition|lacet|pro\b|ffb|homologu/,
    };
    if (rules[a.use] && !rules[a.use].test(text)) return false;
  }
  return true;
}

function readUrl(search: string): { a: Answers; q: string; sort: string } {
  const s = new URLSearchParams(search);
  return {
    a: { use: s.get('usage') || undefined, level: s.get('niveau') || undefined, budget: s.get('budget') || undefined },
    q: s.get('q') || '',
    sort: s.get('tri') || 'pertinence',
  };
}

function writeUrl(a: Answers, q: string, sort: string) {
  const s = new URLSearchParams(location.search);
  const set = (k: string, v?: string) => (v ? s.set(k, v) : s.delete(k));
  set('usage', a.use);
  set('niveau', a.level);
  set('budget', a.budget);
  set('q', q || undefined);
  set('tri', sort !== 'pertinence' ? sort : undefined);
  s.delete('page');
  replaceSearch(s);
}

function transition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
  if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(update);
  else update();
}

export function NextCategory({ category, products }: { category: Category; products: Product[] }) {
  const search = useSearch();
  const { a: answers, q: query, sort } = useMemo(() => readUrl(search), [search]);
  const [shown, setShown] = useState(PAGE);

  const family = c.families[category.slug];
  const results = useMemo(() => {
    const list = products.filter((p) => keep(p, answers) && (!query || matchesSearch(p, query)));
    if (sort === 'prix-croissant') list.sort((x, y) => x.price - y.price);
    if (sort === 'prix-decroissant') list.sort((x, y) => y.price - x.price);
    if (sort === 'nouveautes') list.sort((x, y) => (y.dateAdded || '').localeCompare(x.dateAdded || ''));
    return list;
  }, [products, answers, query, sort]);

  function answer(group: keyof Answers, value: string) {
    const next = { ...answers, [group]: answers[group] === value ? undefined : value };
    transition(() => {
      writeUrl(next, query, sort);
      setShown(PAGE);
    });
  }

  return (
    <main id="contenu" className="ne">
      <header className="ne-section-head" style={{ paddingTop: 40 }}>
        <span className="ne-label">{g.nav.catalogue}</span>
        <h1>{family?.title ?? category.name}</h1>
        {family && <p className="ne-lead">{family.intro}</p>}
      </header>

      <section className="ne-rail" aria-labelledby="rail-title">
        <h2 id="rail-title" style={{ fontSize: 'var(--ne-step-2)' }}>
          {family?.question ?? c.rail.title}
        </h2>
        {(['use', 'level', 'budget'] as const).map((group) => (
          <div className="ne-question" key={group} role="group" aria-label={c.rail.questions[group].label}>
            <span className="ne-label">{c.rail.questions[group].label}</span>
            <div className="ne-options">
              {c.rail.questions[group].options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className="ne-chip"
                  aria-pressed={answers[group] === o.value}
                  onClick={() => answer(group, o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="ne-sentence" aria-live="polite">
          {c.rail.sentence({ use: answers.use, level: answers.level, budget: answers.budget, count: results.length })}
        </p>
        <div className="ne-options">
          <label className="ne-chip" style={{ gap: 10 }}>
            <span className="ne-label" style={{ color: 'inherit' }}>{c.filters.search}</span>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                writeUrl(answers, e.target.value, sort);
                setShown(PAGE);
              }}
              style={{ border: 0, background: 'transparent', font: 'inherit', minWidth: 160, outline: 'none' }}
            />
          </label>
          <label className="ne-chip" style={{ gap: 10 }}>
            <span className="ne-label" style={{ color: 'inherit' }}>{c.filters.sort}</span>
            <select
              value={sort}
              onChange={(e) => writeUrl(answers, query, e.target.value)}
              style={{ border: 0, background: 'transparent', font: 'inherit' }}
            >
              {c.filters.sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {(answers.use || answers.level || answers.budget || query) && (
            <button
              type="button"
              className="ne-chip"
              onClick={() => {
                transition(() => writeUrl({}, '', sort));
              }}
            >
              {c.rail.reset}
            </button>
          )}
        </div>
      </section>

      <section className="ne-section" aria-label={family?.title ?? category.name}>
        {results.length === 0 ? (
          <p className="ne-lead">{c.empty}</p>
        ) : (
          <div className="ne-grid">
            {results.slice(0, shown).map((p, i) => (
              <a
                key={p.id}
                className="ne-product"
                href={`/produits/${p.slug}/`}
                style={{ viewTransitionName: `p-${p.id}` } as React.CSSProperties}
              >
                <img
                  src={p.images[0].small}
                  alt=""
                  width={480}
                  height={480}
                  loading={i < 8 ? 'eager' : 'lazy'}
                />
                <span className="ne-label">{p.brand}</span>
                <h3>{cleanName(p)}</h3>
                <span className="ne-sizes">{p.sizes.slice(0, 6).join(' · ')}</span>
                <span className="ne-price">
                  {money(p.price)} <span className="ne-muted">· {g.status.pricePlanned}</span>
                </span>
              </a>
            ))}
          </div>
        )}
        {results.length > shown && (
          <p style={{ marginTop: 32 }}>
            <button type="button" className="ne-btn is-secondary" onClick={() => setShown(shown + PAGE)}>
              {c.rail.more ? c.rail.more(results.length - shown) : c.rail.sentence({ count: results.length - shown })}
            </button>
          </p>
        )}
      </section>
    </main>
  );
}
