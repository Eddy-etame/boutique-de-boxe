/**
 * Heuristique interne pour comparer le catalogue par poids. Les valeurs numériques historiques
 * restent stables pour les consommateurs (page/MCP), sans devenir un taillage fabricant ni une
 * validation pour le sparring ou la compétition. L'âge et le poids seuls ne suffisent pas à choisir.
 */
export const GLOVE_WEIGHT_REVISION = '2026-10-24';
export type GloveUsage = 'sac' | 'technique' | 'partenaire';
export const USAGES: { key: GloveUsage; label: string; detail: string }[] = [
  { key: 'sac', label: 'Le sac et les pattes d’ours', detail: 'Je frappe dans du matériel, jamais un partenaire.' },
  { key: 'technique', label: 'La technique et le cours collectif', detail: 'Des rounds techniques, des touches légères, le cours de la salle.' },
  { key: 'partenaire', label: 'Le sparring avec un partenaire', detail: 'Une séance avec contacts, selon les consignes de la salle.' },
];

export type GloveAdvice = {
  ounces: number;
  /** Fourchette indicative de l'heuristique, sans garantie d'usage pour chaque modèle. */
  range: [number, number];
  who: string;
  why: string;
  caution: string;
  kind: 'indicative-comparison';
};

export function recommendGloveWeight(o: { usage: GloveUsage; kg?: number | null; age?: number | null }): GloveAdvice {
  const kg = typeof o.kg === 'number' && o.kg >= 15 && o.kg <= 200 ? o.kg : null;
  const age = typeof o.age === 'number' && o.age >= 4 && o.age <= 99 ? o.age : null;
  const kind = 'indicative-comparison' as const;
  const caution = 'Repère de comparaison de l’outil, pas un tableau de tailles fabricant ni une autorisation de sparring ou de compétition. Les onces indiquent le poids nominal du gant complet, pas seulement son rembourrage. Vérifiez le modèle, sa coupe et les consignes du club.'
    + (age !== null && age < 18 ? ' Pour un mineur, faites valider le choix par son encadrant avant de commander.' : age === null ? ' Sans âge indiqué, la comparaison utilise un profil adulte ; pour un enfant, demandez conseil à son encadrant.' : '');
  const profile = age !== null && age < 18 ? 'un adolescent' : age === null ? 'un profil adulte supposé' : 'un adulte';
  if (age !== null && age < 13) {
    const ounces = age < 7 ? 4 : age < 10 ? 6 : 8;
    return { ounces, range: [ounces, ounces], who: age < 7 ? 'un enfant de moins de 7 ans' : age < 10 ? 'un enfant de 7 à 9 ans' : 'un enfant de 10 à 12 ans', why: 'L’outil classe les moins de 7 ans en 4 oz, les 7 à 9 ans en 6 oz et les 10 à 12 ans en 8 oz pour explorer le catalogue. Ce sont ses repères internes : l’âge seul ne permet pas de choisir un gant adapté.', caution, kind };
  }
  if (age !== null && age < 16 && o.usage !== 'partenaire') {
    return { ounces: 10, range: [8, 10], who: 'un adolescent', why: 'L’outil utilise 10 oz comme point de comparaison pour les 13 à 15 ans hors sparring. Ce repère ne remplace pas le choix du modèle et du poids demandé par l’encadrant.', caution, kind };
  }
  if (o.usage === 'sac') {
    const light = kg !== null && kg < 55;
    return { ounces: 10, range: light ? [10, 10] : [10, 12], who: profile + (light ? ' de moins de 55 kg, au sac' : ', au sac'), why: 'Pour explorer le catalogue au sac et aux pattes d’ours, l’outil part de 10 oz ; sa fourchette va de 10 à 12 oz sauf si un poids inférieur à 55 kg est indiqué. Ce choix interne ne signifie pas que toutes les paires de 10 oz sont destinées au sac.', caution, kind };
  }
  if (o.usage === 'technique') {
    const heavy = kg !== null && kg > 75;
    return { ounces: heavy ? 14 : 12, range: heavy ? [12, 14] : kg !== null && kg < 55 ? [10, 12] : [12, 14], who: profile + (heavy ? ' de plus de 75 kg, en technique' : ', en technique et cours collectif'), why: 'Pour la technique, l’outil prend 12 oz comme point de comparaison et passe à 14 oz au-dessus de 75 kg. Le seuil de 75 kg est une hypothèse de cet outil, pas une règle commune aux marques ou aux cours.', caution, kind };
  }
  const ounces = kg !== null && kg < 55 ? 14 : kg !== null && kg > 90 ? 18 : 16;
  return {
    ounces,
    range: ounces === 18 ? [16, 18] : ounces === 14 ? [14, 16] : [16, 16],
    who: profile + (ounces === 14 ? ' de moins de 55 kg, avec un partenaire' : ounces === 18 ? ' de plus de 90 kg, avec un partenaire' : ', avec un partenaire'),
    why: 'Pour comparer les paires, l’outil affiche 14 oz sous 55 kg, 16 oz entre 55 et 90 kg, puis 18 oz au-delà. Ces seuils sont ses hypothèses internes : un nombre d’onces ne prouve ni l’usage sparring du modèle ni son acceptation dans votre salle.',
    caution,
    kind,
  };
}

export const GLOVE_WEIGHT_FAQ = [
  { question: 'Quel poids de gants de boxe pour débuter ?', answer: 'Commencez par la séance prévue et le poids demandé par votre encadrant. Cet outil fournit un repère pour comparer le catalogue ; vérifiez ensuite la destination du modèle, sa coupe et le guide du fabricant.' },
  { question: '10 oz ou 12 oz ?', answer: 'Ce sont deux poids nominaux différents. Le nombre d’onces ne suffit pas à établir si une paire convient au sac, au travail technique ou à votre main. Comparez l’usage annoncé du modèle et les consignes de votre salle.' },
  { question: '14 oz ou 16 oz pour le sparring ?', answer: 'Vérifiez d’abord le poids exigé par la salle et un modèle explicitement prévu pour le travail avec partenaire. L’outil ne valide pas une paire pour le sparring à partir de son poids seul.' },
  { question: 'Quel poids de gants pour un enfant ?', answer: 'L’âge seul ne permet pas de choisir. Faites valider le poids et le modèle par l’encadrant, puis contrôlez le maintien et le confort avec le guide du fabricant. Les catégories d’âge de cet outil servent uniquement à explorer le catalogue.' },
  { question: 'Les onces sont-elles une taille de main ?', answer: 'Non. Oz est une unité de masse : l’indication correspond au poids nominal d’un gant complet, pas uniquement à sa mousse. Deux paires de même poids peuvent avoir des coupes différentes ; consultez les indications du modèle et essayez avec vos bandes.' },
];

export const parseUsage = (v: unknown): GloveUsage | null => (v === 'sac' || v === 'technique' || v === 'partenaire' ? v : null);
export const parseNumber = (v: unknown): number | null => {
  if (typeof v === 'string' && !v.trim()) return null;
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};
