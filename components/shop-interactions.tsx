'use client';
import { pageWindow } from '@/lib/pagination';
import { COLOURS, closureOf, coloursOf, materialOf } from '@/lib/facets';
import {
  useMemo,
  useState,
  useEffect,
  useRef,
  useSyncExternalStore,
} from 'react';
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
import { AddToCart, QuickAdd, PackAdd } from './commerce-ui';
import selection from '@/lib/data/selection.json';

/** La scène d’un modèle détouré : mode, bords touchés par le sujet, modèle sombre ou vif, teinte dominante. */
function stageProps(p: Product, active = true) {
  const cut = active ? p.cut : undefined;
  return {
    'data-cut': cut?.mode,
    'data-edges': cut?.edges.join(' ') || undefined,
    'data-dark': cut && cut.lum < 0.24 ? '' : undefined,
    'data-vivid': cut?.vivid ? '' : undefined,
    style: cut ? ({ '--tint': cut.tint } as React.CSSProperties) : undefined,
  };
}

export function ProductCard({
  product: p,
  index = 0,
}: {
  product: Product;
  index?: number;
}) {
  return (
    <article className="product-card">
      <a
        href={`/produits/${p.slug}/`}
        className="product-image"
        {...stageProps(p)}
      >
        <span className="product-index">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="product-status">
          {p.audience === 'enfant'
            ? 'Enfant'
            : (categoryFor(p.category)?.name ?? 'Catalogue')}
        </span>
        <img
          src={p.cut?.small ?? p.images[0]?.small}
          srcSet={`${p.cut?.small ?? p.images[0]?.small} 480w, ${p.cut?.large ?? p.images[0]?.src} 960w`}
          sizes="(max-width: 600px) 46vw, (max-width: 1000px) 31vw, 24vw"
          width={480}
          height={480}
          alt={p.images[0]?.alt || p.name}
          loading={index < 4 ? 'eager' : 'lazy'}
          fetchPriority={index === 0 ? 'high' : 'auto'}
        />
        <span className="product-arrow">
          <ArrowUpRight size={20} />
        </span>
      </a>
      <div className="product-meta">
        <span>{p.brand}</span>
        <span>
          {p.sizes.length ? p.sizes.slice(0, 4).join(' / ') : 'Tailles à venir'}
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
  const image =
    view === 2
      ? second || p.images[0]
      : view === 1 && !curated && third
        ? third
        : p.images[0];
  const inspection =
    view === 1 && curated
      ? 'closure'
      : view === 2 && curated && second
        ? 'reverse'
        : view === 1 && !third
          ? 'zoom'
          : view === 2 && !second
            ? 'zoom-low'
            : 'whole';
  const fact =
    view === 1 && curated
      ? ['Fermeture', p.specs['Fermeture'] || 'Voir la photo']
      : view === 1
        ? [
            'À regarder',
            third
              ? 'Le modèle sous un autre angle.'
              : 'La matière et les coutures, agrandies.',
          ]
        : view === 2
          ? second
            ? [
                'À regarder',
                'La forme de la paume, les coutures et la fermeture.',
              ]
            : [
                'Zoom',
                'Ce modèle n’a qu’une photo : voici sa partie basse agrandie.',
              ]
          : ['Tailles', p.sizes.join(' / ') || 'Voir la fiche'];
  return (
    <div
      className="equipment-inspector"
      data-inspection={inspection}
      data-curated={curated || undefined}
    >
      <div className="inspector-index">
        <span>
          {p.brand} / {p.reference || p.sourceRef}
        </span>
        <span>LE MODÈLE EN DÉTAIL</span>
      </div>
      <div className="inspector-photo">
        <div className="inspector-crop">
          <img
            key={image.src + view}
            src={image.src}
            width={image.width}
            height={image.height}
            alt={image.alt}
            fetchPriority={view === 0 ? 'high' : 'auto'}
          />
        </div>
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
        <a
          href={'/produits/' + p.slug + '/'}
          aria-label={'Voir ce modèle : ' + p.name}
        >
          <span>Voir ce modèle</span>
          <ArrowUpRight size={20} aria-hidden="true" />
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
            type="button"
            aria-pressed={view === i}
            onClick={() => setView(i)}
          >
            <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** le filtre ne propose que la taille, sans la couleur ni la mention entre parenthèses */
const sizeKey = (s: string) =>
  s
    .split(',')[0]
    .replace(/\s*\(.*\)$/, '')
    .trim();

export function Catalog({
  items: pageItems,
  total = pageItems.length,
  scope = '',
  initialQuery = '',
  showFamilies = false,
  initialPage = 1,
}: {
  /** Les cartes de la page affichée (36 au plus), déjà allégées. */
  items: Product[];
  /** Le nombre de modèles de la liste entière. */
  total?: number;
  /** La liste entière se demande à /api/catalog-list?scope=… au premier geste du visiteur. */
  scope?: string;
  initialQuery?: string;
  showFamilies?: boolean;
  initialPage?: number;
}) {
  // La liste entière n’est chargée que si le visiteur cherche, filtre, trie ou change de page.
  const [all, setAll] = useState<Product[] | null>(scope ? null : pageItems);
  const [requested, setRequested] = useState(Boolean(scope && initialQuery));
  useEffect(() => {
    if (!requested || all || !scope) return;
    let alive = true;
    fetch('/api/catalog-list?scope=' + encodeURIComponent(scope))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('liste'))))
      .then((d: { items: Product[] }) => {
        if (alive) setAll(d.items);
      })
      .catch(() => {
        if (alive) setRequested(false);
      });
    return () => {
      alive = false;
    };
  }, [requested, all, scope]);
  const need = () => setRequested(true);
  const loading = requested && !all;
  const items = all ?? pageItems;
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState('selection');
  const [brand, setBrand] = useState('all');
  const [size, setSize] = useState('all');
  const [family, setFamily] = useState('all');
  const [budget, setBudget] = useState('all');
  const [colour, setColour] = useState('all');
  const [material, setMaterial] = useState('all');
  const [closure, setClosure] = useState('all');
  const [filters, setFilters] = useState(false);
  const [more, setMore] = useState(false);
  const [page, setPage] = useState(initialPage);

  const brands = [...new Set(items.map((p) => p.brand))];
  // Les couleurs présentes, dans l'ordre de la palette ; une teinte seule ne trie rien.
  const colourCounts = new Map<string, number>();
  for (const p of items) for (const c of coloursOf(p)) colourCounts.set(c, (colourCounts.get(c) || 0) + 1);
  const colours = COLOURS.filter((c) => (colourCounts.get(c.key) || 0) >= 2);
  // Les sous-filtres : seulement quand au moins deux valeurs départagent trois modèles chacune.
  const facetValues = (of: (p: Product) => string | null) => {
    const counts = new Map<string, number>();
    for (const p of items) {
      const v = of(p);
      if (v) counts.set(v, (counts.get(v) || 0) + 1);
    }
    const values = [...counts.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).map(([v]) => v);
    return values.length >= 2 ? values : [];
  };
  const materials = facetValues(materialOf);
  const closures = facetValues(closureOf);
  const sizes = [...new Set(items.flatMap((p) => p.sizes.map(sizeKey)))].filter(
    (s) => s.length <= 16,
  );
  const result = useMemo(() => {
    const out = items.filter(
      (p) =>
        (brand === 'all' || p.brand === brand) &&
        (size === 'all' || p.sizes.some((s) => sizeKey(s) === size)) &&
        (family === 'all' || p.category === family) &&
        (budget === 'all' || p.price <= Number(budget) * 100) &&
        (colour === 'all' || coloursOf(p).includes(colour)) &&
        (material === 'all' || materialOf(p) === material) &&
        (closure === 'all' || closureOf(p) === closure) &&
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
  }, [items, query, sort, brand, size, family, budget, colour, material, closure]);
  const count = all ? result.length : total;
  useEffect(
    () =>
      registerCatalogTools(items, (q) => {
        setRequested(true);
        setQuery(q);
        setPage(1);
        setBrand('all');
        setSize('all');
        setFamily('all');
        setBudget('all');
        setColour('all');
        setMaterial('all');
        setClosure('all');
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
            need();
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
            onFocus={need}
            onChange={(e) => {
              need();
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Un modèle, une marque, un équipement…"
            type="search"
          />
        </label>
        <button
          className="filter-toggle"
          onClick={() => {
            need();
            setFilters(!filters);
          }}
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
        {colours.length >= 2 &&
          picker('Couleur', colour, setColour, [
            { value: 'all', label: 'Toutes les couleurs' },
            ...colours.map((c) => ({ value: c.key, label: c.label })),
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
        {(materials.length > 0 || closures.length > 0) && (
          <div className="filter-more">
            <button type="button" className="text-button" aria-expanded={more} onClick={() => setMore(!more)}>
              {more ? 'Moins de critères' : 'Plus de critères'}
              {!more && (material !== 'all' || closure !== 'all') ? ' · actifs' : ''}
            </button>
            {more && (
              <div className="filter-more-fields">
                {materials.length > 0 &&
                  picker('Matière', material, setMaterial, [
                    { value: 'all', label: 'Toutes les matières' },
                    ...materials.map((v) => ({ value: v, label: v })),
                  ])}
                {closures.length > 0 &&
                  picker('Fermeture', closure, setClosure, [
                    { value: 'all', label: 'Toutes les fermetures' },
                    ...closures.map((v) => ({ value: v, label: v })),
                  ])}
              </div>
            )}
          </div>
        )}
        <button
          className="text-button"
          onClick={() => {
            setPage(1);
            setSize('all');
            setBrand('all');
            setFamily('all');
            setBudget('all');
            setColour('all');
            setMaterial('all');
            setClosure('all');
            setQuery('');
          }}
        >
          Réinitialiser les filtres
        </button>
      </div>
      <div className="catalog-count" aria-live="polite">
        <span key={count} className="catalog-count-value">
          {count} {count === 1 ? 'modèle' : 'modèles'}
        </span>
        <span>EN VENTE BIENTÔT</span>
      </div>
      {result.length ? (
        <>
          <div
            className="product-grid"
            aria-busy={loading || undefined}
            key={[query, sort, brand, size, family, budget, colour, material, closure, page, all ? 1 : 0].join('|')}
          >
            {(all
              ? result.slice(
                  (Math.min(page, Math.max(1, Math.ceil(result.length / 36))) - 1) * 36,
                  Math.min(page, Math.max(1, Math.ceil(result.length / 36))) * 36,
                )
              : pageItems
            ).map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
          {count > 36 && (
            <nav className="catalog-pagination" aria-label="Pages du catalogue">
              {pageWindow(page, Math.ceil(count / 36)).map(
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
                        need();
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
            <div
              className="kit-picture"
              {...stageProps(p)}
            >
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
                  src={p.cut?.small ?? p.images[0].small}
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
      {remaining.length > 0 && (
        <PackAdd
          key={selected.key + ':' + owned.join(',')}
          items={remaining.map((r) => ({ product: r.product, label: r.label }))}
        />
      )}
      {'notice' in selected && selected.notice && (
        <div className="kit-notice">
          <p>{selected.notice}</p>
          <AlertForm
            source={'sac-' + selected.key.replace(':', '-')}
            labels={{
              field: 'Prévenez-moi quand ce modèle arrive',
              consent: 'J’accepte de recevoir un e-mail à l’arrivée du modèle.',
            }}
          />
        </div>
      )}
      <div className="bench-footer">
        <p>Aucun lot imposé. Vous choisissez chaque taille.</p>
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
  const [stuck, setStuck] = useState(false);
  const [added, setAdded] = useState(false);
  const buyRef = useRef<HTMLDivElement>(null);
  const sizeChosen = p.sizes.length === 0 || p.sizes.includes(size);

  // Sur téléphone, la barre d’achat suit le lecteur dès que le bouton principal sort de l’écran.
  useEffect(() => {
    const el = buyRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // La confirmation d’ajout se lit aussi dans la barre.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const onAdded = () => {
      setAdded(true);
      if (t) clearTimeout(t);
      t = setTimeout(() => setAdded(false), 2600);
    };
    window.addEventListener('boutique:cart-added', onAdded);
    return () => {
      window.removeEventListener('boutique:cart-added', onAdded);
      if (t) clearTimeout(t);
    };
  }, []);

  // La loupe : sous la souris, la photo s’agrandit autour du point regardé.
  const loupe = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty(
      '--ox',
      `${((e.clientX - r.left) / r.width) * 100}%`,
    );
    e.currentTarget.style.setProperty(
      '--oy',
      `${((e.clientY - r.top) / r.height) * 100}%`,
    );
  };
  const step = (delta: number) =>
    setImage((i) => (i + delta + p.images.length) % p.images.length);
  // Au doigt, la photo suit la main puis passe à la vue voisine : le même geste que partout ailleurs.
  const swipe = useRef({ x: 0, y: 0, on: false });
  const swipeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' || p.images.length < 2) return;
    swipe.current = { x: e.clientX, y: e.clientY, on: true };
  };
  const swipeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!swipe.current.on) return;
    const dx = e.clientX - swipe.current.x;
    const dy = e.clientY - swipe.current.y;
    // Le geste vertical reste au défilement de la page.
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) {
      swipe.current.on = false;
      e.currentTarget.style.removeProperty('--drag');
      return;
    }
    e.currentTarget.style.setProperty('--drag', dx + 'px');
  };
  const swipeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!swipe.current.on) return;
    swipe.current.on = false;
    const dx = e.clientX - swipe.current.x;
    e.currentTarget.style.removeProperty('--drag');
    if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
  };
  const stickyAdd = () => {
    if (sizeChosen) {
      buyRef.current
        ?.querySelector<HTMLButtonElement>('button.cart-add')
        ?.click();
      return;
    }
    const first = document.querySelector<HTMLElement>(
      '.variant-picker button, .product-variant-select',
    );
    first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    first?.focus({ preventScroll: true });
  };
  return (
    <div className="product-detail">
      <div className="product-gallery">
        <div
          className="gallery-main"
          data-loupe={p.images.length ? '' : undefined}
          {...stageProps(p, image === 0)}
          onPointerMove={(e) => {
            loupe(e);
            swipeMove(e);
          }}
          onPointerDown={swipeStart}
          onPointerUp={swipeEnd}
          onPointerCancel={swipeEnd}
        >
          <span className="tiny-label">
            {p.brand} / {p.reference || p.sourceRef}
          </span>
          <img
            key={p.images[image]?.src}
            src={image === 0 && p.cut ? p.cut.large : p.images[image]?.src}
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
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                  e.preventDefault();
                  const delta = e.key === 'ArrowRight' ? 1 : -1;
                  step(delta);
                  const next = e.currentTarget.parentElement?.children[
                    (i + delta + p.images.length) % p.images.length
                  ] as HTMLElement | undefined;
                  next?.focus();
                }}
              >
                <img src={img.small} width={84} height={84} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="product-information">
        <span className="eyebrow">
          {p.brand} /{' '}
          {categoryFor(p.category)?.name ?? p.category.replaceAll('-', ' ')}
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
                {p.sizes[0] === p.name ? 'Taille unique' : p.sizes[0]}
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
        {/* Avant l’ouverture des ventes, l’appel à l’action est l’inscription : le billet d’ouverture du modèle. */}
        <section className="launch-ticket" id="billet" aria-labelledby="billet-titre">
          <span className="eyebrow">BILLET D’OUVERTURE</span>
          <p id="billet-titre" className="launch-ticket-title">
            Soyez prévenu le jour J.
          </p>
          <p className="launch-ticket-copy">
            Les ventes ouvrent bientôt. Un e-mail le matin de l’ouverture pour{' '}
            <strong>
              {cleanName(p)}
              {size ? `, ${size}` : ''}
            </strong>
            . Rien d’autre.
          </p>
          <AlertForm
            productId={p.id}
            variant={size}
            source="fiche"
            labels={{ field: 'Votre adresse e-mail' }}
          />
        </section>
        <div ref={buyRef} className="buy-anchor">
          <p className="trial-lead">Ou essayez la commande dès maintenant, sans payer.</p>
          <AddToCart key={p.id + size} product={p} variant={size} />
        </div>
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
      <div
        className={stuck ? 'sticky-buy is-shown' : 'sticky-buy'}
        aria-hidden={!stuck}
      >
        <div className="sticky-buy-copy">
          <strong>{money(variantPrice(p, size))}</strong>
          <span>
            {size || (p.sizes.length > 0 ? 'Taille à choisir' : cleanName(p))}
          </span>
        </div>
        <button
          type="button"
          className="button sticky-alert"
          tabIndex={stuck ? 0 : -1}
          onClick={() => {
            const field = document.querySelector<HTMLInputElement>(
              '#billet input[type="email"], #billet input[type="tel"]',
            );
            document
              .getElementById('billet')
              ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            field?.focus({ preventScroll: true });
          }}
        >
          Me prévenir <ArrowUpRight size={17} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="button button-dark sticky-add"
          tabIndex={stuck ? 0 : -1}
          onClick={stickyAdd}
        >
          {added ? (
            <>
              Ajouté <Check size={17} aria-hidden="true" />
            </>
          ) : sizeChosen ? (
            <>
              Ajouter au panier <Plus size={17} aria-hidden="true" />
            </>
          ) : (
            <>
              Choisir la taille <ArrowUpRight size={17} aria-hidden="true" />
            </>
          )}
        </button>
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

export type AlertFormLabels = {
  field?: string;
  consent?: string;
  submit?: string;
  placeholder?: string;
};
export function AlertForm({
  productId = 'launch',
  variant = '',
  labels = {},
  source = '',
}: {
  productId?: string;
  variant?: string;
  labels?: AlertFormLabels;
  /** Où l’inscription se fait (accueil, fiche, sac de séance) : lu dans l’atelier. */
  source?: string;
}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('');
  const [busy, setBusy] = useState(false);
  // Deuxième temps, facultatif : l’e-mail est déjà enregistré, le numéro s’ajoute pour un SMS le jour J.
  const [step, setStep] = useState<{ ref: string; email: string } | null>(null);
  const [phone, setPhone] = useState('');
  if (step)
    return (
      <form
        className="alert-form alert-form-phone"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setState('');
          try {
            const r = await fetch('/api/alerts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: step.email,
                ref: step.ref,
                phone,
                smsConsent: true,
                website: '',
              }),
            });
            const data = (await r.json()) as { error?: string };
            if (!r.ok)
              throw new Error(data.error || 'Le numéro n’a pas pu être enregistré.');
            setStep(null);
            setPhone('');
            setState(
              'C’est noté : un e-mail et un SMS le jour de l’ouverture. Rien d’autre.',
            );
          } catch (err) {
            setState(
              err instanceof Error ? err.message : 'Un problème est survenu. Réessayez.',
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="alert-done" role="status">
          <strong>Votre e-mail est enregistré.</strong> Un SMS en plus, le matin
          de l’ouverture ? Facultatif.
        </p>
        <label htmlFor={`alert-phone-${productId}`}>Votre numéro de mobile</label>
        <div className="alert-input">
          <input
            id={`alert-phone-${productId}`}
            name="phone"
            type="tel"
            inputMode="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={30}
            placeholder="06 12 34 56 78"
            autoComplete="tel"
          />
          <button disabled={busy} aria-label="Ajouter mon numéro">
            {busy ? '…' : <ArrowRight size={20} />}
          </button>
        </div>
        <label className="consent">
          <input type="checkbox" name="smsConsent" required />
          J’accepte de recevoir un SMS le jour de l’ouverture.{' '}
          <a href="/confidentialite/">Confidentialité</a>
        </label>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setStep(null);
            setState(
              'C’est noté. Vous recevrez un e-mail à l’ouverture des ventes. Vous pouvez vous désinscrire à tout moment.',
            );
          }}
        >
          Non merci, l’e-mail suffit
        </button>
        {state && (
          <p role="alert" className="form-status">
            {state}
          </p>
        )}
      </form>
    );
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
              source,
              website: '',
            }),
          });
          const data = (await r.json()) as {
            error?: string;
            ref?: string;
            already?: boolean;
          };
          if (!r.ok)
            throw new Error(
              data.error || 'L’inscription n’a pas pu être enregistrée.',
            );
          if (data.ref) setStep({ ref: data.ref, email });
          else
            setState(
              data.already
                ? 'Cette adresse est déjà inscrite : vous serez prévenu à l’ouverture des ventes.'
                : 'C’est noté. Vous recevrez un e-mail à l’ouverture des ventes. Vous pouvez vous désinscrire à tout moment.',
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
        <button
          disabled={busy}
          aria-label={labels.submit ?? 'M’inscrire à l’alerte'}
        >
          {busy ? '…' : <ArrowRight size={20} />}
        </button>
      </div>
      <label className="consent">
        <input type="checkbox" name="consent" required />
        {labels.consent ??
          'J’accepte de recevoir un e-mail à l’ouverture.'}{' '}
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
