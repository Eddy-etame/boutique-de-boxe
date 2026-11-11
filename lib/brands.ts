import { categories, money, type Product, livraison } from './catalog';
import type { SeoFaq } from './seo-copy';
import { marqueDeModele, vuesDesModeles } from './modeles';
import { cartesParModele } from './un-par-modele';
import { quiTient } from './phrases';

/**
 * Pages de marque : la longue traîne avec du stock réel.
 *
 * « Gants de boxe Fairtex », « Cleto Reyes France », « short Elion » : des recherches d’acheteurs, moins
 * disputées que les têtes de requête. Une marque n’a sa page que si le catalogue en porte au moins six
 * modèles : jamais une page mince. Tout le texte est tiré des faits du catalogue (nombre de modèles,
 * familles, prix, tailles) ; rien n’est dit d’une marque que le catalogue ne montre pas.
 */
export const MIN_BRAND_PRODUCTS = 6;
const NOT_A_BRAND = /pr[ée]ciser|^Sélection /i;

export type Brand = {
  slug: string;
  name: string;
  /** Les cartes de la marque (11/11/2026) : une fiche réelle par modèle, avec la marque de son modèle. Leur nombre est le nombre de modèles. */
  products: Product[];
  /** Toutes les fiches de la marque, coloris compris : pour les seuils des pages et les listes à filtrer. */
  fiches: Product[];
  /** Les modèles de la marque vus chacun comme un article, à son premier prix (lib/modeles.ts) : ce que les textes chiffrent. */
  vues: Product[];
  families: { slug: string; name: string; count: number }[];
  min: number;
  max: number;
};

export const brandSlug = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const familyName = (slug: string) =>
  categories.find((c) => c.families.length === 1 && c.families[0] === slug)?.name ||
  ({ 'arts-martiaux': 'Arts martiaux', 'chaussures-boxe': 'Chaussures de boxe', 'equipement-entrainement': 'Équipement d’entraînement', 'sacs-de-sport': 'Sacs de sport' } as Record<string, string>)[slug] ||
  slug;

/** Les marques d'un catalogue se calculent une fois par liste : la réduction par modèle relit chaque fiche. */
const marquesConnues = new WeakMap<Product[], Brand[]>();

export function brandsOf(products: Product[]): Brand[] {
  const connues = marquesConnues.get(products);
  if (connues) return [...connues];
  const by = new Map<string, Product[]>();
  for (const p of products) {
    if (!p.brand || NOT_A_BRAND.test(p.brand)) continue;
    by.set(p.brand, [...(by.get(p.brand) || []), p]);
  }
  const marques = [...by.entries()]
    .filter(([, list]) => list.length >= MIN_BRAND_PRODUCTS)
    .map(([name, list]) => {
      // Les fiches d'un modèle sont toutes de la même marque : la liste de la marque suffit à les réunir.
      const modeles = cartesParModele(list.map((p) => ({ ...p, modele: marqueDeModele(p, list) })));
      const counts = new Map<string, number>();
      for (const p of modeles) counts.set(p.category, (counts.get(p.category) || 0) + 1);
      const prices = list.map((p) => p.price).filter((n) => n > 0);
      return {
        slug: brandSlug(name),
        name,
        products: modeles,
        fiches: list,
        vues: vuesDesModeles(list, list),
        families: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([slug, count]) => ({ slug, name: familyName(slug), count })),
        min: Math.min(...prices),
        max: Math.max(...prices),
      };
    })
    .sort((a, b) => b.products.length - a.products.length);
  marquesConnues.set(products, marques);
  return [...marques];
}

