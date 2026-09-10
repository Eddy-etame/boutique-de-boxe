// Raisons de chaque modèle dans « Votre liste », nouvelle édition.
// Faits tirés des fiches ; aucune supposition de club ou de cours.
export type SessionItemCopy = { label: string; reason: string };
export const sessionsCopy: {
  disciplines: { boxe: string; mma: string };
  empty: string;
  items: Record<string, Record<string, SessionItemCopy>>;
} = {
  disciplines: { boxe: 'Boxe anglaise', mma: 'MMA' },
  empty: 'Pour un enfant en MMA, nous n’avons pas encore de modèle vérifié. Lisez le guide, puis écrivez-nous.',
  items: {
    'boxe:premiere': {
      'mat-blade-gold': { label: 'Les gants', reason: 'Trois poids au choix : 10, 12 ou 14 oz. Essayez-les avec vos bandes avant de choisir le poids.' },
      'mat-bandes-4m': { label: 'Les bandes', reason: 'Quatre mètres, avec un passant pour le pouce. Elles protègent vos mains sous les gants.' },
      'mat-debardeur-training': { label: 'Le haut', reason: 'Une coupe ample pour le sac et la corde. Vos bras restent libres.' },
    },
    'boxe:technique': {
      'bench-champboxing-pattes-noir-mat': { label: 'Les pattes d’ours', reason: 'Elles se tiennent en main pendant que l’autre frappe. Mousse dense et coussin au poignet.' },
      'mat-ergo90-14': { label: 'Des gants de 14 oz', reason: 'Un seul poids, 14 oz, pour comparer avec le Blade. La forme et la fermeture changent.' },
    },
    'boxe:enfant': {
      'mat-one-enfant': { label: 'Les gants enfant', reason: 'Deux tranches d’âge : 4 à 7 ans, 8 à 15 ans. Faites-les essayer à l’enfant.' },
      'mat-dents-enfant': { label: 'Le protège-dents', reason: 'Un modèle enfant, à mouler dans l’eau chaude. Gardez la notice pour le moulage.' },
      'mat-ensemble-enfants': { label: 'Le short et le haut', reason: 'Une tenue de boxe pour enfant, en trois tailles.' },
    },
    'mma:premiere': {
      'mat-shell-mma': { label: 'Les gants MMA', reason: 'Des gants de sparring MMA, du S au XL. Le pouce est protégé, la fermeture est à bande.' },
      'mat-dents-adulte': { label: 'Le protège-dents', reason: 'À mouler dans l’eau chaude, livré avec un boîtier. Suivez sa notice.' },
    },
    'mma:technique': {
      'mat-shell-mma': { label: 'Les gants MMA', reason: 'Regardez la paume, le pouce et la sangle. Ils servent debout comme au sol.' },
      'mat-tibias-coton': { label: 'Les protège-tibias', reason: 'Coton élastique et mousse EVA, du S au XL. Ils couvrent le tibia et le pied.' },
    },
    'mma:enfant': {},
  },
};
