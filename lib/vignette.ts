/**
 * Vignettes de galerie (19/10/2026). Les vues secondaires de 485 fiches sont des photos du fournisseur
 * en pleine taille (médiane 402 Ko, jusqu’à 9,7 Mo) affichées en 72 px. Elles passent par
 * /vignette/t/<fiche>/<rang>-<empreinte>.webp : réduites une fois à 168 px en WebP sur le domaine de
 * la boutique, puis gardées un an par le CDN. L’empreinte change avec la photo d’origine : une photo
 * remplacée reçoit une nouvelle adresse, jamais l’ancienne vignette.
 */
export const THUMB_SIZE = 168;

/** Empreinte courte et stable (FNV-1a 32 bits, base 36) : utilisable dans le navigateur comme au serveur. */
export function empreinte(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padStart(7, '0');
}

/** La vignette d’une photo de fiche : servie telle quelle si elle est déjà sur le domaine (WebP 480 px). */
export function thumbSrc(slug: string, index: number, image: { src: string; small: string }): string {
  if (image.small.startsWith('/')) return image.small;
  return `/vignette/t/${slug}/${index}-${empreinte(image.src)}.webp`;
}
