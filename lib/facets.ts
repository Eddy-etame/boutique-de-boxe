import { categoryFor, money, shop, livraison, type Product } from './catalog';
import type { SeoFaq } from './seo-copy';
import { brandsOf, brandSlug, type Brand } from './brands';
import { SUBFAMILIES, type Subfamily } from './subfamilies';
import { dansLeRayon, ENFANT } from './rayons';

/**
 * Les pages de longue traîne adossées à du stock réel.
 *
 *   « gants de boxe 12 oz », « gants de boxe Fairtex », « short de boxe Elion » : des recherches
 *   d’acheteurs qui savent déjà ce qu’ils veulent. Chaque page n’existe que si le catalogue porte
 *   au moins six modèles qui y répondent ; en dessous, la recherche renvoie à la page mère.
 *   Tout le texte vient des faits du catalogue et du guide publié : rien n’y est promis qu’on ne
 *   puisse montrer.
 *
 *   Quatre familles de pages :
 *     – le poids des gants de boxe, en onces : /gants-de-boxe-12-oz/
 *     – la couleur des gants de boxe : /gants-de-boxe-noirs/
 *     – une marque dans une famille : /marques/fairtex/gants-de-boxe/
 *     – une marque dans un rayon précis (sous-famille) : /marques/fairtex/shorts-de-boxe-thai/
 */
export const MIN_FACET_PRODUCTS = 6;

export type Facet = {
  kind: 'oz' | 'marque-famille' | 'couleur' | 'marque-sous-famille';
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
  /** Marque × sous-famille : la page marque × famille qui la coiffe, quand elle existe. */
  family?: { path: string; name: string };
  /** Marque × sous-famille : le rayon toutes marques (« Protège-tibias », 40 modèles). */
  subfamily?: { path: string; name: string };
  products: Product[];
};

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' et ' + xs.at(-1));
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const familyName = (slug: string) => categoryFor(slug)?.name || slug;

/* ------------------------------------------------------------------ le poids des gants */

export const GLOVE_WEIGHTS = [4, 6, 8, 10, 12, 14, 16, 18] as const;

