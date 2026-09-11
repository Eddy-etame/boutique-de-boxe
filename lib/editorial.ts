import seed from './data/guides.json';
export const guides = seed;
export type Guide = (typeof seed)[number];
export type Service = {
  title: string;
  description: string;
  eyebrow: string;
  sections: { title: string; paragraphs: string[] }[];
};
export const services: Record<string, Service> = {
  livraison: {
    title: 'Livraison en France',
    description:
      'Les conditions de livraison envisagées : point relais, domicile, seuil de gratuité et matériel lourd. Vente et expédition à venir.',
    eyebrow: 'LES CONDITIONS / LIVRAISON',
    sections: [
      {
        title: 'Votre matériel, jusqu’à votre porte.',
        paragraphs: [
          'Le catalogue est en préparation. Le panier permet de simuler une commande sans débit ni expédition. Les tarifs ci-dessous sont des repères envisagés pour l’ouverture, à confirmer avant tout achat.',
        ],
      },
      {
        title: 'France métropolitaine',
        paragraphs: [
          'Point relais : 6,90 €. Livraison à domicile : 8,90 €. La livraison en point relais est envisagée sans frais à partir de 69 € d’achats, hors matériel lourd et conditions particulières.',
        ],
      },
      {
        title: 'Sacs de frappe et matériel lourd',
        paragraphs: [
          'Un sac de frappe ou un colis volumineux peut nécessiter un transport spécifique. Le supplément et les modalités devront être indiqués avant la validation d’une future commande.',
        ],
      },
      {
        title: 'Autres destinations et délais',
        paragraphs: [
          'Les conditions pour la Corse, l’outre-mer et l’international restent à préciser. Aucune date d’expédition ni durée d’acheminement n’est annoncée pendant cette phase de préparation.',
        ],
      },
    ],
  },
  retours: {
    title: 'Retours et échanges',
    description:
      'Informations sur les retours et échanges de la future boutique : phase catalogue, contact et conditions à consulter avant ouverture des ventes.',
    eyebrow: 'LES CONDITIONS / RETOURS',
    sections: [
      {
        title: 'Les ventes ne sont pas encore ouvertes.',
        paragraphs: [
          'Le site propose un catalogue et des commandes d’essai. Les simulations sont enregistrées, sans paiement réel, réservation de stock ni expédition. Leur reçu est un récapitulatif de test ; il ne constitue pas une facture ou une preuve d’achat. Aucun retour de produit ne découle de ce parcours.',
        ],
      },
      {
        title: 'Avant votre futur achat',
        paragraphs: [
          'Les modalités de rétractation, les frais de retour, les échanges et les garanties seront précisés dans les conditions de vente avant l’activation des commandes. Consultez ces conditions au moment de l’achat.',
        ],
      },
      {
        title: 'Une question sur un équipement ?',
        paragraphs: [
          'Écrivez à boxingcenter31@gmail.com en indiquant le modèle concerné et votre question. Pour un achat fait ailleurs, précisez le site d’achat et sa référence.',
        ],
      },
    ],
  },
  'mentions-legales': {
    title: 'Mentions légales',
    description:
      'Éditeur Boutique de Boxe : SAS BOXING CENTER, coordonnées, immatriculation et informations relatives au site.',
    eyebrow: 'LE SITE / ÉDITEUR',
    sections: [
      {
        title: 'Éditeur',
        paragraphs: [
          'SAS BOXING CENTER, au capital social de 1 500 €. Siège social : 12 rue de Fenouillet, 31200 Toulouse, France. SIREN : 821 817 889. SIRET : 821 817 889 00016. RCS Toulouse B 821 817 889.',
        ],
      },
      {
        title: 'Publication et contact',
        paragraphs: [
          'Directeur de la publication : Sébastien DUTILH. Courriel : boxingcenter31@gmail.com. Téléphone : 09 54 14 74 72. Boutique de Boxe est une boutique en ligne nationale de matériel de sports de combat, éditée par la SAS BOXING CENTER. Elle est distincte des salles de sport de l’éditeur.',
        ],
      },
      {
        title: 'Hébergement',
        paragraphs: [
          'Le site est hébergé par Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis. Les données du catalogue et des demandes sont stockées chez Supabase Inc., dans la région Europe de l’Ouest (Londres).',
        ],
      },
      {
        title: 'Contenus et photographies',
        paragraphs: [
          'Les marques et noms de produits appartiennent à leurs titulaires respectifs. Les photographies représentent les modèles présentés ; les précisions de taille figurent sur leurs fiches. Pour signaler une erreur ou exercer un droit sur un contenu, contactez l’éditeur en précisant la page concernée.',
        ],
      },
      {
        title: 'Catalogue en préparation',
        paragraphs: [
          'Les références et prix prévus à l’ouverture sont présentés pour préparer l’ouverture des ventes. Leur publication ne constitue pas une offre permettant de passer commande.',
        ],
      },
    ],
  },
  'conditions-generales-de-vente': {
    title: 'Conditions de la boutique',
    description:
      'Le fonctionnement actuel du catalogue Boutique de Boxe : prix prévus à l’ouverture, alertes et préparation des futures conditions de vente.',
    eyebrow: 'LES CONDITIONS / PHASE CATALOGUE',
    sections: [
      {
        title: 'Un catalogue avant l’ouverture.',
        paragraphs: [
          'Le site permet de consulter des produits, de lire des guides, de contacter l’éditeur et de demander une alerte de disponibilité. Un panier et un paiement simulé permettent d’essayer le parcours jusqu’au reçu. Aucun moyen de paiement réel n’est demandé, aucun produit n’est réservé et aucune expédition n’est déclenchée. Une alerte ne constitue ni une commande, ni une précommande, ni une réservation.',
        ],
      },
      {
        title: 'Prix et disponibilité',
        paragraphs: [
          'Les prix affichés sont indicatifs. Les prix définitifs, taxes applicables, frais éventuels et disponibilités seront présentés avant toute future commande. Aucune remise, date de lancement ou quantité disponible n’est garantie pendant la préparation.',
        ],
      },
      {
        title: 'Conditions de vente à l’ouverture',
        paragraphs: [
          'Les conditions contractuelles complètes seront publiées avant l’activation des ventes : commande, paiement, livraison, rétractation, garanties et médiation de la consommation. Elles devront être consultables et acceptables au moment de l’achat.',
        ],
      },
      {
        title: 'Demandes et alertes',
        paragraphs: [
          'Les demandes sont enregistrées pour être traitées par l’éditeur, la SAS BOXING CENTER. L’inscription à une alerte est facultative et limitée à l’objet demandé. Les informations sur les données personnelles figurent dans la politique de confidentialité.',
        ],
      },
    ],
  },
  confidentialite: {
    title: 'Vos données personnelles',
    description:
      'Cookies de mesure, données de contact et d’alerte de disponibilité : ce que Boutique de Boxe enregistre, combien de temps, et vos droits.',
    eyebrow: 'LE SITE / CONFIDENTIALITÉ',
    sections: [
      {
        title: 'Cookies et mesure d’audience',
        paragraphs: [
          'À votre première visite, une carte vous demande si vous acceptez un cookie de mesure. Si vous acceptez, la boutique enregistre elle-même, sans outil tiers, les pages que vous regardez, le temps passé, les modèles ajoutés au panier, les recherches et les formulaires envoyés. Ces données servent à mieux présenter le matériel. Aucune adresse IP n’est conservée.',
          'L’hébergeur du site, Vercel, compte par ailleurs les pages vues sans cookie ni identifiant conservé : ce comptage ne permet pas de vous reconnaître d’une visite à l’autre et ne dépend pas de votre choix.',
          'Le cookie d’identifiant dure treize mois, le cookie de choix un an. Si vous refusez, aucun cookie de mesure n’est posé et rien n’est enregistré. Vous changez d’avis à tout moment par le lien « Cookies » en bas de page. Le panier et la connexion à l’atelier utilisent des cookies strictement nécessaires, sans mesure.',
        ],
      },
      {
        title: 'Qui traite vos données ?',
        paragraphs: [
          'SAS BOXING CENTER, 12 rue de Fenouillet, 31200 Toulouse, est responsable des traitements du site. Pour toute demande concernant vos données : boxingcenter31@gmail.com, à l’attention de Sébastien DUTILH.',
        ],
      },
      {
        title: 'Contacts et alertes',
        paragraphs: [
          'Le formulaire de contact collecte votre nom, votre e-mail et votre message afin de répondre à votre demande, sur la base de l’intérêt légitime de l’éditeur à traiter les sollicitations reçues. L’alerte collecte votre e-mail, le produit et éventuellement la taille demandée, sur la base de votre consentement. Ces données ne sont pas vendues.',
        ],
      },
      {
        title: 'Destinataires et conservation',
        paragraphs: [
          'L’équipe autorisée de Boxing Center peut consulter les demandes. L’hébergement et le stockage reposent sur OpenAI Sites et Cloudflare. Des traitements peuvent avoir lieu hors de l’Union européenne dans le cadre des garanties contractuelles des prestataires. Les demandes sont conservées pendant leur traitement, puis revues et supprimées lorsqu’elles ne sont plus nécessaires. Les inscriptions aux alertes sont supprimées en cas de retrait du consentement.',
        ],
      },
      {
        title: 'Panier et commandes d’essai',
        paragraphs: [
          'Le panier utilise un cookie technique de 30 jours. Il contient un identifiant aléatoire ; les produits et quantités sont conservés côté serveur. La préparation de séance mémorise uniquement vos choix dans l’onglet en cours.',
          'Lors d’une simulation, vos nom et e-mail, les lignes du panier, le montant et le résultat du test sont enregistrés pour produire le reçu et diagnostiquer le parcours. Aucun numéro de carte n’est collecté. Vous pouvez demander la suppression de ces données à Boxing Center.',
          'Le formulaire peut transmettre votre demande à Inlett après son enregistrement dans la boutique. L’envoi du reçu par e-mail utilise un service transactionnel seulement après configuration ; son état apparaît sur le reçu. Une demande enregistrée ou acceptée par un prestataire ne garantit pas la livraison de l’e-mail.',
        ],
      },
      {
        title: 'Sécurité et mesure d’audience',
        paragraphs: [
          'Le service limite les demandes répétées au moyen d’une empreinte technique temporaire de l’adresse réseau. La navigation et les formulaires restent utilisables sans outil publicitaire. Aucun service Google Analytics n’est activé dans cette version.',
        ],
      },
      {
        title: 'Exercer vos droits',
        paragraphs: [
          'Vous pouvez demander l’accès, la rectification ou la suppression de vos données, ainsi que le retrait de votre consentement aux alertes, en écrivant à boxingcenter31@gmail.com. Selon la situation, vous disposez aussi de droits à la limitation, à l’opposition et à la portabilité. Chaque message d’alerte devra comporter un lien de désinscription. Vous pouvez adresser une réclamation à la CNIL : cnil.fr.',
        ],
      },
    ],
  },
  'guide-des-tailles': {
    title: 'Tailles, poids et ajustement',
    description:
      'Comprendre les onces des gants de boxe et vérifier l’ajustement des gants MMA, textiles, chaussures et équipements enfant.',
    eyebrow: 'LES REPÈRES / AJUSTEMENT',
    sections: [
      {
        title: 'Les onces ne sont pas une taille de main.',
        paragraphs: [
          'Le nombre en oz indique le poids du gant. Il ne décrit pas à lui seul sa coupe intérieure. Deux modèles de même poids peuvent laisser une place différente aux doigts et au pouce. Vérifiez le poids demandé par votre club, puis essayez la paire avec les bandes que vous porterez.',
        ],
      },
      {
        title: 'Gants MMA et protections',
        paragraphs: [
          'Les tailles S, M ou L dépendent du modèle. Mesurez la main selon la méthode du fabricant lorsqu’elle est fournie et comparez avec son propre tableau. Une équivalence universelle risquerait de vous orienter vers une coupe inadaptée.',
        ],
      },
      {
        title: 'Textile et chaussures',
        paragraphs: [
          'Référez-vous au guide de la marque pour le modèle retenu. Prenez les mesures demandées et tenez compte de la coupe. Pour les chaussures, vérifiez aussi la largeur et l’aisance avec vos chaussettes habituelles.',
        ],
      },
      {
        title: 'Pour les enfants',
        paragraphs: [
          'Les tranches d’âge sont des repères commerciaux. La morphologie, le confort et les consignes de l’encadrant doivent guider le choix. Ne prenez pas une protection trop grande dans l’espoir de la faire durer davantage.',
        ],
      },
    ],
  },
  'offres-de-lancement': {
    title: 'L’ouverture se prépare',
    description:
      'Suivez l’ouverture de Boutique de Boxe et les informations de lancement, sans précommande ni engagement.',
    eyebrow: 'LE LANCEMENT / RESTER AU COURANT',
    sections: [
      {
        title: 'Le catalogue prend sa place.',
        paragraphs: [
          'Les modèles sont présentés avec leurs caractéristiques, leurs photos et leurs prix prévus à l’ouverture. Vous pouvez déjà comparer les équipements et préparer vos questions.',
        ],
      },
      {
        title: 'L’alerte ne vous engage à rien.',
        paragraphs: [
          'Inscrivez-vous pour recevoir les informations d’ouverture. Aucune date ni remise n’est annoncée pour le moment. Votre inscription ne réserve aucun produit et ne déclenche aucun paiement.',
        ],
      },
    ],
  },
};
