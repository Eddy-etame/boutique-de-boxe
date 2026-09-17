/**
 * Vignettes sociales à la demande : une URL par page, rendue par app/vignette.
 * Plus aucun PNG dans le dépôt ; le nom, la marque, les tailles et la photo
 * viennent des données au moment de la requête, donc jamais en retard.
 */
import { categoryFor, getCategoryProducts, money, shop, type Product, type Category } from './catalog';
import { guides, services, type Guide } from './editorial';
import { SEO_COPY } from './seo-copy';
import { SUBFAMILIES, subfamilyProducts, type Subfamily } from './subfamilies';
import selection from './data/selection.json';
import { brandFor, brandsOf } from './brands';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export type CardKind = 'p' | 'c' | 's' | 'g' | 'x';
export type Card = {
  title: string;
  eyebrow: string;
  facts: { label: string; value: string }[];
  photos: string[];
  photoLabel: string;
  path: string;
  /** Fiche produit : la photo détourée, posée sur la scène, et le prix prévu en clair. */
  cut?: { src: string; mode: 'pose' | 'cadre'; tint: string; vivid: boolean; lum: number };
  price?: string;
};

export const ogImageUrl = (kind: CardKind, key: string) => `/vignette/${kind}/${key}.png`;

/** Le champ `openGraph.images` d’une page. */
export function ogImage(kind: CardKind, key: string, alt: string) {
  return [{ url: ogImageUrl(kind, key), width: OG_WIDTH, height: OG_HEIGHT, alt }];
}

const fr = (n: number) => n.toLocaleString('fr-FR');
const badBrand = (b: string) => !b || /pr[ée]ciser|^Sélection /i.test(b);
/** Une seule photo, grande : trois vignettes côte à côte se lisent mal à 1200 × 630. */
const photosOf = (items: Product[], n = 1) => items.slice(0, n).map((p) => p.images[0]?.src).filter(Boolean);

function productCard(p: Product): Card {
  const family = categoryFor(p.category);
  const facts: Card['facts'] = [];
  const material = p.specs?.['Matières'] || p.specs?.['Matière'] || p.specs?.['Matière extérieure'];
  if (material) facts.push({ label: 'MATIÈRES', value: material });
  if (p.sizes.length) facts.push({ label: 'TAILLES', value: p.sizes.map((s) => s.split(',')[0]).slice(0, 6).join(' · ') + (p.sizes.length > 6 ? ' …' : '') });
  if (p.colors?.length) facts.push({ label: 'COULEURS', value: p.colors.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).slice(0, 4).join(' · ') });
  if (facts.length < 3) facts.push({ label: 'PRIX PRÉVU', value: money(p.price) });
  if (facts.length < 3 && family) facts.push({ label: 'FAMILLE', value: family.name });
  const brand = badBrand(p.brand) ? '' : p.brand.toUpperCase();
  return {
    title: p.name,
    eyebrow: [brand, (family?.name || 'Catalogue').toUpperCase()].filter(Boolean).join(' · '),
    facts: facts.slice(0, 3),
    photos: p.images[0] ? [p.images[0].src] : [],
    photoLabel: 'PHOTO DU MODÈLE',
    path: '/produits/' + p.slug + '/',
    cut: p.cut ? { src: p.cut.large, mode: p.cut.mode, tint: p.cut.tint, vivid: p.cut.vivid, lum: p.cut.lum } : undefined,
    price: money(p.price),
  };
}

function categoryCard(c: Category, products: Product[]): Card {
  const items = getCategoryProducts(c, products);
  const brands = new Set(items.map((p) => p.brand).filter((b) => !badBrand(b)));
  const copy = SEO_COPY[c.slug];
  return {
    title: c.name,
    eyebrow: copy?.eyebrow || 'LE CATALOGUE / ' + c.number,
    facts: [
      { label: 'MODÈLES', value: fr(items.length) },
      { label: 'MARQUES', value: fr(brands.size) },
      { label: 'PRIX', value: 'Prévus à l’ouverture' },
    ],
    photos: photosOf(items),
    photoLabel: 'LES MODÈLES',
    path: '/' + c.slug + '/',
  };
}

function subfamilyCard(s: Subfamily, products: Product[]): Card {
  const items = subfamilyProducts(s, products);
  const parent = categoryFor(s.parent);
  return {
    title: s.name,
    eyebrow: s.eyebrow,
    facts: [
      { label: 'MODÈLES', value: fr(items.length) },
      { label: 'FAMILLE', value: parent?.name || 'Catalogue' },
      { label: 'PRIX', value: 'Prévus à l’ouverture' },
    ],
    photos: photosOf(items),
    photoLabel: 'LES MODÈLES',
    path: '/' + s.slug + '/',
  };
}

