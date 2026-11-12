import { categoryFor, money, shop, livraison, materialSpec, type Product } from './catalog';
import type { SeoFaq } from './seo-copy';
import { brandsOf, brandSlug, type Brand } from './brands';
import { SUBFAMILIES, type Subfamily } from './subfamilies';
import { dansLeRayon, ENFANT } from './rayons';
import { marqueDeModele, vuesDesModeles, nombreDeModeles, modeleDe } from './modeles';
import { cartesParModele } from './un-par-modele';
import { quiTient } from './phrases';

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
/**
 * Une page de longue traîne montre au moins six modèles (12/11/2026) : la règle écrite en tête de ce fichier, que
 * le compte en fiches ne tenait plus depuis qu'une liste montre une carte par modèle. Vingt-sept pages montraient
 * deux à cinq cartes, toutes déjà présentes sur la page qui les coiffe ; au relevé Search Console du 9 novembre,
 * Google n'avait jamais ouvert seize d'entre elles et aucune n'avait reçu un clic. Sous six modèles, l'adresse
 * renvoie à cette page (`adresseQuiRemplace`). Les constructeurs prennent `tous` pour rendre la page quand même :
 * c'est ainsi que l'on sait où renvoyer.
 */
export const MIN_FACET_MODELES = 6;
/**
 * Une page de facette montre une carte par modèle (11/11/2026, lib/un-par-modele.ts), six au moins. Ses cartes
 * sont des fiches réelles : sur une page par
 * couleur, la carte d'un modèle est sa fiche dans cette couleur. Ses textes, eux, comptent et chiffrent des
 * modèles, vus chacun comme un article à son premier prix (lib/modeles.ts, `vuesDesModeles`).
 */
const cartes = (fiches: Product[], all: Product[]) => cartesParModele(fiches.map((p) => ({ ...p, modele: marqueDeModele(p, all) })));
/** Le prix le plus haut d'un modèle vu comme un article : celui de sa fiche la plus chère. */
const plusHaut = (p: Product) => p.modele?.max ?? p.price;
/** « de 25,00 € à 339,00 € », ou « à 17,50 € » quand la page n'a qu'un prix. */
const etendue = (min: number, max: number) => (min === max ? `à ${money(min)}` : `de ${money(min)} à ${money(max)}`);
const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** Les prix d'une page : un premier prix par modèle, triés ; l'étendue va jusqu'à la fiche la plus chère. */
function prixDesModeles(vues: Product[]) {
  const comptes = vues.filter((p) => p.price > 0);
  const s = comptes.map((p) => p.price).sort((a, b) => a - b);
  return { s, min: s[0], max: Math.max(...comptes.map(plusHaut)), med: s[Math.floor(s.length / 2)] };
}

/**
 * Une page se calcule une fois par catalogue lu, ou par marque de ce catalogue : le tableau du catalogue est partagé
 * une minute par instance (lib/database.ts), et la barre de recherche, le plan du site ou une page de gants
 * redemandaient chaque page à chaque rendu. Une page rendue ne se modifie pas : elle est partagée ; les listes de
 * pages, elles, sont rendues en copie.
 */
const PAGES = new WeakMap<object, Map<string, unknown>>();
function uneFois<T>(racine: object, cle: string, calcule: () => T): T {
  let connues = PAGES.get(racine);
  if (!connues) PAGES.set(racine, (connues = new Map()));
  if (!connues.has(cle)) connues.set(cle, calcule());
  return connues.get(cle) as T;
}

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
  revision?: string;
  keywords: string[];
  faq: SeoFaq[];
  guide: string;
  parent: { path: string; name: string };
  /** Marque × sous-famille : la page marque × famille qui la coiffe, quand elle existe. */
  family?: { path: string; name: string };
  /** Marque × sous-famille : le rayon toutes marques (« Protège-tibias », 40 modèles). */
  subfamily?: { path: string; name: string };
  /** Les cartes de la page : une fiche réelle par modèle, avec la marque de son modèle. */
  products: Product[];
  /** Toutes les fiches de la page, coloris compris : la liste que le navigateur filtre, et les dates du plan du site. */
  fiches: Product[];
  /** Le premier prix de la page et le prix de sa fiche la plus chère. */
  min: number;
  max: number;
};

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' et ' + xs.at(-1));
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const familyName = (slug: string) => categoryFor(slug)?.name || slug;