export const brandFor = (slug: string, products: Product[]) => brandsOf(products).find((b) => b.slug === slug);

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' et ' + xs.at(-1));
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Titre, description, texte d’entrée et questions d’une marque, tirés des faits du catalogue. */
export function brandCopy(b: Brand) {
  const n = b.products.length;
  const top = b.families.slice(0, 3).map((f) => lower(f.name));
  const sizes = [...new Set(b.vues.flatMap((p) => p.sizes.map((s) => s.split(' (')[0])))].filter((s) => s.length <= 8).slice(0, 8);
  const title = quiTient(60, `${b.name} : ${top[0] || 'matériel de boxe'}, ${n} modèles ${b.name}`, `${b.name} : ${n} modèles, ${top[0] || 'matériel de boxe'}`, `${b.name} : ${n} modèles`);
  const description = quiTient(158, ...[3, 2, 1].map((k) => `${b.name} chez Boutique de Boxe : ${n} modèles, ${list(top.slice(0, k))}, de ${money(b.min)} à ${money(b.max)}. Tailles, photos et prix de vente TTC.`));
  const intro = `${n} modèles ${b.name} au catalogue : ${list(b.families.map((f) => `${f.count} en ${lower(f.name)}`))}. Les prix vont de ${money(b.min)} à ${money(b.max)}. Chaque fiche donne les tailles réellement proposées et le prix de vente TTC.`;
  const faq: SeoFaq[] = [
    { question: `Quels produits ${b.name} trouve-t-on chez Boutique de Boxe ?`, answer: `${n} modèles ${b.name} : ${list(b.families.map((f) => `${f.count} en ${lower(f.name)}`))}. La liste complète est sur cette page, avec un filtre par équipement, par taille et par budget.` },
    { question: `À quel prix sont les produits ${b.name} ?`, answer: `De ${money(b.min)} à ${money(b.max)}, selon le modèle. Ce sont les prix de vente TTC, affichés sur chaque fiche.` },
    ...(sizes.length >= 3 ? [{ question: `Quelles tailles ${b.name} proposez-vous ?`, answer: `Selon le modèle : ${sizes.join(', ')}. Les tailles ne se transposent pas d’une marque à l’autre : suivez le guide de tailles de ${b.name} indiqué sur la fiche.` }] : []),
    { question: `Peut-on acheter du ${b.name} en ligne ?`, answer: 'Oui, depuis le 13 octobre 2026 : chaque modèle se commande sur sa fiche et se paie par carte sur la page sécurisée de PayPlug.' },
    { question: `Livrez-vous les produits ${b.name} partout en France ?`, answer: `Oui, dans toute la ${livraison.zone}, à domicile ou en point relais (${livraison.tarifs}). Le matériel lourd (sacs de frappe, bases, portiques) se livre à domicile, sur devis.` },
  ];
  return { title, description, intro, faq };
}

/** Le prix le plus haut d'un modèle vu comme un article : celui de sa fiche la plus chère. */
const plusHaut = (p: Product) => p.modele?.max ?? p.price;

/** Les prix d'une liste de vues : nombre de modèles, premier prix, prix médian (un prix par modèle, le premier), prix de la fiche la plus chère. */
export function prixDesVues(vues: Product[]) {
  const comptes = vues.filter((p) => p.price > 0);
  const s = comptes.map((p) => p.price).sort((a, b) => a - b);
  return { count: s.length, min: s[0], median: s[Math.floor(s.length / 2)], max: comptes.length ? Math.max(...comptes.map(plusHaut)) : 0 };
}

/**
 * Par famille : nombre de modèles, prix le plus bas, prix médian, prix le plus haut. Des chiffres du catalogue, pas des
 * estimations. La liste reçue est faite de vues de modèles (lib/modeles.ts, `vuesDesModeles`).
 */
export function priceTable(vues: Product[]) {
  const by = new Map<string, Product[]>();
  for (const p of vues) if (p.price > 0) by.set(p.category, [...(by.get(p.category) || []), p]);
  return [...by.entries()].map(([slug, ps]) => ({ slug, name: familyName(slug), ...prixDesVues(ps) })).sort((a, b) => b.count - a.count);
}
