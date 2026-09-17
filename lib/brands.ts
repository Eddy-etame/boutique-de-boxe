import { categories, money, type Product } from './catalog';
import type { SeoFaq } from './seo-copy';

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
  products: Product[];
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

export function brandsOf(products: Product[]): Brand[] {
  const by = new Map<string, Product[]>();
  for (const p of products) {
    if (!p.brand || NOT_A_BRAND.test(p.brand)) continue;
    by.set(p.brand, [...(by.get(p.brand) || []), p]);
  }
  return [...by.entries()]
    .filter(([, list]) => list.length >= MIN_BRAND_PRODUCTS)
    .map(([name, list]) => {
      const counts = new Map<string, number>();
      for (const p of list) counts.set(p.category, (counts.get(p.category) || 0) + 1);
      const prices = list.map((p) => p.price).filter((n) => n > 0);
      return {
        slug: brandSlug(name),
        name,
        products: list,
        families: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([slug, count]) => ({ slug, name: familyName(slug), count })),
        min: Math.min(...prices),
        max: Math.max(...prices),
      };
    })
    .sort((a, b) => b.products.length - a.products.length);
}

export const brandFor = (slug: string, products: Product[]) => brandsOf(products).find((b) => b.slug === slug);

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' et ' + xs.at(-1));
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Titre, description, texte d’entrée et questions d’une marque, tirés des faits du catalogue. */
export function brandCopy(b: Brand) {
  const n = b.products.length;
  const top = b.families.slice(0, 3).map((f) => lower(f.name));
  const sizes = [...new Set(b.products.flatMap((p) => p.sizes.map((s) => s.split(' (')[0])))].filter((s) => s.length <= 8).slice(0, 8);
  const title = `${b.name} : ${top[0] || 'matériel de boxe'}, ${n} modèles ${b.name}`.slice(0, 60);
  const description = `${b.name} chez Boutique de Boxe : ${n} modèles, ${list(top)}, de ${money(b.min)} à ${money(b.max)}. Tailles, photos et prix prévus à l’ouverture des ventes.`.slice(0, 158);
  const intro = `${n} modèles ${b.name} au catalogue : ${list(b.families.map((f) => `${f.count} en ${lower(f.name)}`))}. Les prix vont de ${money(b.min)} à ${money(b.max)}. Chaque fiche donne les tailles réellement proposées et le prix prévu à l’ouverture des ventes.`;
  const faq: SeoFaq[] = [
    { question: `Quels produits ${b.name} trouve-t-on chez Boutique de Boxe ?`, answer: `${n} modèles ${b.name} : ${list(b.families.map((f) => `${f.count} en ${lower(f.name)}`))}. La liste complète est sur cette page, avec un filtre par équipement, par taille et par budget.` },
    { question: `À quel prix sont les produits ${b.name} ?`, answer: `De ${money(b.min)} à ${money(b.max)}, selon le modèle. Ce sont les prix prévus à l’ouverture des ventes ; ils sont affichés sur chaque fiche.` },
    ...(sizes.length >= 3 ? [{ question: `Quelles tailles ${b.name} proposez-vous ?`, answer: `Selon le modèle : ${sizes.join(', ')}. Les tailles ne se transposent pas d’une marque à l’autre : suivez le guide de tailles de ${b.name} indiqué sur la fiche.` }] : []),
    { question: `Quand pourrai-je acheter du ${b.name} ?`, answer: 'Les ventes ouvrent bientôt. Laissez votre e-mail sur la fiche du modèle qui vous intéresse : vous êtes prévenu le matin de l’ouverture. D’ici là, vous pouvez essayer la commande, sans payer.' },
    { question: `Livrez-vous les produits ${b.name} partout en France ?`, answer: 'Oui, dans toute la France métropolitaine, à domicile ou en point relais. Le matériel lourd (sacs de frappe, bases) est livré à domicile seulement.' },
  ];
  return { title, description, intro, faq };
}

/** Par famille : nombre de modèles, prix le plus bas, prix médian, prix le plus haut. Des chiffres du catalogue, pas des estimations. */
export function priceTable(products: Product[]) {
  const by = new Map<string, number[]>();
  for (const p of products) if (p.price > 0) by.set(p.category, [...(by.get(p.category) || []), p.price]);
  return [...by.entries()]
    .map(([slug, prices]) => {
      const s = [...prices].sort((a, b) => a - b);
      return { slug, name: familyName(slug), count: s.length, min: s[0], median: s[Math.floor(s.length / 2)], max: s[s.length - 1] };
    })
    .sort((a, b) => b.count - a.count);
}
