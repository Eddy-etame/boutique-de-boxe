/**
 * Une liste de rayon montre un modèle par carte (11/11/2026).
 *
 * Depuis « un modèle, une page » (lib/modeles.ts), les coloris d'un modèle renvoient tous à sa fiche de tête.
 * Les grilles, elles, alignaient encore une carte par coloris : onze cartes pour la Nike HyperKO 2, dont dix
 * menaient à une adresse que Google ne garde pas. Ici, la liste se réduit à une fiche par modèle.
 *
 * Ce fichier n'importe aucune donnée : il sert au serveur (lib/listing.ts) comme au navigateur
 * (components/shop-interactions.tsx), qui doivent réduire une liste exactement de la même façon.
 */

/** Ce qu'une fiche sait de son modèle quand elle part dans une liste. */
export type MarqueDeModele = {
  /** La clé du modèle (lib/modeles.ts). */
  cle: string;
  /** La fiche est la fiche de tête du modèle : celle que le plan du site et les canoniques désignent. */
  tete: boolean;
  /** Le nombre de fiches que le modèle réunit. */
  n: number;
  /** Les fiches se distinguent par un coloris (« 4 coloris ») ou par autre chose (« 4 versions »). */
  coloris: boolean;
  /** Le nom du modèle, sans coloris : porté par la fiche de tête d'un modèle à plusieurs fiches, et par toute vue. */
  nom?: string;
  /** Le premier prix du modèle dans la liste, quand une autre de ses fiches listées coûte moins que la fiche montrée. */
  min?: number;
  /** Sur une vue (lib/modeles.ts, `vuesDesModeles`) : le prix le plus haut du modèle dans la liste, quand il dépasse son premier prix. */
  max?: number;
};

/**
 * La liste réduite à une fiche par modèle, dans l'ordre de la liste. La place d'un modèle est celle de sa
 * première fiche ; la fiche montrée est la fiche de tête dès qu'elle figure dans la liste, sinon la première
 * rencontrée (un filtre « rouge » montre le coloris rouge). Une fiche sans marque passe telle quelle.
 */
export function unParModele<T>(liste: T[], marque: (x: T) => Pick<MarqueDeModele, 'cle' | 'tete'> | undefined): T[] {
  const place = new Map<string, number>();
  const out: T[] = [];
  for (const x of liste) {
    const m = marque(x);
    if (!m) {
      out.push(x);
      continue;
    }
    const i = place.get(m.cle);
    if (i === undefined) {
      place.set(m.cle, out.length);
      out.push(x);
    } else if (m.tete && !marque(out[i])?.tete) out[i] = x;
  }
  return out;
}

/**
 * Les cartes d'une liste : une fiche par modèle, chacune avec le premier prix de son modèle dans la liste quand
 * une autre de ses fiches listées coûte moins qu'elle. « Dès » se lit donc sur ce que la liste contient : sur la
 * page des gants rouges, le premier prix est celui des rouges ; sous un filtre, celui des fiches qui restent.
 * Une fiche seule de son modèle dans la liste garde la marque qu'elle porte : la page a déjà réduit les cartes
 * qu'elle envoie, leur premier prix vient d'elle.
 */
export function cartesParModele<T extends { price: number; modele?: MarqueDeModele }>(liste: T[]): T[] {
  const vus = new Map<string, { n: number; min: number }>();
  for (const p of liste) {
    if (!p.modele) continue;
    const v = vus.get(p.modele.cle);
    if (!v) vus.set(p.modele.cle, { n: 1, min: p.price > 0 ? p.price : Infinity });
    else {
      v.n++;
      if (p.price > 0 && p.price < v.min) v.min = p.price;
    }
  }
  return unParModele(liste, (p) => p.modele).map((p) => {
    const v = p.modele && vus.get(p.modele.cle);
    if (!p.modele || !v || v.n < 2) return p;
    const marque: MarqueDeModele = { ...p.modele };
    if (v.min < p.price) marque.min = v.min;
    else delete marque.min;
    return { ...p, modele: marque };
  });
}
