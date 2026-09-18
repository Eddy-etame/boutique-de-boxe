import { categoryFor, money, type Product } from './catalog';
import type { SeoFaq } from './seo-copy';
import { brandsOf, brandSlug, type Brand } from './brands';

/**
 * Les pages de longue traîne adossées à du stock réel.
 *
 *   « gants de boxe 12 oz », « gants de boxe Fairtex », « short de boxe Elion » : des recherches
 *   d’acheteurs qui savent déjà ce qu’ils veulent. Chaque page n’existe que si le catalogue porte
 *   au moins six modèles qui y répondent ; en dessous, la recherche renvoie à la page mère.
 *   Tout le texte vient des faits du catalogue et du guide publié : rien n’y est promis qu’on ne
 *   puisse montrer.
 *
 *   Deux familles de pages :
 *     – le poids des gants de boxe, en onces : /gants-de-boxe-12-oz/
 *     – une marque dans une famille : /marques/fairtex/gants-de-boxe/
 */
export const MIN_FACET_PRODUCTS = 6;

export type Facet = {
  kind: 'oz' | 'marque-famille';
  /** identifiant de liste (scope du catalogue en fenêtre) */
  scope: string;
  path: string;
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  keywords: string[];
  faq: SeoFaq[];
  guide: string;
  parent: { path: string; name: string };
  products: Product[];
};

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' et ' + xs.at(-1));
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const familyName = (slug: string) => categoryFor(slug)?.name || slug;

/* ------------------------------------------------------------------ le poids des gants */

export const GLOVE_WEIGHTS = [4, 6, 8, 10, 12, 14, 16, 18] as const;

/** Les repères du guide « Quelle taille de gants de boxe choisir ? », un par poids. */
const OZ_COPY: Record<number, { who: string; use: string; note: string }> = {
  4: { who: 'les enfants de 5 à 7 ans', use: 'la découverte de la boxe, au sac et aux pattes d’ours', note: 'Le plus petit poids du catalogue. Un gant d’enfant se choisit à l’âge et à la main, jamais « pour grandir dedans ».' },
  6: { who: 'les enfants de 7 à 10 ans', use: 'l’école de boxe, le sac et les pattes d’ours', note: 'Entre 4 et 8 oz, le 6 oz est le poids des premières années de club.' },
  8: { who: 'les enfants de 10 à 13 ans et les gabarits très légers', use: 'le sac, les pattes d’ours et la technique', note: 'Le 8 oz est aussi le poids de compétition de certaines catégories : votre club vous le dira.' },
  10: { who: 'les adultes de moins de 55 kg et les adolescents', use: 'le sac et les pattes d’ours', note: 'Le poids du travail au sac pour la plupart des adultes : plus léger, plus rapide, moins de rembourrage.' },
  12: { who: 'les adultes de 55 à 75 kg', use: 'la technique et le cours collectif', note: 'Le poids « à tout faire » du cours de boxe : assez de mousse pour le sac, assez léger pour la vitesse.' },
  14: { who: 'les gabarits légers avec un partenaire, et les adultes de 55 à 75 kg', use: 'la technique avec partenaire et le sparring léger', note: 'Le 14 oz est le premier poids qu’une salle accepte en général pour toucher un partenaire.' },
  16: { who: 'la plupart des adultes avec un partenaire', use: 'le sparring', note: 'Le poids de sparring de référence : il protège le partenaire autant que vos mains. Beaucoup de salles l’imposent.' },
  18: { who: 'les adultes de plus de 90 kg', use: 'le sparring des lourds', note: 'Réservé aux gabarits lourds : plus de rembourrage, plus de protection pour le partenaire.' },
};

const OZ_RE = /(\d{1,2})\s*oz\b/i;

/** Les poids, en onces, réellement proposés par un modèle (d’après ses tailles). */
export function ouncesOf(p: Product): number[] {
  const out = new Set<number>();
  for (const s of p.sizes) {
    const m = OZ_RE.exec(s);
    if (m) out.add(Number(m[1]));
  }
  return [...out].sort((a, b) => a - b);
}

const gloves = (products: Product[]) => products.filter((p) => p.category === 'gants-de-boxe');

