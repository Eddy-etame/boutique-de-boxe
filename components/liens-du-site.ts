/**
 * Les liens de l’entête, du pied de page et de l’accueil vers les rayons et les guides : une seule liste
 * pour les trois, des ancres qui décrivent la page d’arrivée (carte des mots-clés du concours du
 * 20/10/2026). Une requête, une page : « Arts martiaux » mène à la page d’information /les-arts-martiaux/,
 * jamais à un rayon ; le rayon /arts-martiaux/ se lie en « Matériel d’arts martiaux » et
 * /boutique-arts-martiaux/ en « Boutique arts martiaux ». « Sport de combat » mène à /sports-de-combat/,
 * le rayon de toutes les disciplines se lie en « Matériel sport de combat ».
 *
 * Module sans état ni import : l’entête et le pied de page (composants client) comme l’accueil (composant
 * serveur) le lisent tel quel.
 */

/**
 * La page /equipement-boxe-anglaise/ (requête « équipement boxe anglaise ») se construit dans une autre
 * copie : tant qu’elle n’est pas en ligne, aucun lien n’y mène. À la fusion, passer à true : le panneau
 * « Rayons » de l’entête, le bloc « Rayons » du pied de page et l’index « Par discipline » de l’accueil
 * la lient aussitôt (l’index y envoie alors « Boxe anglaise » au lieu de /materiel-boxe/).
 */
export const EQUIPEMENT_BOXE_ANGLAISE_PRET = false;

export type Lien = { href: string; label: string };

/** Les rayons par pratique : les pages de tête. */
export const RAYONS_PRATIQUE: Lien[] = [
  { href: '/materiel-boxe/', label: 'Matériel de boxe' },
  ...(EQUIPEMENT_BOXE_ANGLAISE_PRET ? [{ href: '/equipement-boxe-anglaise/', label: 'Équipement de boxe anglaise' }] : []),
  { href: '/materiel-mma/', label: 'Matériel MMA' },
  { href: '/boutique-arts-martiaux/', label: 'Boutique arts martiaux' },
  { href: '/materiel-sport-de-combat/', label: 'Matériel sport de combat' },
];

/** Les rayons par type de matériel, dans l’ordre du catalogue. */
export const RAYONS_TYPE: Lien[] = [
  { href: '/gants-de-boxe/', label: 'Gants de boxe' },
  { href: '/gants-mma/', label: 'Gants MMA' },
  { href: '/protections-boxe/', label: 'Protections de boxe' },
  { href: '/textile-boxe/', label: 'Textile de boxe' },
  { href: '/accessoires-boxe/', label: 'Accessoires de boxe' },
  { href: '/sacs-de-frappe/', label: 'Sacs de frappe' },
  { href: '/chaussures-boxe/', label: 'Chaussures de boxe et de lutte' },
  { href: '/equipement-entrainement/', label: 'Équipement d’entraînement' },
  { href: '/sacs-de-sport/', label: 'Sacs de sport' },
  { href: '/arts-martiaux/', label: 'Matériel d’arts martiaux' },
];

/** Le matériel d’une discipline : les pages d’entrée sous « Matériel de boxe » et « Matériel MMA ». */
export const PAR_DISCIPLINE: Lien[] = [
  { href: '/materiel-boxe-thai/', label: 'Matériel de boxe thaï' },
  { href: '/materiel-kick-boxing/', label: 'Matériel de kick-boxing' },
  { href: '/materiel-boxe-francaise/', label: 'Matériel de boxe française' },
  { href: '/equipement-jjb/', label: 'Équipement JJB' },
];

/**
 * Les guides du pied de page : les guides d’achat les plus demandés et les deux pages d’information.
 * Le poids des gants n’y est pas : le pied de page le propose déjà en troisième chemin.
 */
export const GUIDES: Lien[] = [
  { href: '/guides/choisir-gants-boxe/', label: 'Choisir ses gants de boxe' },
  { href: '/guides/difference-gants-boxe-mma/', label: 'Gants de boxe ou gants MMA ?' },
  { href: '/guides/debuter-boxe/', label: 'Débuter la boxe anglaise' },
  { href: '/guides/debuter-mma/', label: 'Commencer le MMA' },
  { href: '/guides/choisir-protections/', label: 'Choisir ses protections' },
  { href: '/guides/sac-de-frappe-suspendu-ou-sur-pied/', label: 'Sac de frappe suspendu ou sur pied ?' },
  { href: '/guide-des-tailles/', label: 'Guide des tailles' },
  { href: '/sports-de-combat/', label: 'Qu’est-ce qu’un sport de combat ?' },
  { href: '/les-arts-martiaux/', label: 'Arts martiaux : la liste et leur origine' },
  { href: '/guides/', label: 'Tous les guides' },
];

/** L’ancre d’un rayon par type, d’après son adresse (le nom du catalogue sinon). */
export const nomDeRayon = (slug: string, sinon: string) => RAYONS_TYPE.find((r) => r.href === '/' + slug + '/')?.label ?? sinon;
