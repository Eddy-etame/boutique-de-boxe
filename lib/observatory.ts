import { categories, categoryFor, money, type Product } from './catalog';
import { brandsOf } from './brands';
import { GLOVE_WEIGHTS, ouncesOf } from './facets';
import { isoWeek } from './hub';

/**
 * L’observatoire des prix.
 *
 *   Des chiffres que personne d’autre ne publie : combien coûtent des gants de boxe, un casque, un
 *   sac de frappe, par famille, par marque, par poids de gant — le nombre de modèles, le prix le plus
 *   bas, le prix médian, le prix moyen, le prix le plus haut. Tout vient du catalogue, rien n’est
 *   estimé. Le relevé est daté à la semaine ISO ; il change quand le catalogue change.
 *
 *   La page publie ces chiffres en texte, en JSON et en CSV, sous licence de citation (source à
 *   nommer). C’est ce que les forums, les comparateurs, les journalistes et les moteurs de réponse
 *   citent quand on leur demande « combien coûtent des gants de boxe ? ».
 */
export type PriceRow = {
  key: string;
  label: string;
  path: string | null;
  count: number;
  min: number;
  q1: number;
  median: number;
  mean: number;
  q3: number;
  max: number;
};

function stats(prices: number[]) {
  const s = prices.filter((n) => n > 0).sort((a, b) => a - b);
  const at = (q: number) => s[Math.min(s.length - 1, Math.floor(s.length * q))];
  return {
    count: s.length,
    min: s[0] ?? 0,
    q1: at(0.25) ?? 0,
    median: at(0.5) ?? 0,
    mean: s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : 0,
    q3: at(0.75) ?? 0,
    max: s[s.length - 1] ?? 0,
  };
}

const NOT_A_BRAND = /pr[ée]ciser|^Sélection /i;
const FAMILY_ORDER = ['gants-de-boxe', 'gants-mma', 'protections-boxe', 'sacs-de-frappe', 'chaussures-boxe', 'textile-boxe', 'accessoires-boxe', 'equipement-entrainement', 'sacs-de-sport', 'arts-martiaux'];

export function observatory(products: Product[], now = new Date()) {
  const { year, week, monday } = isoWeek(now);
  const priced = products.filter((p) => p.price > 0);
  const families: PriceRow[] = FAMILY_ORDER.map((slug) => {
    const list = priced.filter((p) => p.category === slug);
    const c = categoryFor(slug);
    return { key: slug, label: c?.name || slug, path: c ? '/' + c.slug + '/' : null, ...stats(list.map((p) => p.price)) };
  }).filter((r) => r.count >= 4);
  const brands: PriceRow[] = brandsOf(priced).map((b) => ({ key: b.slug, label: b.name, path: '/marques/' + b.slug + '/', ...stats(b.products.map((p) => p.price)) }));
  const gloves = priced.filter((p) => p.category === 'gants-de-boxe');
  const weights: PriceRow[] = GLOVE_WEIGHTS.map((oz) => {
    const list = gloves.filter((p) => ouncesOf(p).includes(oz));
    return { key: `${oz}-oz`, label: `${oz} oz`, path: list.length >= 6 ? `/gants-de-boxe-${oz}-oz/` : null, ...stats(list.map((p) => p.price)) };
  }).filter((r) => r.count >= 4);
  // Les gants de boxe par marque : la question la plus posée, « combien coûtent des gants Fairtex ? »
  const gloveBrands: PriceRow[] = [...new Set(gloves.map((p) => p.brand).filter((b) => b && !NOT_A_BRAND.test(b)))]
    .map((name) => {
      const list = gloves.filter((p) => p.brand === name);
      const b = brandsOf(priced).find((x) => x.name === name);
      return { key: b?.slug || name, label: name, path: b && list.length >= 6 ? `/marques/${b.slug}/gants-de-boxe/` : b ? '/marques/' + b.slug + '/' : null, ...stats(list.map((p) => p.price)) };
    })
    .filter((r) => r.count >= 4)
    .sort((a, b) => a.median - b.median);
  const all = stats(priced.map((p) => p.price));
  // Les tranches de prix : où se concentre le catalogue.
  const bands = [
    [0, 2000, 'moins de 20 €'],
    [2000, 5000, 'de 20 à 50 €'],
    [5000, 10000, 'de 50 à 100 €'],
    [10000, 20000, 'de 100 à 200 €'],
    [20000, Infinity, 'plus de 200 €'],
  ].map(([lo, hi, label]) => ({ label: label as string, count: priced.filter((p) => p.price >= (lo as number) && p.price < (hi as number)).length }));
  return {
    generated: now.toISOString(),
    week: { year, week, monday: monday.toISOString().slice(0, 10) },
    currency: 'EUR',
    basis: 'Prix prévus à l’ouverture des ventes, TTC, hors livraison. Un modèle = un prix (celui de la fiche, hors déclinaisons).',
    products: priced.length,
    brands: brands.length,
    all,
    bands,
    families,
    brands_rows: brands,
    weights,
    gloveBrands,
  };
}

