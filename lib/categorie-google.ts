/**
 * Catégorie Google Merchant d’un modèle (`g:google_product_category` du flux), lue dans son nom
 * puis dans son rayon. Numéros de la taxonomie fr-FR de Google, relevée le 22 octobre 2026 :
 * https://www.google.com/basepages/producttype/taxonomy-with-ids.fr-FR.txt
 * Bing Merchant Center lit la même taxonomie.
 */
import type { Product } from './catalog';

/** Les libellés, pour les contrôles et le compte rendu ; le flux n’envoie que le numéro. */
export const LIBELLES: Record<number, string> = {
  3235: 'Boxe et arts martiaux > Équipement de protection > Mitaines et gants de boxe',
  499726: 'Boxe et arts martiaux > Équipement de protection > Bandages de mains',
  499722: 'Boxe et arts martiaux > Équipement de protection > Casques',
  499724: 'Boxe et arts martiaux > Équipement de protection > Protège-tibias',
  499723: 'Boxe et arts martiaux > Équipement de protection > Plastrons',
  499725: 'Boxe et arts martiaux > Équipement de protection > Protège avant-bras',
  4008: 'Boxe et arts martiaux > Équipement de protection',
  499801: 'Matériel de sport > Protège-dents pour sportifs',
  499800: 'Matériel de sport > Coquilles de protection (« Athletic Cups »)',
  499769: 'Boxe et arts martiaux > Entraînement > Mitaines d’entraîneur (pattes d’ours, paos)',
  499721: 'Boxe et arts martiaux > Entraînement > Boucliers de frappe',
  7116: 'Boxe et arts martiaux > Entraînement > Mannequins',
  3297: 'Boxe et arts martiaux > Entraînement > Punching-balls (sacs de frappe, poires)',
  7129: 'Boxe et arts martiaux > Entraînement > Accessoires pour punching-balls',
  499720: 'Boxe et arts martiaux > Équipement d’entraînement',
  3652: 'Boxe et arts martiaux > Rings de boxe',
  3411: 'Boxe et arts martiaux > Pièces de ring de boxe',
  4282: 'Boxe et arts martiaux > Armes d’arts martiaux',
  3717: 'Boxe et arts martiaux > Ceintures d’arts martiaux',
  499719: 'Boxe et arts martiaux',
  4003: 'Vêtements > Tenues > Uniformes de sport > Tenues d’arts martiaux',
  5378: 'Vêtements > Vêtements fitness et sports > Shorts de boxe',
  5379: 'Vêtements > Vêtements fitness et sports > Shorts pour arts martiaux',
  5322: 'Vêtements > Vêtements fitness et sports',
  173: 'Accessoires d’habillement > Chapeaux',
  187: 'Vêtements et accessoires > Chaussures',
  2614: 'Entraînement et fitness > Cardio > Cordes à sauter',
  103: 'Bagages et maroquinerie > Sacs polochon',
  100: 'Bagages et maroquinerie > Sacs à dos',
  499803: 'Matériel de sport > Tapis de gym',
  3809: 'Arts de la table > Supports pour aliments et boissons > Bouteilles d’eau',
  508: 'Santé > Premiers secours',
  509: 'Santé > Premiers secours > Bandes et pansements',
  2954: 'Santé > Premiers secours > Antiseptiques et désinfectants',
};

/** Par le début du nom du modèle, du plus précis au plus large. */
const PAR_NOM: [RegExp, number][] = [
  [/^sacs? à dos\b/i, 100],
  [/^(sacs? (de sport|de voyage|polochon|convertible|fourre-tout)|sac\b(?! de frappe))/i, 103],
  [/^(sacs? de frappe|poires?|punching|balles? r|aqua|hydro)/i, 3297],
  [/^(rotules?|attaches?|cha[iî]nes?|ressorts?|crochets?|mousquetons?|fixations?|plateformes?|potences?|portiques?|supports?|rails?)\b/i, 7129],
  [/^(gants?|mitaines?)\b/i, 3235],
  [/^(bandes?|sous-gants?|bandages?)\b/i, 499726],
  [/^(finger tape|tape|strapping)\b/i, 509],
  [/^casques?\b/i, 499722],
  [/^prot[eè]ge-tibias?/i, 499724],
  [/^prot[eè]ge-dents/i, 499801],
  [/^(plastrons?|prot[eè]ge-poitrine|prot[eè]ge-buste|prot[eè]ge-seins)/i, 499723],
  [/^prot[eè]ge-avant-bras/i, 499725],
  [/^coquilles?\b/i, 499800],
  [/^(pattes? d|paos?\b|cibles? de frappe|raquettes?|ceintures? de frappe|planches? de rupture)/i, 499769],
  [/^boucliers?\b/i, 499721],
  [/^(mannequins?|bases? de frappe|stations?)\b/i, 7116],
  [/^rings?\b/i, 3652],
  [/^(coins? de ring|cordes? de ring|tendeurs?|protections? de cordes?)/i, 3411],
  [/^(kimonos?|tenues?|doboks?|gi\b|karategi|judogi|hakamas?)/i, 4003],
  [/^ceintures?\b/i, 3717],
  [/^shorts?\b.*\b(mma|combat|jjb|grappling|arts martiaux|lutte|no.?gi)\b/i, 5379],
  [/^shorts?\b/i, 5378],
  [/^(bobs?|casquettes?|bonnets?)\b/i, 173],
  [/^(rashguards?|t-shirts?|tee-shirts?|sweats?|d[ée]bardeurs?|leggings?|spats|vestes?|pantalons?|surv[eê]tements?|brassi[eè]res?|hoodies?|polos?|maillots?|ensembles?|joggings?)\b/i, 5322],
  [/^chaussures?\b/i, 187],
  [/^cordes? à sauter/i, 2614],
  [/^(tatamis?|tapis)\b/i, 499803],
  [/^(bouteilles?|gourdes?)\b/i, 3809],
  [/^(trousses? de soins?|ciseaux)\b/i, 508],
  [/^sprays? .*d[ée]sinfectant/i, 2954],
  [/^(b[aâ]tons?|nunchakus?|sabres?|bokken|tonfas?|armes?|couteaux?|tantos?|[ée]tuis? pour armes)\b/i, 4282],
];

/** Par rayon, quand le nom ne dit rien de plus précis. */
const PAR_RAYON: Record<string, number> = {
  'gants-de-boxe': 3235,
  'gants-mma': 3235,
  'protections-boxe': 4008,
  'accessoires-boxe': 499719,
  'sacs-de-frappe': 3297,
  'textile-boxe': 5322,
  'chaussures-boxe': 187,
  'equipement-entrainement': 499720,
  'sacs-de-sport': 103,
  'arts-martiaux': 499719,
  'boutique-arts-martiaux': 499719,
};

export function categorieGoogle(p: Pick<Product, 'name' | 'category'>): number {
  for (const [re, id] of PAR_NOM) if (re.test(p.name)) return id;
  return PAR_RAYON[p.category] ?? 499719;
}