/* ------------------------------------------------------------------ le poids des gants */

export const GLOVE_WEIGHTS = [4, 6, 8, 10, 12, 14, 16, 18] as const;

export const OZ_GUIDANCE_REVISION = '2026-10-24';
/** Une offre de poids ne suffit pas à établir un âge, un niveau ou une homologation. */
export const OZ_COPY: Record<number, { note: string }> = {
  4: { note: 'Pour un enfant, vérifiez que le modèle est bien prévu pour lui, son ajustement et les consignes de son encadrant. Le chiffre 4 oz ne fixe pas une tranche d’âge.' },
  6: { note: 'Comparez la coupe et les tailles du modèle : 6 oz n’est pas une mesure de la main. Un équipement enfant doit être adapté dès son achat.' },
  8: { note: 'La présence du 8 oz dans un catalogue ne vaut pas homologation en compétition. Faites confirmer le modèle et le poids par le règlement de votre épreuve.' },
  10: { note: 'Deux gants de 10 oz peuvent avoir des constructions et des usages différents. Comparez le type annoncé par le fabricant avant de choisir pour le sac ou le cours.' },
  12: { note: 'Le 12 oz ne garantit pas un usage polyvalent. Vérifiez les exercices autorisés avec ce modèle et le poids demandé par votre club.' },
  14: { note: 'Avant un travail avec partenaire, faites valider le modèle et le poids par l’encadrant. Le chiffre 14 oz ne suffit pas à établir sa protection ou son ajustement.' },
  16: { note: 'Le poids de 16 oz ne permet pas à lui seul de qualifier un gant pour le sparring. Vérifiez son usage déclaré, sa coupe et les consignes de la salle.' },
  18: { note: 'Le 18 oz est un poids proposé, pas une prescription liée à un poids de corps. Contrôlez l’ajustement et l’usage annoncé pour le modèle choisi.' },
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
  const m = materialSpec(p);
  if (!m) return null;
  const first = m.split(' · ')[0].trim();
  if (/^(cuir\s+synth|pu\b|synth|simili|polyuréthane|vinyle|skaï|skai)/i.test(first)) return 'Synthétique';
  if (/^cuir\b/i.test(first)) return 'Cuir';
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

export const colourFacet = (slug: string, products: Product[], tous = false): Facet | null => uneFois(products, `couleur:${slug}:${tous}`, () => pageDeCouleur(slug, products, tous));
function pageDeCouleur(slug: string, products: Product[], tous: boolean): Facet | null {
  const colour = COLOURS.find((c) => c.slug === slug);
  if (!colour) return null;
  const fiches = gloves(products).filter((p) => coloursOf(p).includes(colour.key));
  if (fiches.length < MIN_FACET_PRODUCTS) return null;
  const items = vuesDesModeles(fiches, products);
  if (!tous && items.length < MIN_FACET_MODELES) return null;
  const { min, max, med } = prixDesModeles(items);
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
    title: quiTient(60, `${name} : ${items.length} modèles, ${etendue(min, max)}`, `${name} : ${items.length} modèles, dès ${money(min)}`, `${name} : ${items.length} modèles`, name),
    description: quiTient(
      158,
      ...[4, 3, 2, 0].flatMap((k) =>
        [weights.length ? `, de ${weights[0]} à ${weights.at(-1)} oz` : '', ''].map((poids) => `${name} : ${items.length} modèles${k ? ' ' + list(brands.slice(0, k)) : ''}, ${etendue(min, max)}${poids}. Photos, tailles réelles et prix de vente TTC.`),
      ),
    ),
    intro: `${items.length} paires de gants de boxe ${colour.plural} au catalogue, chez ${list(brands)}${weights.length ? `, proposées de ${weights[0]} à ${weights.at(-1)} oz` : ''}. La couleur ne change ni le poids ni la coupe : choisissez d'abord la séance et le poids, la teinte ensuite.`,
    keywords: [`gants de boxe ${colour.plural}`, `gants de boxe ${colour.key}`, `gant de boxe ${colour.key}`, `gants ${colour.key} boxe`, ...brands.slice(0, 3).map((b) => `gants de boxe ${b} ${colour.key}`)],
    faq: [
      { question: `Quels gants de boxe ${colour.plural} proposez-vous ?`, answer: `${items.length} modèles, listés sur cette page avec leur photo, leurs poids et leur prix. Le filtre permet de choisir le poids, la marque et le budget.` },
      { question: `Combien coûtent des gants de boxe ${colour.plural} ?`, answer: `${majuscule(etendue(min, max))}, prix médian ${money(med)}. Ce sont les prix de vente TTC.` },
      { question: `La couleur change-t-elle quelque chose ?`, answer: 'Rien au gant : le poids, la coupe et la matière font le gant, la couleur fait le style. Certaines salles demandent une couleur précise en compétition ; demandez avant d\'acheter.' },
    ],
    guide: 'choisir-gants-boxe',
    parent: { path: '/gants-de-boxe/', name: 'Gants de boxe' },
    products: cartes(fiches, products),
    fiches,
    min,
    max,
  };
}