export type Observatory = ReturnType<typeof observatory>;

/** Le relevé en CSV, une ligne par série et par ligne. */
export function observatoryCsv(o: Observatory) {
  const rows = [['serie', 'cle', 'libelle', 'modeles', 'min_eur', 'q1_eur', 'median_eur', 'moyen_eur', 'q3_eur', 'max_eur', 'url']];
  const eur = (c: number) => (c / 100).toFixed(2);
  const push = (serie: string, r: PriceRow) => rows.push([serie, r.key, r.label, String(r.count), eur(r.min), eur(r.q1), eur(r.median), eur(r.mean), eur(r.q3), eur(r.max), r.path ? 'https://www.boutique-de-boxe.com' + r.path : '']);
  rows.push(['catalogue', 'tout', 'Tout le catalogue', String(o.all.count), eur(o.all.min), eur(o.all.q1), eur(o.all.median), eur(o.all.mean), eur(o.all.q3), eur(o.all.max), 'https://www.boutique-de-boxe.com/observatoire-des-prix/']);
  o.families.forEach((r) => push('famille', r));
  o.brands_rows.forEach((r) => push('marque', r));
  o.weights.forEach((r) => push('gants-poids', r));
  o.gloveBrands.forEach((r) => push('gants-marque', r));
  return rows.map((r) => r.map((v) => (/[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v)).join(';')).join('\n') + '\n';
}

/** Les phrases citables du relevé, écrites une fois pour la page, le llms.txt et l’outil MCP. */
export function observatorySentences(o: Observatory) {
  const f = (slug: string) => o.families.find((r) => r.key === slug);
  const g = f('gants-de-boxe');
  const out: string[] = [];
  if (g) out.push(`Une paire de gants de boxe coûte ${money(g.min)} au minimum, ${money(g.median)} au prix médian et jusqu’à ${money(g.max)}, sur ${g.count} modèles.`);
  const w16 = o.weights.find((r) => r.key === '16-oz');
  const w10 = o.weights.find((r) => r.key === '10-oz');
  if (w10 && w16) out.push(`En 10 oz, le prix médian est de ${money(w10.median)} ; en 16 oz, de ${money(w16.median)}.`);
  for (const slug of ['protections-boxe', 'sacs-de-frappe', 'chaussures-boxe']) {
    const r = f(slug);
    if (r) out.push(`${r.label} : de ${money(r.min)} à ${money(r.max)}, prix médian ${money(r.median)} (${r.count} modèles).`);
  }
  const cheap = o.gloveBrands[0];
  const dear = o.gloveBrands.at(-1);
  if (cheap && dear && cheap !== dear) out.push(`Parmi les marques de gants, ${cheap.label} a le prix médian le plus bas (${money(cheap.median)}) et ${dear.label} le plus haut (${money(dear.median)}).`);
  return out;
}

export const familyLabel = (slug: string) => categories.find((c) => c.slug === slug)?.name || slug;
