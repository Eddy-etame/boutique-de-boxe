import { categoryFor, getCategoryProducts, type Product } from './catalog';
import { SUBFAMILIES, subfamilyProducts } from './subfamilies';
import { brandFor } from './brands';
import { facetFor } from './facets';
import { marqueDeModele, fichesParModele, vuesDesModeles } from './modeles';
import { cartesParModele } from './un-par-modele';
import { faits, type Contexte } from './guides-rayons';
import { entrelace } from './rayons';
import { phrasesDe, phrasesEntieres } from './phrases';

/**
 * Une liste, trois lectures (11/11/2026) :
 *   – ses cartes (`cartesDe`) : une fiche réelle par modèle, celle de tête quand elle y figure, avec « Dès » ;
 *   – son nombre de modèles (`modelesDe(...).length`) : ce que disent la pagination et tout texte qui compte ;
 *   – ses modèles vus comme des articles (`vuesDesModeles`, `contexteDeRayon`) : ce que les textes chiffrent.
 */

/** Une liste réduite à une fiche par modèle (la fiche de tête quand elle y figure), dans l'ordre de la liste. */
export const modelesDe = fichesParModele;
/** La fiche telle qu'elle part dans une liste : avec la marque de son modèle. */
export const avecModele = (p: Product, all: Product[]): Product => ({ ...p, modele: marqueDeModele(p, all) });
/** Les cartes d'une liste : une fiche par modèle, sa marque, et son premier prix parmi les fiches de la liste. */
export const cartesDe = (liste: Product[], all: Product[]) => cartesParModele(liste.map((p) => avecModele(p, all)));

/**
 * Ce qu'un guide de rayon sait de sa page (lib/guides-rayons.ts) : les modèles de la page et ceux du catalogue,
 * chacun vu comme un article, les faits de la page, et les fiches du catalogue.
 */
export function contexteDeRayon(slug: string, fiches: Product[], all: Product[]): Contexte {
  const items = vuesDesModeles(fiches, all);
  return { f: faits(slug, items), items, all: vuesDesModeles(all, all), catalogue: all };
}

/** Une phrase qui n'est qu'une liste de marques : « Elion, Venum, Everlast. » — chaque mot commence par une majuscule ou un chiffre. */
const listeDeMarques = (phrase: string) => {
  const noms = phrase.replace(/[.!?]$/, '').split(', ');
  return noms.length >= 2 && noms.every((x) => x.split(' ').every((mot) => /^[\p{Lu}\d]/u.test(mot)));
};

/**
 * La description écrite d'un rayon, telle qu'elle se publie (11/11/2026). Quinze descriptions citaient des marques
 * que leur rayon ne vend pas (des gants à lacets « Cleto Reyes, Fairtex, Twins » pour un rayon tout Elion) : la
 * phrase qui n'est qu'une liste de marques est remplacée par les marques du rayon, les plus fournies d'abord,
 * lues sur le catalogue du jour. Le texte garde ensuite ses phrases entières dans la limite.
 */
export function descriptionDeRayon(texte: string, slug: string, fiches: Product[], all: Product[], max = 158): string {
  const phrases = phrasesDe(texte);
  if (!phrases.some(listeDeMarques)) return phrasesEntieres(texte, max);
  // Une marque que le catalogue écrit tout en capitales (« CHAMPBOXING ») se lit en bas de casse ; un sigle (« RDX ») reste.
  const lisible = (nom: string) => (nom.length > 4 && nom === nom.toUpperCase() ? nom.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase()) : nom);
  const marques = faits(slug, vuesDesModeles(fiches, all)).marques.slice(0, 5).map((m) => lisible(m.nom));
  const vraie = marques.length > 1 ? marques.join(', ') + '.' : marques.length ? `Marque : ${marques[0]}.` : '';
  return phrasesEntieres(phrases.map((p) => (listeDeMarques(p) ? vraie : p)).filter(Boolean).join(' '), max);
}

/** Les fiches d'une page de rayon, de sous-famille ou des nouveautés, dans l'ordre où la page les montre. */
export function fichesDePage(slug: string, products: Product[]): Product[] {
  const sub = SUBFAMILIES.find((s) => s.slug === slug);
  if (sub) return subfamilyProducts(sub, products);
  const cat = categoryFor(slug);
  if (!cat) return [...products].reverse();
  return cat.slug === 'materiel-sport-de-combat' ? entrelace(getCategoryProducts(cat, products)) : getCategoryProducts(cat, products);
}

/**
 * La liste complète d’une page de catalogue, dans son ordre « notre sélection ».
 *
 * La page n’envoie au navigateur que les 36 cartes affichées ; la liste entière n’est demandée
 * (GET /api/catalog-list?scope=…) que lorsque le visiteur cherche, filtre, trie ou change de page.
 * Avec la liste entière dans le HTML, « matériel de boxe » pesait plus d’un mégaoctet.
 */
export function listingFor(scope: string, products: Product[]): Product[] | null {
  const cat = categoryFor(scope);
  if (cat) return getCategoryProducts(cat, products);
  if (scope === 'nouveautes') return [...products].reverse();
  if (scope === 'recherche') return products;
  // « marque-fairtex » = toute la marque ; « marque-fairtex--gants-de-boxe » = la marque dans une famille.
  if (scope.startsWith('marque-') && !scope.includes('--')) return brandFor(scope.slice(7), products)?.fiches ?? null;
  const sub = SUBFAMILIES.find((s) => s.slug === scope);
  if (sub) return subfamilyProducts(sub, products);
  return facetFor(scope, products)?.fiches ?? null;
}
