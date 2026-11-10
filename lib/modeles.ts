import type { Product } from './catalog';
import { appellation } from './describe';
import tetes from './data/modeles-tetes.json';

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
const sansAccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const enCle = (s: string) => sansAccent(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Les mots de matière du coloris, tels qu'écrits : « cuir », « PU », « gel ». */
const matiereDe = (variante: string) => variante.split(/\s+/).filter((w) => MATIERE.test(w));

export function cleDuModele(p: Product): string {
  const a = appellation(p);
  const matiere = matiereDe(a.variante).map((w) => w.toLowerCase()).sort().join('-');
  return [p.category, enCle(p.brand || ''), enCle(a.base), ...(matiere ? [enCle(matiere)] : [])].join(':');
}

/**
 * Ce qui distingue une fiche dans son modèle : « noir », « bleu clair », « Itachi ». Une fiche dont le nom
 * ne dit aucun coloris se désigne par sa référence, seule donnée sûre.
 */
export function libelleDeFiche(p: Product): string {
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
    const tete = fiches.find((p) => p.slug === ecrites[cle]) ?? [...fiches].sort(ordreDeTete)[0];
    const a = appellation(tete);
    const matiere = matiereDe(a.variante);
    const autres = fiches.filter((p) => p.id !== tete.id).sort((x, y) => libelleDeFiche(x).localeCompare(libelleDeFiche(y), 'fr'));
    const modele: Modele = {
      cle,
      nom: fiches.length > 1 ? a.base + (matiere.length ? ', ' + matiere.join(' ') : '') : tete.name,
      tete,
      fiches: [tete, ...autres],
      // Un coloris s'écrit en minuscules (« bleu clair », « blanc, bleu et rose ») ; une édition porte un nom propre.
      coloris: fiches.every((p) => appellation(p).variante.split(/[\s,]+/).every((w) => !w || MATIERE.test(w) || /^[a-zà-ÿ]+$/.test(w))),
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

/** « 10 coloris », « 4 versions » : ce que le modèle propose, compté. */
export const compteDuModele = (m: Modele) => `${m.fiches.length} ${m.coloris ? 'coloris' : 'versions'}`;
