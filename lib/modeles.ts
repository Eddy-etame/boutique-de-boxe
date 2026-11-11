import type { Product } from './catalog';
import { unParModele, type MarqueDeModele } from './un-par-modele';
import { appellation } from './describe';
import tetes from './data/modeles-tetes.json';
import textes from './data/modeles-textes.json';
import rattaches from './data/modeles-rattaches.json';

/**
 * Un modèle, une page (10/11/2026).
 *
 * Le catalogue compte 1 042 fiches pour 646 modèles : 396 fiches ne sont qu'un autre coloris (ou une autre
 * édition) d'un modèle déjà présenté — 19 fiches pour une même bande de boxe, 10 pour le Twins BGVL3. Chacune
 * était une page à part, canonique d'elle-même, au texte identique à un mot près. Google en indexait 704 le
 * 6 novembre et n'en acceptait plus aucune depuis le 20 octobre.
 *
 * Deux fiches sont le même modèle quand elles ont la même famille, la même marque, le même nom une fois le
 * coloris retiré (lib/describe.ts, `appellation`), et la même matière dans ce coloris : « cuir noir » et
 * « cuir marron » vont ensemble, « cuir » et « coton » jamais (deux protège-tibias qui ne partagent que le
 * nom, l'un huit fois plus cher que l'autre). Une édition sous licence (Itachi, Kakashi, Goku…) est une version du modèle.
 *
 * Chaque modèle a une fiche de tête : c'est elle que les autres coloris désignent comme canonique, elle que
 * le plan du site propose, et elle qui porte le nom du modèle sans coloris. Les autres fiches restent en
 * ligne — on y arrive par le sélecteur de coloris, par une page de couleur ou par le flux marchand — et
 * s'achètent comme avant. La tête est écrite dans lib/data/modeles-tetes.json : la fiche que Google indexait
 * déjà (Search Console, liste du 6/11/2026) quand il y en avait une. Elle ne se déduit pas à chaque rendu,
 * pour qu'une page de modèle ne change jamais d'adresse. Un modèle absent du fichier suit la règle
 * `ordreDeTete`.
 */
export type Modele = {
  /** Identifiant stable du modèle : famille, marque, nom sans coloris, matière. */
  cle: string;
  /** « Gants de boxe d’entraînement Twins BGVL3 », « Sac de frappe Elion 1,35 m 45 kg, cuir ». */
  nom: string;
  /** La fiche qui porte le modèle. */
  tete: Product;
  /** Toutes les fiches du modèle : la tête d'abord, puis par libellé. */
  fiches: Product[];
  /** Vrai quand ce qui distingue les fiches est une couleur ; faux pour des éditions (Itachi, Goku…). */
  coloris: boolean;
};

