/**
 * Registre des requêtes et textes de fond des pages de catalogue.
 *
 * Une page, une requête de tête. Chaque requête du cahier des charges a sa
 * page canonique, et chaque requête « prioritaire » doit exister dans le texte
 * visible de cette page : le titre, le H1, le surtitre ou le corps. Le script
 * scripts/audit-seo.mjs le vérifie à chaque contrôle. Les « secondaires »
 * nourrissent les sous-titres et les réponses ; rien n’est caché.
 *
 * Voix : phrases courtes, faits, « vous ». Aucun stock, aucune remise, aucune
 * date : la vente n’est pas ouverte.
 */

export type SeoSection = { h2: string; paragraphs: string[] };
export type SeoFaq = { question: string; answer: string };
export type SeoCopy = {
  /** requête exacte en tête de titre ; ≤ 60 caractères avec le suffixe */
  title: string;
  description: string;
  /** surtitre au-dessus du H1 : porte la requête courte exacte, en capitales */
  eyebrow: string;
  prioritaires: string[];
  secondaires: string[];
  sections: SeoSection[];
  faq: SeoFaq[];
};

const ALL = 'gants, bandes, protections, textile, sacs de frappe, chaussures, matériel d’entraînement et sacs de sport';

export const SEO_COPY: Record<string, SeoCopy> = {
  'boutique-boxe': {
    title: 'Boutique boxe : vente matériel boxe, matos boxe, MMA',
    description: 'Boutique boxe en ligne, vente matériel boxe et matos boxe : plus de 1 000 modèles de gants, bandes, protections, sacs de frappe et textile, avec leurs tailles et leurs prix prévus. Livraison dans toute la France.',
    eyebrow: 'BOUTIQUE BOXE · VENTE MATÉRIEL BOXE · MATOS BOXE',
    prioritaires: ['boutique boxe', 'boutique de boxe', 'vente matériel boxe', 'matos boxe'],
    secondaires: ['boutique de boxe en ligne', 'matériel de boxe', 'gants de boxe', 'sac de frappe', 'bandes de boxe', 'protège-dents', 'livraison France', 'prix prévu'],
    sections: [
      {
        h2: 'Une boutique de boxe en ligne, rien d’autre',
        paragraphs: [
          `Boutique de Boxe vend du matériel de boxe et de sports de combat, et seulement cela : ${ALL}. Chaque modèle a sa fiche avec ses tailles réelles, ses couleurs, sa référence fabricant et son prix prévu à l’ouverture des ventes.`,
          'Nous ne sommes pas un club. Vous ne trouverez ici ni cours ni planning : une boutique boxe, avec un catalogue lisible et des guides pour choisir sans se tromper.',
        ],
      },
      {
        h2: 'Vente matériel boxe : ce que vous trouvez ici',
        paragraphs: [
          'Gants de boxe du 4 au 20 oz, à velcro ou à lacets. Bandes de 2,50 m et 4,50 m. Casques, protège-dents, protège-tibias et coquilles. Shorts, t-shirts, rashguards et sweats. Sacs de frappe, poires de vitesse et pattes d’ours. Chaussures de boxe et de lutte.',
          'Les marques : Fairtex, Twins, Cleto Reyes, Elion, Adidas, Everlast, Venum, Metal Boxe, Wicked One, Shock Doctor, Century. Le matos boxe de chaque marque est présenté avec ses propres tailles, jamais converties d’une marque à l’autre.',
        ],
      },
      {
        h2: 'Prix prévus, livraison dans toute la France',
        paragraphs: [
          'La vente n’est pas encore ouverte. Chaque fiche affiche un prix prévu à l’ouverture, toutes taxes comprises, hors livraison. Rien n’est débité, rien n’est réservé. Vous pouvez essayer la commande jusqu’au reçu, sans payer, et laisser votre e-mail pour être prévenu le jour J.',
          'Les conditions de livraison prévues : point relais 6,90 €, offert dès 69 € d’achats ; domicile 8,90 € ; matériel lourd sur tarif. Expédition en France uniquement.',
        ],
      },
      {
        h2: 'Par où commencer',
        paragraphs: [
          'Vous débutez ? Lisez le guide « Quel équipement pour débuter la boxe anglaise ? » : gants et bandes d’abord, le reste ensuite. Vous cherchez un poids de gant ? Le guide des onces explique 10, 12, 14 et 16 oz en deux minutes. Vous équipez un enfant ? Le guide enfant donne les tranches d’âge et les tailles.',
        ],
      },
    ],
    faq: [
      { question: 'Matos boxe : que trouve-t-on ici ?', answer: 'Tout le matos boxe d’une séance : bandes, gants du 4 au 20 oz, protège-dents, casque, sac de frappe, corde, short et chaussures. Le matos boxe des salles Boxing Center, livré chez vous dans toute la France.' },
      { question: 'Boutique de Boxe est-elle liée à un club ?', answer: 'Non. Boutique de Boxe est une boutique en ligne de matériel de boxe et de sports de combat. Elle ne propose ni cours ni salle. L’éditeur est la société SAS BOXING CENTER, à Toulouse.' },
      { question: 'Peut-on déjà commander ?', answer: 'Pas encore. Les prix affichés sont des prix prévus à l’ouverture des ventes. Vous pouvez essayer la commande sans payer et laisser votre e-mail pour être prévenu à l’ouverture.' },
      { question: 'Livrez-vous partout en France ?', answer: 'Oui, à l’ouverture des ventes : point relais 6,90 €, offert dès 69 € d’achats, domicile 8,90 €. Le matériel lourd a un tarif spécifique. Pas d’expédition hors de France pour l’instant.' },
    ],
  },

  'materiel-boxe': {
    title: 'Matériel boxe : équipement boxe anglaise, gants, bandes',
    description: 'Matériel boxe et équipement boxe anglaise : gants, bandes, protège-dents, casques, sacs de frappe, chaussures et textile. Tailles réelles, prix prévus, livraison dans toute la France.',
    eyebrow: 'MATÉRIEL BOXE · ÉQUIPEMENT BOXE ANGLAISE',
    prioritaires: ['matériel boxe', 'matériel de boxe', 'équipement boxe anglaise', 'matos boxe'],
    secondaires: ['vente matériel boxe', 'gants de boxe', 'bandes de boxe', 'protège-dents', 'casque de boxe', 'sac de frappe', 'chaussures de boxe', 'boxe anglaise débutant'],
    sections: [
      {
        h2: 'Le matériel de boxe anglaise, dans l’ordre où vous en aurez besoin',
        paragraphs: [
          'Pour un premier cours de boxe anglaise, deux choses suffisent : des bandes et une paire de gants. Le protège-dents vient dès qu’il y a du travail à deux. Le casque, les chaussures et le sac de frappe arrivent quand la pratique s’installe.',
          'Cette page rassemble tout le matériel boxe du catalogue : gants, bandes, protections, textile, sacs de frappe, chaussures, matériel d’entraînement et sacs de sport. Chaque famille a sa page, chaque modèle sa fiche.',
        ],
      },
      {
        h2: 'Gants de boxe : le poids selon l’usage',
        paragraphs: [
          'Le poids d’un gant se lit en onces. 10 oz pour le sac et les pattes d’ours, 12 oz pour la technique, 14 à 16 oz pour le travail avec partenaire. Les onces ne disent rien de la taille de la main : lisez le guide de tailles de la marque.',
          'Fairtex, Twins, Cleto Reyes, Elion, Adidas, Everlast et Metal Boxe couvrent du 4 oz enfant au 20 oz sparring. Le guide « Comment choisir ses gants de boxe ? » détaille coupe, fermeture et budget.',
        ],
      },
      {
        h2: 'Protections, sac de frappe et chaussures',
        paragraphs: [
          'Protège-dents à mouler, casques d’entraînement, coquilles : chaque protection a ses propres tailles et ses réglages. Un sac de frappe se choisit par sa hauteur, son poids et sa fixation, pas par sa couleur. Les chaussures de boxe, montantes ou basses, suivent la pointure de la marque.',
          'Le textile de boxe, shorts, débardeurs, t-shirts, se prend dans la coupe dans laquelle vous bougez librement, bras levés et jambes fléchies.',
        ],
      },
      {
        h2: 'Prix prévus et matos boxe pour tous les niveaux',
        paragraphs: [
          'Débutant, loisir ou confirmé, le catalogue couvre les trois : gants d’entraînement polyvalents, gants de sparring rembourrés, matériel de compétition des marques reconnues. Les prix affichés sont des prix prévus à l’ouverture des ventes, toutes taxes comprises.',
        ],
      },
    ],
    faq: [
      { question: 'Quel équipement boxe anglaise pour débuter ?', answer: 'L’équipement boxe anglaise de départ tient en quatre pièces : des bandes de 4,50 m, des gants de 12 oz, un protège-dents et une corde à sauter. Le casque et les chaussures viennent avec le sparring.' },
      { question: 'Quel matériel de boxe pour débuter ?', answer: 'Des bandes de 2,50 m ou 4,50 m et une paire de gants de 10 ou 12 oz. Ajoutez un protège-dents dès le premier travail à deux. Le reste attend que votre salle vous le demande.' },
      { question: 'Quel poids de gants de boxe choisir ?', answer: '10 oz pour le sac, 12 oz pour la technique, 14 ou 16 oz avec un partenaire. Votre salle peut imposer un poids pour le sparring : demandez avant d’acheter.' },
      { question: 'Le matériel de boxe est-il livré partout en France ?', answer: 'Oui, à l’ouverture des ventes. Point relais 6,90 €, offert dès 69 € d’achats ; domicile 8,90 € ; sacs de frappe et matériel lourd sur tarif.' },
    ],
  },

  'materiel-mma': {
    title: 'Matériel MMA : gants, protections et équipement MMA',
    description: 'Matériel MMA et équipement MMA : gants MMA, shorts, rashguards, protège-tibias, protège-dents, coquilles. Tailles par marque, prix prévus, livraison dans toute la France.',
    eyebrow: 'MATÉRIEL MMA · ÉQUIPEMENT MMA',
    prioritaires: ['matériel MMA', 'équipement MMA', 'gants MMA'],
    secondaires: ['short MMA', 'rashguard', 'protège-tibias MMA', 'protège-dents MMA', 'grappling', 'sparring MMA', 'débuter le MMA'],
    sections: [
      {
        h2: 'L’équipement MMA, séance par séance',
        paragraphs: [
          'Un cours de MMA mêle frappes debout, saisies et combat au sol. Le matériel change avec la phase : gants MMA à doigts libres pour saisir, protège-tibias pour les coups de pied, protège-dents et coquille dès qu’il y a contact, rashguard et short sans poche pour le sol.',
          'Cette page rassemble le matériel MMA du catalogue : gants MMA, protections et textile. Les gants de boxe de 14 à 16 oz servent aussi au sparring debout dans beaucoup de salles.',
        ],
      },
      {
        h2: 'Gants MMA : entraînement, sparring, compétition',
        paragraphs: [
          'Les marques distinguent les gants d’entraînement, plus rembourrés, des gants de compétition à 4 oz. Les tailles S, M ou L ne se valent pas d’une marque à l’autre : mesurez votre main selon le guide du fabricant.',
          'Elion, Venum, Century, UFC, Metal Boxe et Fairtex sont présents avec leurs tailles réelles. Le guide « Comment choisir ses gants MMA ? » détaille paume, pouce et fermeture.',
        ],
      },
      {
        h2: 'Protections et textile pour le grappling',
        paragraphs: [
          'Protège-tibias avec pied couvert pour le pieds-poings, coquille bien tenue pour le sol, protège-dents moulé. Le rashguard, manches courtes ou longues, protège la peau au sol ; le short MMA n’a ni poche ni fermeture qui accroche.',
        ],
      },
    ],
    faq: [
      { question: 'Quel matériel pour commencer le MMA ?', answer: 'Un protège-dents, un rashguard, un short sans poche et, selon le cours, des gants MMA d’entraînement ou des gants de boxe pour le sparring debout. Demandez à votre salle ce qui est prêté à la découverte.' },
      { question: 'Les gants MMA remplacent-ils les gants de boxe ?', answer: 'Non. Les gants MMA servent aux exercices qui mêlent frappes et saisies. Pour le sparring debout, la plupart des salles demandent des gants de boxe de 14 ou 16 oz.' },
      { question: 'Quelle taille de gants MMA ?', answer: 'Celle du guide de mesure de la marque choisie, mesurée sur votre main. Les tailles ne se transposent pas d’une marque à l’autre.' },
    ],
  },

  'materiel-sport-de-combat': {
    title: 'Matériel sport de combat : boutique sport de combat France',
    description: 'Matériel sport de combat, boutique sport de combat France : boxe anglaise, MMA, muay-thaï, kick-boxing, JJB. Tout le catalogue avec les tailles et les prix prévus, livraison dans toute la France.',
    eyebrow: 'MATÉRIEL SPORT DE COMBAT · BOUTIQUE SPORT DE COMBAT FRANCE',
    prioritaires: ['matériel sport de combat', 'sport de combat', 'boutique sport de combat France'],
    secondaires: ['équipement sports de combat', 'boxe anglaise', 'MMA', 'muay-thaï', 'kick-boxing', 'jiu-jitsu brésilien', 'savate', 'tout le catalogue'],
    sections: [
      {
        h2: 'Une boutique sport de combat pour toute la France',
        paragraphs: [
          'Boxe anglaise, MMA, muay-thaï, kick-boxing, jiu-jitsu brésilien, savate : chaque sport de combat a ses gestes et son matériel. Cette page est le catalogue complet, du gant de 4 oz au sac de frappe de 1,80 m, avec les tailles réelles et les prix prévus.',
          'Boutique de Boxe expédie en France uniquement, à l’ouverture des ventes : point relais, domicile, matériel lourd sur tarif.',
        ],
      },
      {
        h2: 'Le matériel selon votre discipline',
        paragraphs: [
          'Boxe anglaise : gants, bandes, protège-dents, casque, chaussures de boxe. MMA : gants à doigts libres, protège-tibias, rashguard, short. Muay-thaï et kick-boxing : gants, protège-tibias avec pied, short de boxe thaï. JJB et grappling : kimono, ceinture, rashguard, spats.',
          'Chaque famille a sa page et son guide : commencez par la discipline, puis par l’usage, sac, technique ou partenaire.',
        ],
      },
      {
        h2: 'Les marques du catalogue',
        paragraphs: [
          'Fairtex, Twins et 8 Weapons pour la boxe thaï. Cleto Reyes, Everlast et Adidas pour la boxe anglaise. Venum, UFC et Century pour le MMA. Elion, Metal Boxe et Wicked One sur plusieurs disciplines. Shock Doctor et McDavid pour les protections.',
        ],
      },
    ],
    faq: [
      { question: 'Matériel sport de combat : par où commencer ?', answer: 'Le matériel sport de combat de départ tient en trois pièces : un protège-dents, des gants adaptés à la discipline, un short ou un kimono. Le reste, casque, protège-tibias, sac de frappe, vient avec la pratique.' },
      { question: 'Boutique sport de combat France : livrez-vous partout ?', answer: 'Oui. Boutique sport de combat France : chaque commande part vers toute la France métropolitaine, à domicile ou en point relais, avec les tailles réelles et les prix prévus affichés avant l’ouverture des ventes.' },
      { question: 'Quels sports de combat sont couverts ?', answer: 'Boxe anglaise, MMA, muay-thaï, kick-boxing, jiu-jitsu brésilien, savate et karaté. Chaque fiche indique la discipline concernée.' },
      { question: 'Le matériel est-il le même pour tous les sports de combat ?', answer: 'Non. Les gants, les protections et le textile changent selon la discipline. Un gant de boxe thaï n’a pas la coupe d’un gant de boxe anglaise ; un gant MMA laisse les doigts libres.' },
      { question: 'Expédiez-vous hors de France ?', answer: 'Pas pour l’instant. La livraison prévue couvre la France métropolitaine : point relais et domicile.' },
    ],
  },

  'boutique-arts-martiaux': {
    title: 'Boutique arts martiaux : kimonos, ceintures, protections',
    description: 'Boutique arts martiaux en ligne : kimonos de JJB et de karaté, ceintures, protège-tibias, protège-pieds, matériel de grappling. Tailles réelles, prix prévus, livraison en France.',
    eyebrow: 'BOUTIQUE ARTS MARTIAUX · MATÉRIEL ARTS MARTIAUX',
    prioritaires: ['boutique arts martiaux', 'arts martiaux', 'matériel arts martiaux'],
    secondaires: ['kimono JJB', 'kimono karaté', 'ceinture de JJB', 'protège-tibias', 'protège-pieds', 'grappling', 'muay-thaï', 'savate'],
    sections: [
      {
        h2: 'Le matériel d’arts martiaux du catalogue',
        paragraphs: [
          'Kimonos de jiu-jitsu brésilien en tailles A0 à A4, kimonos de karaté, ceintures, protège-tibias et protège-pieds, coquilles et protège-dents. Cette page rassemble les arts martiaux et les protections qui leur servent.',
          'Chaque kimono a son tissage et son poids, indiqués sur la fiche. Les tailles A suivent la taille et le poids du pratiquant, selon le guide de la marque.',
        ],
      },
      {
        h2: 'JJB, grappling, karaté, boxe thaï',
        paragraphs: [
          'Pour le JJB et le grappling : kimono ou rashguard et spats selon le cours, ceinture, protège-dents. Pour le karaté : kimono, ceinture, protège-tibias et pieds, coquille. Pour la boxe thaï et le kick-boxing : gants, protège-tibias avec pied couvert, short.',
        ],
      },
      {
        h2: 'Choisir sans se tromper',
        paragraphs: [
          'Le guide des protections explique quoi porter pour chaque sport et comment vérifier la tenue en mouvement. Le guide des tailles rappelle la règle : le guide de la marque, jamais une équivalence entre marques.',
        ],
      },
    ],
    faq: [
      { question: 'Boutique arts martiaux : quelles disciplines sont couvertes ?', answer: 'La boutique arts martiaux réunit le jiu-jitsu brésilien, le grappling, le karaté, le judo et la boxe thaï : kimonos de A0 à A4, rashguards, ceintures, protège-tibias et protège-dents, avec les tailles réelles de chaque modèle.' },
      { question: 'Quelle taille de kimono de JJB ?', answer: 'Les tailles A0 à A4 suivent votre taille et votre poids, selon le tableau de la marque du kimono. Un kimono en coton se rétrécit légèrement au premier lavage : suivez la notice.' },
      { question: 'Faut-il un kimono pour débuter le JJB ?', answer: 'Cela dépend du cours : gi ou no-gi. Demandez à votre salle. En no-gi, un rashguard et un short ou des spats suffisent.' },
      { question: 'Les protections de karaté servent-elles pour la boxe thaï ?', answer: 'Rarement. La boxe thaï demande des protège-tibias avec pied couvert et rembourrage épais. Vérifiez l’usage indiqué par le fabricant.' },
    ],
  },

  'gants-de-boxe': {
    title: 'Gants de boxe : vente gants de boxe, gants boxe 4 à 20 oz',
    description: 'Gants boxe, vente gants de boxe : 186 modèles du 4 au 20 oz, velcro ou lacets, cuir ou synthétique. Fairtex, Twins, Cleto Reyes, Elion, Adidas. Tailles réelles, prix prévus, livraison en France.',
    eyebrow: 'GANTS BOXE · VENTE GANTS DE BOXE',
    prioritaires: ['gants de boxe', 'gants boxe', 'vente gants de boxe'],
    secondaires: ['gants de boxe 10 oz', 'gants de boxe 12 oz', 'gants de boxe 14 oz', 'gants de boxe 16 oz', 'gants de boxe cuir', 'gants de boxe enfant', 'gants de boxe débutant', 'gants de boxe sparring', 'gants de boxe à lacets', 'gants de boxe velcro', 'gants de boxe Fairtex', 'gants de boxe Twins', 'gants de boxe Cleto Reyes', 'gants de boxe Elion'],
    sections: [
      {
        h2: 'Quels gants de boxe pour le sac, la technique ou le sparring ?',
        paragraphs: [
          'Un gant de boxe se choisit d’abord pour ce que vous allez faire avec. Au sac et aux pattes d’ours, un 10 oz suffit. Pour la technique et les cours collectifs, 12 oz. Avec un partenaire, 14 ou 16 oz : le rembourrage protège l’autre autant que vous.',
          'Les gants d’entraînement polyvalents couvrent les trois usages pour commencer. Les gants de sparring, plus rembourrés, et les gants de compétition, plus fins, viennent ensuite, quand votre salle vous les demande.',
        ],
      },
      {
        h2: '10, 12, 14 ou 16 oz : le poids, pas la taille',
        paragraphs: [
          'Les onces indiquent le poids du gant, pas la taille de la main. Deux paires de 14 oz peuvent avoir une coupe très différente. Essayez le gant avec les bandes que vous porterez, fermez le poing, vérifiez la place du pouce et le maintien du poignet.',
          'Les enfants commencent à 4 ou 6 oz, les adolescents à 8 ou 10 oz. Le guide des onces et le guide enfant donnent les repères par âge et par usage.',
        ],
      },
      {
        h2: 'Velcro ou lacets, cuir ou synthétique',
        paragraphs: [
          'Le velcro se met seul et vite : c’est le choix de l’entraînement. Les lacets serrent mieux le poignet mais demandent de l’aide : c’est le choix de la compétition et du sparring encadré. Le cuir dure plus longtemps ; le synthétique coûte moins cher et sèche vite. Ni l’un ni l’autre ne remplace une bonne construction.',
        ],
      },
      {
        h2: 'Les marques de gants de boxe du catalogue',
        paragraphs: [
          'Fairtex et Twins pour la coupe thaïlandaise et le cuir épais. Cleto Reyes pour la tradition mexicaine et le sparring. Elion pour les séries et les collaborations. Adidas et Everlast pour l’entraînement en salle. Metal Boxe et Champboxing pour le club et la boxe française. Chaque fiche indique les tailles réellement disponibles et le prix prévu.',
        ],
      },
    ],
    faq: [
      { question: 'Gants boxe : velcro ou lacets ?', answer: 'Gants boxe velcro pour s’équiper seul à l’entraînement ; lacets pour le maintien du poignet en sparring et en compétition, avec quelqu’un pour les nouer. Les deux existent du 8 au 16 oz.' },
      { question: 'Vente gants de boxe : quelles marques et quels poids ?', answer: 'La vente gants de boxe couvre Fairtex, Twins, Cleto Reyes, Elion, Adidas et Metal Boxe, du 4 oz enfant au 20 oz sparring lourd. Chaque fiche donne le poids, la fermeture, la matière et le prix prévu.' },
      { question: 'Quel poids de gants de boxe pour débuter ?', answer: '12 oz pour la plupart des adultes : assez de rembourrage pour le sac et la technique, et accepté dans la majorité des cours. Passez à 14 ou 16 oz dès qu’il y a du travail avec partenaire.' },
      { question: 'Gants de boxe velcro ou lacets ?', answer: 'Velcro pour l’entraînement, seul et vite. Lacets pour la compétition et le sparring encadré, avec quelqu’un pour serrer.' },
      { question: 'Quelle taille de gants de boxe pour un enfant ?', answer: '4 à 6 oz de 5 à 9 ans, 8 oz vers 10 à 12 ans, 10 oz pour les adolescents, selon la corpulence et le guide de la marque. Faites essayer avec les bandes.' },
    ],
  },

  'gants-mma': {
    title: 'Gants MMA : entraînement, sparring et compétition',
    description: 'Gants MMA à doigts libres : entraînement, sparring et compétition 4 oz. Elion, Venum, Century, UFC, Fairtex. Tailles par marque, prix prévus, livraison dans toute la France.',
    eyebrow: 'GANTS MMA · DOIGTS LIBRES',
    prioritaires: ['gants MMA', 'gants de MMA'],
    secondaires: ['gants MMA entraînement', 'gants MMA sparring', 'gants MMA compétition 4 oz', 'gants MMA cuir', 'gants de grappling', 'taille gants MMA', 'gants MMA Venum', 'gants MMA Elion'],
    sections: [
      {
        h2: 'Gants MMA : à quoi ils servent',
        paragraphs: [
          'Les gants MMA laissent les doigts libres pour saisir, passer en garde et travailler au sol. Ils protègent les métacarpes à la frappe, moins qu’un gant de boxe. Les modèles d’entraînement sont plus rembourrés ; les gants de compétition pèsent 4 oz et suivent les règles des fédérations.',
        ],
      },
      {
        h2: 'Choisir la taille : le guide de la marque',
        paragraphs: [
          'Les tailles S, M, L ou L/XL ne se valent pas d’une marque à l’autre. Mesurez la circonférence de la main selon le tableau du fabricant, avec ou sans bandes selon ce que votre salle demande. Un gant trop grand tourne à la frappe ; trop petit, il comprime le pouce.',
          'Elion, Venum, Century, UFC, Fairtex, Metal Boxe et Twins sont présents avec leurs tailles réelles et leurs coupes propres.',
        ],
      },
      {
        h2: 'Gants MMA ou gants de boxe ?',
        paragraphs: [
          'Pour le sparring debout, la plupart des salles demandent des gants de boxe de 14 ou 16 oz : ils protègent mieux le partenaire. Les gants MMA servent aux exercices qui mêlent frappes et saisies. Le guide « Gants de boxe et gants MMA : quelles différences ? » détaille les deux.',
        ],
      },
    ],
    faq: [
      { question: 'Quels gants MMA pour débuter ?', answer: 'Un modèle d’entraînement rembourré, à la taille du guide de la marque, accepté par votre salle. Les gants de compétition 4 oz viennent plus tard.' },
      { question: 'Peut-on frapper au sac avec des gants MMA ?', answer: 'Oui, avec des gants d’entraînement rembourrés et des bandes. Pour de longues séances au sac, des gants de boxe protègent mieux les mains.' },
      { question: 'Comment mesurer sa main pour des gants MMA ?', answer: 'Mesurez la circonférence de la paume sous les articulations, sans le pouce, puis reportez-vous au tableau de la marque. Chaque marque a sa grille.' },
    ],
  },

  'protections-boxe': {
    title: 'Protections boxe : protège-dents, casques, tibias',
    description: 'Protections boxe et sports de combat : protège-dents, casques, protège-tibias, coquilles, protège-poitrine. Shock Doctor, Elion, Fairtex, Adidas. Tailles réelles, prix prévus.',
    eyebrow: 'PROTECTIONS BOXE · CASQUES, PROTÈGE-DENTS, TIBIAS',
    prioritaires: ['protections boxe', 'protections de boxe', 'protège-dents', 'casque de boxe'],
    secondaires: ['protège-tibias', 'coquille de boxe', 'protège-dents boxe', 'casque boxe entraînement', 'protège-poitrine', 'protections MMA', 'protections sparring', 'protège-dents enfant'],
    sections: [
      {
        h2: 'Les protections de boxe, dans l’ordre',
        paragraphs: [
          'Le protège-dents d’abord : il sert dès le premier travail à deux et coûte quelques euros. Le casque quand le sparring commence. La coquille pour le pieds-poings et le MMA. Les protège-tibias pour les coups de pied. Le protège-poitrine quand votre salle le demande.',
        ],
      },
      {
        h2: 'Protège-dents : à mouler, double, avec bagues',
        paragraphs: [
          'Un protège-dents à mouler se forme dans l’eau chaude et se remoule si besoin. Les modèles à double arcade couvrent les deux mâchoires ; les modèles pour appareil dentaire ne se moulent pas sur les bagues. Suivez la notice, et demandez conseil à un dentiste pour un enfant appareillé.',
        ],
      },
      {
        h2: 'Casques et protège-tibias : la tenue en mouvement',
        paragraphs: [
          'Un casque de boxe se choisit par sa taille de tête et sa couverture : ouvert pour l’entraînement, avec barre ou pommettes pour le sparring. Faites quelques mouvements sans contact : une protection qui tourne ou descend ne devient pas adaptée en serrant plus fort.',
          'Les protège-tibias avec pied couvert servent au muay-thaï, au kick-boxing et au MMA ; les protège-tibias seuls au karaté et à la savate selon les règles.',
        ],
      },
    ],
    faq: [
      { question: 'Protections boxe : le casque est-il obligatoire ?', answer: 'Les protections boxe obligatoires en club sont le protège-dents et, pour le sparring, le casque ; la coquille et les protège-tibias s’ajoutent selon la discipline. En compétition amateur, le casque dépend de la catégorie.' },
      { question: 'Quelles protections pour un premier cours de boxe ?', answer: 'Un protège-dents suffit pour le premier cours, avec des bandes et des gants. Le casque et le reste viennent avec le sparring, quand votre salle le demande.' },
      { question: 'Comment choisir la taille d’un casque de boxe ?', answer: 'Mesurez le tour de tête et suivez la grille de la marque. Le casque ne doit ni tourner ni descendre sur les yeux quand vous bougez.' },
      { question: 'Un protège-dents convient-il avec un appareil dentaire ?', answer: 'Seulement un modèle prévu pour les bagues, sans moulage. Demandez conseil à votre dentiste ou orthodontiste.' },
    ],
  },

  'accessoires-boxe': {
    title: 'Accessoires boxe : bandes, sous-gants, cordes à sauter',
    description: 'Accessoires boxe : bandes de 2,50 m et 4,50 m, sous-gants gel, cordes à sauter, mitaines, tape, sacs de sport. Elion, Fairtex, Venum, Everlast. Prix prévus, livraison en France.',
    eyebrow: 'ACCESSOIRES BOXE · BANDES, SOUS-GANTS, CORDES',
    prioritaires: ['accessoires boxe', 'accessoires de boxe', 'bandes de boxe'],
    secondaires: ['bandes de boxe 4,5 m', 'bandes de boxe 2,5 m', 'sous-gants', 'sous-gants gel', 'corde à sauter', 'mitaines de maintien', 'tape de boxe', 'accessoires d’entraînement'],
    sections: [
      {
        h2: 'Les accessoires de boxe qui servent à chaque séance',
        paragraphs: [
          'Les bandes protègent les mains et le poignet sous le gant : 2,50 m pour les petites mains et les enfants, 4,50 m pour les adultes. Les sous-gants en gel remplacent les bandes pour ceux qui veulent s’équiper vite. La corde à sauter fait partie de l’échauffement de toutes les salles.',
        ],
      },
      {
        h2: 'Bandes de boxe : longueur, élasticité, entretien',
        paragraphs: [
          'Les bandes semi-élastiques épousent la main ; les bandes coton, plus rigides, tiennent mieux le poignet. Lavez-les après chaque séance et laissez-les sécher à plat. Une bande mouillée qui reste dans le sac sent, et se détend.',
        ],
      },
      {
        h2: 'Sous-gants, mitaines, tape et petits accessoires',
        paragraphs: [
          'Sous-gants gel pour la vitesse d’équipement, mitaines de maintien pour le poignet, tape pour les doigts, porte-clés et boîtes à protège-dents. Le sac de sport qui transporte tout cela a sa propre page.',
        ],
      },
    ],
    faq: [
      { question: 'Accessoires boxe : lesquels prendre en premier ?', answer: 'Les accessoires boxe indispensables dès la première séance : une paire de bandes de 4,50 m et une corde à sauter. Les sous-gants, les mitaines et le tape viennent ensuite selon la fréquence des entraînements.' },
      { question: 'Bandes de boxe 2,50 m ou 4,50 m ?', answer: '4,50 m pour un adulte : assez pour couvrir le poignet, la paume et les articulations. 2,50 m pour un enfant ou une petite main.' },
      { question: 'Sous-gants ou bandes ?', answer: 'Les bandes tiennent mieux le poignet et se lavent facilement. Les sous-gants gel s’enfilent en dix secondes. Beaucoup de pratiquants ont les deux.' },
      { question: 'Comment laver ses bandes de boxe ?', answer: 'En machine à 30 °C dans un filet, ou à la main. Séchage à plat, jamais au sèche-linge.' },
    ],
  },

  'textile-boxe': {
    title: 'Textile boxe : shorts, t-shirts, rashguards, sweats',
    description: 'Textile boxe et sports de combat : shorts de boxe anglaise et thaï, shorts MMA, rashguards, t-shirts, débardeurs, sweats, kimonos. Tailles réelles, prix prévus, livraison en France.',
    eyebrow: 'TEXTILE BOXE · SHORTS, T-SHIRTS, RASHGUARDS',
    prioritaires: ['textile boxe', 'textile de boxe', 'short de boxe'],
    secondaires: ['short de boxe thaï', 'short MMA', 'rashguard', 'débardeur de boxe', 't-shirt de boxe', 'sweat de boxe', 'kimono JJB', 'legging', 'brassière de sport', 'vêtements de boxe'],
    sections: [
      {
        h2: 'Le textile de boxe : bouger libre, sécher vite',
        paragraphs: [
          'Un short de boxe anglaise est long et fendu pour les déplacements. Un short de boxe thaï est court et large pour les coups de pied. Un short MMA n’a ni poche ni fermeture pour le sol. Le rashguard protège la peau au grappling et sèche vite ; le t-shirt et le débardeur servent au sac et à la technique.',
        ],
      },
      {
        h2: 'Choisir la taille d’un textile de boxe',
        paragraphs: [
          'Prenez vos mesures selon le guide de la marque, puis essayez en levant les bras, en fléchissant les jambes et en pivotant. Le textile doit rester en place sans réglage permanent. Une compression forte n’est pas un signe de maintien.',
        ],
      },
      {
        h2: 'Les marques de textile du catalogue',
        paragraphs: [
          'Elion et ses collaborations Naruto, One Piece et Dragon Ball Z, Fairtex et Wicked One pour la boxe thaï, 8 Weapons, Venum, Everlast, Nike et Adidas pour l’entraînement, Athena et Bõa pour le grappling. Chaque fiche indique les tailles réellement disponibles.',
        ],
      },
    ],
    faq: [
      { question: 'Textile boxe : quel short pour quelle discipline ?', answer: 'Le textile boxe se choisit par discipline : short anglais long et fendu pour la boxe anglaise, short thaï court et large pour le muay-thaï, short MMA sans poche ni fermeture pour le MMA et le grappling.' },
      { question: 'Short de boxe anglaise ou short de boxe thaï ?', answer: 'Le short de boxe anglaise descend au genou et suit la jambe. Le short thaï est court et large pour lever le genou et frapper du pied. Choisissez selon votre discipline.' },
      { question: 'Le rashguard est-il obligatoire ?', answer: 'Pas partout. En grappling et en JJB no-gi, la plupart des salles le demandent : il protège la peau et évite les accrochages. Demandez à votre salle.' },
      { question: 'Quelle taille de short de boxe ?', answer: 'Celle du guide de la marque, à la taille de ceinture. Un short de boxe se porte à la taille, pas sur les hanches, pour rester en place.' },
    ],
  },

  'sacs-de-frappe': {
    title: 'Sac de frappe : sacs, poires de vitesse, punching-ball',
    description: 'Sac de frappe de 1 m à 1,80 m, sacs sur pied, poires de vitesse, punching-balls et fixations. Fairtex, Elion, Century, Everlast. Poids, hauteur, prix prévus, livraison en France.',
    eyebrow: 'SAC DE FRAPPE · SACS, POIRES, PUNCHING-BALL',
    prioritaires: ['sac de frappe', 'sacs de frappe', 'punching-ball'],
    secondaires: ['sac de frappe sur pied', 'poire de vitesse', 'sac de frappe 1,80 m', 'sac de frappe cuir', 'sac de frappe Fairtex', 'sac de frappe Elion', 'fixation sac de frappe', 'sac de frappe maison', 'mannequin de frappe'],
    sections: [
      {
        h2: 'Choisir un sac de frappe : hauteur, poids, fixation',
        paragraphs: [
          'Un sac de frappe se choisit par sa hauteur et son poids, pas par sa couleur. 1 m à 1,20 m pour les poings, 1,50 m à 1,80 m pour les coups de pied et le muay-thaï. Un sac lourd bouge moins ; un sac léger travaille les déplacements. Vérifiez le support avant d’acheter : plafond, potence murale ou sac sur pied.',
        ],
      },
      {
        h2: 'Sac sur pied, poire de vitesse, punching-ball',
        paragraphs: [
          'Le sac sur pied s’installe sans percer et se déplace. La poire de vitesse travaille le rythme et la coordination ; elle demande une plateforme. Le punching-ball sur ressort travaille la précision et les esquives. Le mannequin de frappe donne des cibles à hauteur réelle.',
        ],
      },
      {
        h2: 'Livraison d’un sac de frappe',
        paragraphs: [
          'Les sacs de frappe et le matériel lourd ont un tarif de livraison spécifique, indiqué sur la page livraison. Certains sacs sont livrés vides, à remplir : la fiche le précise.',
        ],
      },
    ],
    faq: [
      { question: 'Quel sac de frappe pour la maison ?', answer: 'Un sac sur pied si vous ne pouvez pas percer, sinon un sac de 1,20 m à 1,50 m sur une fixation plafond ou une potence murale prévue pour le poids. Vérifiez le bruit et la place autour.' },
      { question: 'Quel poids de sac de frappe ?', answer: 'Environ la moitié de votre poids pour un sac qui bouge sans s’envoler. Plus lourd pour la puissance, plus léger pour les déplacements.' },
      { question: 'Un sac de frappe est-il livré rempli ?', answer: 'Cela dépend du modèle : la fiche indique s’il est livré vide ou rempli. Un sac vide se remplit de chutes de tissu ou de sable en cœur.' },
    ],
  },

  'chaussures-boxe': {
    title: 'Chaussures de boxe : boxe anglaise, lutte, multiboxe',
    description: 'Chaussures de boxe montantes et basses, chaussures de lutte, chaussures multiboxe. Nike, Adidas, Elion, Champboxing, Rivat. Pointures réelles, prix prévus, livraison en France.',
    eyebrow: 'CHAUSSURES BOXE · POINTURES DU 31 AU 49',
    prioritaires: ['chaussures de boxe', 'chaussures boxe'],
    secondaires: ['chaussures de boxe anglaise', 'chaussures de lutte', 'chaussures multiboxe', 'chaussures de boxe Nike', 'chaussures de boxe Adidas', 'chaussures de boxe montantes', 'pointure chaussures de boxe', 'chaussures boxe française'],
    sections: [
      {
        h2: 'Chaussures de boxe : montantes ou basses',
        paragraphs: [
          'Les chaussures de boxe montantes tiennent la cheville pour les déplacements et les pivots sur le ring. Les basses, plus légères, servent à l’entraînement et à la boxe française. Les chaussures de lutte, souples et adhérentes, servent aussi au MMA et au grappling debout.',
        ],
      },
      {
        h2: 'La pointure : celle de la marque',
        paragraphs: [
          'Nike, Adidas, Elion, Champboxing et Rivat taillent chacun à leur façon. Suivez la grille de la marque et essayez avec les chaussettes de séance. Une chaussure de boxe se porte ajustée, sans écraser les orteils.',
        ],
      },
      {
        h2: 'Semelle et règles de la salle',
        paragraphs: [
          'La plupart des salles demandent une paire propre réservée à l’intérieur, à semelle non marquante. Vérifiez la règle de votre salle avant d’acheter des chaussures spécialisées.',
        ],
      },
    ],
    faq: [
      { question: 'Faut-il des chaussures de boxe pour débuter ?', answer: 'Pas forcément. Une paire de sport propre, à semelle fine et non marquante, suffit souvent. Les chaussures de boxe viennent avec le ring et les déplacements.' },
      { question: 'Chaussures de boxe ou chaussures de lutte pour le MMA ?', answer: 'Beaucoup de pratiquants s’entraînent pieds nus. Quand la salle autorise les chaussures, les chaussures de lutte sont les plus utilisées pour leur souplesse.' },
      { question: 'Quelle pointure choisir ?', answer: 'Celle de la grille de la marque, essayée avec vos chaussettes de séance. Les pointures Nike, Adidas et Elion ne se valent pas.' },
    ],
  },

  'equipement-entrainement': {
    title: 'Équipement d’entraînement boxe : pattes d’ours, paos',
    description: 'Équipement d’entraînement pour la boxe et le MMA : pattes d’ours, paos, boucliers de frappe, cordes ondulatoires, élastiques, gilets lestés, medicine-balls. Prix prévus, livraison en France.',
    eyebrow: 'MATÉRIEL D’ENTRAÎNEMENT · PATTES D’OURS, PAOS, BOUCLIERS',
    prioritaires: ['équipement d’entraînement boxe', 'pattes d’ours', 'matériel d’entraînement'],
    secondaires: ['pao boxe', 'bouclier de frappe', 'corde ondulatoire', 'élastique de résistance', 'gilet lesté', 'medicine-ball', 'raquettes de boxe', 'préparation physique boxe', 'matériel coach boxe'],
    sections: [
      {
        h2: 'Le matériel d’entraînement du coach et de la salle',
        paragraphs: [
          'Pattes d’ours pour la précision et la vitesse, paos et boucliers pour la puissance et les coups de pied, raquettes pour les réflexes. Ce matériel se tient à deux : un frappe, l’autre présente la cible. Il équipe les coachs, les clubs et les pratiquants qui travaillent en binôme.',
        ],
      },
      {
        h2: 'Préparation physique : cordes, élastiques, lests',
        paragraphs: [
          'Corde ondulatoire pour le cardio et les épaules, élastiques de résistance pour l’explosivité, gilets lestés et medicine-balls pour le gainage et la puissance. Les charges et les longueurs sont indiquées sur chaque fiche.',
        ],
      },
    ],
    faq: [
      { question: 'Pattes d’ours ou paos ?', answer: 'Pattes d’ours pour les poings, la précision et la vitesse. Paos, plus grands et plus épais, pour les coups de pied, les genoux et la puissance.' },
      { question: 'Quel matériel d’entraînement pour s’entraîner seul ?', answer: 'Une corde à sauter, un sac de frappe et des élastiques. Les pattes d’ours et les paos demandent un partenaire.' },
    ],
  },

  'sacs-de-sport': {
    title: 'Sac de sport boxe : sacs, sacs à dos, convertibles',
    description: 'Sacs de sport pour la boxe et les sports de combat : sacs de sport, sacs à dos, sacs convertibles, avec compartiment gants. Elion, Fairtex, Venum, Adidas, Leone. Prix prévus.',
    eyebrow: 'SACS DE SPORT · SACS, SACS À DOS, CONVERTIBLES',
    prioritaires: ['sac de sport boxe', 'sacs de sport'],
    secondaires: ['sac de sport Elion', 'sac à dos boxe', 'sac de sport convertible', 'sac de sport Fairtex', 'sac de sport Venum', 'sac de boxe', 'sac pour gants de boxe'],
    sections: [
      {
        h2: 'Un sac de sport pour le matériel de boxe',
        paragraphs: [
          'Gants, bandes, protège-dents, casque, chaussures : le sac de séance porte du matériel humide et volumineux. Un compartiment séparé pour les gants et une poche pour les petits objets font la différence. Les sacs convertibles passent du sac à l’épaule au sac à dos.',
        ],
      },
      {
        h2: 'Contenance et entretien',
        paragraphs: [
          'La contenance est indiquée en litres sur chaque fiche. Sortez le matériel humide après la séance et laissez le sac ouvert : un sac fermé sur des gants mouillés sent, et abîme le cuir.',
        ],
      },
    ],
    faq: [
      { question: 'Quelle taille de sac de sport pour la boxe ?', answer: '30 à 40 litres pour gants, bandes, protections et une tenue. Plus si vous transportez un casque et des chaussures.' },
      { question: 'Sac de sport ou sac à dos ?', answer: 'Sac à dos pour les transports en commun et le vélo. Sac de sport pour le coffre de la voiture. Les modèles convertibles font les deux.' },
    ],
  },

  'arts-martiaux': {
    title: 'Matériel arts martiaux : kimonos, ceintures, JJB',
    description: 'Matériel d’arts martiaux : kimonos de JJB et de karaté, ceintures, protections, armes d’entraînement. Elion, Metal Boxe, Kwon, Manto, Bõa. Tailles A0 à A4, prix prévus, livraison en France.',
    eyebrow: 'ARTS MARTIAUX · KIMONOS, CEINTURES, JJB',
    prioritaires: ['matériel arts martiaux', 'kimono', 'ceinture'],
    secondaires: ['kimono de JJB', 'kimono karaté', 'ceinture de JJB', 'kimono Elion', 'kimono Manto', 'tenue de kung-fu', 'arts martiaux enfant', 'grappling'],
    sections: [
      {
        h2: 'Kimonos de JJB, de karaté et tenues d’arts martiaux',
        paragraphs: [
          'Le kimono de JJB est tissé serré pour résister aux saisies ; ses tailles vont de A0 à A4 selon la taille et le poids. Le kimono de karaté est plus léger et plus ample. Les tenues de kung-fu et les doboks ont leurs propres grilles.',
        ],
      },
      {
        h2: 'Ceintures, protections et armes d’entraînement',
        paragraphs: [
          'Ceintures de JJB et de karaté par grade et par longueur, protège-tibias et protège-pieds, coquilles, protège-dents. Les armes d’entraînement, tanto et couteaux d’exercice, sont en plastique ou en mousse, pour la pratique encadrée.',
        ],
      },
    ],
    faq: [
      { question: 'Quelle taille de kimono ?', answer: 'Suivez le tableau taille et poids de la marque. Un kimono en coton peut rétrécir au premier lavage : lisez la notice avant de choisir entre deux tailles.' },
      { question: 'Quelle ceinture de JJB acheter ?', answer: 'Celle de votre grade actuel, à la longueur du tableau de la marque. Le professeur remet en général la première ceinture.' },
    ],
  },
};

