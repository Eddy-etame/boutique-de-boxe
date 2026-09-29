/**
 * Ce qu'un rayon « compte » quand on annonce « N modèles, dès X € » ou qu'on y
 * choisit un premier achat (29/09) : la famille Chaussures contient aussi des
 * semelles (1,70 €) et des chaussettes, la famille Gants de boxe des gants
 * d'enfant. Un chiffre qui dit « chaussures dès 1,70 € » est faux ; ce filtre
 * le rend vrai.
 */
import type { Product } from './catalog';

/** Le nom d'un article doit contenir ce mot pour compter dans le rayon. */
export const DOIT: Record<string, RegExp> = {
  'chaussures-boxe': /chaussure/i,
  'gants-de-boxe': /gant/i,
  'gants-mma': /gant/i,
  kimonos: /kimono/i,
  'protege-dents': /prot[èe]ge.dents/i,
};
/** …et ne doit pas être un accessoire de l'article : une boîte n'est pas un protège-dents. */
export const PAS: Record<string, RegExp> = {
  'protege-dents': /bo[iî]te|[ée]tui/i,
};
/** Un premier sac d'adulte ne propose pas d'article d'enfant. */
export const ENFANT = /enfant|junior|b[ée]b[ée]|\bkids?\b/i;

export const dansLeRayon = (slug: string, p: Product) => (!DOIT[slug] || DOIT[slug].test(p.name)) && !(PAS[slug] && PAS[slug].test(p.name));

/* « Matériel sport de combat » (29/09) : la page liste tout le catalogue ; sa première page ne doit pas
   s'ouvrir sur des gourdes. Les familles du combat passent d'abord, en alternance, le reste ensuite —
   aucun modèle n'est retiré, seul l'ordre change, et seulement sur cette page. */
const ORDRE_COMBAT = ['gants-de-boxe', 'protections-boxe', 'gants-mma', 'textile-boxe', 'chaussures-boxe', 'arts-martiaux', 'sacs-de-frappe', 'accessoires-boxe', 'equipement-entrainement', 'sacs-de-sport'];

export function entrelace(products: Product[]) {
  const files = new Map<string, Product[]>();
  for (const p of products) {
    const k = ORDRE_COMBAT.includes(p.category) ? p.category : '~';
    if (!files.has(k)) files.set(k, []);
    files.get(k)!.push(p);
  }
  const ordre = [...ORDRE_COMBAT, '~'].filter((k) => files.has(k));
  const out: Product[] = [];
  for (let i = 0; out.length < products.length; i++) for (const k of ordre) if (files.get(k)![i]) out.push(files.get(k)![i]);
  return out;
}
