/**
 * Photos du fournisseur servies par le domaine (19 et 20/10/2026). Les vues secondaires de 485 fiches
 * sont des photos hébergées chez le fournisseur (api.ecommercio.com, qui renvoie vers son stockage,
 * et media.cdnws.com), en pleine taille : médiane 402 Ko, jusqu’à 9,7 Mo, et un hôte qui refuse les
 * robots trop pressés (429, connexions coupées). Elles passent par
 * /vignette/<largeur>/<fiche>/<empreinte>.webp : lues une fois chez le fournisseur, réduites en WebP
 * à la largeur demandée sur le domaine de la boutique, puis gardées un an par le CDN.
 *
 * Une adresse par photo et par largeur, stable : l’empreinte est celle de l’adresse d’origine de la
 * photo, pas son rang dans la galerie (réordonner les photos ne change aucune adresse). Une photo
 * remplacée reçoit une nouvelle adresse, jamais l’ancienne image.
 *
 * Les photos déjà sur le domaine (/media/cut/, /media/catalogue/, /products/ : WebP 480 et 960 px)
 * ne passent pas par là : elles sont servies telles quelles. L’ancienne forme des vignettes,
 * /vignette/t/<fiche>/<rang>-<empreinte>.webp (168 px), reste servie pour les pages déjà en cache.
 */
export const THUMB_SIZE = 168;
/** Largeurs servies : vignette de galerie (84 px en double densité), carte et téléphone, grande vue,
 *  agrandissement, données structurées et flux marchand. */
export const PHOTO_WIDTHS = [THUMB_SIZE, 480, 960, 1200] as const;
export type PhotoWidth = (typeof PHOTO_WIDTHS)[number];

/** Hôtes des photos de fournisseurs (les mêmes que la CSP `img-src`) : la route ne lit rien d’autre. */
export const PHOTO_HOSTS = new Set(['api.ecommercio.com', 'ypnjjowtudmpxoqopzta.supabase.co', 'media.cdnws.com']);

/** Empreinte courte et stable (FNV-1a 32 bits, base 36) : utilisable dans le navigateur comme au serveur. */
export function empreinte(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padStart(7, '0');
}

/** Vrai pour une photo hébergée chez un fournisseur connu (adresse https sur l’un des hôtes ci-dessus). */
export function photoDuFournisseur(src: string | undefined): boolean {
  if (!src || !src.startsWith('https://')) return false;
  try {
    return PHOTO_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

type Photo = { src: string; small: string };

/**
 * L’adresse d’une photo de fiche à la largeur voulue, toujours sur le domaine quand c’est possible :
 * photo du fournisseur → /vignette/<largeur>/<fiche>/<empreinte>.webp ; photo déjà sur le domaine →
 * son fichier 480 px jusqu’à 480 de large, son fichier 960 px au-delà ; toute autre adresse reste telle quelle.
 */
export function photoSrc(slug: string, image: Photo, width: PhotoWidth): string;
export function photoSrc(slug: string, image: Photo | undefined, width: PhotoWidth): string | undefined;
export function photoSrc(slug: string, image: Photo | undefined, width: PhotoWidth): string | undefined {
  if (!image) return undefined;
  if (width <= 480 && image.small?.startsWith('/')) return image.small;
  if (photoDuFournisseur(image.src)) return `/vignette/${width}/${slug}/${empreinte(image.src)}.webp`;
  return width <= 480 && image.small ? image.small : image.src;
}

/** La vignette d’une photo de galerie (168 px) ; une photo déjà sur le domaine sert son fichier 480 px. */
export function thumbSrc(slug: string, image: Photo): string {
  return photoSrc(slug, image, THUMB_SIZE);
}
