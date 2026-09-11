'use client';
import { pageWindow } from '@/lib/pagination';
import { useMemo, useState, useEffect, useSyncExternalStore } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Search,
  SlidersHorizontal,
  Plus,
  Minus,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { matchesSearch, registerCatalogTools } from '@/lib/catalog-tools';
import {
  Product,
  money,
  cleanName,
  categories,
  variantPrice,
  categoryFor,
} from '@/lib/catalog';
import { AddToCart, QuickAdd } from './commerce-ui';
import selection from '@/lib/data/selection.json';

export function ProductCard({
  product: p,
  index = 0,
}: {
  product: Product;
  index?: number;
}) {
  return (
    <article className="product-card">
      <a href={`/produits/${p.slug}/`} className="product-image">
        <span className="product-index">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="product-status">
          {p.audience === 'enfant' ? 'Enfant' : (categoryFor(p.category)?.name ?? 'Catalogue')}
        </span>
        <img
          src={p.images[0]?.small}
          srcSet={`${p.images[0]?.small} 480w, ${p.images[0]?.src} 960w`}
          sizes="(max-width: 600px) 46vw, (max-width: 1000px) 31vw, 24vw"
          width={480}
          height={480}
          alt={p.images[0]?.alt || p.name}
          loading="lazy"
        />
        <span className="product-arrow">
          <ArrowUpRight size={20} />
        </span>
      </a>
      <div className="product-meta">
        <span>{p.brand}</span>
        <span>
          {p.sizes.length
            ? p.sizes.slice(0, 4).join(' / ')
            : 'Tailles à venir'}
        </span>
      </div>
      <h3>
        <a href={`/produits/${p.slug}/`}>{cleanName(p)}</a>
      </h3>
      <div className="price-row">
        <strong>
          {p.variants?.some((v) => v.price !== p.price) ? 'Dès ' : ''}
          {money(p.price)}
        </strong>
        <span>prix prévu</span>
        <QuickAdd product={p} />
      </div>
    </article>
  );
}