export const colourFacets = (products: Product[]) => [...uneFois(products, 'couleurs', () => COLOURS.map((c) => colourFacet(c.slug, products)).filter((f): f is Facet => Boolean(f)))];

export const ozFacet = (oz: number, products: Product[], tous = false): Facet | null => uneFois(products, `poids:${oz}:${tous}`, () => pageDePoids(oz, products, tous));
function pageDePoids(oz: number, products: Product[], tous: boolean): Facet | null {
  const copy = OZ_COPY[oz];
  if (!copy) return null;
  const fiches = gloves(products).filter((p) => ouncesOf(p).includes(oz));
  if (fiches.length < MIN_FACET_PRODUCTS) return null;
  const items = vuesDesModeles(fiches, products);
  if (!tous && items.length < MIN_FACET_MODELES) return null;
  const { min, max, med } = prixDesModeles(items);
  const brands = [...new Set(items.map((p) => p.brand).filter((b) => b && !/pr[ée]ciser|^Sélection /i.test(b)))].slice(0, 6);
  const name = `Gants de boxe ${oz} oz`;
  const scope = `gants-de-boxe-${oz}-oz`;
  return {
    kind: 'oz',
    revision: OZ_GUIDANCE_REVISION,
    scope,
    path: '/' + scope + '/',
    name,
    eyebrow: `GANTS DE BOXE · ${oz} OZ · ${items.length} MODÈLES`,
    title: quiTient(60, `${name} : ${items.length} modèles, ${etendue(min, max)}`, `${name} : ${items.length} modèles, dès ${money(min)}`, `${name} : ${items.length} modèles`, name),
    description: quiTient(158, ...[4, 3, 2, 0].map((k) => `${name} : ${items.length} modèles${k ? ' ' + list(brands.slice(0, k)) : ''}, ${etendue(min, max)}. Comparez matières, fermetures et tailles. Livraison en France.`)),
    intro: `${items.length} paires de gants de boxe proposées en ${oz} oz, chez ${list(brands)}. ${copy.note}`,
    keywords: [`gants de boxe ${oz} oz`, `gants ${oz} oz`, `gant de boxe ${oz} oz`, `${oz} oz boxe`, `gants de boxe ${oz} onces`, ...brands.slice(0, 3).map((b) => `gants de boxe ${b} ${oz} oz`)],
    faq: [
      { question: `À qui conviennent des gants de boxe ${oz} oz ?`, answer: `Le choix dépend du modèle, de l’ajustement et de votre pratique. ${copy.note} Consultez le guide du fabricant et votre encadrant avant de commander.` },
      { question: `Combien coûtent des gants de boxe ${oz} oz ?`, answer: `${majuscule(etendue(min, max))} selon la marque et la matière, prix médian ${money(med)}. Ce sont les prix de vente TTC, affichés sur chaque fiche.` },
      { question: `Le ${oz} oz est-il une taille de main ?`, answer: `Non. L’once indique un poids, pas la taille intérieure ni la qualité du rembourrage. Deux paires de ${oz} oz peuvent avoir une coupe différente : vérifiez le guide du modèle et l’ajustement avec vos bandes.` },
      { question: `Quel poids si j’hésite entre deux ?`, answer: 'Faites d’abord confirmer le poids demandé pour votre séance, puis comparez les tailles réellement proposées par le modèle. Prendre plus lourd ou plus léger ne garantit pas à lui seul un meilleur ajustement ni une meilleure protection.' },
    ],
    guide: 'quelle-taille-gants-de-boxe',
    parent: { path: '/gants-de-boxe/', name: 'Gants de boxe' },
    products: cartes(fiches, products),
    fiches,
    min,
    max,
  };
}