/** Les repères du guide « Quelle taille de gants de boxe choisir ? », un par poids. */
export const OZ_COPY: Record<number, { who: string; use: string; note: string }> = {
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

/* ------------------------------------------------------------------ les couleurs */

/** Une teinte par famille de couleur : « bleu marine », « bleu roi » et « bleu clair » sont bleus ; « noir mat » est noir. */
export const COLOURS: { key: string; slug: string; label: string; plural: string }[] = [
  { key: 'noir', slug: 'noirs', label: 'Noir', plural: 'noirs' },
  { key: 'blanc', slug: 'blancs', label: 'Blanc', plural: 'blancs' },
  { key: 'rouge', slug: 'rouges', label: 'Rouge', plural: 'rouges' },
  { key: 'bleu', slug: 'bleus', label: 'Bleu', plural: 'bleus' },
  { key: 'or', slug: 'dores', label: 'Doré', plural: 'dorés' },
  { key: 'argent', slug: 'argentes', label: 'Argenté', plural: 'argentés' },
  { key: 'gris', slug: 'gris', label: 'Gris', plural: 'gris' },
  { key: 'vert', slug: 'verts', label: 'Vert', plural: 'verts' },
  { key: 'kaki', slug: 'kaki', label: 'Kaki', plural: 'kaki' },
  { key: 'rose', slug: 'roses', label: 'Rose', plural: 'roses' },
  { key: 'orange', slug: 'orange', label: 'Orange', plural: 'orange' },
  { key: 'bordeaux', slug: 'bordeaux', label: 'Bordeaux', plural: 'bordeaux' },
  { key: 'violet', slug: 'violets', label: 'Violet', plural: 'violets' },
  { key: 'jaune', slug: 'jaunes', label: 'Jaune', plural: 'jaunes' },
  { key: 'marron', slug: 'marron', label: 'Marron', plural: 'marron' },
  { key: 'turquoise', slug: 'turquoise', label: 'Turquoise', plural: 'turquoise' },
  { key: 'camo', slug: 'camouflage', label: 'Camouflage', plural: 'camouflage' },
];
const COLOUR_ALIASES: Record<string, string> = { 'bleu marine': 'bleu', 'bleu roi': 'bleu', 'bleu clair': 'bleu', 'bleu ciel': 'bleu', marine: 'bleu', navy: 'bleu', charbon: 'noir', anthracite: 'gris', crème: 'blanc', creme: 'blanc', écru: 'blanc', ivoire: 'blanc', sable: 'marron', beige: 'marron', olive: 'kaki', doré: 'or', dore: 'or', gold: 'or', silver: 'argent', argenté: 'argent', cerise: 'rouge', fuchsia: 'rose', camouflage: 'camo' };

/** La famille de couleur d'une teinte du catalogue, ou null si elle n'en a pas (« réfléchissant », « fluo »). */
export function colourKey(colour: string): string | null {
  const c = colour.toLowerCase().trim();
  if (COLOUR_ALIASES[c]) return COLOUR_ALIASES[c];
  const first = c.replace(/\s+(mat|clair|foncé|fonce|brillant|pâle|pale)$/, '').split(/[\s/·-]+/)[0];
  if (COLOUR_ALIASES[first]) return COLOUR_ALIASES[first];
  return COLOURS.some((x) => x.key === first) ? first : null;
}

/** Les familles de couleur d'un modèle, sans doublon. */
export const coloursOf = (p: Product) => [...new Set((p.colors || []).map(colourKey).filter((x): x is string => Boolean(x)))];

/** Une matière lisible pour trier : le premier composant de « Cuir · Nylon ». */
export function materialOf(p: Product): string | null {
  const m = p.specs?.['Matières'];
  if (!m) return null;
  const first = m.split(' · ')[0].trim();
  if (/^cuir/i.test(first)) return 'Cuir';
  if (/^(pu|synth|simili|polyuréthane|vinyle|skaï|skai)/i.test(first)) return 'Synthétique';
  if (/^(coton|lycra|élasthanne|elasthanne|polyester|nylon|mesh|laine|microfibre|néoprène|neoprene)/i.test(first)) return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  return first.length <= 16 ? first : null;
}

/** La fermeture, en trois mots : auto-agrippant, lacets, zip. */
export function closureOf(p: Product): string | null {
  const f = p.specs?.['Fermeture'];
  if (!f) return null;
  if (/lacet/i.test(f)) return 'Lacets';
  if (/zip|éclair|eclair/i.test(f)) return 'Zip';
  if (/agrippant|velcro|scratch/i.test(f)) return 'Auto-agrippant';
  return null;
}

export function colourFacet(slug: string, products: Product[]): Facet | null {
  const colour = COLOURS.find((c) => c.slug === slug);
  if (!colour) return null;
  const items = gloves(products).filter((p) => coloursOf(p).includes(colour.key));
  if (items.length < MIN_FACET_PRODUCTS) return null;
  const prices = items.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b);
  const brands = [...new Set(items.map((p) => p.brand).filter((b) => b && !/pr[ée]ciser|^Sélection /i.test(b)))].slice(0, 6);
  const weights = [...new Set(items.flatMap(ouncesOf))].sort((a, b) => a - b);
  const name = `Gants de boxe ${colour.plural}`;
  const scope = `gants-de-boxe-${colour.slug}`;
  return {
    kind: 'couleur',
    scope,
    path: '/' + scope + '/',
    name,
    eyebrow: `GANTS DE BOXE · ${colour.label.toUpperCase()} · ${items.length} MODÈLES`,
    title: `Gants de boxe ${colour.plural} : ${items.length} modèles, de ${money(prices[0])} à ${money(prices.at(-1)!)}`.slice(0, 60),
    description: `Gants de boxe ${colour.plural} : ${items.length} modèles ${list(brands.slice(0, 4))}, de ${money(prices[0])} à ${money(prices.at(-1)!)}${weights.length ? `, de ${weights[0]} à ${weights.at(-1)} oz` : ''}. Photos, tailles réelles et prix de vente TTC.`.slice(0, 158),
    intro: `${items.length} paires de gants de boxe ${colour.plural} au catalogue, chez ${list(brands)}${weights.length ? `, proposées de ${weights[0]} à ${weights.at(-1)} oz` : ''}. La couleur ne change ni le poids ni la coupe : choisissez d'abord la séance et le poids, la teinte ensuite.`,
    keywords: [`gants de boxe ${colour.plural}`, `gants de boxe ${colour.key}`, `gant de boxe ${colour.key}`, `gants ${colour.key} boxe`, ...brands.slice(0, 3).map((b) => `gants de boxe ${b} ${colour.key}`)],
    faq: [
      { question: `Quels gants de boxe ${colour.plural} proposez-vous ?`, answer: `${items.length} modèles, listés sur cette page avec leur photo, leurs poids et leur prix. Le filtre permet de choisir le poids, la marque et le budget.` },
      { question: `Combien coûtent des gants de boxe ${colour.plural} ?`, answer: `De ${money(prices[0])} à ${money(prices.at(-1)!)}, prix médian ${money(prices[Math.floor(prices.length / 2)])}. Ce sont les prix de vente TTC.` },
      { question: `La couleur change-t-elle quelque chose ?`, answer: 'Rien au gant : le poids, la coupe et la matière font le gant, la couleur fait le style. Certaines salles demandent une couleur précise en compétition ; demandez avant d\'acheter.' },
    ],
    guide: 'choisir-gants-boxe',
    parent: { path: '/gants-de-boxe/', name: 'Gants de boxe' },
    products: items,
  };
}