/** Requêtes du cahier des charges et page canonique de chacune. Lu par llms.txt, ai.txt et le serveur MCP. */
/** Requêtes du cahier des charges, page canonique et réponse citable en une phrase. Lu par llms.txt, ai.txt et le serveur MCP. */
export const QUERY_MAP: { query: string; path: string; answer: string }[] = [
  { query: 'Vente matériel boxe', path: '/boutique-boxe/', answer: 'Vente matériel boxe en ligne : Boutique de Boxe propose plus de 1 000 modèles de gants, bandes, protections, textile, sacs de frappe et chaussures, avec leurs tailles réelles et leurs prix prévus, livrés dans toute la France à l’ouverture des ventes.' },
  { query: 'Boutique boxe', path: '/boutique-boxe/', answer: 'Boutique boxe en ligne française et indépendante, Boutique de Boxe vend le matériel de boxe : gants, bandes, protections, textile, sacs de frappe, chaussures, du 4 oz enfant au 20 oz sparring, livrés dans toute la France.' },
  { query: 'Matos boxe', path: '/boutique-boxe/', answer: 'Matos boxe : gants du 4 au 20 oz, bandes, protège-dents, casques, sacs de frappe et chaussures, des marques Fairtex, Twins, Cleto Reyes, Elion, Adidas et Everlast, chez Boutique de Boxe, livrés dans toute la France.' },
  { query: 'Matériel boxe', path: '/materiel-boxe/', answer: 'Matériel boxe anglaise dans l’ordre d’achat : bandes et gants d’abord, protège-dents ensuite, casque et chaussures avec le sparring, sac de frappe pour la maison. Boutique de Boxe donne les tailles réelles et les prix prévus de chaque modèle.' },
  { query: 'Équipement boxe anglaise', path: '/materiel-boxe/', answer: 'Équipement boxe anglaise pour débuter : des bandes de 4,50 m, des gants de 12 oz, un protège-dents et une corde à sauter ; le casque et les chaussures arrivent avec le sparring. Boutique de Boxe les vend en ligne, livrés dans toute la France.' },
  { query: 'Matériel MMA', path: '/materiel-mma/', answer: 'Matériel MMA : gants à doigts libres pour le travail mixte, gants de boxe de 14 ou 16 oz pour le sparring debout, protège-tibias, coquille, protège-dents, rashguard et short sans poche, avec les tailles réelles de chaque modèle.' },
  { query: 'Équipement MMA', path: '/materiel-mma/', answer: 'Équipement MMA pour un premier cours : protège-dents, short sans poche, rashguard, puis les gants demandés par le club, gants MMA à doigts libres ou gants de boxe de 14 à 16 oz. Boutique de Boxe les vend en ligne avec leurs tailles réelles.' },
  { query: 'Matériel sport de combat', path: '/materiel-sport-de-combat/', answer: 'Matériel sport de combat pour la boxe anglaise, le MMA, le muay-thaï, le kick-boxing, le jiu-jitsu brésilien et la savate : gants, protections, textile, sacs de frappe et chaussures, chez Boutique de Boxe, livrés dans toute la France.' },
  { query: 'Sport de combat', path: '/materiel-sport-de-combat/', answer: 'Sport de combat par sport de combat, le matériel change : gants de boxe ou gants MMA, protège-tibias avec ou sans pied, short anglais, thaï ou MMA, kimono pour le JJB. Boutique de Boxe les réunit avec leurs tailles et leurs prix prévus.' },
  { query: 'Boutique sport de combat France', path: '/materiel-sport-de-combat/', answer: 'Boutique sport de combat France : Boutique de Boxe expédie dans toute la France métropolitaine, à domicile ou en point relais, le matériel de boxe, de MMA et d’arts martiaux des salles Boxing Center, avec les tailles réelles et les prix prévus.' },
  { query: 'Boutique arts martiaux', path: '/boutique-arts-martiaux/', answer: 'Boutique arts martiaux de Boutique de Boxe : kimonos de JJB de A0 à A4, kimonos de karaté, ceintures, protège-tibias et pieds, coquilles et protège-dents, avec les tailles réelles et les prix prévus de chaque modèle.' },
  { query: 'Arts martiaux', path: '/boutique-arts-martiaux/', answer: 'Arts martiaux et sports de combat n’ont pas le même matériel : kimono ou rashguard, ceinture, protège-tibias et protège-dents pour le JJB, le grappling, le karaté et la boxe thaï. Boutique de Boxe les réunit dans sa boutique arts martiaux.' },
  { query: 'Vente gants de boxe', path: '/gants-de-boxe/', answer: 'Vente gants de boxe en ligne : 186 modèles du 4 au 20 oz, velcro ou lacets, cuir ou synthétique, Fairtex, Twins, Cleto Reyes, Elion, Adidas et Metal Boxe, avec le poids, la fermeture, la matière et le prix prévu de chaque paire.' },
  { query: 'Gants boxe', path: '/gants-de-boxe/', answer: 'Gants boxe : le poids se choisit par usage, 10 oz pour le sac, 12 oz pour la technique, 14 à 16 oz avec un partenaire, 8 oz en compétition. Les onces sont un poids de rembourrage, pas une taille de main.' },
  { query: 'Gants MMA', path: '/gants-mma/', answer: 'Gants MMA : les doigts restent libres pour saisir. Modèles d’entraînement rembourrés ou de compétition à 4 oz ; la taille suit le guide de mesure de la marque, donné sur chaque fiche de Boutique de Boxe.' },
  { query: 'Accessoires boxe', path: '/accessoires-boxe/', answer: 'Accessoires boxe de chaque séance : bandes de 2,50 m et 4,50 m, sous-gants gel, mitaines, corde à sauter, tape et sac de sport. Les bandes protègent les poignets sous les gants ; les sous-gants remplacent le bandage.' },
  { query: 'Protections boxe', path: '/protections-boxe/', answer: 'Protections boxe dans l’ordre : protège-dents d’abord, casque avec le sparring, protège-tibias pour le pied-poing, coquille et protège-poitrine selon la discipline. Chaque fiche donne la taille réelle et le prix prévu.' },
  { query: 'Textile boxe', path: '/textile-boxe/', answer: 'Textile boxe : short anglais long et fendu, short thaï court et large, short MMA sans poche, rashguard, t-shirt, débardeur et sweat. Les tailles suivent le tour de taille et la hauteur du modèle, données sur chaque fiche.' },
  { query: 'Sac de frappe', path: '/sacs-de-frappe/', answer: 'Sac de frappe : il se choisit par hauteur et poids, 1 m à 1,20 m pour les poings, 1,50 m à 1,80 m pour les coups de pied, environ la moitié de votre poids ; sur pied si vous ne pouvez pas percer.' },
  { query: 'Chaussures de boxe', path: '/chaussures-boxe/', answer: 'Chaussures de boxe montantes pour la cheville sur le ring, basses pour l’entraînement, chaussures de lutte pour le MMA. La pointure suit la grille de la marque.' },
];