export function ozFacet(oz: number, products: Product[]): Facet | null {
  const copy = OZ_COPY[oz];
  if (!copy) return null;
  const items = gloves(products).filter((p) => ouncesOf(p).includes(oz));
  if (items.length < MIN_FACET_PRODUCTS) return null;
  const prices = items.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b);
  const brands = [...new Set(items.map((p) => p.brand).filter((b) => b && !/pr[ée]ciser|^Sélection /i.test(b)))].slice(0, 6);
  const name = `Gants de boxe ${oz} oz`;
  const scope = `gants-de-boxe-${oz}-oz`;
  return {
    kind: 'oz',
    scope,
    path: '/' + scope + '/',
    name,
    eyebrow: `GANTS DE BOXE · ${oz} OZ · ${items.length} MODÈLES`,
    title: `Gants de boxe ${oz} oz : ${items.length} modèles, de ${money(prices[0])} à ${money(prices.at(-1)!)}`.slice(0, 60),
    description: `Gants de boxe ${oz} oz pour ${copy.who} : ${items.length} modèles ${list(brands.slice(0, 4))}, de ${money(prices[0])} à ${money(prices.at(-1)!)}. ${copy.use.charAt(0).toUpperCase() + copy.use.slice(1)}. Prix prévus, livraison en France.`.slice(0, 158),
    intro: `${items.length} paires de gants de boxe proposées en ${oz} oz, chez ${list(brands)}. D’après notre guide, le ${oz} oz convient à ${copy.who}, pour ${copy.use}. ${copy.note}`,
    keywords: [`gants de boxe ${oz} oz`, `gants ${oz} oz`, `gant de boxe ${oz} oz`, `${oz} oz boxe`, `gants de boxe ${oz} onces`, ...brands.slice(0, 3).map((b) => `gants de boxe ${b} ${oz} oz`)],
    faq: [
      { question: `À qui conviennent des gants de boxe ${oz} oz ?`, answer: `À ${copy.who}, pour ${copy.use}. Ce sont les repères de notre guide de tailles ; votre salle peut imposer un autre poids pour le sparring, demandez avant d’acheter.` },
      { question: `Combien coûtent des gants de boxe ${oz} oz ?`, answer: `De ${money(prices[0])} à ${money(prices.at(-1)!)} selon la marque et la matière, prix médian ${money(prices[Math.floor(prices.length / 2)])}. Ce sont les prix prévus à l’ouverture des ventes, affichés sur chaque fiche.` },
      { question: `Le ${oz} oz est-il une taille de main ?`, answer: `Non. L’once est un poids de rembourrage, pas une taille. Deux paires de ${oz} oz peuvent avoir une coupe très différente : essayez avec vos bandes et lisez le guide de tailles de la marque quand il existe.` },
      { question: `Quel poids si j’hésite entre deux ?`, answer: oz >= 14 ? 'Pour le sparring, prenez le plus lourd : il protège le partenaire et beaucoup de salles l’imposent.' : 'Pour le sac et la technique, prenez le plus léger si vous cherchez la vitesse, le plus lourd si vous frappez fort ou si vous prévoyez de toucher un partenaire.' },
    ],
    guide: 'quelle-taille-gants-de-boxe',
    parent: { path: '/gants-de-boxe/', name: 'Gants de boxe' },
    products: items,
  };
}

export const ozFacets = (products: Product[]) => GLOVE_WEIGHTS.map((oz) => ozFacet(oz, products)).filter((f): f is Facet => Boolean(f));

/* ------------------------------------------------------------------ une marque dans une famille */

