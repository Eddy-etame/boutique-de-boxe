'use client';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
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
import { Product, money, cleanName, categories } from '@/lib/catalog';

export function ProductCard({
  product: p,
  index = 0,
}: {
  product: Product;
  index?: number;
}) {
  return (
    <article className="product-card">
      <Link href={`/produits/${p.slug}/`} className="product-image">
        <span className="product-index">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="product-status">Bientôt disponible</span>
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
      </Link>
      <div className="product-meta">
        <span>{p.brand}</span>
        <span>
          {p.sizes.length
            ? p.sizes.slice(0, 4).join(' / ')
            : 'Déclinaison à venir'}
        </span>
      </div>
      <h3>
        <Link href={`/produits/${p.slug}/`}>{cleanName(p)}</Link>
      </h3>
      <div className="price-row">
        <strong>{money(p.price)}</strong>
        <span>prix indicatif</span>
      </div>
    </article>
  );
}

export function HeroStage({ product: p }: { product: Product }) {
  const [feature, setFeature] = useState(0);
  const details = [
    {
      title: 'Le maintien',
      text: 'Une manchette large. Une fermeture auto-agrippante.',
      image: 0,
    },
    {
      title: 'La construction',
      text: 'Une enveloppe en PU. Un rembourrage en mousse EVA.',
      image: 1,
    },
    {
      title: 'Le poids',
      text: '10, 12 ou 14 oz : le choix dépend de votre pratique.',
      image: 0,
    },
  ];
  const selected = details[feature];
  return (
    <div className={`hero-stage stage-${feature}`}>
      <div className="stage-top">
        <span>FOCUS / METAL BOXE</span>
        <span>MODÈLE BLADE</span>
      </div>
      <div className="stage-image">
        <span className="stage-letter" aria-hidden="true">
          B.
        </span>
        <img
          key={selected.image}
          src={p.images[selected.image]?.src || p.images[0].src}
          width={960}
          height={960}
          alt={selected.image ? p.images[1]?.alt : p.images[0].alt}
          fetchPriority="high"
        />
        <span className="stage-weight">
          10—14<span>oz</span>
        </span>
      </div>
      <div className="stage-detail" aria-live="polite">
        <span className="crosshair" aria-hidden="true">
          +
        </span>
        <div>
          <strong>{selected.title}</strong>
          <p>{selected.text}</p>
        </div>
        <Link href={`/produits/${p.slug}/`} aria-label="Voir les gants Blade">
          <ArrowUpRight />
        </Link>
      </div>
      <div
        className="stage-controls"
        role="group"
        aria-label="Explorer les caractéristiques du gant"
      >
        {details.map((d, i) => (
          <button
            key={d.title}
            aria-pressed={feature === i}
            onClick={() => setFeature(i)}
          >
            <span>0{i + 1}</span>
            {d.title}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Catalog({
  items,
  initialQuery = '',
  showFamilies = false,
}: {
  items: Product[];
  initialQuery?: string;
  showFamilies?: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState('selection');
  const [brand, setBrand] = useState('all');
  const [size, setSize] = useState('all');
  const [family, setFamily] = useState('all');
  const [budget, setBudget] = useState('all');
  const [filters, setFilters] = useState(false);
  const brands = [...new Set(items.map((p) => p.brand))];
  const sizes = [...new Set(items.flatMap((p) => p.sizes))];
  const result = useMemo(() => {
    const out = items.filter(
      (p) =>
        (brand === 'all' || p.brand === brand) &&
        (size === 'all' || p.sizes.includes(size)) &&
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
        <Select value={value} onValueChange={(v) => set(String(v))}>
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
            onChange={(e) => setQuery(e.target.value)}
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
        {picker('Taille / déclinaison', size, setSize, [
          { value: 'all', label: 'Toutes les déclinaisons' },
          ...sizes.map((v) => ({ value: v, label: v })),
        ])}
        {picker('Budget indicatif', budget, setBudget, [
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
          {result.length} {result.length === 1 ? 'référence' : 'références'}
        </span>
        <span>CATALOGUE EN PRÉPARATION</span>
      </div>
      {result.length ? (
        <div className="product-grid">
          {result.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={35} />
          <h3>
            {items.length
              ? 'Aucune référence ne correspond.'
              : 'La sélection de cette famille se prépare.'}
          </h3>
          <p>
            {items.length
              ? 'Essayez un autre terme ou retirez un filtre.'
              : 'Retrouvez les critères de choix dans nos guides et explorez les équipements déjà présentés.'}
          </p>
          {items.length ? (
            <button
              className="button button-dark"
              onClick={() => {
                setQuery('');
                setSize('all');
                setBrand('all');
                setFamily('all');
                setBudget('all');
              }}
            >
              Voir toute la sélection <ArrowRight size={18} />
            </button>
          ) : (
            <Link className="button button-dark" href="/guides/">
              Consulter les guides <ArrowRight size={18} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function SessionChooser({ items }: { items: Product[] }) {
  const [discipline, setDiscipline] = useState('boxe');
  const [context, setContext] = useState('premiere');
  const config: Record<
    string,
    { name: string; text: string; families: string[]; guide: string }
  > = {
    premiere: {
      name: 'Première séance',
      text: 'Commencez par les consignes de votre salle : le matériel prêté varie. Regardez ensuite les gants, la tenue et les accessoires personnels à prévoir.',
      families:
        discipline === 'mma'
          ? ['gants-mma', 'protections-boxe', 'textile-boxe']
          : ['gants-de-boxe', 'accessoires-boxe', 'textile-boxe'],
      guide: discipline === 'mma' ? 'debuter-mma' : 'debuter-boxe',
    },
    technique: {
      name: 'Travail technique',
      text: 'Identifiez les exercices de la séance. Le type de gant, son poids et les protections demandées se valident avec votre encadrant avant de choisir.',
      families:
        discipline === 'mma'
          ? ['gants-mma', 'protections-boxe']
          : ['gants-de-boxe', 'accessoires-boxe'],
      guide: discipline === 'mma' ? 'choisir-gants-mma' : 'choisir-gants-boxe',
    },
    enfant: {
      name: 'Équipement enfant',
      text: 'L’âge indiqué sur un modèle est un repère de gamme. L’ajustement réel, les consignes du club et la déclinaison photographiée restent les points à vérifier.',
      families: ['gants-de-boxe', 'protections-boxe', 'textile-boxe'],
      guide: 'equipement-enfant',
    },
  };
  const selected = config[context];
  const candidates = items.filter(
    (p) =>
      p.id !== 'mat-sparring-16' &&
      (context === 'enfant'
        ? p.audience === 'enfant'
        : p.audience !== 'enfant'),
  );
  const results =
    context === 'enfant' && discipline === 'mma'
      ? []
      : (selected.families
          .map((f) => candidates.find((p) => p.category === f))
          .filter(Boolean) as Product[]);
  return (
    <section className="session-section" id="preparer">
      <div className="session-copy">
        <span className="eyebrow">02 / DANS VOTRE COIN</span>
        <h2>
          VOTRE SÉANCE.
          <br />
          <em>VOTRE SÉLECTION.</em>
        </h2>
        <p>
          Une pratique, un contexte : les pièces à regarder changent. Prenez un
          point de départ.
        </p>
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
              onClick={() => setDiscipline(value)}
            >
              {label}
            </button>
          ))}
        </fieldset>
        <div className="session-options" role="group" aria-label="Votre séance">
          {Object.entries(config).map(([key, c], i) => (
            <button
              key={key}
              onClick={() => setContext(key)}
              aria-pressed={context === key}
            >
              <span>0{i + 1}</span>
              {c.name}
              <ArrowUpRight size={19} />
            </button>
          ))}
        </div>
      </div>
      <div className="session-results" aria-live="polite">
        <div className="session-reason">
          <span className="tiny-label">LE POINT DE DÉPART</span>
          <h3>{selected.name}</h3>
          <p>
            {context === 'enfant' && discipline === 'mma'
              ? 'La sélection enfant présentée concerne la boxe. Pour le MMA, demandez au club les modèles et protections adaptés au cours : nous ne présentons pas encore de référence enfant vérifiée pour cette pratique.'
              : selected.text}
          </p>
        </div>
        <div className="session-products">
          {results.map((p) => (
            <Link key={p.id} href={`/produits/${p.slug}/`}>
              <img
                src={p.images[0]?.small}
                width={112}
                height={112}
                alt={p.name}
                loading="lazy"
              />
              <div>
                <span>
                  {categories.find((c) => c.slug === p.category)?.name}
                </span>
                <h4>{cleanName(p)}</h4>
                <span>{money(p.price)} · indicatif</span>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
        <Link
          className="session-guide"
          href={`/guides/${context === 'enfant' && discipline === 'mma' ? 'debuter-mma' : selected.guide}/`}
        >
          Les repères pour choisir <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}

export function ProductDetails({ product: p }: { product: Product }) {
  const [image, setImage] = useState(0);
  const [size, setSize] = useState(p.sizes[0] || '');
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  return (
    <div className="product-detail">
      <div className="product-gallery">
        <div className="gallery-main">
          <span className="tiny-label">
            {p.brand} / {p.sourceRef}
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
          {p.brand} / {p.category.replaceAll('-', ' ')}
        </span>
        <h1>{cleanName(p)}</h1>
        <p className="product-lead">{p.short}</p>
        <div className="detail-price">
          <strong>{money(p.price)}</strong>
          <span>Prix indicatif · vente à venir</span>
        </div>
        <div className="availability">
          <span className="status-dot" />
          Bientôt disponible
        </div>
        {p.sizes.length > 0 && (
          <fieldset className="variant-picker">
            <legend>
              Déclinaison présentée{' '}
              <Link href="/guide-des-tailles/">
                Comment choisir ? <ArrowUpRight size={13} />
              </Link>
            </legend>
            {p.sizes.map((s) => (
              <button
                type="button"
                key={s}
                aria-pressed={size === s}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            ))}
          </fieldset>
        )}
        <div className="detail-notes">
          {p.notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
        <AlertForm productId={p.id} variant={size} />
        <div className="detail-assurances">
          <span>
            <Check size={15} />
            Caractéristiques détaillées
          </span>
          <span>
            <Check size={15} />
            Aucune commande à ce stade
          </span>
        </div>
        <Link href="/livraison/" className="inline-link">
          Livraison France métropolitaine : conditions indicatives{' '}
          <ArrowUpRight size={15} />
        </Link>
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

export function AlertForm({
  productId = 'launch',
  variant = '',
}: {
  productId?: string;
  variant?: string;
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
            'Votre inscription est enregistrée. Aucun produit n’est réservé. Vous pouvez retirer votre demande à tout moment.',
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
          Cette alerte concerne le modèle, toutes déclinaisons. Pour une demande
          précise, contactez-nous par e-mail.
        </p>
      </noscript>
      <label htmlFor={`alert-${productId}`}>
        Recevoir une alerte de disponibilité
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
          placeholder="Votre adresse e-mail"
          autoComplete="email"
        />
        <button disabled={busy} aria-label="M’inscrire à l’alerte">
          {busy ? '…' : <ArrowRight size={20} />}
        </button>
      </div>
      <label className="consent">
        <input type="checkbox" name="consent" required />
        J’accepte de recevoir l’alerte demandée.{' '}
        <Link href="/confidentialite/">Confidentialité</Link>
      </label>
      {state && (
        <p role="status" className="form-status">
          {state}
        </p>
      )}
    </form>
  );
}