export function HeroStage({ product: p }: { product: Product }) {
  const [view, setView] = useState(0);
  const curated = p.images[0].src.includes(
    'gants-boxe-blade-metal-boxe-noir-blanc-1',
  );
  const controls = curated
    ? ['La paire', 'La manchette', 'L’autre face']
    : ['Le modèle', 'Le détail', 'Les vues'];
  // Trois vues réelles : la photo principale, une seconde photo quand elle existe,
  // sinon un vrai agrandissement de la seule photo disponible.
  const second = p.images[1];
  const third = p.images[2];
  const image = view === 2 ? second || p.images[0] : view === 1 && !curated && third ? third : p.images[0];
  const inspection =
    view === 1 && curated ? 'closure' : view === 1 && !third ? 'zoom' : view === 2 && !second ? 'zoom-low' : 'whole';
  const fact =
    view === 1 && curated
      ? ['Fermeture', p.specs['Fermeture'] || 'Voir la photo']
      : view === 1
        ? ['À regarder', third ? 'Le modèle sous un autre angle.' : 'La matière et les coutures, agrandies.']
        : view === 2
          ? second
            ? ['À regarder', 'La forme de la paume, les coutures et la fermeture.']
            : ['Zoom', 'Ce modèle n’a qu’une photo : voici sa partie basse agrandie.']
          : [
              'Tailles',
              p.sizes.join(' / ') || 'Voir la fiche',
            ];
  return (
    <div
      className="equipment-inspector"
      data-inspection={inspection}
    >
      <div className="inspector-index">
        <span>
          {p.brand} / {p.reference || p.sourceRef}
        </span>
        <span>LE MODÈLE EN DÉTAIL</span>
      </div>
      <div className="inspector-photo">
        <img
          key={image.src + view}
          src={image.src}
          width={image.width}
          height={image.height}
          alt={image.alt}
          fetchPriority="high"
        />
        {view === 1 && curated && (
          <div className="inspection-pin">
            <i />
            La manchette
          </div>
        )}
        <span className="inspection-coordinate" aria-hidden="true">
          {view === 1
            ? 'DÉTAIL / 01'
            : 'VUE / ' + String(view === 2 ? 2 : 1).padStart(2, '0')}
        </span>
      </div>
      <div className="inspection-caption" aria-live="polite">
        <div key={view}>
          <span>{fact[0]}</span>
          <p>{fact[1]}</p>
        </div>
        <a href={'/produits/' + p.slug + '/'} aria-label={'Examiner ' + p.name}>
          <ArrowUpRight size={24} />
        </a>
      </div>
      <div
        className="inspection-controls"
        role="group"
        aria-label="Observer le produit"
      >
        {controls.map((label, i) => (
          <button
            key={label}
            aria-pressed={view === i}
            onClick={() => setView(i)}
          >
            <span>{String(i + 1).padStart(2, '0')}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** le filtre ne propose que la taille, sans la couleur ni la mention entre parenthèses */
const sizeKey = (s: string) => s.split(',')[0].replace(/\s*\(.*\)$/, '').trim();

export function Catalog({
  items,
  initialQuery = '',
  showFamilies = false,
  initialPage = 1,
}: {
  items: Product[];
  initialQuery?: string;
  showFamilies?: boolean;
  initialPage?: number;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState('selection');
  const [brand, setBrand] = useState('all');
  const [size, setSize] = useState('all');
  const [family, setFamily] = useState('all');
  const [budget, setBudget] = useState('all');
  const [filters, setFilters] = useState(false);
  const [page, setPage] = useState(initialPage);

  const brands = [...new Set(items.map((p) => p.brand))];
  const sizes = [...new Set(items.flatMap((p) => p.sizes.map(sizeKey)))].filter((s) => s.length <= 16);
  const result = useMemo(() => {
    const out = items.filter(
      (p) =>
        (brand === 'all' || p.brand === brand) &&
        (size === 'all' || p.sizes.some((s) => sizeKey(s) === size)) &&
        (family === 'all' || p.category === family) &&
        (budget === 'all' || p.price <= Number(budget) * 100) &&
        matchesSearch(p, query),
    );
    return out.sort(
      sort === 'price-up'
        ? (a, b) => a.price - b.price
        : sort === 'price-down'
          ? (a, b) => b.price - a.price
          : sort === 'name'
            ? (a, b) => a.name.localeCompare(b.name, 'fr')
            : () => 0,
    );
  }, [items, query, sort, brand, size, family, budget]);
  useEffect(
    () =>
      registerCatalogTools(items, (q) => {
        setQuery(q);
        setPage(1);
        setBrand('all');
        setSize('all');
        setFamily('all');
        setBudget('all');
      }),
    [items],
  );
  function picker(
    label: string,
    value: string,
    set: (s: string) => void,
    options: { value: string; label: string }[],
  ) {
    return (
      <label className="filter-field">
        <span>{label}</span>
        <Select
          value={value}
          onValueChange={(v) => {
            set(String(v));
            setPage(1);
          }}
        >
          <SelectTrigger aria-label={label}>
            <SelectValue>
              {options.find((o) => o.value === value)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    );
  }
  return (
    <div className="catalog">
      <div className="catalog-toolbar">
        <label className="search-field">
          <Search size={19} />
          <span className="sr-only">Rechercher dans le catalogue</span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Un modèle, une marque, un équipement…"
            type="search"
          />
        </label>
        <button
          className="filter-toggle"
          onClick={() => setFilters(!filters)}
          aria-expanded={filters}
          aria-controls="catalog-filters"
        >
          <SlidersHorizontal size={17} />
          Filtres{filters ? <Minus size={15} /> : <Plus size={15} />}
        </button>
        {picker('Trier par', sort, setSort, [
          { value: 'selection', label: 'Notre sélection' },
          { value: 'price-up', label: 'Prix croissant' },
          { value: 'price-down', label: 'Prix décroissant' },
          { value: 'name', label: 'Nom du produit' },
        ])}
      </div>
      <div
        id="catalog-filters"
        className={`filter-panel ${filters ? 'is-open' : ''}`}
      >
        {picker('Marque', brand, setBrand, [
          { value: 'all', label: 'Toutes les marques' },
          ...brands.map((v) => ({ value: v, label: v })),
        ])}
        {picker('Taille', size, setSize, [
          { value: 'all', label: 'Toutes les tailles' },
          ...sizes.map((v) => ({ value: v, label: v })),
        ])}
        {picker('Budget', budget, setBudget, [
          { value: 'all', label: 'Tous les prix' },
          { value: '25', label: 'Jusqu’à 25 €' },
          { value: '50', label: 'Jusqu’à 50 €' },
          { value: '100', label: 'Jusqu’à 100 €' },
        ])}
        {showFamilies &&
          picker('Équipement', family, setFamily, [
            { value: 'all', label: 'Tout le matériel' },
            ...[...new Set(items.map((p) => p.category))].map((value) => ({
              value,
              label:
                categories.find((c) => c.slug === value)?.name ||
                (value === 'arts-martiaux' ? 'Arts martiaux' : value),
            })),
          ])}
        <button
          className="text-button"
          onClick={() => {
            setPage(1);
            setSize('all');
            setBrand('all');
            setFamily('all');
            setBudget('all');
            setQuery('');
          }}
        >
          Réinitialiser les filtres
        </button>
      </div>
      <div className="catalog-count" aria-live="polite">
        <span>
          {result.length} {result.length === 1 ? 'modèle' : 'modèles'}
        </span>
        <span>EN VENTE BIENTÔT</span>
      </div>
      {result.length ? (
        <>
          <div className="product-grid">
            {result
              .slice(
                (Math.min(page, Math.max(1, Math.ceil(result.length / 36))) -
                  1) *
                  36,
                Math.min(page, Math.max(1, Math.ceil(result.length / 36))) * 36,
              )
              .map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
          </div>
          {result.length > 36 && (
            <nav className="catalog-pagination" aria-label="Pages du catalogue">
              {pageWindow(page, Math.ceil(result.length / 36)).map(
                (n, i, visible) => (
                  <span key={n}>
                    {i > 0 && n - visible[i - 1] > 1 && (
                      <span aria-hidden="true">…</span>
                    )}
                    <a
                      href={'?page=' + n}
                      aria-label={'Page ' + n}
                      aria-current={page === n ? 'page' : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(n);
                        document
                          .querySelector('.catalog-toolbar')
                          ?.scrollIntoView({ block: 'start' });
                      }}
                    >
                      {n}
                    </a>
                  </span>
                ),
              )}
            </nav>
          )}
        </>
      ) : (
        <div className="empty-state">
          <Search size={35} />
          <h3>
            {items.length
              ? 'Aucun modèle ne correspond.'
              : 'Cette famille arrive bientôt.'}
          </h3>
          <p>
            {items.length
              ? 'Essayez un autre terme ou retirez un filtre.'
              : 'En attendant, lisez les guides d’achat ou regardez les autres familles.'}
          </p>
          {items.length ? (
            <button
              className="button button-dark"
              onClick={() => {
                setQuery('');
                setPage(1);
                setSize('all');
                setBrand('all');
                setFamily('all');
                setBudget('all');
              }}
            >
              Voir toute la sélection <ArrowRight size={18} />
            </button>
          ) : (
            <a className="button button-dark" href="/guides/">
              Consulter les guides <ArrowRight size={18} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function sessionSnapshot() {
  try {
    return sessionStorage.getItem('boutique-session') || '';
  } catch {
    return '';
  }
}
function subscribeSession(callback: () => void) {
  window.addEventListener('boutique:session', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('boutique:session', callback);
    window.removeEventListener('storage', callback);
  };
}
export function SessionChooser({ items }: { items: Product[] }) {
  const stored = useSyncExternalStore(
    subscribeSession,
    sessionSnapshot,
    () => '',
  );
  const { discipline, context, owned } = useMemo(() => {
    try {
      const data = JSON.parse(stored);
      return {
        discipline: ['boxe', 'mma'].includes(data.discipline)
          ? data.discipline
          : 'boxe',
        context: ['premiere', 'technique', 'enfant'].includes(data.context)
          ? data.context
          : 'premiere',
        owned: Array.isArray(data.owned)
          ? (data.owned.filter(
              (v: unknown) => typeof v === 'string',
            ) as string[])
          : [],
      };
    } catch {
      return { discipline: 'boxe', context: 'premiere', owned: [] as string[] };
    }
  }, [stored]);
  function saveSession(d: string, c: string, o: string[]) {
    try {
      sessionStorage.setItem(
        'boutique-session',
        JSON.stringify({ discipline: d, context: c, owned: o }),
      );
      window.dispatchEvent(new Event('boutique:session'));
    } catch {}
  }
  const selected = selection.sessions.find(
    (s) => s.key === `${discipline}:${context}`,
  )!;
  const results = selected.products.flatMap((r) => {
    const product = items.find((p) => p.id === r.id);
    return product ? [{ ...r, product }] : [];
  });
  const remaining = results.filter((r) => !owned.includes(r.id));
  const total = remaining.reduce((sum, r) => sum + r.product.price, 0);
  return (
    <section className="session-bench" id="preparer" data-reveal>
      <header className="bench-heading">
        <div>
          <span className="eyebrow">LE SAC DE SÉANCE</span>
          <h2>
            Ce que vous avez.
            <br />
            <em>Ce qu’il vous manque.</em>
          </h2>
        </div>
        <p>
          Choisissez votre discipline et votre situation. Cochez ce que vous
          avez déjà : le total suit.
        </p>
      </header>
      <div className="bench-controls">
        <fieldset className="segmented">
          <legend className="sr-only">Votre discipline</legend>
          {[
            ['boxe', 'Boxe anglaise'],
            ['mma', 'MMA'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={discipline === value}
              onClick={() => saveSession(value, context, owned)}
            >
              {label}
            </button>
          ))}
        </fieldset>
        <div className="bench-context" role="group" aria-label="Votre séance">
          {[
            ['premiere', 'Je commence'],
            ['technique', 'Je m’entraîne déjà'],
            ['enfant', 'Pour un enfant'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={context === value}
              onClick={() => saveSession(discipline, value, owned)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="bench-feedback" aria-live="polite">
        <strong>{selected.name}</strong>
        <span>
          {results.length
            ? `${remaining.length} modèle${remaining.length > 1 ? 's' : ''} à regarder · ${money(total)} prévus`
            : 'Pas encore de modèle vérifié'}
        </span>
      </div>
      <p className="bench-explanation">{selected.text}</p>
      <div className="kit-grid" key={selected.key}>
        {results.map(({ product: p, ...r }, i) => (
          <article
            className={'kit-piece ' + (owned.includes(p.id) ? 'is-owned' : '')}
            key={p.id}
          >
            <div className="kit-picture">
              <span className="tiny-label">
                {String(i + 1).padStart(2, '0')} / {r.label}
              </span>
              <a
                href={
                  '/produits/' +
                  p.slug +
                  '/?seance=' +
                  encodeURIComponent(selected.key)
                }
              >
                <img
                  src={p.images[0].small}
                  alt={p.images[0].alt}
                  width={480}
                  height={480}
                  loading="lazy"
                />
              </a>
              <label className="owned-control">
                <input
                  type="checkbox"
                  checked={owned.includes(p.id)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...owned, p.id]
                      : owned.filter((id) => id !== p.id);
                    saveSession(discipline, context, next);
                  }}
                />
                <span>Je l’ai déjà</span>
              </label>
            </div>
            <div className="kit-note">
              <a
                href={
                  '/produits/' +
                  p.slug +
                  '/?seance=' +
                  encodeURIComponent(selected.key)
                }
              >
                <h3>
                  {cleanName(p)} <ArrowUpRight size={18} />
                </h3>
              </a>
              <p>{r.reason}</p>
              <details>
                <summary>À vérifier avant d’acheter</summary>
                <p>{r.condition}</p>
              </details>
              <strong>
                {money(p.price)} <small>prix prévu</small>
              </strong>
            </div>
          </article>
        ))}
      </div>
      {!results.length && (
        <div className="kit-empty">
          <p>Pas encore de modèle enfant vérifié pour cette discipline.</p>
          <a href="/contact/" className="button">
            Nous écrire <ArrowUpRight size={18} />
          </a>
        </div>
      )}
      <div className="bench-footer">
        <p>
          Aucun lot imposé. Vous choisissez chaque taille.
        </p>
        <a href={'/guides/' + selected.guide + '/'} className="inline-link">
          Lire le guide <ArrowRight size={18} />
        </a>
      </div>
    </section>
  );
}

export function ProductDetails({ product: p }: { product: Product }) {
  const [image, setImage] = useState(0);
  const [size, setSize] = useState(p.sizes.length === 1 ? p.sizes[0] : '');
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  return (
    <div className="product-detail">
      <div className="product-gallery">
        <div className="gallery-main">
          <span className="tiny-label">
            {p.brand} / {p.reference || p.sourceRef}
          </span>
          <img
            src={p.images[image]?.src}
            width={960}
            height={960}
            alt={p.images[image]?.alt}
            fetchPriority="high"
          />
          <button
            className="image-expand"
            aria-label="Agrandir la photo du produit"
            onClick={() => setOpen(true)}
          >
            <Plus size={19} />
          </button>
        </div>
        {p.images.length > 1 && (
          <div
            className="gallery-thumbs"
            role="group"
            aria-label="Photos du produit"
          >
            {p.images.map((img, i) => (
              <button
                key={img.src}
                aria-label={`Afficher la photo ${i + 1}`}
                aria-pressed={image === i}
                onClick={() => setImage(i)}
              >
                <img src={img.small} width={84} height={84} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="product-information">
        <span className="eyebrow">
          {p.brand} / {categoryFor(p.category)?.name ?? p.category.replaceAll('-', ' ')}
        </span>
        <h1>{cleanName(p)}</h1>
        <p className="product-lead">{p.short}</p>
        <div className="detail-price">
          <strong>
            {!size && p.variants?.some((v) => v.price !== p.price)
              ? 'Dès '
              : ''}
            {money(variantPrice(p, size))}
          </strong>
          <span>Prix prévu à l’ouverture des ventes</span>
        </div>
        <div className="availability">
          <span className="status-dot" />
          En vente bientôt
        </div>
        {p.sizes.length > 0 && (
          <fieldset className="variant-picker">
            <legend>
              Taille{' '}
              <a href="/guide-des-tailles/">
                Comment choisir ? <ArrowUpRight size={13} />
              </a>
            </legend>
            {p.sizes.length === 1 ? (
              <p className="variant-single">
                {p.sizes[0] === p.name
                  ? 'Taille unique'
                  : p.sizes[0]}
              </p>
            ) : p.sizes.length > 12 ? (
              <Select
                value={size}
                onValueChange={(value) => setSize(value || '')}
              >
                <SelectTrigger
                  aria-label="Choisir une taille"
                  className="product-variant-select"
                >
                  <SelectValue placeholder="Choisir une taille" />
                </SelectTrigger>
                <SelectContent>
                  {p.sizes.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s} · {money(variantPrice(p, s))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              p.sizes.map((s) => (
                <button
                  type="button"
                  key={s}
                  aria-pressed={size === s}
                  onClick={() => setSize(s)}
                >
                  {s}
                </button>
              ))
            )}
          </fieldset>
        )}
        <div className="detail-notes">
          {p.notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
        <AddToCart key={p.id + size} product={p} variant={size} />
        <details className="product-alert-disclosure">
          <summary>Être averti de l’ouverture des ventes</summary>
          <AlertForm productId={p.id} variant={size} />
        </details>
        <div className="detail-assurances">
          <span>
            <Check size={15} />
            Caractéristiques détaillées
          </span>
          <span>
            <Check size={15} />
            Commande d’essai, sans paiement
          </span>
        </div>
        <a href="/livraison/" className="inline-link">
          Livraison en France : tarifs prévus à l’ouverture{' '}
          <ArrowUpRight size={15} />
        </a>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="zoom-dialog" showCloseButton={false}>
          <DialogTitle className="sr-only">{p.name}</DialogTitle>
          <DialogDescription className="sr-only">
            Photo du produit en grand format. Agrandissez puis faites défiler
            pour explorer les détails.
          </DialogDescription>
          <button className="zoom-close" onClick={() => setOpen(false)}>
            Fermer
          </button>
          <div className="zoom-viewport">
            <button
              className={zoom ? 'zoom-photo is-zoomed' : 'zoom-photo'}
              aria-label={
                zoom
                  ? 'Revenir à la photo entière'
                  : 'Zoomer deux fois dans la photo'
              }
              onClick={() => setZoom(!zoom)}
            >
              <img
                src={p.images[image]?.src}
                alt={p.images[image]?.alt}
                width={960}
                height={960}
              />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export type AlertFormLabels = { field?: string; consent?: string; submit?: string; placeholder?: string };
export function AlertForm({
  productId = 'launch',
  variant = '',
  labels = {},
}: {
  productId?: string;
  variant?: string;
  labels?: AlertFormLabels;
}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="alert-form"
      method="post"
      action="/api/alerts"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setState('');
        try {
          const r = await fetch('/api/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              productId,
              variant,
              consent: true,
              website: '',
            }),
          });
          const data = (await r.json()) as { error?: string };
          if (!r.ok)
            throw new Error(
              data.error || 'L’inscription n’a pas pu être enregistrée.',
            );
          setState(
            'C’est noté. Vous recevrez un e-mail à l’ouverture des ventes. Vous pouvez vous désinscrire à tout moment.',
          );
          setEmail('');
        } catch (err) {
          setState(
            err instanceof Error
              ? err.message
              : 'Un problème est survenu. Réessayez.',
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="variant" value="" />
      <noscript>
        <p>
          Cette alerte concerne le modèle, toutes tailles. Pour une demande
          précise, écrivez-nous.
        </p>
      </noscript>
      <label htmlFor={`alert-${productId}`}>
        {labels.field ?? 'Prévenez-moi à l’ouverture des ventes'}
      </label>
      <div className="alert-input">
        <input
          id={`alert-${productId}`}
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={254}
          placeholder={labels.placeholder ?? 'Votre adresse e-mail'}
          autoComplete="email"
        />
        <button disabled={busy} aria-label={labels.submit ?? 'M’inscrire à l’alerte'}>
          {busy ? '…' : <ArrowRight size={20} />}
        </button>
      </div>
      <label className="consent">
        <input type="checkbox" name="consent" required />
        {labels.consent ?? 'J’accepte de recevoir un e-mail à l’ouverture.'}{' '}
        <a href="/confidentialite/">Confidentialité</a>
      </label>
      {state && (
        <p role="status" className="form-status">
          {state}
        </p>
      )}
    </form>
  );
}