export function brandFamilyFacet(b: Brand, family: string): Facet | null {
  const items = b.products.filter((p) => p.category === family);
  if (items.length < MIN_FACET_PRODUCTS) return null;
  const fam = familyName(family);
  const prices = items.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b);
  const sizes = [...new Set(items.flatMap((p) => p.sizes.map((s) => s.split(' (')[0])))].filter((s) => s.length <= 8).slice(0, 8);
  const name = `${fam} ${b.name}`;
  const scope = `marque-${b.slug}--${family}`;
  const cat = categoryFor(family);
  return {
    kind: 'marque-famille',
    scope,
    path: `/marques/${b.slug}/${family}/`,
    name,
    eyebrow: `${b.name.toUpperCase()} · ${fam.toUpperCase()} · ${items.length} MODÈLES`,
    title: `${fam} ${b.name} : ${items.length} modèles, de ${money(prices[0])} à ${money(prices.at(-1)!)}`.slice(0, 60),
    description: `${fam} ${b.name} chez Boutique de Boxe : ${items.length} modèles, de ${money(prices[0])} à ${money(prices.at(-1)!)}${sizes.length >= 2 ? `, tailles ${sizes.slice(0, 4).join(', ')}` : ''}. Photos, tailles réelles et prix prévus à l’ouverture des ventes.`.slice(0, 158),
    intro: `${items.length} modèles ${b.name} en ${lower(fam)}, de ${money(prices[0])} à ${money(prices.at(-1)!)}${sizes.length >= 2 ? `, proposés en ${list(sizes.slice(0, 5))}` : ''}. ${b.name} compte ${b.products.length} modèles au catalogue, dans ${b.families.length} famille${b.families.length > 1 ? 's' : ''}. Chaque fiche donne les tailles réellement proposées et le prix prévu à l’ouverture des ventes.`,
    keywords: [`${lower(fam)} ${b.name}`, `${b.name} ${lower(fam)}`, `${lower(fam)} ${b.name} prix`, `${b.name} France`, `${lower(fam)} ${b.name} pas cher`],
    faq: [
      { question: `Quels ${lower(fam)} ${b.name} proposez-vous ?`, answer: `${items.length} modèles, listés sur cette page avec leur photo, leurs tailles et leur prix prévu. Le filtre permet de trier par prix et par taille.` },
      { question: `À quel prix sont les ${lower(fam)} ${b.name} ?`, answer: `De ${money(prices[0])} à ${money(prices.at(-1)!)}, prix médian ${money(prices[Math.floor(prices.length / 2)])}. Ce sont les prix prévus à l’ouverture des ventes.` },
      ...(sizes.length >= 3 ? [{ question: `Quelles tailles pour les ${lower(fam)} ${b.name} ?`, answer: `Selon le modèle : ${sizes.join(', ')}. Les tailles ${b.name} ne se transposent pas d’une marque à l’autre : suivez le guide de tailles de la marque indiqué sur la fiche.` }] : []),
      { question: `Quand pourrai-je commander ?`, answer: 'Les ventes ouvrent bientôt. Laissez votre e-mail sur la fiche du modèle qui vous intéresse : vous êtes prévenu le matin de l’ouverture. D’ici là, la commande d’essai fonctionne sans paiement.' },
    ],
    guide: cat?.guide || 'guide-des-tailles',
    parent: { path: '/marques/' + b.slug + '/', name: b.name },
    products: items,
  };
}

export function brandFamilyFacets(products: Product[]): Facet[] {
  return brandsOf(products).flatMap((b) => b.families.map((f) => brandFamilyFacet(b, f.slug)).filter((x): x is Facet => Boolean(x)));
}

/** Toutes les pages de longue traîne qui existent aujourd’hui, pour le plan du site et les index. */
export const allFacets = (products: Product[]) => [...ozFacets(products), ...brandFamilyFacets(products)];

/** Résolution d’un chemin de page ou d’un scope de liste vers sa page, s’il y en a une. */
export function facetFor(key: string, products: Product[]): Facet | null {
  const oz = /^gants-de-boxe-(\d{1,2})-oz$/.exec(key);
  if (oz) return ozFacet(Number(oz[1]), products);
  const bf = /^marque-([a-z0-9-]+?)--([a-z0-9-]+)$/.exec(key) || /^marques\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(key);
  if (bf) {
    const b = brandsOf(products).find((x) => x.slug === bf[1]);
    return b ? brandFamilyFacet(b, bf[2]) : null;
  }
  return null;
}

/** Les pages voisines d’une page : les autres poids, ou les autres familles de la marque et les autres marques de la famille. */
export function facetSiblings(f: Facet, products: Product[]): { path: string; name: string }[] {
  if (f.kind === 'oz') return ozFacets(products).filter((x) => x.scope !== f.scope).map((x) => ({ path: x.path, name: x.name }));
  const [, brand, family] = /^marque-([a-z0-9-]+?)--([a-z0-9-]+)$/.exec(f.scope) || [];
  const b = brandsOf(products).find((x) => x.slug === brand);
  const sameBrand = b ? b.families.map((x) => brandFamilyFacet(b, x.slug)).filter((x): x is Facet => x !== null && x.scope !== f.scope) : [];
  const sameFamily = brandsOf(products)
    .filter((x) => x.slug !== brand)
    .map((x) => brandFamilyFacet(x, family))
    .filter((x): x is Facet => Boolean(x));
  return [...sameBrand, ...sameFamily].map((x) => ({ path: x.path, name: x.name }));
}

export { brandSlug };
