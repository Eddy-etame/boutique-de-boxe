// Textes de la page d’accueil de la nouvelle édition.
// Espace insecable (U+00A0) avant les deux-points, le point-virgule, le point d exclamation, le point d interrogation et l euro.
import type { HomeCopy } from './types';

export const homeCopy: HomeCopy = {
  heroA: {
    kicker: 'Gants de boxe · Metal Boxe',
    title: 'Regardez le gant Blade de près',
    sentence: 'Voici trois points à regarder avant de choisir une paire.',
    marks: { closure: 'La fermeture', palm: 'La paume', weight: 'Le poids' },
    notes: {
      closure: 'La fermeture est une bande auto-agrippante large.',
      palm: 'La paume est rembourrée de mousse EVA. La photo de près montre la version blanc et or.',
      weight: 'Vous choisissez le poids : 10, 12 ou 14 oz.',
    },
    noMacro: 'Nous n’avons pas encore de photo de ce détail.',
    primary: {
      label: 'Voir la fiche de ce gant',
      hint: 'Photos, poids et prix prévu à l’ouverture.',
    },
    secondary: {
      label: 'Voir tous les gants de boxe',
      hint: 'Vous comparez les poids et les prix.',
    },
  },
  heroB: {
    kicker: 'Votre liste',
    title: 'Ce qu’il vous faut pour une séance',
    sentence: 'Dites-nous où vous en êtes. Nous posons devant vous le matériel à regarder, et pourquoi.',
    choices: {
      start: 'Je commence la boxe',
      train: 'Je m’entraîne déjà',
      child: 'C’est pour mon enfant',
    },
    reasonPrefix: 'Pourquoi ce modèle : ',
    totalLabel: 'Total prévu à l’ouverture',
    lentByGym:
      'Si vous êtes en club, on vous prête parfois du matériel. Cochez ce que vous avez déjà, le total suit.',
    primary: {
      label: 'Lire le guide de cette séance',
      hint: 'Le guide explique chaque choix de la liste.',
    },
  },
  families: {
    title: 'Tout le matériel, par type',
    countSuffix: 'modèles',
    open: 'Voir les modèles',
  },
  notebook: {
    title: 'Les guides d’achat',
    sentence: 'Chaque guide répond à une question avant l’achat.',
    action: {
      label: 'Lire les guides d’achat',
      hint: 'Tailles, poids et entretien.',
    },
  },
  sales: {
    title: 'La vente n’est pas ouverte',
    sentence:
      'Vous pouvez essayer la commande, sans payer. Laissez votre e-mail, nous vous écrivons le jour de l’ouverture.',
    alert: {
      label: 'Prévenez-moi à l’ouverture',
      hint: 'Un e-mail, seulement à l’ouverture des ventes.',
    },
    consent: 'J’accepte de recevoir un e-mail à l’ouverture des ventes.',
  },
};
