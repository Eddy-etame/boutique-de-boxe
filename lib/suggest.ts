import { categories, money, type Product } from './catalog';
import { normalizeSearch, matchesSearch } from './catalog-tools';
import { guides, services } from './editorial';
import { SUBFAMILIES } from './subfamilies';
import { brandsOf } from './brands';
import { allFacets } from './facets';

/**
 * Les suggestions : ce que la barre de recherche propose pendant la frappe, et ce que la page 404
 * propose devant une adresse qui n'existe pas (un « s » en trop, une lettre en moins).
 *
 *   Même index pour les deux : les familles, sous-familles, pages de longue traîne, marques, guides,
 *   pages de service, et les modèles. En frappe, on cherche des débuts de mots ; en 404, on cherche
 *   des voisins par distance d'édition sur le dernier segment de l'adresse.
 */
export type Suggestion = { kind: 'famille' | 'marque' | 'guide' | 'page' | 'outil'; label: string; path: string; hint?: string };
export type ProductSuggestion = { name: string; slug: string; brand: string; price: string; image: string | null; family: string };

const NOT_A_BRAND = /pr[ée]ciser|^Sélection /i;

/** L'index des pages, reconstruit à chaque appel à partir du catalogue (quelques centaines d'entrées). */
export function pageIndex(products: Product[]): Suggestion[] {
  const out: Suggestion[] = [];
  for (const c of categories) out.push({ kind: 'famille', label: c.name, path: '/' + c.slug + '/', hint: c.label });
  for (const s of SUBFAMILIES) out.push({ kind: 'famille', label: s.name, path: '/' + s.slug + '/' });
  for (const f of allFacets(products)) out.push({ kind: 'famille', label: f.name, path: f.path, hint: `${f.products.length} modèles` });
  for (const b of brandsOf(products)) out.push({ kind: 'marque', label: b.name, path: '/marques/' + b.slug + '/', hint: `${b.products.length} modèles` });
  out.push({ kind: 'marque', label: 'Toutes les marques', path: '/marques/' });
  for (const g of guides) out.push({ kind: 'guide', label: g.title, path: '/guides/' + g.slug + '/' });
  out.push({ kind: 'guide', label: 'Les guides d’achat', path: '/guides/' });
  out.push({ kind: 'guide', label: 'Guide des tailles', path: '/guide-des-tailles/' });
  out.push({ kind: 'outil', label: 'Quel poids de gants de boxe ?', path: '/outils/poids-de-gants/', hint: 'Le calculateur' });
  out.push({ kind: 'outil', label: 'L’observatoire des prix', path: '/observatoire-des-prix/' });
  for (const [slug, s] of Object.entries(services)) out.push({ kind: 'page', label: s.title, path: '/' + slug + '/' });
  out.push({ kind: 'page', label: 'Nous contacter', path: '/contact/' });
  out.push({ kind: 'page', label: 'Les nouveautés', path: '/nouveautes/' });
  return out;
}

const productView = (p: Product): ProductSuggestion => ({
  name: p.name,
  slug: p.slug,
  brand: p.brand && !NOT_A_BRAND.test(p.brand) ? p.brand : '',
  price: money(p.price),
  image: p.cut?.small ?? p.images[0]?.small ?? null,
  family: categories.find((c) => c.slug === p.category)?.name || p.category,
});

/** Pendant la frappe : les pages dont un mot commence par la saisie, puis les modèles qui répondent. */
export function suggest(query: string, products: Product[]): { pages: Suggestion[]; products: ProductSuggestion[]; total: number } {
  const q = normalizeSearch(query).trim();
  if (q.length < 2) return { pages: [], products: [], total: 0 };
  const terms = q.split(' ').filter(Boolean);
  const startsAll = (label: string) => {
    const words = normalizeSearch(label).split(/\s+/);
    return terms.every((t) => words.some((w) => w.startsWith(t)));
  };
  const pages = pageIndex(products)
    .filter((s) => startsAll(s.label))
    .sort((a, b) => (normalizeSearch(a.label).startsWith(q) ? 0 : 1) - (normalizeSearch(b.label).startsWith(q) ? 0 : 1) || a.label.length - b.label.length)
    .slice(0, 4);
  const hits = products.filter((p) => matchesSearch(p, q));
  // Le nom qui commence par la saisie d'abord, puis la marque, puis le reste, à prix croissant.
  const rank = (p: Product) => (normalizeSearch(p.name).startsWith(q) ? 0 : normalizeSearch(p.brand).startsWith(q) ? 1 : 2);
  const top = hits.sort((a, b) => rank(a) - rank(b) || a.price - b.price).slice(0, 6);
  return { pages, products: top.map(productView), total: hits.length };
}

/** Distance d'édition bornée : assez pour un « s » en trop, une lettre inversée, un accent oublié. */
function distance(a: string, b: string, max = 4): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

const slugOf = (s: string) => normalizeSearch(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Devant une adresse introuvable : les pages dont le chemin ou le nom est à quelques lettres de la saisie. */
export function nearest(path: string, products: Product[]): { pages: Suggestion[]; products: ProductSuggestion[] } {
  const segments = path.split('/').filter(Boolean);
  const last = slugOf(decodeURIComponent(segments.at(-1) || ''));
  if (!last) return { pages: [], products: [] };
  const tokens = last.split('-').filter((t) => t.length >= 3);
  const scorePage = (s: Suggestion) => {
    const slug = slugOf(s.path.replace(/^\/|\/$/g, '').split('/').at(-1) || '');
    const d = Math.min(distance(last, slug), distance(last, slugOf(s.label)));
    // Un chemin à deux lettres près passe devant ; sinon, le plus de mots entiers en commun
    // (« dent » ne doit pas retrouver « confidentialite »).
    const words = slug.split('-');
    const shared = tokens.filter((t) => words.some((w) => w === t || (t.length >= 4 && w.startsWith(t)) || (w.length >= 4 && t.startsWith(w)))).length;
    return d <= 2 ? d : shared > 0 ? 3 + (tokens.length - shared) : 99;
  };
  const pages = pageIndex(products)
    .map((s) => ({ s, score: scorePage(s) }))
    .filter((x) => x.score < 99)
    .sort((a, b) => a.score - b.score || a.s.label.length - b.s.label.length)
    .slice(0, 5)
    .map((x) => x.s);
  let items: ProductSuggestion[] = [];
  if (segments[0] === 'produits' || pages.length === 0) {
    const scored = products
      .map((p) => ({ p, d: distance(last, p.slug, 6) }))
      .filter((x) => x.d <= 6)
      .sort((a, b) => a.d - b.d)
      .slice(0, 4);
    if (scored.length === 0 && tokens.length) {
      const hits = products.filter((p) => tokens.some((t) => normalizeSearch(p.name).includes(t)));
      items = hits.slice(0, 4).map(productView);
    } else items = scored.map((x) => productView(x.p));
  }
  return { pages, products: items };
}