export const colourFacets = (products: Product[]) => COLOURS.map((c) => colourFacet(c.slug, products)).filter((f): f is Facet => Boolean(f));

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
    description: `Gants de boxe ${oz} oz pour ${copy.who} : ${items.length} modèles ${list(brands.slice(0, 4))}, de ${money(prices[0])} à ${money(prices.at(-1)!)}. ${copy.use.charAt(0).toUpperCase() + copy.use.slice(1)}. Prix, livraison en France.`.slice(0, 158),
    intro: `${items.length} paires de gants de boxe proposées en ${oz} oz, chez ${list(brands)}. D’après notre guide, le ${oz} oz convient à ${copy.who}, pour ${copy.use}. ${copy.note}`,
    keywords: [`gants de boxe ${oz} oz`, `gants ${oz} oz`, `gant de boxe ${oz} oz`, `${oz} oz boxe`, `gants de boxe ${oz} onces`, ...brands.slice(0, 3).map((b) => `gants de boxe ${b} ${oz} oz`)],
    faq: [
      { question: `À qui conviennent des gants de boxe ${oz} oz ?`, answer: `À ${copy.who}, pour ${copy.use}. Ce sont les repères de notre guide de tailles ; votre salle peut imposer un autre poids pour le sparring, demandez avant d’acheter.` },
      { question: `Combien coûtent des gants de boxe ${oz} oz ?`, answer: `De ${money(prices[0])} à ${money(prices.at(-1)!)} selon la marque et la matière, prix médian ${money(prices[Math.floor(prices.length / 2)])}. Ce sont les prix de vente TTC, affichés sur chaque fiche.` },
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
    description: `${fam} ${b.name} chez Boutique de Boxe : ${items.length} modèles, de ${money(prices[0])} à ${money(prices.at(-1)!)}${sizes.length >= 2 ? `, tailles ${sizes.slice(0, 4).join(', ')}` : ''}. Photos, tailles réelles et prix de vente TTC.`.slice(0, 158),
    intro: `${items.length} modèles ${b.name} en ${lower(fam)}, de ${money(prices[0])} à ${money(prices.at(-1)!)}${sizes.length >= 2 ? `, proposés en ${list(sizes.slice(0, 5))}` : ''}. ${b.name} compte ${b.products.length} modèles au catalogue, dans ${b.families.length} famille${b.families.length > 1 ? 's' : ''}. Chaque fiche donne les tailles réellement proposées et le prix de vente TTC.`,
    keywords: [`${lower(fam)} ${b.name}`, `${b.name} ${lower(fam)}`, `${lower(fam)} ${b.name} prix`, `${b.name} France`, `${lower(fam)} ${b.name} pas cher`],
    faq: [
      { question: `Quels ${lower(fam)} ${b.name} proposez-vous ?`, answer: `${items.length} modèles, listés sur cette page avec leur photo, leurs tailles et leur prix. Le filtre permet de trier par prix et par taille.` },
      { question: `À quel prix sont les ${lower(fam)} ${b.name} ?`, answer: `De ${money(prices[0])} à ${money(prices.at(-1)!)}, prix médian ${money(prices[Math.floor(prices.length / 2)])}. Ce sont les prix de vente TTC.` },
      ...(sizes.length >= 3 ? [{ question: `Quelles tailles pour les ${lower(fam)} ${b.name} ?`, answer: `Selon le modèle : ${sizes.join(', ')}. Les tailles ${b.name} ne se transposent pas d’une marque à l’autre : suivez le guide de tailles de la marque indiqué sur la fiche.` }] : []),
      { question: `Peut-on les commander en ligne ?`, answer: 'Oui, depuis le 13 octobre 2026 : paiement par carte sur la page sécurisée de PayPlug, expédition sous 7 jours ouvrés, quatorze jours après réception pour changer d’avis.' },
    ],
    guide: cat?.guide || 'guide-des-tailles',
    parent: { path: '/marques/' + b.slug + '/', name: b.name },
    products: items,
  };
}

