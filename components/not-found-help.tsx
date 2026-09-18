'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import type { ProductSuggestion, Suggestion } from '@/lib/suggest';

/**
 * L'aide de la page 404 : devant une adresse introuvable, on cherche les pages à quelques lettres
 * près (un « s » en trop, une lettre en moins) et on les propose, avant la recherche et les familles.
 */
type Reply = { pages: Suggestion[]; products: ProductSuggestion[] };

export function NotFoundHelp() {
  // L'adresse demandée et les propositions arrivent ensemble, depuis le serveur, après le montage.
  const [state, setState] = useState<{ path: string; reply: Reply } | null>(null);
  useEffect(() => {
    const p = window.location.pathname;
    fetch('/api/suggest?path=' + encodeURIComponent(p))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('suggest'))))
      .then((d: Reply) => setState({ path: p, reply: d }))
      .catch(() => setState({ path: p, reply: { pages: [], products: [] } }));
  }, []);
  const path = state?.path || '';
  const reply = state?.reply || null;
  const hasHint = reply && (reply.pages.length > 0 || reply.products.length > 0);
  const guess = decodeURIComponent(path.split('/').filter(Boolean).at(-1) || '').replace(/-/g, ' ');
  return (
    <div className="not-found-help">
      {hasHint && (
        <section className="not-found-guess" aria-labelledby="nf-guess">
          <h2 id="nf-guess">Vouliez-vous dire…</h2>
          <ul>
            {reply!.pages.map((s) => (
              <li key={s.path}>
                <a href={s.path}>
                  {s.label} <ArrowRight size={14} />
                </a>
                {s.hint && <small>{s.hint}</small>}
              </li>
            ))}
            {reply!.products.map((p) => (
              <li key={p.slug} className="not-found-product">
                <a href={'/produits/' + p.slug + '/'}>
                  {p.image && <img src={p.image} alt="" width={36} height={36} loading="lazy" decoding="async" />}
                  {p.name} <ArrowRight size={14} />
                </a>
                <small>
                  {p.brand ? p.brand + ' · ' : ''}
                  {p.price}
                </small>
              </li>
            ))}
          </ul>
        </section>
      )}
      <form className="not-found-search" role="search" action="/recherche/" method="get">
        <label>
          <span>Chercher un modèle, une marque, un équipement</span>
          <span className="not-found-field">
            <Search size={18} aria-hidden="true" />
            <input name="q" type="search" defaultValue={guess.length > 2 && guess.length < 40 ? guess : ''} placeholder="gants de boxe, Fairtex, protège-dents…" autoComplete="off" />
            <button type="submit" className="button button-dark">
              Rechercher
            </button>
          </span>
        </label>
      </form>
    </div>
  );
}
