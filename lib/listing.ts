import { categoryFor, getCategoryProducts, type Product } from './catalog';
import { SUBFAMILIES, subfamilyProducts } from './subfamilies';
import { brandFor } from './brands';
import { facetFor } from './facets';
import { marqueDeModele, fichesParModele, vuesDesModeles } from './modeles';
import { cartesParModele } from './un-par-modele';
import { faits, type Contexte } from './guides-rayons';
import { entrelace } from './rayons';

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
