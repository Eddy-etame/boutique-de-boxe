import manifest from './data/cutouts.json';
import type { Product } from './catalog';

/**
 * Photos détourées du catalogue (scripts/cutout-images.py).
 *
 * Chaque photo fournisseur arrive avec son propre fond. La découpe pose tous les modèles
 * sur la même scène : même échelle, même ligne de sol, même ombre d’appui.
 *   pose   l’objet est entier : il est posé sur le sol de la scène.
 *   cadre  le sujet touche un bord (photo portée, plan serré) : il reste ancré à ce bord.
 * Le manifeste ne part jamais dans le navigateur : il est lu ici, côté serveur, et chaque
 * produit n’emporte que sa propre découpe.
 */
type Entry = {
  mode: 'pose' | 'cadre';
  edges: string[];
  tint: string;
  vivid: boolean;
  lum: number;
  src?: string;
};
const entries = manifest as unknown as Record<string, Entry>;

export function withCutout<T extends Product>(p: T): T {
  const e = entries[p.id];
  // Photo remplacée dans l’atelier : la découpe ne vaut que pour la photo dont elle vient.
  if (!e || (e.src && e.src !== p.images[0]?.src)) return p;
  return {
    ...p,
    cut: {
      small: `/media/cut/${p.id}-480.webp`,
      large: `/media/cut/${p.id}-960.webp`,
      mode: e.mode,
      edges: e.edges,
      tint: e.tint,
      vivid: e.vivid,
      lum: e.lum,
    },
  };
}