const MATIERE = /^(?:cuir|coton|mesh|gel|pu|mousse|néoprène|synthétique|plastique)$/i;
const sansAccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const enCle = (s: string) => sansAccent(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Les mots de matière du coloris, tels qu'écrits : « cuir », « PU », « gel ». */
const matiereDe = (variante: string) => variante.split(/\s+/).filter((w) => MATIERE.test(w));

/**
 * Fiches rattachées à la main (lib/data/modeles-rattaches.json) : des coloris ou des éditions d'un modèle que
 * leur nom ne rattache pas tout seul — « Pro Citrus Green Redesign » et « Pro Redesign, rose » sont le même gant,
 * « Naruto Shippuden × Elion Gaï » s'écrit sans la virgule des cinq autres. Chaque entrée donne, par adresse de
 * fiche, la clé de son modèle et son libellé dans le sélecteur ; `nom` écrit le nom du modèle quand aucune
 * fiche ne le porte telle quelle (deux gants dont le coloris s'écrit « bleu, blanc et rouge »).
 */
const RATTACHES = rattaches as Record<string, { modele: string; libelle: string; nom?: string }>;

function cleCalculee(p: Product): string {
  const a = appellation(p);
  const matiere = matiereDe(a.variante).map((w) => w.toLowerCase()).sort().join('-');
  return [p.category, enCle(p.brand || ''), enCle(a.base), ...(matiere ? [enCle(matiere)] : [])].join(':');
}

export const cleDuModele = (p: Product): string => RATTACHES[p.slug]?.modele ?? cleCalculee(p);

/**
 * Ce qui distingue une fiche dans son modèle : « noir », « bleu clair », « Itachi ». Une fiche dont le nom
 * ne dit aucun coloris se désigne par sa référence, seule donnée sûre.
 */
export function libelleDeFiche(p: Product): string {
  if (RATTACHES[p.slug]) return RATTACHES[p.slug].libelle;
  const a = appellation(p);
  const sansMatiere = a.variante.split(/\s+/).filter((w) => !MATIERE.test(w)).join(' ').replace(/^et\s+|\s+et$/g, '').trim();
  if (sansMatiere) return sansMatiere;
  const reference = p.reference || p.specs?.['Référence'] || p.specs?.['Référence interne'] || p.sourceRef;
  return reference ? 'réf. ' + reference : 'modèle d’origine';
}

/** Sans tête écrite : la fiche sans coloris dans le nom, puis le noir, puis la plus illustrée, puis l'ordre des adresses. */
export function ordreDeTete(a: Product, b: Product): number {
  const rang = (p: Product) => {
    const v = appellation(p).variante.toLowerCase();
    return !v ? 0 : v === 'noir' ? 1 : 2;
  };
  return rang(a) - rang(b) || b.images.length - a.images.length || a.slug.localeCompare(b.slug);
}

const memo = new WeakMap<Product[], { parFiche: Map<string, Modele>; liste: Modele[] }>();

/** Les modèles du catalogue, calculés une fois par catalogue lu. */
export function modeles(all: Product[]) {
  const connu = memo.get(all);
  if (connu) return connu;
  const groupes = new Map<string, Product[]>();
  for (const p of all) {
    const cle = cleDuModele(p);
    const fiches = groupes.get(cle);
    if (fiches) fiches.push(p);
    else groupes.set(cle, [p]);
  }
  const ecrites = tetes as Record<string, string>;
  const parFiche = new Map<string, Modele>();
  const liste: Modele[] = [];
  for (const [cle, fiches] of groupes) {
    // Sans tête écrite, une fiche que son nom rattache au modèle passe avant une fiche rattachée à la main.
    const natives = fiches.filter((p) => !RATTACHES[p.slug]);
    const tete = fiches.find((p) => p.slug === ecrites[cle]) ?? [...(natives.length ? natives : fiches)].sort(ordreDeTete)[0];
    // Le nom du modèle vient d'une fiche dont le nom le porte, jamais d'une édition rattachée à la main.
    const a = appellation(natives.includes(tete) ? tete : natives[0] ?? tete);
    const matiere = matiereDe(a.variante);
    const autres = fiches.filter((p) => p.id !== tete.id).sort((x, y) => libelleDeFiche(x).localeCompare(libelleDeFiche(y), 'fr'));
    const modele: Modele = {
      cle,
      nom: fiches.map((p) => RATTACHES[p.slug]?.nom).find(Boolean) ?? (fiches.length > 1 ? a.base + (matiere.length ? ', ' + matiere.join(' ') : '') : tete.name),
      tete,
      fiches: [tete, ...autres],
      // Un coloris s'écrit en minuscules (« bleu clair », « blanc, bleu et rose ») ; une édition porte un nom propre.
      coloris: fiches.every((p) => libelleDeFiche(p).replace(/^réf\. .*$/, '').split(/[\s,]+/).every((w) => !w || /^[a-zà-ÿ]+$/.test(w))),
    };
    liste.push(modele);
    for (const p of fiches) parFiche.set(p.id, modele);
  }
  const resultat = { parFiche, liste };
  memo.set(all, resultat);
  return resultat;
}

/** Le modèle d'une fiche. Une fiche seule est son propre modèle. */
export const modeleDe = (p: Product, all: Product[]): Modele =>
  modeles(all).parFiche.get(p.id) ?? { cle: cleDuModele(p), nom: p.name, tete: p, fiches: [p], coloris: true };

/** Vrai pour la fiche qui porte son modèle : la seule que le plan du site et les données structurées mettent en avant. */
export const estTete = (p: Product, all: Product[]) => modeleDe(p, all).tete.id === p.id;

/** Les fiches de tête : une par modèle, dans l'ordre du catalogue. */
export const fichesDeTete = (all: Product[]) => {
  const { parFiche } = modeles(all);
  return all.filter((p) => parFiche.get(p.id)?.tete.id === p.id);
};

/**
 * La description rédigée d'un modèle (lib/data/modeles-textes.json), écrite à la main depuis les faits du
 * modèle : ce pour quoi le fabricant le destine, ce dont il est fait, ce que le catalogue en propose. Un
 * texte par modèle, jamais une phrase partagée entre deux modèles, aucune phrase reprise d'un fournisseur,
 * ni prix ni superlatif (scripts/test-modeles.mjs le vérifie). `ecrit` date le texte : la page et le plan
 * du site la publient. Un modèle sans texte garde sa phrase de faits (lib/describe.ts, `longDescription`).
 */
export type TexteDeModele = { ecrit: string; texte: string[] };
export const texteDuModele = (m: Modele): TexteDeModele | null => (textes as Record<string, TexteDeModele>)[m.cle] ?? null;

/** « 10 coloris », « 4 versions » : ce que le modèle propose, compté. */
export const compteDuModele = (m: Modele) => `${m.fiches.length} ${m.coloris ? 'coloris' : 'versions'}`;

/**
 * Ce qu'une fiche sait de son modèle quand elle part dans une liste (lib/un-par-modele.ts) : la fiche de tête d'un
 * modèle à plusieurs fiches porte le nom du modèle, sans coloris. Le premier prix, lui, se lit sur la liste
 * (`cartesParModele`) : il dépend des fiches que la liste contient.
 */
export function marqueDeModele(p: Product, all: Product[]): MarqueDeModele {
  const m = modeleDe(p, all);
  const tete = m.tete.id === p.id;
  return { cle: m.cle, tete, n: m.fiches.length, coloris: m.coloris, ...(tete && m.fiches.length > 1 ? { nom: m.nom } : {}) };
}

/** Une liste réduite à une fiche par modèle (la fiche de tête quand elle y figure), dans l'ordre de la liste. */
export const fichesParModele = (liste: Product[], all: Product[]) => unParModele(liste, (p) => marqueDeModele(p, all));

/** Le nombre de modèles d'une liste de fiches : ce que compte tout texte du site qui dit « modèles » (11/11/2026). */
export const nombreDeModeles = (liste: Product[], all: Product[]) => new Set(liste.map((p) => modeleDe(p, all).cle)).size;

const vuesDuCatalogue = new WeakMap<Product[], Product[]>();

/**
 * Les modèles d'une liste, vus chacun comme un seul article — pour les textes qui comptent ou chiffrent des modèles :
 * guides de rayon, pages par poids, par couleur ou par marque, observatoire des prix, place d'un prix dans sa famille.
 *
 * Compter sur la seule fiche de tête serait faux : dans 22 modèles un autre coloris coûte moins qu'elle (des
 * chevillères à 29,99 € dont une version est à 9,79 €), dans 63 les tailles changent d'un coloris à l'autre.
 * La vue d'un modèle est donc la fiche que la liste montre (`unParModele`), à son premier prix dans la liste, avec
 * les tailles, les couleurs et les déclinaisons de toutes ses fiches listées ; une caractéristique que cette fiche
 * ne donne pas se lit sur la première qui la donne. Sa marque porte le nom du modèle, et son prix le plus haut dans
 * la liste quand il dépasse le premier.
 *
 * Une vue ne s'affiche pas en carte et ne se vend pas : les cartes montrent une fiche réelle (lib/un-par-modele.ts).
 */
export function vuesDesModeles(liste: Product[], all: Product[]): Product[] {
  const connues = liste === all ? vuesDuCatalogue.get(all) : undefined;
  if (connues) return connues;
  const groupes = new Map<string, { m: Modele; fiches: Product[] }>();
  for (const p of liste) {
    const m = modeleDe(p, all);
    const g = groupes.get(m.cle);
    if (g) g.fiches.push(p);
    else groupes.set(m.cle, { m, fiches: [p] });
  }
  const vues = [...groupes.values()].map(({ m, fiches }): Product => {
    const montree = fiches.find((p) => p.id === m.tete.id) ?? fiches[0];
    const marque: MarqueDeModele = { cle: m.cle, tete: montree.id === m.tete.id, n: m.fiches.length, coloris: m.coloris, nom: m.nom };
    if (fiches.length === 1) return { ...montree, modele: marque };
    const ordre = [montree, ...fiches.filter((p) => p !== montree)];
    const prix = ordre.map((p) => p.price).filter((x) => x > 0);
    const premier = prix.length ? Math.min(...prix) : montree.price;
    const haut = prix.length ? Math.max(...prix) : montree.price;
    const specs = { ...montree.specs };
    for (const p of ordre) for (const [k, v] of Object.entries(p.specs || {})) if (v && !specs[k]) specs[k] = v;
    // « Dès » (prixAffiche, buyingBrief) se lit dans les déclinaisons : chaque autre prix du modèle y figure.
    const variants = [...ordre.flatMap((p) => p.variants || []), ...[...new Set(prix)].filter((x) => x !== premier).map((price) => ({ id: '', reference: '', label: '', attributes: {}, price }))];
    return {
      ...montree,
      price: premier,
      sizes: [...new Set(ordre.flatMap((p) => p.sizes))],
      colors: [...new Set(ordre.flatMap((p) => p.colors || []))],
      specs,
      ...(variants.length ? { variants } : {}),
      modele: haut > premier ? { ...marque, max: haut } : marque,
    };
  });
  if (liste === all) vuesDuCatalogue.set(all, vues);
  return vues;
}

/** Le nom sous lequel citer un article dans une phrase : celui du modèle quand la marque le porte, sinon celui de la fiche. */
export const nomDeModele = (p: Product) => p.modele?.nom || p.name;
