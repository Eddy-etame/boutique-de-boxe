import type { EditorialCopy } from './types';

// Textes des guides et des pages de service. Les faits viennent de
// lib/data/guides.json et de lib/editorial.ts ; rien n’est ajouté ici.
export const editorialCopy: EditorialCopy = {
  guides: {
    title: 'Les guides d’achat',
    sentence:
      'Neuf guides pour choisir votre matériel selon vos séances et votre taille.',
    readTime: (minutes: number) => `${minutes} min de lecture`,
    summaryTitle: 'En résumé',
  },
  guideIntros: {
    'choisir-gants-boxe': {
      summary:
        'Choisissez vos gants pour les séances que vous faites vraiment. Essayez-les avec vos bandes, puis demandez à votre entraîneur quel poids il accepte.',
      forWhom: 'À lire avant d’acheter une paire de gants de boxe.',
    },
    'taille-poids-gants-boxe': {
      summary:
        'Les onces indiquent le poids du gant, pas la taille de votre main. Demandez le poids attendu pour votre séance, puis essayez le modèle exact.',
      forWhom: 'À lire si vous hésitez entre 12, 14 et 16 oz.',
    },
    'choisir-gants-mma': {
      summary:
        'Un gant MMA ne se choisit pas comme un gant de boxe. Regardez l’usage annoncé, la paume, le pouce et le guide de tailles.',
      forWhom: 'À lire avant d’acheter des gants MMA pour l’entraînement.',
    },
    'debuter-boxe': {
      summary:
        'Si vous êtes en club, demandez d’abord ce qu’il prête. Achetez ensuite ce qui sert à chaque séance, souvent les gants et les bandes.',
      forWhom: 'À lire avant votre premier cours de boxe anglaise.',
    },
    'debuter-mma': {
      summary:
        'Un cours de MMA change de contenu selon les séances. Demandez la liste du matériel pour chaque cours, puis achetez petit à petit.',
      forWhom: 'À lire avant vos premiers cours de MMA.',
    },
    'choisir-protections': {
      summary:
        'Partez de la liste de votre entraîneur, pas d’un lot tout prêt. Vérifiez la taille, les réglages, et que rien ne bouge quand vous bougez.',
      forWhom:
        'À lire si votre cours demande un casque, un protège-dents ou des protège-tibias.',
    },
    'difference-gants-boxe-mma': {
      summary:
        'Le gant de boxe enferme les doigts, le gant MMA les laisse libres. Votre choix dépend des exercices du cours, pas du nom de la discipline.',
      forWhom:
        'À lire si vous pratiquez les deux et hésitez sur la paire à prendre.',
    },
    'equipement-enfant': {
      summary:
        'Demandez à l’encadrant la liste du cours et ce qui peut être prêté. Faites essayer les gants à l’enfant ; le matériel doit lui convenir aujourd’hui.',
      forWhom: 'À lire si vous équipez un enfant pour ses premiers cours.',
    },
    'equipement-femme': {
      summary:
        'Ne prenez pas des gants plus légers par principe ; le poids dépend du cours. Vérifiez ensuite la coupe du gant, la brassière et le textile en bougeant.',
      forWhom: 'À lire si vos gants ou votre tenue ne vous vont pas.',
    },
  },
  services: {
    livraison: {
      title: 'Livraison et frais de port',
      intro:
        'Le point relais est prévu à 6,90 €, le domicile à 8,90 €. Dès 69 € d’achats, il devrait être sans frais, hors matériel lourd. Rien n’est encore expédié : ces tarifs restent à confirmer.',
    },
    retours: {
      title: 'Retours et échanges',
      intro:
        'Les ventes ne sont pas encore ouvertes. Vous pouvez essayer la commande, sans payer ni rien recevoir. Les règles de retour seront publiées avant le premier achat.',
    },
    'mentions-legales': {
      title: 'Mentions légales',
      intro:
        'Ce site est édité par la SAS BOXING CENTER. Le directeur de la publication est Sébastien DUTILH. Pour signaler une erreur, écrivez à boxingcenter31@gmail.com.',
    },
    'conditions-generales-de-vente': {
      title: 'Conditions de la boutique',
      intro:
        'Vous pouvez voir les modèles, lire les guides et essayer la commande. Rien n’est payé, réservé ni expédié pour le moment. Les conditions de vente complètes seront publiées avant l’ouverture.',
    },
    confidentialite: {
      title: 'Vos données personnelles',
      intro:
        'Votre nom et votre e-mail servent à répondre à votre demande. Une alerte utilise votre e-mail et le modèle demandé. Vos données ne sont pas vendues ; vous pouvez les faire supprimer.',
    },
    'guide-des-tailles': {
      title: 'Tailles, poids et ajustement',
      intro:
        'Les onces disent le poids du gant, pas la taille de votre main. Demandez le poids attendu à votre entraîneur, puis essayez avec vos bandes. Pour le textile et les chaussures, suivez le guide de la marque.',
    },
    'offres-de-lancement': {
      title: 'Être prévenu à l’ouverture',
      intro:
        'Les modèles sont déjà visibles, avec leurs prix prévus à l’ouverture. Laissez votre e-mail pour connaître la date. Cela ne réserve aucun modèle et ne déclenche aucun paiement.',
    },
  },
};