export function brandFamilyFacets(products: Product[]): Facet[] {
  return brandsOf(products).flatMap((b) => b.families.map((f) => brandFamilyFacet(b, f.slug)).filter((x): x is Facet => Boolean(x)));
}

/* ------------------------------------------------------------------ une marque dans un rayon (sous-famille) */

/**
 * « Protège-tibias Elion », « short de boxe thaï Wicked One », « protège-dents Shock Doctor » : les
 * recherches « produit + marque », celles où une boutique spécialisée passe devant les grands sites
 * (relevé des suggestions Google du 20 octobre 2026). Une page par marque et par rayon précis, à partir
 * de six modèles, sous /marques/<marque>/<rayon>/, au gabarit des pages marque × famille.
 *
 *   – jamais un doublon : si tous les modèles de la marque dans la famille sont dans ce rayon, la page
 *     marque × famille suffit ; si deux rayons donnent la même liste pour une marque (« shorts de
 *     boxe » et « shorts de boxe thaï » chez Wicked One), seul le plus précis a sa page ;
 *   – les rayons qui traversent les familles (par boxe, par niveau, par public) n’entrent pas, ni
 *     « gants de boxe pas cher » : la page « gants de boxe <marque> » porte déjà « … pas cher » ;
 *   – tout le texte se calcule sur la liste du jour : prix, tailles, matières, fermetures, couleurs,
 *     modèles le moins et le plus cher, place dans la marque. Les chiffres font la page ; aucune phrase
 *     n’est écrite pour une marque en particulier, et aucune suite de sept mots sans chiffre ne se
 *     retrouve sur plus de la moitié de ces pages (mesuré avant chaque livraison).
 */
const PAS_PAR_MARQUE = new Set(['gants-de-boxe-pas-cher']);
/** Les rayons qu’une marque peut découper : un équipement précis, dans une seule famille. */
export const SOUS_FAMILLES_PAR_MARQUE: Subfamily[] = SUBFAMILIES.filter((s) => !s.kind && !PAS_PAR_MARQUE.has(s.slug) && categoryFor(s.parent)?.families.length === 1);

/** Les modèles de la marque dans le rayon, au sens du rayon (une boîte n’est pas un protège-dents). */
const subfamilyItems = (b: Brand, s: Subfamily) => b.products.filter((p) => s.match(p) && dansLeRayon(s.slug, p));

/** Taille d’un rayon dans tout le catalogue, mémorisée par catalogue : le rayon le plus petit est le plus précis. */
const SUBFAMILY_TOTALS = new WeakMap<Product[], Map<string, number>>();
function subfamilyTotal(s: Subfamily, all: Product[]) {
  let totals = SUBFAMILY_TOTALS.get(all);
  if (!totals) SUBFAMILY_TOTALS.set(all, (totals = new Map()));
  if (!totals.has(s.slug)) totals.set(s.slug, all.filter(s.match).length);
  return totals.get(s.slug)!;
}

/** La requête telle qu’on la tape, pour le titre : « short de boxe thaï », « casque de boxe », « kimono de JJB ». */
const requeteDe = (s: Subfamily) => {
  const q = s.prioritaires[0];
  return (q.charAt(0).toUpperCase() + q.slice(1)).replace(/\bjjb\b/gi, 'JJB').replace(/\bmma\b/gi, 'MMA');
};

/* Typographie française : espace insécable avant « : ; ? », à l’intérieur des guillemets. */
const DP = ' : ';
const PV = ' ; ';
const QM = ' ?';
const guill = (s: string) => '« ' + s + ' »';

/** Ordre de lecture des tailles : XS avant S/M, 10 oz avant 12 oz, A1 avant A1L avant A2. */
const SIZE_ORDER = ['xxs', 'xs', 's', 's/m', 'm', 'm/l', 'l', 'l/xl', 'xl', 'xxl', '2xl', 'xxxl', '3xl', '4xl'];
function sizeRank(size: string) {
  const k = size.toLowerCase();
  const i = SIZE_ORDER.indexOf(k);
  if (i >= 0) return i;
  const a = /^a(\d)(l?)$/.exec(k);
  if (a) return 500 + Number(a[1]) + (a[2] ? 0.5 : 0);
  const n = parseFloat(k.replace(',', '.'));
  return Number.isFinite(n) ? 100 + n : 1000;
}