export const ozFacets = (products: Product[]) => [...uneFois(products, 'poids', () => GLOVE_WEIGHTS.map((oz) => ozFacet(oz, products)).filter((f): f is Facet => Boolean(f)))];

/* ------------------------------------------------------------------ une marque dans une famille */

export const brandFamilyFacet = (b: Brand, family: string, tous = false): Facet | null => uneFois(b, `famille:${family}:${tous}`, () => pageDeFamille(b, family, tous));
function pageDeFamille(b: Brand, family: string, tous: boolean): Facet | null {
  const fiches = b.fiches.filter((p) => p.category === family);
  if (fiches.length < MIN_FACET_PRODUCTS) return null;
  const items = vuesDesModeles(fiches, b.fiches);
  if (!tous && items.length < MIN_FACET_MODELES) return null;
  const fam = familyName(family);
  const { min, max, med } = prixDesModeles(items);
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
    title: quiTient(60, `${name} : ${items.length} modèles, ${etendue(min, max)}`, `${name} : ${items.length} modèles, dès ${money(min)}`, `${name} : ${items.length} modèles`, name),
    description: quiTient(
      158,
      `${name} chez Boutique de Boxe : ${items.length} modèles, ${etendue(min, max)}${sizes.length >= 2 ? `, tailles ${sizes.slice(0, 4).join(', ')}` : ''}. Photos, tailles réelles et prix de vente TTC.`,
      `${name} chez Boutique de Boxe : ${items.length} modèles, ${etendue(min, max)}. Photos, tailles réelles et prix de vente TTC.`,
      `${name} : ${items.length} modèles, ${etendue(min, max)}. Photos, tailles réelles et prix de vente TTC.`,
    ),
    intro: `${items.length} modèles ${b.name} en ${lower(fam)}, ${etendue(min, max)}${sizes.length >= 2 ? `, proposés en ${list(sizes.slice(0, 5))}` : ''}. ${b.name} compte ${b.products.length} modèles au catalogue, dans ${b.families.length} famille${b.families.length > 1 ? 's' : ''}. Chaque fiche donne les tailles réellement proposées et le prix de vente TTC.`,
    keywords: [`${lower(fam)} ${b.name}`, `${b.name} ${lower(fam)}`, `${lower(fam)} ${b.name} prix`, `${b.name} France`, `${lower(fam)} ${b.name} pas cher`],
    faq: [
      { question: `Que propose ${b.name} en ${lower(fam)} ?`, answer: `${items.length} modèles, listés sur cette page avec leur photo, leurs tailles et leur prix. Le filtre permet de trier par prix et par taille.` },
      { question: `Quels sont les prix ${b.name} en ${lower(fam)} ?`, answer: `${majuscule(etendue(min, max))}, prix médian ${money(med)}. Ce sont les prix de vente TTC.` },
      ...(sizes.length >= 3 ? [{ question: `Quelles tailles ${b.name} en ${lower(fam)} ?`, answer: `Selon le modèle : ${sizes.join(', ')}. Les tailles ${b.name} ne se transposent pas d’une marque à l’autre : suivez le guide de tailles de la marque indiqué sur la fiche.` }] : []),
      { question: `Peut-on les commander en ligne ?`, answer: 'Oui, depuis le 13 octobre 2026 : paiement par carte sur la page sécurisée de PayPlug, expédition sous 7 jours ouvrés, quatorze jours après réception pour changer d’avis.' },
    ],
    guide: cat?.guide || 'guide-des-tailles',
    parent: { path: '/marques/' + b.slug + '/', name: b.name },
    products: cartes(fiches, b.fiches),
    fiches,
    min,
    max,
  };
}

