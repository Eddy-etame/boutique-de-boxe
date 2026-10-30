import { categoryFor, estLourd, livraison, money, shop, type Product } from './catalog';
import { dansLeRayon } from './rayons';
import { subfamilyFor } from './subfamilies';

/** A purchasing answer, not another keyword list or a second catalogue. */
export const BUYING_BRIEF_REVISION = '2026-10-24';
export type BuyingLink = { href: string; label: string };
type Decision = { answer: string; links: BuyingLink[] };
const link = (href: string, label: string): BuyingLink => ({ href, label });

/** Each rule answers the actual equipment decision; it does not prescribe a universal size. */
const DECISIONS: { match: RegExp; decision: Decision }[] = [
  {
    match: /enfant/,
    decision: {
      answer: 'Pour un enfant, partez de la discipline et du matériel demandés par son encadrant. Vérifiez les tailles du modèle : une paire légère n’est pas automatiquement une paire adaptée à sa main.',
      links: [link('/guides/equipement-enfant/', 'Préparer le premier équipement enfant'), link('/gants-de-boxe-enfant/', 'Comparer les gants enfant'), link('/guide-des-tailles/', 'Vérifier les tailles de la marque')],
    },
  },
  {
    match: /gants-de-boxe|^gants-boxe/,
    decision: {
      answer: 'Commencez par l’exercice : sac, travail technique ou opposition avec un partenaire. Comparez ensuite le poids, la fermeture et la matière de la paire ; le nombre d’onces ne remplace pas l’essayage ni le guide de la marque.',
      links: [link('/guides/choisir-gants-boxe/', 'Choisir selon votre entraînement'), link('/gants-de-boxe-cuir/', 'Les modèles en cuir'), link('/gants-de-boxe-pas-cher/', 'Les paires adultes à 50 € ou moins')],
    },
  },
  {
    match: /gants-mma/,
    decision: {
      answer: 'Vérifiez d’abord le format demandé pour votre séance : travail avec saisies, entraînement ou compétition. Comparez la paume, le pouce et le rembourrage, puis mesurez votre main avec le tableau du fabricant.',
      links: [link('/guides/choisir-gants-mma/', 'Choisir ses gants MMA'), link('/guides/difference-gants-boxe-mma/', 'Gants MMA ou gants de boxe ?'), link('/materiel-mma/', 'Compléter son équipement MMA')],
    },
  },
  {
    match: /protege-dents/,
    decision: {
      answer: 'Choisissez le modèle selon l’âge, la dentition et les consignes de son fabricant. Vérifiez les instructions de moulage avant d’ouvrir l’emballage, particulièrement si vous portez un appareil dentaire.',
      links: [link('/guides/choisir-protections/', 'Choisir ses protections'), link('/protections-boxe/', 'Les autres protections de boxe'), link('/retours/', 'Lire les conditions de retour')],
    },
  },
  {
    match: /casques|protege-tibias|coquilles|protections/,
    decision: {
      answer: 'Le bon équipement dépend des contacts autorisés dans votre discipline. Comparez la couverture et les réglages, puis contrôlez la mesure indiquée par la marque : une protection ne doit pas tourner pendant l’exercice.',
      links: [link('/guides/choisir-protections/', 'Comparer les protections par usage'), link('/protege-dents/', 'Trouver un protège-dents'), link('/guide-des-tailles/', 'Prendre les mesures avant de choisir')],
    },
  },
  {
    match: /sacs-de-frappe|poires-de-vitesse/,
    decision: {
      answer: 'Mesurez l’espace disponible et vérifiez le support avant de choisir. Regardez les dimensions, le poids et le remplissage de la fiche ; un sac lourd et une petite pièce de suspension n’ont pas les mêmes conditions de livraison.',
      links: [link('/guides/sac-de-frappe-suspendu-ou-sur-pied/', 'Suspendu ou sur pied : comparer l’installation'), link('/sacs-de-frappe-sur-pied/', 'Les sacs sur pied'), link('/livraison/', 'Livraison du matériel lourd et devis')],
    },
  },
  {
    match: /bandes|sous-gants/,
    decision: {
      answer: 'Comparez la longueur, la matière et la place sous vos gants. Bandes et sous-gants ne se choisissent pas seulement par couleur : le montage et le maintien recherchés comptent aussi.',
      links: [link('/guides/bandes-de-boxe-ou-sous-gants/', 'Bandes ou sous-gants : faire la différence'), link('/bandes-de-boxe/', 'Choisir des bandes'), link('/sous-gants/', 'Comparer les sous-gants')],
    },
  },
  {
    match: /chaussures/,
    decision: {
      answer: 'Vérifiez l’usage annoncé — boxe ou lutte — avant la pointure. Comparez la semelle, la hauteur et la fermeture, puis utilisez la grille de la marque : deux modèles de même pointure peuvent chausser différemment.',
      links: [link('/guide-des-tailles/', 'Vérifier sa pointure'), link('/equipement-boxe-anglaise/', 'L’équipement de boxe anglaise'), link('/retours/', 'Préparer un échange ou un retour')],
    },
  },
  {
    match: /kimono|ceinture|arts-martiaux|equipement-jjb|grappling/,
    decision: {
      answer: 'Séparez d’abord la pratique en kimono de la pratique sans kimono. Pour un gi, vérifiez la stature, le poids et le tissage annoncés par la marque ; pour la compétition, faites valider le modèle et la couleur par le règlement applicable.',
      links: [link('/kimonos-jjb/', 'Comparer les kimonos de JJB'), link('/equipement-jjb/', 'Préparer son équipement JJB'), link('/guide-des-tailles/', 'Lire les tailles de kimonos et de textile')],
    },
  },
  {
    match: /thai|kick-boxing|boxe-francaise|competition/,
    decision: {
      answer: 'Partez des règles de votre discipline et de votre niveau de contact. Choisissez les protections et la tenue demandées par votre encadrant ; avant une compétition, vérifiez les exigences de l’organisateur plutôt qu’une liste universelle.',
      links: [link('/materiel-sport-de-combat/', 'Comparer le matériel par discipline'), link('/protege-tibias/', 'Les protections tibias et pieds'), link('/textile-boxe/', 'Choisir une tenue d’entraînement')],
    },
  },
  {
    match: /textile|shorts|rashguards|leggings|t-shirts|sweats|debardeurs/,
    decision: {
      answer: 'Choisissez une coupe qui laisse les mouvements de votre discipline, puis comparez les mesures du modèle. Pour le textile, suivez la grille propre à la marque plutôt qu’une équivalence S, M ou L entre fabricants.',
      links: [link('/guide-des-tailles/', 'Mesurer avant de choisir sa taille'), link('/shorts-de-boxe-thai/', 'Les shorts de boxe thaï'), link('/shorts-mma/', 'Les shorts MMA')],
    },
  },
  {
    match: /materiel-mma/,
    decision: {
      answer: 'Préparez le matériel pour la séance réelle : frappe debout, travail au sol ou séance mixte. Vérifiez avec le club les gants et protections attendus, puis complétez avec une tenue adaptée aux saisies.',
      links: [link('/guides/debuter-mma/', 'Préparer un premier cours de MMA'), link('/gants-mma/', 'Comparer les gants MMA'), link('/rashguards/', 'Les rashguards pour le sol')],
    },
  },
  {
    match: /sacs-de-sport/,
    decision: {
      answer: 'Listez ce que vous transportez avant de comparer le volume. Vérifiez les dimensions, les ouvertures et les modes de portage ; séparez le matériel humide selon les compartiments réellement décrits sur la fiche.',
      links: [link('/guides/debuter-boxe/', 'Préparer son sac de séance'), link('/accessoires-boxe/', 'Les accessoires à emporter'), link('/livraison/', 'Voir les frais de livraison')],
    },
  },
  {
    match: /accessoires|equipement-entrainement|pattes-d-ours|cordes/,
    decision: {
      answer: 'Distinguez ce que vous utilisez seul de ce qui demande un partenaire. Pour chaque accessoire, vérifiez les dimensions, la fixation éventuelle et la compatibilité avec le matériel que vous possédez déjà.',
      links: [link('/bandes-de-boxe/', 'Les bandes pour la séance'), link('/pattes-d-ours/', 'Travailler à deux avec des pattes d’ours'), link('/guides/debuter-boxe/', 'La liste d’un premier équipement')],
    },
  },
];
const GENERAL: Decision = {
  answer: 'Choisissez d’abord votre discipline et le type de séance, puis les pièces réellement demandées par le club. Les rayons et guides ci-dessous vous permettent de comparer sans acheter deux fois un équipement déjà fourni sur place.',
  links: [link('/materiel-boxe-debutant/', 'Préparer un premier équipement'), link('/equipement-boxe-anglaise/', 'S’équiper pour la boxe anglaise'), link('/materiel-mma/', 'S’équiper pour le MMA')],
};

