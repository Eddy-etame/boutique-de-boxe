'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import type { ProductSuggestion, Suggestion } from '@/lib/suggest';

/**
 * La recherche de l'entête : le bouton ouvre la barre sur place (sur téléphone elle prend toute la
 * ligne), la frappe montre des réponses tout de suite (pages puis modèles), Entrée ou « Rechercher »
 * envoie sur la page de résultats déjà filtrée. Sans script, le bouton reste un lien vers /recherche/.
 */
type Reply = { pages: Suggestion[]; products: ProductSuggestion[]; total: number };
const EMPTY: Reply = { pages: [], products: [], total: 0 };

export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [reply, setReply] = useState<Reply>(EMPTY);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  const listId = id + '-list';

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const away = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  // Les réponses suivent la frappe, 150 ms après la dernière touche ; une réponse en retard ne remplace jamais une plus récente.
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const controller = new AbortController();
    const handle = setTimeout(() => {
      fetch('/api/suggest?q=' + encodeURIComponent(query), { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('suggest'))))
        .then((d: Reply) => {
          setReply(d);
          setActive(-1);
        })
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [q]);

  const has = q.trim().length >= 2;
  // Sous deux caractères, rien à montrer : la dernière réponse est ignorée sans la recharger.
  const shown = has ? reply : EMPTY;
  const rows: { label: string; href: string }[] = [
    ...shown.pages.map((p) => ({ label: p.label, href: p.path })),
    ...shown.products.map((p) => ({ label: p.name, href: '/produits/' + p.slug + '/' })),
  ];
  const go = (href: string) => {
    window.location.assign(href);
  };
  const submit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (active >= 0 && rows[active]) return go(rows[active].href);
    const query = q.trim();
    go(query ? '/recherche/?q=' + encodeURIComponent(query) : '/recherche/');
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(rows.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    }
  };

  return (
    <div ref={box} className={'header-search' + (open ? ' is-open' : '')}>
      {!open && (
        <a
          className="icon-button"
          href="/recherche/"
          aria-label="Rechercher un équipement"
          onClick={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
        >
          <Search size={21} />
        </a>
      )}
      {open && (
        <form className="header-search-form" role="search" onSubmit={submit} action="/recherche/" method="get">
          <Search size={18} aria-hidden="true" />
          <input
            ref={input}
            name="q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Un modèle, une marque, un équipement…"
            aria-label="Rechercher"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="submit" className="header-search-go" aria-label="Voir tous les résultats">
            <ArrowRight size={18} />
          </button>
          <button type="button" className="header-search-close" aria-label="Fermer la recherche" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
          {has && (
            <div className="header-search-results" id={listId} role="listbox" aria-label="Réponses">
              {shown.pages.length > 0 && (
                <div className="header-search-group">
                  <span>Pages</span>
                  {shown.pages.map((p, i) => (
                    <a key={p.path} id={`${listId}-${i}`} role="option" aria-selected={active === i} href={p.path} className={active === i ? 'is-active' : ''}>
                      {p.label}
                      {p.hint && <small>{p.hint}</small>}
                    </a>
                  ))}
                </div>
              )}
              {shown.products.length > 0 && (
                <div className="header-search-group">
                  <span>Modèles</span>
                  {shown.products.map((p, j) => {
                    const i = shown.pages.length + j;
                    return (
                      <a key={p.slug} id={`${listId}-${i}`} role="option" aria-selected={active === i} href={'/produits/' + p.slug + '/'} className={'header-search-product' + (active === i ? ' is-active' : '')}>
                        {p.image ? <img src={p.image} alt="" width={40} height={40} loading="lazy" decoding="async" /> : <i aria-hidden="true" />}
                        <span>
                          {p.name}
                          <small>
                            {p.brand ? p.brand + ' · ' : ''}
                            {p.family}
                          </small>
                        </span>
                        <b>{p.price}</b>
                      </a>
                    );
                  })}
                </div>
              )}
              <a className="header-search-all" href={'/recherche/?q=' + encodeURIComponent(q.trim())}>
                {shown.total > 0 ? `Voir les ${shown.total} modèles pour « ${q.trim()} »` : `Rechercher « ${q.trim()} »`} <ArrowRight size={14} />
              </a>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
