/**
 * Le poids de gants de boxe conseillé, d’après le guide publié « Quelle taille de gants de boxe
 * choisir ? » — et rien d’autre. La même règle sert la page-outil, l’outil MCP et les pages par poids.
 *
 *   Sac et pattes d’ours : 10 oz. Technique et cours collectif : 12 oz. Partenaire : 14 oz pour les
 *   gabarits légers, 16 oz pour la plupart des adultes, 18 oz pour les lourds.
 *   Moins de 55 kg : 10 à 12 oz. De 55 à 75 kg : 12 à 14 oz. Plus de 75 kg : 14 à 16 oz.
 *   Enfants : 4 oz de 5 à 7 ans, 6 oz de 7 à 10 ans, 8 oz de 10 à 13 ans. 10 oz pour les adolescents.
 */
export type GloveUsage = 'sac' | 'technique' | 'partenaire';
export const USAGES: { key: GloveUsage; label: string; detail: string }[] = [
  { key: 'sac', label: 'Le sac et les pattes d’ours', detail: 'Je frappe dans du matériel, jamais un partenaire.' },
  { key: 'technique', label: 'La technique et le cours collectif', detail: 'Des rounds techniques, des touches légères, le cours de la salle.' },
  { key: 'partenaire', label: 'Le sparring avec un partenaire', detail: 'Je touche quelqu’un, il me touche : le gant protège aussi l’autre.' },
];

export type GloveAdvice = {
  ounces: number;
  /** une fourchette quand le guide en donne une */
  range: [number, number];
  who: string;
  why: string;
  caution: string;
};

export function recommendGloveWeight(o: { usage: GloveUsage; kg?: number | null; age?: number | null }): GloveAdvice {
  const kg = typeof o.kg === 'number' && o.kg >= 15 && o.kg <= 200 ? o.kg : null;
  const age = typeof o.age === 'number' && o.age >= 4 && o.age <= 99 ? o.age : null;
  const caution = 'Votre salle peut imposer un poids pour le sparring : demandez avant d’acheter. Les onces sont un poids de rembourrage, pas une taille de main : essayez avec vos bandes.';
  if (age !== null && age < 13) {
    const ounces = age < 7 ? 4 : age < 10 ? 6 : 8;
    return { ounces, range: [ounces, ounces], who: age < 7 ? 'un enfant de 5 à 7 ans' : age < 10 ? 'un enfant de 7 à 10 ans' : 'un enfant de 10 à 13 ans', why: 'Repère enfant du guide : 4 oz de 5 à 7 ans, 6 oz de 7 à 10 ans, 8 oz de 10 à 13 ans. Un gant d’enfant se choisit à l’âge et à la main, jamais « pour grandir dedans ».', caution: 'Le club peut demander un poids précis pour les cours enfants : demandez à l’entraîneur.' };
  }
  if (age !== null && age < 16 && o.usage !== 'partenaire') {
    return { ounces: 10, range: [8, 10], who: 'un adolescent', why: 'Repère du guide : 10 oz pour les adolescents, selon la corpulence ; 8 oz pour les plus légers.', caution };
  }
  if (o.usage === 'sac') {
    const light = kg !== null && kg < 55;
    return { ounces: 10, range: light ? [10, 10] : [10, 12], who: light ? 'un adulte de moins de 55 kg, au sac' : 'un adulte, au sac', why: 'Sac et pattes d’ours : 10 oz. Plus léger, plus rapide, moins de rembourrage : c’est le poids du travail au sac.', caution };
  }
  if (o.usage === 'technique') {
    const heavy = kg !== null && kg > 75;
    return { ounces: heavy ? 14 : 12, range: heavy ? [12, 14] : kg !== null && kg < 55 ? [10, 12] : [12, 14], who: heavy ? 'un adulte de plus de 75 kg, en technique' : 'un adulte, en technique et cours collectif', why: heavy ? 'Technique et cours collectif : 12 oz ; au-dessus de 75 kg, le guide monte à 14 oz.' : 'Technique et cours collectif : 12 oz, le poids « à tout faire » du cours de boxe.', caution };
  }
  const ounces = kg !== null && kg < 55 ? 14 : kg !== null && kg > 90 ? 18 : 16;
  return {
    ounces,
    range: ounces === 18 ? [16, 18] : ounces === 14 ? [14, 16] : [16, 16],
    who: ounces === 14 ? 'un gabarit léger, avec un partenaire' : ounces === 18 ? 'un adulte de plus de 90 kg, avec un partenaire' : 'la plupart des adultes, avec un partenaire',
    why: 'Avec un partenaire : 14 oz pour les gabarits légers, 16 oz pour la plupart des adultes, 18 oz pour les lourds. Le gant lourd protège le partenaire autant que vos mains.',
    caution,
  };
}

export const parseUsage = (v: unknown): GloveUsage | null => (v === 'sac' || v === 'technique' || v === 'partenaire' ? v : null);
export const parseNumber = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};
