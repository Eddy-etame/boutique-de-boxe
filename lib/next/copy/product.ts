// Textes de la fiche produit. Aucun composant n’écrit ces phrases en dur.
// Règles appliquées : « vous », moins de quinze mots par phrase, mots de tous
// les jours, apostrophes typographiques, espaces insécables avant : ; ! ? et €.

import type { ProductCopy } from './types';

export const productCopy: ProductCopy = {
  sizes: 'Tailles',
  colours: 'Couleurs',
  chooseSize: 'Choisissez une taille pour ajouter ce modèle au sac.',
  addToBag: 'Ajouter au sac',
  added: 'Ajouté à votre sac.',
  notify: {
    label: 'Prévenez-moi à l’ouverture',
    hint: 'Vous recevez un e-mail le jour de l’ouverture des ventes.',
  },
  problemPrefix: 'Le problème que ce modèle règle :',
  specs: 'Caractéristiques',
  care: 'Entretien',
  careUnknown: 'Le fabricant ne donne aucune consigne d’entretien pour ce modèle.',
  compare: 'Comparer avec des modèles proches',
  verifyBox: 'J’ai vérifié ce modèle avec mon entraîneur.',
  photosMissing: 'Nous n’avons pas encore de photo de ce modèle.',
  delivery: 'Les délais et les frais de livraison seront confirmés à l’ouverture des ventes.',
  breadcrumbHome: 'Accueil',
};