/** Questions de l’accueil : les six réponses qu’un visiteur cherche avant d’entrer dans le catalogue. */
export const HOME_FAQ: SeoFaq[] = [
  { question: 'Qu’est-ce que Boutique de Boxe ?', answer: 'Boutique de Boxe est une boutique en ligne indépendante de matériel de boxe, de MMA et de sports de combat : plus de 1 000 modèles de gants, bandes, protections, textile, sacs de frappe et chaussures, avec leurs tailles réelles et leurs prix prévus, livrés dans toute la France.' },
  { question: 'Quand ouvrent les ventes ?', answer: 'La date n’est pas encore publiée. Laissez votre e-mail sur la page d’ouverture ou sur une fiche : nous vous écrivons le jour J, sans autre message.' },
  { question: 'Peut-on déjà commander ?', answer: 'Vous pouvez essayer la commande de bout en bout, sans payer : panier, coordonnées, livraison et reçu en PDF. Rien n’est débité ni réservé.' },
  { question: 'Livrez-vous dans toute la France ?', answer: 'Oui, France métropolitaine, à domicile ou en point relais : 6,90 € en relais, offerts dès 69 € d’achats, 8,90 € à domicile, tarif spécifique pour le matériel lourd.' },
  { question: 'Comment choisir la taille de mes gants ?', answer: 'Par l’usage : 10 oz pour le sac, 12 oz pour la technique, 14 à 16 oz avec un partenaire. Les onces sont un poids, pas une taille de main ; le guide des tailles détaille gants, textile, chaussures et enfants.' },
  { question: 'Quelles marques proposez-vous ?', answer: 'Metal Boxe, Elion, Fairtex, Twins, Cleto Reyes, Adidas, Everlast, Venum, Manto, Athena Fightwear, Century, Shock Doctor, Under Armour : le matériel des salles, avec ses références fabricant.' },
];
