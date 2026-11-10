import type { Product } from './catalog';
import { guides, type Guide } from './editorial';
import { ENFANT } from './rayons';
import { subfamiliesOf } from './subfamilies';

/**
 * Les guides qui parlent d’un modèle (10/11/2026) — trois au plus, sous « Les repères pour choisir ».
 *
 * Le cahier des charges (§ 13) demande des liens vers les guides d’achat sur chaque fiche. Les 21 guides écrits
 * depuis le 20/10 n’en recevaient que 6 à 11 sur tout le site, et la Search Console n’en connaissait aucun
 * (« Referring page: None detected ») : explorés à la demande le 9/11, ils sont restés hors de l’index.
 *
 * Un guide n’est lié que s’il porte sur ce matériel. Les rayons liés d’un guide (`relatedCategories`) sont rangés
 * du sujet au plus lointain ; on lit les quatre premiers :
 *   — la sous-famille du modèle (bandes, protège-dents, casques, shorts thaï…) : 6 points au premier rang,
 *     4 au deuxième, 2 ensuite ;
 *   — sa famille, quand elle ne vend qu’une sorte d’objet (gants de boxe, gants MMA, sacs de frappe, chaussures) :
 *     3, 2 puis 1. Les familles mêlées (accessoires, protections, textile, entraînement, arts martiaux) ne lient
 *     rien à ce niveau : une corde à sauter n’a que faire d’un guide sur les bandes ;
 *   — un guide qui nomme une sous-famille voisine sans nommer celle du modèle parle du voisin (le guide des sacs
 *     sur pied ne se lie pas depuis une poire de vitesse) ;
 *   — les guides « enfant » et « femme » ne sortent que sur un modèle qui l’est.
 * À égalité, le guide le plus récent passe devant : c’est lui qui manque de liens. Le guide de la famille, déjà lié
 * juste au-dessus, n’est pas répété.
 */
const FAMILLES_HOMOGENES = new Set(['gants-de-boxe', 'gants-mma', 'sacs-de-frappe', 'chaussures-boxe']);
const PAR_RANG_SOUS_FAMILLE = [6, 4, 2, 2];
const PAR_RANG_FAMILLE = [3, 2, 1, 1];

export function guidesDuModele(p: Product, guideDeFamille?: string): Guide[] {
  const duRayon = subfamiliesOf(p.category).filter((s) => !s.kind);
  const siennes = new Set(duRayon.filter((s) => s.match(p)).map((s) => s.slug));
  const voisines = new Set(duRayon.filter((s) => !siennes.has(s.slug)).map((s) => s.slug));
  const enfant = p.audience === 'enfant' || ENFANT.test(p.name);
  const femme = /\bfemmes?\b/i.test(p.name);
  return guides
    .map((g, rang) => {
      const lies = (g.relatedCategories || []).slice(0, 4);
      if (g.slug === 'equipement-enfant') return { g, rang, score: enfant ? 3 : 0 };
      if (g.slug === 'equipement-femme') return { g, rang, score: femme ? 3 : 0 };
      let score = 0;
      lies.forEach((c, i) => {
        if (siennes.has(c)) score = Math.max(score, PAR_RANG_SOUS_FAMILLE[i]);
      });
      const parleDuVoisin = siennes.size > 0 && lies.some((c) => voisines.has(c));
      if (!score && !parleDuVoisin && FAMILLES_HOMOGENES.has(p.category)) {
        const i = lies.indexOf(p.category);
        if (i >= 0) score = PAR_RANG_FAMILLE[i];
      }
      return { g, rang, score };
    })
    .filter((x) => x.score > 0 && x.g.slug !== guideDeFamille)
    .sort((a, b) => b.score - a.score || b.rang - a.rang)
    .slice(0, 3)
    .map((x) => x.g);
}