function guideCard(g: Guide, products: Product[]): Card {
  const pick = selection.guides.find((x) => x.slug === g.slug)?.imageProductId;
  const photo = products.find((p) => p.id === pick)?.images[0]?.src;
  const related = g.relatedCategories.map((slug) => categoryFor(slug)).filter(Boolean) as Category[];
  const fallback = related[0] ? photosOf(getCategoryProducts(related[0], products), 1) : [];
  return {
    title: g.title,
    eyebrow: `GUIDE D’ACHAT · ${g.readMinutes} MIN DE LECTURE`,
    facts: [
      { label: 'REPÈRES', value: fr(g.sections.length) },
      { label: 'QUESTIONS', value: fr(g.faq.length) },
      { label: 'MIS À JOUR', value: '11 septembre 2026' },
    ],
    photos: photo ? [photo] : fallback,
    photoLabel: 'LE MODÈLE ILLUSTRÉ',
    path: '/guides/' + g.slug + '/',
  };
}

const PAGES: Record<string, (products: Product[]) => Card> = {
  home: (products) => ({
    title: 'Tout pour la boxe et le MMA.',
    eyebrow: 'BOUTIQUE DE BOXE · MATÉRIEL DE BOXE, MMA ET SPORTS DE COMBAT',
    facts: [
      { label: 'MODÈLES', value: fr(products.length) },
      { label: 'GUIDES D’ACHAT', value: fr(guides.length) },
      { label: 'LIVRAISON', value: 'Toute la France' },
    ],
    photos: photosOf(products.filter((p) => !p.sourceName)),
    photoLabel: 'LES MODÈLES',
    path: '/',
  }),
  guides: () => ({
    title: 'Les guides d’achat.',
    eyebrow: 'GUIDES D’ACHAT · BOXE, MMA, SPORTS DE COMBAT',
    facts: [
      { label: 'GUIDES', value: fr(guides.length) },
      { label: 'QUESTIONS', value: fr(guides.reduce((a, g) => a + g.faq.length, 0)) },
      { label: 'LECTURE', value: '4 à 5 min chacun' },
    ],
    photos: [],
    photoLabel: '',
    path: '/guides/',
  }),
  nouveautes: (products) => ({
    title: 'Les nouveautés.',
    eyebrow: 'NOUVEAUTÉS · LES DERNIERS MODÈLES',
    facts: [
      { label: 'MODÈLES', value: fr(products.length) },
      { label: 'FAMILLES', value: '10' },
      { label: 'PRIX', value: 'Prévus à l’ouverture' },
    ],
    photos: photosOf([...products].reverse()),
    photoLabel: 'LES MODÈLES',
    path: '/nouveautes/',
  }),
  contact: () => ({
    title: 'Une question sur un modèle ?',
    eyebrow: 'CONTACT · BOUTIQUE DE BOXE',
    facts: [
      { label: 'E-MAIL', value: shop.email },
      { label: 'TÉLÉPHONE', value: shop.phone },
      { label: 'RÉPONSE', value: 'Par e-mail' },
    ],
    photos: [],
    photoLabel: '',
    path: '/contact/',
  }),
};

export function cardFor(kind: CardKind, key: string, products: Product[]): Card | null {
  if (kind === 'p') { const p = products.find((x) => x.slug === key); return p ? productCard(p) : null; }
  if (kind === 'c') { const c = categoryFor(key); return c ? categoryCard(c, products) : null; }
  if (kind === 's') { const s = SUBFAMILIES.find((x) => x.slug === key); return s ? subfamilyCard(s, products) : null; }
  if (kind === 'g') { const g = guides.find((x) => x.slug === key); return g ? guideCard(g, products) : null; }
  if (kind === 'x') {
    if (key === 'marques') {
      const brands = brandsOf(products);
      return {
        title: 'Les marques de la boutique.',
        eyebrow: 'MARQUES · BOXE, MMA, SPORTS DE COMBAT',
        facts: [
          { label: 'MARQUES', value: fr(brands.length) },
          { label: 'MODÈLES', value: fr(brands.reduce((a, b) => a + b.products.length, 0)) },
          { label: 'LES PLUS FOURNIES', value: brands.slice(0, 3).map((b) => b.name).join(' · ') },
        ],
        photos: photosOf(brands[0]?.products || []),
        photoLabel: 'LES MODÈLES',
        path: '/marques/',
      };
    }
    if (key.startsWith('marques/')) {
      const b = brandFor(key.slice(8), products);
      if (!b) return null;
      return {
        title: b.name,
        eyebrow: 'MARQUE · ' + b.families.slice(0, 2).map((f) => f.name.toUpperCase()).join(' · '),
        facts: [
          { label: 'MODÈLES', value: fr(b.products.length) },
          { label: 'DÈS', value: money(b.min) },
          { label: 'JUSQU’À', value: money(b.max) },
        ],
        photos: photosOf(b.products.filter((p) => p.cut?.mode === 'pose')),
        photoLabel: 'UN MODÈLE ' + b.name.toUpperCase(),
        path: '/marques/' + b.slug + '/',
      };
    }
    if (PAGES[key]) return PAGES[key](products);
    const s = services[key];
    if (s) return { title: s.title, eyebrow: s.eyebrow.replace(/\s*\/\s*/g, ' · '), facts: s.sections.slice(0, 3).map((sec) => ({ label: sec.title.replace(/\.$/, '').toUpperCase().slice(0, 28), value: '' })), photos: [], photoLabel: '', path: '/' + key + '/' };
  }
  return null;
}