export function brandFamilyFacets(products: Product[]): Facet[] {
  return [...uneFois(products, 'marques-familles', () => brandsOf(products).flatMap((b) => b.families.map((f) => brandFamilyFacet(b, f.slug)).filter((x): x is Facet => Boolean(x))))];
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
const subfamilyItems = (b: Brand, s: Subfamily) => b.fiches.filter((p) => s.match(p) && dansLeRayon(s.slug, p));

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
/** « à lacets », « zippé », « zippés » : la fermeture, accordée au nombre de modèles. */
const closureWord = (k: string, c: number) => (k === 'Zip' && c < 2 ? 'zippé' : CLOSURE_WORD[k]);
/** « 1 modèle », « 4 modèles » */
const nModeles = (k: number) => `${k} modèle${k > 1 ? 's' : ''}`;
const colourLabel = (key: string) => (COLOURS.find((c) => c.key === key)?.label || key).toLowerCase();
const enfant = (p: Product) => p.audience === 'enfant' || ENFANT.test(p.name);
/** « et 3 autres », « et 1 autre » */
const autres = (k: number) => (k > 0 ? ` et ${k} autre${k > 1 ? 's' : ''}` : '');
/** « les 29 modèles » quand tous le disent, « 27 modèles sur 29 » sinon */
const lesModeles = (k: number, n: number) => (k === n ? `les ${n} modèles` : `${nModeles(k)} sur ${n}`);
/** « 2 modèles ne la donnent pas », « 1 modèle ne la donne pas » */
const sansLaLigne = (k: number) => `${k} modèle${k > 1 ? 's ne la donnent' : ' ne la donne'} pas`;
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
export const brandSubfamilyFacet = (b: Brand, s: Subfamily, all: Product[], tous = false): Facet | null => uneFois(b, `rayon:${s.slug}:${tous}`, () => pageDeRayon(b, s, all, tous));
function pageDeRayon(b: Brand, s: Subfamily, all: Product[], tous: boolean): Facet | null {
  if (!SOUS_FAMILLES_PAR_MARQUE.includes(s)) return null;
  const fiches = subfamilyItems(b, s);
  if (fiches.length < MIN_FACET_PRODUCTS) return null;
  const ids = new Set(fiches.map((p) => p.id));
  // Les fiches décident si la page existe ; les modèles, ce que ses textes comptent.
  const familleFiches = b.fiches.filter((p) => p.category === s.parent);
  if (familleFiches.length >= MIN_FACET_PRODUCTS && familleFiches.every((p) => ids.has(p.id))) return null;
  const famille = b.products.filter((p) => p.category === s.parent);
  for (const other of SOUS_FAMILLES_PAR_MARQUE) {
    if (other === s) continue;
    const theirs = subfamilyItems(b, other);
    if (theirs.length !== fiches.length || !theirs.every((p) => ids.has(p.id))) continue;
    const [mine, his] = [subfamilyTotal(s, all), subfamilyTotal(other, all)];
    if (his < mine || (his === mine && other.slug.length > s.slug.length)) return null;
  }

  // Les textes comptent des modèles, vus chacun comme un article à son premier prix (lib/modeles.ts) ; le moins
  // cher et le plus cher, eux, sont des fiches réelles, citées sous leur nom.
  const items = vuesDesModeles(fiches, all);
  const n = items.length;
  if (!tous && n < MIN_FACET_MODELES) return null;
  const { s: prices, min, max, med } = prixDesModeles(items);
  const vendues = fiches.filter((p) => p.price > 0).sort((a, c) => a.price - c.price);
  const cheapest = vendues[0];
  const dearest = vendues.at(-1)!;
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
    .map((x) => ({ brand: x.name, n: uneFois(x, `modeles:${s.slug}`, () => nombreDeModeles(subfamilyItems(x, s), all)) }))
    .filter((x) => x.n >= 2)
    .sort((x, y) => y.n - x.n)
    .slice(0, 6);
  // Le rayon toutes marques, compté comme sa propre page le compte : en modèles.
  const totalRayon = uneFois(all, `modeles:${s.slug}`, () => nombreDeModeles(all.filter(s.match), all));
  const matieres = list(materials.map(([m, c]) => `${c} en ${m.toLowerCase()}`));
  const nbMatieres = materials.reduce((sum, [, c]) => sum + c, 0);
  const fermetures = list(closures.map(([k, c], i) => `${i ? c : nModeles(c)} ${closureWord(k, c)}`));
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
  const prixDe = (m: string) => fourchette(items.filter((p) => materialOf(p) === m).flatMap((p) => [p.price, plusHaut(p)]));
  const famillesDeLaMarque = b.families.length > 4 ? `${b.families.slice(0, 4).map((f) => `${f.count} en ${lower(f.name)}`).join(', ')}${autres(b.families.length - 4)} familles` : list(b.families.map((f) => `${f.count} en ${lower(f.name)}`));
  const intro = [
    `Les ${n} ${lowerName} du catalogue ${min === max ? `sont tous à ${money(min)}` : `vont de ${money(min)} à ${money(max)}, prix médian ${money(med)}`}${kids.length && kids.length < n ? `, dont ${kids.length} en taille enfant` : ''}.`,
    materials.length ? `Matières données pour ${lesModeles(nbMatieres, n)}${DP}${matieres}.` : '',
    sizes.list.length >= 2 ? `Tailles proposées${DP}${sizesPhrase(sizes.list)}${PV}${sizes.top[0][0]} revient sur ${nModeles(sizes.top[0][1])}${sizes.top[1] ? `, ${sizes.top[1][0]} sur ${sizes.top[1][1]}` : ''}.` : '',
    closures.length ? `${fermetures.charAt(0).toUpperCase() + fermetures.slice(1)}.` : '',
    colours.length >= 2 ? `${colours.length} teintes${DP}${teintes.slice(0, 4).join(', ')}${autres(colours.length - 4)}.` : '',
    `${b.name} compte ${b.products.length} modèles au catalogue, ${famille.length} en ${lower(famName)}${PV}ces ${n} ${lowerRayon} sont ici.`,
  ]
    .filter(Boolean)
    .join(' ');

  const faq: SeoFaq[] = [
    { question: `Combien coûtent les ${lowerName}${QM}`, answer: `${min === max ? `${money(min)} (prix de vente TTC) pour les ${n} modèles.` : `De ${money(min)} à ${money(max)} (prix de vente TTC), médian ${money(med)}. Le moins cher${DP}${guill(cheapest.name)} à ${money(min)}${PV}le plus cher${DP}${guill(dearest.name)} à ${money(max)}.`}${seuil ? ` ${sousSeuil} modèles sur ${n} sont à ${seuil} € et moins.` : ''}` },
    ...(sizes.list.length >= 2
      ? [{ question: `Quelles tailles pour les ${lowerName}${QM}`, answer: `${sizes.list.length} tailles${DP}${sizesPhrase(sizes.list, false)}, selon le modèle${PV}${sizes.top[0][0]} sur ${nModeles(sizes.top[0][1])} (grille ${b.name} sur chaque fiche)${sizes.top[1] ? `, ${sizes.top[1][0]} sur ${sizes.top[1][1]}` : ''}.` }]
      : []),
    ...(materials.length
      ? [{ question: `En quelle matière sont les ${lowerName}${QM}`, answer: `${matieres.charAt(0).toUpperCase() + matieres.slice(1)}, d’après la ligne ${guill('Matières')} de leurs fiches${nbMatieres < n ? `${PV}${sansLaLigne(n - nbMatieres)}` : ''}.${materials.length >= 2 ? ` ${materials[0][0]}${DP}${prixDe(materials[0][0])}${PV}${materials[1][0].toLowerCase()}${DP}${prixDe(materials[1][0])}.` : ''}` }]
      : []),
    ...(closures.length ? [{ question: `Comment se ferment les ${lowerName}${QM}`, answer: `${fermetures.charAt(0).toUpperCase() + fermetures.slice(1)}, d’après leurs fiches${nbFermetures < n ? `${PV}fermeture non indiquée pour ${n - nbFermetures} modèle${n - nbFermetures > 1 ? 's' : ''}` : ''}.` }] : []),
    ...(others.length ? [{ question: `Quelles autres marques proposent des ${lowerRayon}${QM}`, answer: `${list(others.map((o) => `${o.brand} (${o.n} modèle${o.n > 1 ? 's' : ''})`))}${PV}toutes marques confondues, le rayon ${s.name} compte ${totalRayon} modèles.` }] : []),
    ...(colours.length >= 2 ? [{ question: `Quelles couleurs pour les ${lowerName}${QM}`, answer: `${colours.length} teintes au catalogue${DP}${teintes.join(', ')}${bicolores ? `${PV}${bicolores} modèle${bicolores > 1 ? 's comptés' : ' compté'} dans plusieurs teintes` : ''}.` }] : []),
    ...(kids.length && kids.length < n ? [{ question: `Y a-t-il des ${lowerName} pour enfant${QM}`, answer: `${kids.length} modèle${kids.length > 1 ? 's' : ''} sur ${n}${DP}${list(kids.slice(0, 3).map((p) => guill(p.modele?.nom || p.name)))}${autres(kids.length - 3)}.` }] : []),
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
    products: cartes(fiches, all),
    fiches,
    min,
    max,
  };
}

/** Les pages marque × rayon d’une marque, dans l’ordre des rayons. */
export const brandSubfamilyFacetsOf = (b: Brand, all: Product[]) => SOUS_FAMILLES_PAR_MARQUE.map((s) => brandSubfamilyFacet(b, s, all)).filter((f): f is Facet => Boolean(f));

/** Les pages marque × rayon d’un rayon, la marque la plus fournie d’abord. */
export const brandSubfamilyFacetsIn = (s: Subfamily, all: Product[]) => brandsOf(all).map((b) => brandSubfamilyFacet(b, s, all)).filter((f): f is Facet => Boolean(f));

export const brandSubfamilyFacets = (all: Product[]) => [...uneFois(all, 'marques-rayons', () => brandsOf(all).flatMap((b) => brandSubfamilyFacetsOf(b, all)))];

/** Toutes les pages de longue traîne qui existent aujourd’hui, pour le plan du site et les index. */
export const allFacets = (products: Product[]) => [...uneFois(products, 'toutes', () => [...ozFacets(products), ...colourFacets(products), ...brandFamilyFacets(products), ...brandSubfamilyFacets(products)])];

/** Résolution d’un chemin de page ou d’un scope de liste vers sa page, s’il y en a une. */
export function facetFor(key: string, products: Product[], tous = false): Facet | null {
  const oz = /^gants-de-boxe-(\d{1,2})-oz$/.exec(key);
  if (oz) return ozFacet(Number(oz[1]), products, tous);
  const colour = /^gants-de-boxe-([a-z]+)$/.exec(key);
  if (colour && COLOURS.some((c) => c.slug === colour[1])) return colourFacet(colour[1], products, tous);
  const bf = /^marque-([a-z0-9-]+?)--([a-z0-9-]+)$/.exec(key) || /^marques\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(key);
  if (bf) {
    const b = brandsOf(products).find((x) => x.slug === bf[1]);
    if (!b) return null;
    const rayon = SOUS_FAMILLES_PAR_MARQUE.find((s) => s.slug === bf[2]);
    return brandFamilyFacet(b, bf[2], tous) || (rayon ? brandSubfamilyFacet(b, rayon, products, tous) : null);
  }
  return null;
}

/**
 * Une adresse de longue traîne dont la page n'existe pas parce qu'elle montrerait moins de six modèles : l'adresse
 * qui la remplace, où la route renvoie en 308 — une seule adresse par contenu. Un seul modèle : sa fiche de tête.
 * Deux à cinq : la page la plus proche qui les montre tous — la marque dans la famille quand elle a sa page et
 * les contient, sinon la marque ; « gants de boxe » pour un poids ou une couleur.
 */
export function adresseQuiRemplace(key: string, products: Product[]): string | null {
  if (facetFor(key, products)) return null;
  const petite = facetFor(key, products, true);
  if (!petite) return null;
  if (petite.products.length === 1) return '/produits/' + modeleDe(petite.products[0], products).tete.slug + '/';
  const famille = petite.family ? facetFor(petite.family.path.replace(/^\/|\/$/g, ''), products) : null;
  return famille && petite.fiches.every((p) => famille.fiches.some((x) => x.id === p.id)) ? famille.path : petite.parent.path;
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