export function buyingDecision(scope: string): Decision | null {
  if (!categoryFor(scope) && !subfamilyFor(scope)) return null;
  const decision = DECISIONS.find((rule) => rule.match.test(scope))?.decision || GENERAL;
  const links = decision.links.filter((l) => l.href !== '/' + scope + '/');
  return { answer: decision.answer, links };
}

export function buyingBrief(scope: string, items: Product[]) {
  const decision = buyingDecision(scope);
  if (!decision) return null;
  const counted = items.filter((p) => Number.isFinite(p.price) && p.price > 0 && dansLeRayon(scope, p) && dansLeRayon(p.category, p));
  if (!counted.length) return null;
  const prices = counted.flatMap((p) => [p.price, ...(p.variants || []).map((v) => v.price)]).filter((p) => Number.isFinite(p) && p > 0);
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  const heavy = counted.filter(estLourd).length;
  const sales = shop.ventesOuvertes;
  const priceLabel = sales ? 'Prix TTC, hors livraison' : 'Prix prévus à l’ouverture, hors livraison';
  const priceRange = minimum === maximum ? money(minimum) : `${money(minimum)} à ${money(maximum)}`;
  const fulfillment = heavy === counted.length
    ? sales
      ? 'Ce matériel lourd se commande sur devis : faites confirmer le transport avant de commander.'
      : `Ventes annoncées le ${shop.ouverture.long}. Le transport de ce matériel lourd sera à confirmer sur devis.`
    : `${sales ? 'Expédition sous ' + shop.delais.expedition : 'Ventes annoncées le ' + shop.ouverture.long}. ${livraison.tarifs}, en ${livraison.zone}.${heavy ? ' Les modèles lourds se livrent sur devis.' : ''}`;
  return { ...decision, count: counted.length, minimum, maximum, priceLabel, priceRange, fulfillment, heavy };
}