/** Les tailles réellement proposées (« S/M », « 12 oz », « A2 »), avec le nombre de modèles qui les proposent. */
function sizesOf(items: Product[]) {
  const counts = new Map<string, number>();
  for (const p of items) for (const s of new Set(p.sizes.map((x) => x.split(/[,(]/)[0].trim()))) if (s && s.length <= 8 && !/unique/i.test(s)) counts.set(s, (counts.get(s) || 0) + 1);
  const list = [...counts.keys()].sort((a, b) => sizeRank(a) - sizeRank(b)).map(sizeLabel);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s, c]) => [sizeLabel(s), c] as const);
  return { list, counts, top };
}

/** Compte les valeurs d’une caractéristique sur la liste, la plus fréquente d’abord. */
function tally(items: Product[], of: (p: Product) => (string | null)[]) {
  const counts = new Map<string, number>();
  for (const p of items) for (const v of new Set(of(p))) if (v) counts.set(v, (counts.get(v) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/** « S, M, L, XL et XXL » quand les tailles sont peu nombreuses, « du S au XXL » quand elles se suivent. */
function sizesPhrase(list: string[], withCount = true) {
  const letters = list.filter((s) => SIZE_ORDER.includes(s.toLowerCase()));
  if (letters.length >= 4 && letters.length === list.length) return `du ${list[0]} au ${list.at(-1)}${withCount ? ` (${list.length} tailles)` : ''}`;
  return list.slice(0, 6).join(', ') + autres(list.length - 6);
}

const CLOSURE_WORD: Record<string, string> = { 'Auto-agrippant': 'à fermeture auto-agrippante', Lacets: 'à lacets', Zip: 'zippés' };
const colourLabel = (key: string) => (COLOURS.find((c) => c.key === key)?.label || key).toLowerCase();
const enfant = (p: Product) => p.audience === 'enfant' || ENFANT.test(p.name);
/** « et 3 autres », « et 1 autre » */
const autres = (k: number) => (k > 0 ? ` et ${k} autre${k > 1 ? 's' : ''}` : '');
/** « des 29 fiches » quand toutes le disent, « de 27 fiches sur 29 » sinon ; « les 29 fiches » / « 27 fiches sur 29 » après « d’après » */
const deFiches = (k: number, n: number) => (k === n ? `des ${n} fiches` : `de ${k} fiches sur ${n}`);
const lesFiches = (k: number, n: number) => (k === n ? `les ${n} fiches` : `${k} fiches sur ${n}`);
/** « de 45,00 € à 66,90 € », ou « à 91,90 € » quand il n’y a qu’un prix */
const fourchette = (xs: number[]) => {
  const s = xs.filter((x) => x > 0).sort((a, b) => a - b);
  return s[0] === s.at(-1) ? `à ${money(s[0])}` : `de ${money(s[0])} à ${money(s.at(-1)!)}`;
};
/** L’étiquette d’une taille telle qu’on l’écrit en français : « 4,5 m », pas « 4.5 m ». */
const sizeLabel = (s: string) => s.replace(/(\d)\.(\d)/g, '$1,$2');

/**
 * La page d’une marque dans un rayon, ou null : moins de six modèles, doublon de la page marque ×
 * famille, ou un rayon plus précis qui donne la même liste pour cette marque.
 */
export function brandSubfamilyFacet(b: Brand, s: Subfamily, all: Product[]): Facet | null {
  if (!SOUS_FAMILLES_PAR_MARQUE.includes(s)) return null;
  const items = subfamilyItems(b, s);
  if (items.length < MIN_FACET_PRODUCTS) return null;
  const ids = new Set(items.map((p) => p.id));
  const famille = b.products.filter((p) => p.category === s.parent);
  if (famille.length >= MIN_FACET_PRODUCTS && famille.every((p) => ids.has(p.id))) return null;
  for (const other of SOUS_FAMILLES_PAR_MARQUE) {
    if (other === s) continue;
    const theirs = subfamilyItems(b, other);
    if (theirs.length !== items.length || !theirs.every((p) => ids.has(p.id))) continue;
    const [mine, his] = [subfamilyTotal(s, all), subfamilyTotal(other, all)];
    if (his < mine || (his === mine && other.slug.length > s.slug.length)) return null;
  }

  const n = items.length;
  const priced = items.filter((p) => p.price > 0).sort((a, c) => a.price - c.price);
  const prices = priced.map((p) => p.price);
  const [min, max, med] = [prices[0], prices.at(-1)!, prices[Math.floor(prices.length / 2)]];
  const cheapest = priced[0];
  const dearest = priced.at(-1)!;
  const name = `${s.name} ${b.name}`;
  const lowerName = `${lower(s.name)} ${b.name}`;
  const lowerRayon = lower(s.name);
  const requete = requeteDe(s);
  const sizes = sizesOf(items);
  const materials = tally(items, (p) => [materialOf(p)]);
  const closures = tally(items, (p) => [closureOf(p)]);
  const colours = tally(items, coloursOf);
  const kids = items.filter(enfant);
  const famName = categoryFor(s.parent)?.name || s.parent;
  const familyPage = brandFamilyFacet(b, s.parent);
  // Les autres marques du rayon, d’après le catalogue (deux modèles au moins) : les pages voisines, elles, sont dans la navigation.
  const others = brandsOf(all)
    .filter((x) => x.slug !== b.slug)
    .map((x) => ({ brand: x.name, n: subfamilyItems(x, s).length }))
    .filter((x) => x.n >= 2)
    .sort((x, y) => y.n - x.n)
    .slice(0, 6);
  const totalRayon = subfamilyTotal(s, all);
  const matieres = list(materials.map(([m, c]) => `${c} en ${m.toLowerCase()}`));
  const nbMatieres = materials.reduce((sum, [, c]) => sum + c, 0);
  const fermetures = list(closures.map(([k, c], i) => `${c}${i ? '' : ' modèles'} ${CLOSURE_WORD[k]}`));
  const nbFermetures = closures.reduce((sum, [, c]) => sum + c, 0);
  const teintes = colours.map(([k, c]) => `${colourLabel(k)} (${c})`);
  const bicolores = items.filter((p) => coloursOf(p).length >= 2).length;
  const seuil = [20, 30, 50, 100, 200].find((x) => prices.filter((p) => p <= x * 100).length >= 2 && prices.filter((p) => p <= x * 100).length < prices.length);
  const sousSeuil = seuil ? prices.filter((p) => p <= seuil * 100).length : 0;

  const scope = `marque-${b.slug}--${s.slug}`;
  const path = `/marques/${b.slug}/${s.slug}/`;

  // Titre : la requête d’abord, le nombre de modèles, le prix d’appel ; 60 caractères au plus, sans couper un mot.
  const title = [`${requete} ${b.name}${DP}${n} modèles, dès ${money(min)}`, `${requete} ${b.name}${DP}${n} modèles`, `${requete} ${b.name}`].find((t) => t.length <= 60)!;

  // Description : 120 à 158 caractères, et seulement des faits de la liste ; chaque segment n’entre que s’il tient.
  const head = `${name}${DP}${n} modèles, de ${money(min)} à ${money(max)}`;
  const tail = '. Prix TTC, livraison en France.';
  let description = head;
  for (const segment of [
    sizes.list.length ? `, tailles ${sizes.list.slice(0, 5).join(', ')}` : null,
    materials.length ? `, ${list(materials.slice(0, 3).map(([m]) => m.toLowerCase()))}` : null,
    closures.length ? `, ${list(closures.map(([k]) => k.toLowerCase()))}` : null,
    colours.length >= 2 ? `, ${colours.length} teintes` : null,
    kids.length ? `, ${kids.length} en taille enfant` : null,
  ]) {
    if (segment && (description + segment + tail).length <= 158) description += segment;
  }
  description += tail;
  if (description.length < 120) description = description.replace(/\.$/, `, prix médian ${money(med)}, photos et tailles réelles sur chaque fiche.`);

  // Entrée de page : les faits de la liste, dans l’ordre où l’on choisit (prix, matière, taille, fermeture, couleur), puis la place dans la marque.
  const prixDe = (m: string) => fourchette(items.filter((p) => materialOf(p) === m).map((p) => p.price));
  const famillesDeLaMarque = b.families.length > 4 ? `${b.families.slice(0, 4).map((f) => `${f.count} en ${lower(f.name)}`).join(', ')}${autres(b.families.length - 4)} familles` : list(b.families.map((f) => `${f.count} en ${lower(f.name)}`));
  const intro = [
    `Les ${n} ${lowerName} du catalogue ${min === max ? `sont tous à ${money(min)}` : `vont de ${money(min)} à ${money(max)}, prix médian ${money(med)}`}${kids.length && kids.length < n ? `, dont ${kids.length} en taille enfant` : ''}.`,
    materials.length ? `Matières données par ${lesFiches(nbMatieres, n)}${DP}${matieres}.` : '',
    sizes.list.length >= 2 ? `Tailles proposées${DP}${sizesPhrase(sizes.list)}${PV}${sizes.top[0][0]} revient sur ${sizes.top[0][1]} modèles${sizes.top[1] ? `, ${sizes.top[1][0]} sur ${sizes.top[1][1]}` : ''}.` : '',
    closures.length ? `${fermetures.charAt(0).toUpperCase() + fermetures.slice(1)}.` : '',
    colours.length >= 2 ? `${colours.length} teintes${DP}${teintes.slice(0, 4).join(', ')}${autres(colours.length - 4)}.` : '',
    `${b.name} compte ${b.products.length} modèles au catalogue, ${famille.length} en ${lower(famName)}${PV}ces ${n} ${lowerRayon} sont ici.`,
  ]
    .filter(Boolean)
    .join(' ');

  const faq: SeoFaq[] = [
    { question: `Combien coûtent les ${lowerName}${QM}`, answer: `${min === max ? `${money(min)} (prix de vente TTC) pour les ${n} modèles.` : `De ${money(min)} à ${money(max)} (prix de vente TTC), médian ${money(med)}. Le moins cher${DP}${guill(cheapest.name)} à ${money(min)}${PV}le plus cher${DP}${guill(dearest.name)} à ${money(max)}.`}${seuil ? ` ${sousSeuil} modèles sur ${n} sont à ${seuil} € et moins.` : ''}` },
    ...(sizes.list.length >= 2
      ? [{ question: `Quelles tailles pour les ${lowerName}${QM}`, answer: `${sizes.list.length} tailles${DP}${sizesPhrase(sizes.list, false)}, selon le modèle${PV}${sizes.top[0][0]} sur ${sizes.top[0][1]} modèles (grille ${b.name} sur chaque fiche)${sizes.top[1] ? `, ${sizes.top[1][0]} sur ${sizes.top[1][1]}` : ''}.` }]
      : []),
    ...(materials.length
      ? [{ question: `En quelle matière sont les ${lowerName}${QM}`, answer: `${matieres.charAt(0).toUpperCase() + matieres.slice(1)}, d’après la ligne ${guill('Matières')} ${deFiches(nbMatieres, n)}.${materials.length >= 2 ? ` ${materials[0][0]}${DP}${prixDe(materials[0][0])}${PV}${materials[1][0].toLowerCase()}${DP}${prixDe(materials[1][0])}.` : ''}` }]
      : []),
    ...(closures.length ? [{ question: `Comment se ferment les ${lowerName}${QM}`, answer: `${fermetures.charAt(0).toUpperCase() + fermetures.slice(1)}, d’après ${lesFiches(nbFermetures, n)}${nbFermetures < n ? `${PV}fermeture non indiquée sur ${n - nbFermetures} fiche${n - nbFermetures > 1 ? 's' : ''}` : ''}.` }] : []),
    ...(others.length ? [{ question: `Quelles autres marques proposent des ${lowerRayon}${QM}`, answer: `${list(others.map((o) => `${o.brand} (${o.n} modèle${o.n > 1 ? 's' : ''})`))}${PV}toutes marques confondues, le rayon ${s.name} compte ${totalRayon} modèles.` }] : []),
    ...(colours.length >= 2 ? [{ question: `Quelles couleurs pour les ${lowerName}${QM}`, answer: `${colours.length} teintes au catalogue${DP}${teintes.join(', ')}${bicolores ? `${PV}${bicolores} modèles comptés dans 2 teintes` : ''}.` }] : []),
    ...(kids.length && kids.length < n ? [{ question: `Y a-t-il des ${lowerName} pour enfant${QM}`, answer: `${kids.length} modèle${kids.length > 1 ? 's' : ''} sur ${n}${DP}${list(kids.slice(0, 3).map((p) => guill(p.name)))}${autres(kids.length - 3)}.` }] : []),
    { question: `Que propose ${b.name} en dehors des ${lowerRayon}${QM}`, answer: `${b.products.length} modèles ${b.name} au catalogue, dans ${b.families.length} famille${b.families.length > 1 ? 's' : ''}${DP}${famillesDeLaMarque}.` },
  ].slice(0, 5);
  if (faq.length < 3) faq.push({ question: `Peut-on commander les ${lowerName} en ligne${QM}`, answer: `Oui, depuis le ${shop.ouverture.long}${DP}chaque modèle se paie par carte sur sa fiche, expédition sous ${shop.delais.expedition}, livraison ${livraison.tarifs}.` });

  return {
    kind: 'marque-sous-famille',
    scope,
    path,
    name,
    eyebrow: `${b.name.toUpperCase()} · ${s.name.toUpperCase()} · ${n} MODÈLES`,
    title,
    description,
    intro,
    keywords: [...new Set([`${lower(requete)} ${b.name}`, `${b.name} ${lower(requete)}`, `${lowerName}`, `${lower(requete)} ${b.name} prix`, ...s.secondaires.filter((k) => k.toLowerCase().includes(b.name.toLowerCase()))])],
    faq,
    guide: s.guide,
    parent: { path: '/marques/' + b.slug + '/', name: b.name },
    ...(familyPage ? { family: { path: familyPage.path, name: familyPage.name } } : {}),
    subfamily: { path: '/' + s.slug + '/', name: s.name },
    products: items,
  };
}

/** Les pages marque × rayon d’une marque, dans l’ordre des rayons. */
export const brandSubfamilyFacetsOf = (b: Brand, all: Product[]) => SOUS_FAMILLES_PAR_MARQUE.map((s) => brandSubfamilyFacet(b, s, all)).filter((f): f is Facet => Boolean(f));

/** Les pages marque × rayon d’un rayon, la marque la plus fournie d’abord. */
export const brandSubfamilyFacetsIn = (s: Subfamily, all: Product[]) => brandsOf(all).map((b) => brandSubfamilyFacet(b, s, all)).filter((f): f is Facet => Boolean(f));

export const brandSubfamilyFacets = (all: Product[]) => brandsOf(all).flatMap((b) => brandSubfamilyFacetsOf(b, all));

/** Toutes les pages de longue traîne qui existent aujourd’hui, pour le plan du site et les index. */
export const allFacets = (products: Product[]) => [...ozFacets(products), ...colourFacets(products), ...brandFamilyFacets(products), ...brandSubfamilyFacets(products)];

/** Résolution d’un chemin de page ou d’un scope de liste vers sa page, s’il y en a une. */
export function facetFor(key: string, products: Product[]): Facet | null {
  const oz = /^gants-de-boxe-(\d{1,2})-oz$/.exec(key);
  if (oz) return ozFacet(Number(oz[1]), products);
  const colour = /^gants-de-boxe-([a-z]+)$/.exec(key);
  if (colour && COLOURS.some((c) => c.slug === colour[1])) return colourFacet(colour[1], products);
  const bf = /^marque-([a-z0-9-]+?)--([a-z0-9-]+)$/.exec(key) || /^marques\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(key);
  if (bf) {
    const b = brandsOf(products).find((x) => x.slug === bf[1]);
    if (!b) return null;
    const rayon = SOUS_FAMILLES_PAR_MARQUE.find((s) => s.slug === bf[2]);
    return brandFamilyFacet(b, bf[2]) || (rayon ? brandSubfamilyFacet(b, rayon, products) : null);
  }
  return null;
}

/**
 * Les pages voisines d’une page : les autres poids, les autres couleurs, ou — pour une marque — les autres
 * familles de la marque et les autres marques de la famille ; pour une marque dans un rayon, les autres
 * marques du rayon puis les autres rayons de la marque.
 */
export function facetSiblings(f: Facet, products: Product[]): { path: string; name: string }[] {
  if (f.kind === 'oz') return ozFacets(products).filter((x) => x.scope !== f.scope).map((x) => ({ path: x.path, name: x.name }));
  if (f.kind === 'couleur') return colourFacets(products).filter((x) => x.scope !== f.scope).map((x) => ({ path: x.path, name: x.name }));
  const [, brand, family] = /^marque-([a-z0-9-]+?)--([a-z0-9-]+)$/.exec(f.scope) || [];
  if (f.kind === 'marque-sous-famille') {
    const pages = brandSubfamilyFacets(products).filter((x) => x.scope !== f.scope);
    const sameRayon = pages.filter((x) => x.scope.endsWith('--' + family));
    const sameBrand = pages.filter((x) => x.scope.startsWith(`marque-${brand}--`));
    return [...sameRayon, ...sameBrand].map((x) => ({ path: x.path, name: x.name }));
  }
  const b = brandsOf(products).find((x) => x.slug === brand);
  const sameBrand = b ? b.families.map((x) => brandFamilyFacet(b, x.slug)).filter((x): x is Facet => x !== null && x.scope !== f.scope) : [];
  const sameFamily = brandsOf(products)
    .filter((x) => x.slug !== brand)
    .map((x) => brandFamilyFacet(x, family))
    .filter((x): x is Facet => Boolean(x));
  return [...sameBrand, ...sameFamily].map((x) => ({ path: x.path, name: x.name }));
}

export { brandSlug };
