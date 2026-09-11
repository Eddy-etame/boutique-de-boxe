/**
 * Sous-familles : les pages d’atterrissage de l’arborescence du cahier des
 * charges (bandes, sous-gants, protège-dents, casques, pattes d’ours,
 * rashguards, shorts MMA, kimonos, ceintures…). Chaque page porte une requête
 * précise, un texte propre, une liste de modèles filtrée par règle, et renvoie
 * à sa famille et à son guide.
 */
import type { Product } from './catalog';
import type { SeoFaq, SeoSection } from './seo-copy';

export type Subfamily = {
  slug: string;
  parent: string;
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  prioritaires: string[];
  secondaires: string[];
  intro: string;
  sections: SeoSection[];
  faq: SeoFaq[];
  guide: string;
  match: (p: Product) => boolean;
};

const n = (p: Product) => p.name.toLowerCase();
const starts = (re: RegExp) => (p: Product) => re.test(n(p));

export const SUBFAMILIES: Subfamily[] = [
  {
    slug: 'bandes-de-boxe',
    parent: 'accessoires-boxe',
    name: 'Bandes de boxe',
    eyebrow: 'BANDES DE BOXE · 2,50 M ET 4,50 M',
    title: 'Bandes de boxe 2,50 m et 4,50 m : toutes les couleurs',
    description: 'Bandes de boxe semi-élastiques et coton, 2,50 m pour les enfants, 4,50 m pour les adultes. Elion, Fairtex, Everlast, Cleto Reyes, Venum. Prix prévus, livraison en France.',
    prioritaires: ['bandes de boxe', 'bande de boxe'],
    secondaires: ['bandes de boxe 4,5 m', 'bandes de boxe 2,5 m', 'bandes de boxe enfant', 'bandes semi-élastiques', 'bandes coton', 'bandes de boxe Elion', 'bandes de boxe Fairtex', 'comment mettre des bandes de boxe'],
    intro: 'Les bandes de boxe protègent les articulations et le poignet sous le gant. 4,50 m pour un adulte, 2,50 m pour un enfant ou une petite main. Elles se lavent après chaque séance.',
    sections: [
      { h2: 'Semi-élastiques ou coton', paragraphs: ['Les bandes semi-élastiques épousent la main et se serrent facilement : c’est le choix le plus courant. Les bandes coton, plus rigides, tiennent mieux le poignet et conviennent aux frappeurs lourds. Les deux se portent sous n’importe quel gant.'] },
      { h2: 'Longueur et entretien', paragraphs: ['4,50 m couvrent le poignet, la paume et les articulations d’un adulte. 2,50 m suffisent pour un enfant. Lavez les bandes en machine à 30 °C dans un filet et séchez-les à plat : une bande humide restée dans le sac se détend et sent.'] },
    ],
    faq: [
      { question: 'Bandes de boxe 2,50 m ou 4,50 m ?', answer: '4,50 m pour un adulte, 2,50 m pour un enfant ou une petite main. En cas de doute, prenez 4,50 m : on peut toujours faire un tour de plus.' },
      { question: 'Faut-il des bandes avec des gants de boxe ?', answer: 'Oui pour toute frappe au sac ou avec partenaire. Les bandes tiennent le poignet et protègent les articulations ; le gant seul ne le fait pas.' },
    ],
    guide: 'debuter-boxe',
    match: starts(/^bandes? de boxe|^bandes de boxe mexicaines/),
  },
  {
    slug: 'sous-gants',
    parent: 'accessoires-boxe',
    name: 'Sous-gants et mitaines',
    eyebrow: 'SOUS-GANTS · GEL ET MAINTIEN',
    title: 'Sous-gants de boxe gel et mitaines de maintien',
    description: 'Sous-gants gel et mitaines de maintien pour la boxe et le MMA : s’équiper en dix secondes, tenir le poignet. Elion, Venum, Everlast. Tailles réelles, prix prévus.',
    prioritaires: ['sous-gants', 'mitaines'],
    secondaires: ['sous-gants gel', 'sous-gants boxe', 'mitaines de maintien', 'sous-gants Venum', 'sous-gants Elion', 'sous-gants ou bandes'],
    intro: 'Les sous-gants remplacent les bandes pour ceux qui veulent s’équiper vite. Le gel protège les articulations, la sangle tient le poignet. Les mitaines de maintien servent au sac et aux pattes d’ours.',
    sections: [
      { h2: 'Sous-gants gel ou bandes', paragraphs: ['Les bandes tiennent mieux le poignet et se lavent facilement. Les sous-gants gel s’enfilent en dix secondes et protègent bien les articulations au sac. Beaucoup de pratiquants ont les deux et choisissent selon la séance.'] },
      { h2: 'La taille des sous-gants', paragraphs: ['S/M ou L/XL selon la circonférence de la main, d’après le tableau de la marque. Un sous-gant trop serré coupe la circulation ; trop grand, il tourne dans le gant.'] },
    ],
    faq: [
      { question: 'Peut-on porter des sous-gants sans bandes ?', answer: 'Oui, c’est leur rôle. Pour le sparring lourd, certaines salles demandent des bandes en plus : demandez.' },
      { question: 'Les sous-gants se lavent-ils ?', answer: 'À la main, à l’eau tiède, sans essorer fort. Séchage à l’air, loin d’un radiateur.' },
    ],
    guide: 'choisir-gants-boxe',
    match: starts(/^sous-gants|^mitaines/),
  },
  {
    slug: 'protege-dents',
    parent: 'protections-boxe',
    name: 'Protège-dents',
    eyebrow: 'PROTÈGE-DENTS · SIMPLE, DOUBLE, AVEC BAGUES',
    title: 'Protège-dents boxe et MMA : à mouler, double, bagues',
    description: 'Protège-dents de boxe et de MMA à mouler, double arcade, pour appareil dentaire, adulte et enfant. Shock Doctor, Elion, Metal Boxe, Venum. Prix prévus, livraison en France.',
    prioritaires: ['protège-dents', 'protège-dents boxe'],
    secondaires: ['protège-dents à mouler', 'protège-dents double', 'protège-dents appareil dentaire', 'protège-dents enfant', 'protège-dents MMA', 'protège-dents Shock Doctor', 'boîte protège-dents'],
    intro: 'Le protège-dents est la première protection à acheter : il sert dès le premier travail à deux. À mouler dans l’eau chaude, simple ou double arcade, avec des modèles pour appareil dentaire.',
    sections: [
      { h2: 'À mouler, double arcade, bagues', paragraphs: ['Le protège-dents à mouler se forme dans l’eau chaude et se remoule si besoin. Le double arcade couvre les deux mâchoires. Les modèles pour appareil dentaire ne se moulent pas sur les bagues : suivez la notice, et demandez conseil à un dentiste pour un enfant.'] },
      { h2: 'Taille et entretien', paragraphs: ['Junior jusqu’à 11 ans environ, adulte au-delà, selon la marque. Rincez après chaque séance, rangez dans sa boîte aérée, remplacez-le quand il se déforme ou se perce.'] },
    ],
    faq: [
      { question: 'Comment mouler un protège-dents ?', answer: 'Trempez-le dans l’eau chaude le temps indiqué par la notice, placez-le sur les dents du haut, mordez et aspirez, puis passez-le à l’eau froide. Il se remoule si le résultat ne va pas.' },
      { question: 'Protège-dents simple ou double ?', answer: 'Simple pour la plupart des usages : il gêne moins la respiration. Double pour le contact lourd ou quand votre salle le demande.' },
    ],
    guide: 'choisir-protections',
    match: starts(/^protège-dents|^boîte pour protège-dents/),
  },
  {
    slug: 'casques-de-boxe',
    parent: 'protections-boxe',
    name: 'Casques de boxe',
    eyebrow: 'CASQUE DE BOXE · ENTRAÎNEMENT ET SPARRING',
    title: 'Casque de boxe : entraînement, sparring, à barre',
    description: 'Casques de boxe ouverts, à pommettes, à barre et intégraux, adulte et enfant. Elion, Fairtex, Adidas, Century, Top Ten. Tailles réelles, prix prévus, livraison en France.',
    prioritaires: ['casque de boxe', 'casques de boxe'],
    secondaires: ['casque boxe entraînement', 'casque boxe sparring', 'casque de boxe à barre', 'casque intégral boxe', 'casque de boxe enfant', 'casque MMA', 'taille casque de boxe', 'casque boxe cuir'],
    intro: 'Un casque de boxe se choisit par son tour de tête et par sa couverture. Ouvert pour l’entraînement, à pommettes pour le sparring, à barre ou intégral pour protéger le nez et le menton.',
    sections: [
      { h2: 'Ouvert, à pommettes, à barre, intégral', paragraphs: ['Le casque ouvert laisse la vision libre et suffit pour l’entraînement technique. Le casque à pommettes protège les joues au sparring. Le casque à barre ou intégral protège le nez et le menton, au prix d’une vision réduite : c’est le choix du sparring appuyé.'] },
      { h2: 'La taille, puis la tenue en mouvement', paragraphs: ['Mesurez le tour de tête et suivez la grille de la marque. Enfilez le casque, bougez la tête, esquivez : il ne doit ni tourner ni descendre sur les yeux. Un casque qui bouge ne devient pas adapté en serrant plus fort.'] },
    ],
    faq: [
      { question: 'Faut-il un casque pour débuter la boxe ?', answer: 'Non. Le casque arrive avec le sparring, quand votre salle le demande. Pour le sac et la technique, il ne sert à rien.' },
      { question: 'Le casque de boxe protège-t-il des commotions ?', answer: 'Il réduit les coupures et les chocs superficiels, pas le risque de commotion. Gardez les consignes d’intensité de votre cours.' },
    ],
    guide: 'choisir-protections',
    match: (p) => n(p).startsWith('casque'),
  },
  {
    slug: 'protege-tibias',
    parent: 'protections-boxe',
    name: 'Protège-tibias',
    eyebrow: 'PROTÈGE-TIBIAS · MUAY-THAÏ, MMA, KARATÉ',
    title: 'Protège-tibias : muay-thaï, kick-boxing, MMA, karaté',
    description: 'Protège-tibias avec pied couvert pour le muay-thaï, le kick-boxing et le MMA, protège-tibias seuls pour le karaté. Fairtex, Twins, Elion, Adidas. Tailles réelles, prix prévus.',
    prioritaires: ['protège-tibias', 'protège-tibias et pieds'],
    secondaires: ['protège-tibias MMA', 'protège-tibias muay-thaï', 'protège-tibias karaté', 'protège-tibias enfant', 'protège-tibias Fairtex', 'protège-tibias Twins', 'taille protège-tibias'],
    intro: 'Les protège-tibias absorbent les coups de pied donnés et reçus. Avec pied couvert pour le pieds-poings et le MMA, sans pied pour le karaté selon les règles. La taille suit la longueur du tibia.',
    sections: [
      { h2: 'Avec ou sans pied', paragraphs: ['Le protège-tibias et pieds couvre le cou-de-pied : c’est le modèle du muay-thaï, du kick-boxing et du MMA. Le protège-tibias seul, en tissu ou en mousse, sert au karaté et à la savate selon la fédération. Vérifiez ce que votre cours demande.'] },
      { h2: 'La taille et le maintien', paragraphs: ['Mesurez du genou à la cheville et suivez la grille de la marque. Deux sangles tiennent mieux qu’une ; le protège-tibias ne doit pas tourner quand vous frappez.'] },
    ],
    faq: [
      { question: 'Quelle taille de protège-tibias ?', answer: 'Celle de la grille de la marque, mesurée du genou à la cheville. Entre deux tailles, prenez la plus grande si le maintien par sangles est bon.' },
      { question: 'Les protège-tibias de karaté servent-ils pour le MMA ?', answer: 'Rarement : trop fins et sans pied. Le MMA et le muay-thaï demandent un rembourrage épais avec le pied couvert.' },
    ],
    guide: 'choisir-protections',
    match: starts(/^protège-tibias/),
  },
  {
    slug: 'coquilles',
    parent: 'protections-boxe',
    name: 'Coquilles et protections pelviennes',
    eyebrow: 'COQUILLE DE BOXE · HOMME ET FEMME',
    title: 'Coquille de boxe et protection pelvienne',
    description: 'Coquilles de boxe et de MMA pour homme, protections pelviennes pour femme, protège-poitrine. Shock Doctor, Elion, Adidas, Champboxing. Tailles réelles, prix prévus.',
    prioritaires: ['coquille de boxe', 'coquille'],
    secondaires: ['coquille MMA', 'coquille boxe thaï', 'protection pelvienne femme', 'protège-poitrine', 'coquille Shock Doctor', 'taille coquille'],
    intro: 'La coquille protège le bas-ventre pour le pieds-poings, le MMA et le sparring. Les protections pelviennes pour femme et les protège-poitrine complètent la liste selon la discipline.',
    sections: [
      { h2: 'Coquille de boxe, coquille de MMA', paragraphs: ['La coquille de boxe thaï, large et rembourrée, se porte par-dessus le short. La coquille de MMA et de boxe anglaise se porte sous le short, dans un slip de maintien ou avec ses sangles. Choisissez selon la discipline et le confort au sol.'] },
      { h2: 'Tenue et hygiène', paragraphs: ['La coquille ne doit pas bouger quand vous levez le genou. Lavez le support après chaque séance ; la coque se rince.'] },
    ],
    faq: [
      { question: 'Une coquille est-elle obligatoire ?', answer: 'Pour le sparring, le pieds-poings et le MMA, la plupart des salles la demandent. Pour le sac et la technique, non.' },
      { question: 'Quelle taille de coquille ?', answer: 'Celle du tour de taille selon la grille de la marque. Une coquille trop petite bouge, trop grande elle gêne.' },
    ],
    guide: 'choisir-protections',
    match: starts(/^coquille|^protection pelvienne|^protège-poitrine|^support et coquille/),
  },
  {
    slug: 'pattes-d-ours',
    parent: 'equipement-entrainement',
    name: 'Pattes d’ours et paos',
    eyebrow: 'PATTES D’OURS · PAOS ET BOUCLIERS',
    title: 'Pattes d’ours, paos et boucliers de frappe',
    description: 'Pattes d’ours pour la précision, paos et boucliers pour la puissance, raquettes pour les réflexes. Fairtex, Elion, Cleto Reyes, Metal Boxe. Cuir ou synthétique, prix prévus.',
    prioritaires: ['pattes d’ours', 'paos'],
    secondaires: ['pattes d’ours boxe', 'pattes d’ours cuir', 'pao boxe thaï', 'bouclier de frappe', 'raquettes de boxe', 'pattes d’ours Fairtex', 'pattes d’ours Elion', 'matériel coach boxe'],
    intro: 'Les pattes d’ours se tiennent à deux : l’un frappe, l’autre présente la cible. Petites et courbées pour la précision et la vitesse, elles laissent aux paos et aux boucliers les coups de pied et la puissance.',
    sections: [
      { h2: 'Pattes d’ours, paos, boucliers, raquettes', paragraphs: ['Pattes d’ours pour les poings et les enchaînements. Paos, longs et épais, pour les coups de pied, les genoux et les coudes de la boxe thaï. Boucliers pour les frappes lourdes. Raquettes pour les réflexes et la vitesse.'] },
      { h2: 'Cuir ou synthétique', paragraphs: ['Le cuir dure plus longtemps sous les frappes répétées ; le synthétique coûte moins cher et convient à un usage personnel. La densité de la mousse compte plus que la matière du dessus : une mousse fine se sent dans la main du coach.'] },
    ],
    faq: [
      { question: 'Pattes d’ours courbées ou plates ?', answer: 'Courbées pour amortir et guider les frappes, c’est le choix le plus courant. Plates pour la précision pure et les crochets.' },
      { question: 'Peut-on s’entraîner seul avec des pattes d’ours ?', answer: 'Non, il faut un partenaire pour les tenir. Seul, préférez un sac de frappe ou un punching-ball.' },
    ],
    guide: 'debuter-boxe',
    match: starts(/^pattes d’ours|^mini pattes|^raquettes|^bouclier|^cible/),
  },
  {
    slug: 'cordes-a-sauter',
    parent: 'equipement-entrainement',
    name: 'Cordes à sauter',
    eyebrow: 'CORDE À SAUTER · BOXE ET CARDIO',
    title: 'Corde à sauter de boxe : vitesse, lestée, ondulatoire',
    description: 'Cordes à sauter de boxe, cordes de vitesse, cordes lestées et cordes ondulatoires pour l’échauffement et le cardio. Elion, Century, Everlast. Prix prévus, livraison en France.',
    prioritaires: ['corde à sauter', 'corde à sauter boxe'],
    secondaires: ['corde à sauter vitesse', 'corde à sauter lestée', 'corde ondulatoire', 'corde à sauter cuir', 'longueur corde à sauter', 'corde à sauter enfant'],
    intro: 'La corde à sauter ouvre chaque séance de boxe : cardio, appuis, rythme. Corde de vitesse pour la cadence, corde lestée pour les épaules, corde ondulatoire pour le travail de puissance.',
    sections: [
      { h2: 'Vitesse, lestée, ondulatoire', paragraphs: ['La corde de vitesse, câble fin et poignées légères, sert au rythme et aux doubles sauts. La corde lestée travaille les épaules et le cardio. La corde ondulatoire, lourde et courte, se secoue au sol pour la puissance et le gainage.'] },
      { h2: 'La bonne longueur', paragraphs: ['Posez un pied au milieu de la corde : les poignées doivent arriver aux aisselles. Les cordes réglables se coupent à la longueur voulue.'] },
    ],
    faq: [
      { question: 'Quelle corde à sauter pour débuter la boxe ?', answer: 'Une corde réglable, câble gainé ou PVC, à la longueur des aisselles. La corde de vitesse vient quand le geste est en place.' },
      { question: 'Combien de temps de corde avant une séance ?', answer: 'Cinq à dix minutes par tranches, comme un échauffement. Votre entraîneur ajuste selon le cours.' },
    ],
    guide: 'debuter-boxe',
    match: starts(/^corde à sauter|^corde ondulatoire/),
  },
  {
    slug: 'poires-de-vitesse',
    parent: 'sacs-de-frappe',
    name: 'Poires de vitesse et punching-balls',
    eyebrow: 'POIRE DE VITESSE · PUNCHING-BALL, BALLE RÉFLEXE',
    title: 'Poire de vitesse, punching-ball et balle réflexe',
    description: 'Poires de vitesse, punching-balls sur ressort et balles réflexe pour le rythme, la précision et les esquives. Cleto Reyes, Everlast, Elion, Fairtex. Prix prévus, livraison en France.',
    prioritaires: ['poire de vitesse', 'punching-ball'],
    secondaires: ['poire de vitesse boxe', 'plateforme poire de vitesse', 'punching-ball sur ressort', 'balle réflexe', 'poire de vitesse Cleto Reyes', 'punching-ball maison'],
    intro: 'La poire de vitesse travaille le rythme et la coordination sous une plateforme. Le punching-ball sur ressort travaille la précision et les esquives. La balle réflexe, fixée à un bandeau, s’emporte partout.',
    sections: [
      { h2: 'Poire, punching-ball, balle réflexe', paragraphs: ['La poire de vitesse demande une plateforme fixée au mur et un pivot. Le punching-ball sur pied ou sur ressort ne demande qu’un peu de place au sol. La balle réflexe tient dans une poche et se pratique seul, sans installation.'] },
      { h2: 'Tailles de poires', paragraphs: ['Petite poire, 13 à 16 cm, pour la vitesse. Grande poire, 20 à 25 cm, pour apprendre le rythme. La fiche indique le diamètre et si le gonflage est nécessaire.'] },
    ],
    faq: [
      { question: 'Poire de vitesse ou punching-ball ?', answer: 'Poire de vitesse pour le rythme et la coordination, avec une plateforme. Punching-ball pour la précision et les esquives, sans installation lourde.' },
      { question: 'Faut-il des gants pour la poire de vitesse ?', answer: 'Des sous-gants ou des gants de sac fins suffisent. Les gros gants de boxe gênent le rythme.' },
    ],
    guide: 'debuter-boxe',
    match: starts(/^poire de vitesse|^punching-ball|^balle réflexe/),
  },
  {
    slug: 'sacs-de-frappe-sur-pied',
    parent: 'sacs-de-frappe',
    name: 'Sacs de frappe sur pied',
    eyebrow: 'SAC DE FRAPPE SUR PIED · SANS FIXATION',
    title: 'Sac de frappe sur pied : sans percer, à déplacer',
    description: 'Sacs de frappe sur pied et mannequins de frappe : sans fixation au plafond, base à lester, hauteur réglable. Century Wavemaster, Elion, Metal Boxe. Prix prévus, livraison en France.',
    prioritaires: ['sac de frappe sur pied', 'sac de frappe autoportant'],
    secondaires: ['sac de frappe sur pied maison', 'mannequin de frappe', 'Century Wavemaster', 'base à lester', 'sac de frappe sans fixation', 'sac de frappe appartement'],
    intro: 'Un sac de frappe sur pied s’installe sans percer et se déplace. Sa base se remplit d’eau ou de sable ; sa hauteur se règle. C’est le choix de l’appartement et de la salle qui change de configuration.',
    sections: [
      { h2: 'Sac sur pied ou sac suspendu', paragraphs: ['Le sac suspendu bouge et travaille les déplacements, mais il demande un plafond ou une potence solide. Le sac sur pied reste en place, bouge moins et se range dans un coin. Il glisse au sol si la base n’est pas assez lourde.'] },
      { h2: 'Mannequin de frappe', paragraphs: ['Le mannequin de frappe donne des cibles à hauteur réelle : tête, foie, plexus. Il sert à la précision et aux enchaînements, en boxe comme en MMA.'] },
    ],
    faq: [
      { question: 'Un sac sur pied bouge-t-il ?', answer: 'Il glisse si la base est mal remplie. Remplissez-la de sable plutôt que d’eau pour plus de stabilité, et posez-la sur un tapis.' },
      { question: 'Quelle place pour un sac sur pied ?', answer: 'Un cercle de 1,50 m autour du sac pour tourner et se déplacer, plus la hauteur du sac, jusqu’à 1,80 m.' },
    ],
    guide: 'debuter-boxe',
    match: starts(/^sac de frappe sur pied|^mannequin de frappe|^base de frappe/),
  },
  {
    slug: 'rashguards',
    parent: 'textile-boxe',
    name: 'Rashguards',
    eyebrow: 'RASHGUARD · MMA, JJB, GRAPPLING',
    title: 'Rashguard MMA et JJB : manches courtes et longues',
    description: 'Rashguards pour le MMA, le JJB et le grappling, manches courtes et longues, homme et femme. Elion, Venum, Athena, Bõa. Tailles réelles, prix prévus, livraison en France.',
    prioritaires: ['rashguard', 'rashguards'],
    secondaires: ['rashguard MMA', 'rashguard JJB', 'rashguard manches longues', 'rashguard femme', 'rashguard Elion', 'rashguard Naruto', 'rashguard compression'],
    intro: 'Le rashguard est le haut du grappling et du MMA : près du corps, il protège la peau des frottements et sèche vite. Manches courtes pour la chaleur, manches longues pour le sol.',
    sections: [
      { h2: 'Manches courtes ou longues', paragraphs: ['Manches longues pour le JJB et le grappling : les bras frottent le tapis et le kimono du partenaire. Manches courtes pour le MMA debout et le sac quand il fait chaud. Beaucoup de salles imposent le rashguard en no-gi.'] },
      { h2: 'La taille d’un rashguard', paragraphs: ['Près du corps sans comprimer : prenez la taille du guide de la marque et bougez les bras. Un rashguard trop grand fait des plis et accroche ; trop petit, il remonte.'] },
    ],
    faq: [
      { question: 'Le rashguard est-il obligatoire en JJB ?', answer: 'En no-gi, presque toujours. Sous le kimono, beaucoup de pratiquants le portent aussi pour l’hygiène. Demandez à votre salle.' },
      { question: 'Rashguard ou t-shirt de compression ?', answer: 'Le rashguard est pensé pour le sol : coutures plates, tissu résistant aux frottements. Un t-shirt de compression convient au sac, moins au grappling.' },
    ],
    guide: 'debuter-mma',
    match: starts(/^rashguard/),
  },
  {
    slug: 'shorts-mma',
    parent: 'textile-boxe',
    name: 'Shorts MMA',
    eyebrow: 'SHORT MMA · SANS POCHE, SANS FERMETURE',
    title: 'Short MMA : sans poche, pour le sol et le debout',
    description: 'Shorts MMA sans poche ni fermeture, avec empiècements extensibles, homme et femme. Elion, Venum, Everlast, Century. Tailles réelles, prix prévus, livraison en France.',
    prioritaires: ['short MMA', 'shorts MMA'],
    secondaires: ['short MMA homme', 'short MMA femme', 'short MMA Elion', 'short MMA Venum', 'short de grappling', 'short MMA taille', 'short MMA Naruto'],
    intro: 'Le short MMA n’a ni poche ni fermeture : rien n’accroche au sol ni ne blesse le partenaire. Un empiècement extensible à l’entrejambe laisse lever le genou. Il se porte à la taille, avec un cordon.',
    sections: [
      { h2: 'Ce qui fait un short MMA', paragraphs: ['Pas de poche, pas de fermeture, pas de cordon apparent. Un tissu résistant et un empiècement extensible. Une ceinture à velcro ou à cordon intérieur qui reste fermée au sol.'] },
      { h2: 'La taille', paragraphs: ['Celle du tour de taille dans le guide de la marque. Le short doit rester en place quand vous levez la jambe et quand on vous saisit.'] },
    ],
    faq: [
      { question: 'Short MMA ou short de boxe thaï ?', answer: 'Le short thaï est large et court pour les coups de pied ; il a parfois un élastique apparent. Le short MMA est ajusté et sans accroche pour le sol. Pour un cours de MMA, prenez un short MMA.' },
      { question: 'Peut-on porter un short MMA en JJB no-gi ?', answer: 'Oui, c’est le short le plus courant en no-gi, avec ou sans spats dessous.' },
    ],
    guide: 'debuter-mma',
    match: starts(/^short mma/),
  },
  {
    slug: 'shorts-de-boxe',
    parent: 'textile-boxe',
    name: 'Shorts de boxe',
    eyebrow: 'SHORT DE BOXE · ANGLAISE ET THAÏ',
    title: 'Short de boxe anglaise et short de boxe thaï',
    description: 'Shorts de boxe anglaise longs et fendus, shorts de boxe thaï courts et larges, shorts d’entraînement. Elion, Fairtex, Wicked One, 8 Weapons, Cleto Reyes. Tailles réelles, prix prévus.',
    prioritaires: ['short de boxe', 'shorts de boxe'],
    secondaires: ['short de boxe anglaise', 'short de boxe thaï', 'short boxe Fairtex', 'short de boxe Elion', 'short muay-thaï', 'short de boxe femme', 'short de boxe enfant', 'taille short de boxe'],
    intro: 'Le short de boxe anglaise descend au genou et se fend sur le côté pour les déplacements. Le short de boxe thaï est court et large pour lever le genou et frapper du pied. Les deux se portent à la taille.',
    sections: [
      { h2: 'Anglaise ou thaï', paragraphs: ['Boxe anglaise : short long, ceinture large, coupe droite. Boxe thaï et kick-boxing : short court, satin ou polyester, fentes hautes. Le short de sport ou d’entraînement, sans fente, sert au sac et au cardio.'] },
      { h2: 'La taille', paragraphs: ['Celle du tour de taille dans le guide de la marque. Un short de boxe se porte à la taille, pas sur les hanches, sinon il descend au premier déplacement.'] },
    ],
    faq: [
      { question: 'Quel short pour un cours de boxe anglaise ?', answer: 'Un short de boxe anglaise long et fendu, ou un short de sport ample sans poche. Le short thaï, très court, n’est pas l’usage.' },
      { question: 'Le short de boxe thaï se porte-t-il grand ?', answer: 'Il se porte à la taille, ample sur la cuisse. Prenez la taille du guide de la marque, pas une taille au-dessus.' },
    ],
    guide: 'guide-des-tailles',
    match: (p) => n(p).startsWith('short') && !n(p).startsWith('short mma'),
  },
  {
    slug: 't-shirts-boxe',
    parent: 'textile-boxe',
    name: 'T-shirts de boxe',
    eyebrow: 'T-SHIRT DE BOXE · COTON ET RESPIRANT',
    title: 'T-shirt de boxe : coton, respirant, enfant et adulte',
    description: 'T-shirts de boxe et de sports de combat en coton ou respirants, adulte et enfant. Elion, Everlast, Venum, Adidas, Champboxing. Tailles réelles, prix prévus, livraison en France.',
    prioritaires: ['t-shirt de boxe', 't-shirts de boxe'],
    secondaires: ['t-shirt boxe homme', 't-shirt boxe femme', 't-shirt boxe enfant', 't-shirt Elion', 't-shirt Everlast', 't-shirt respirant boxe', 't-shirt Naruto Elion'],
    intro: 'Le t-shirt de boxe sert au sac, à la technique et à la vie de tous les jours. Coton pour le confort, tissu respirant pour les séances longues. Les collaborations Elion existent aussi en t-shirt.',
    sections: [
      { h2: 'Coton ou respirant', paragraphs: ['Le coton est confortable et se lave à 40 °C. Le tissu respirant sèche pendant la séance et pèse moins. Pour le grappling, préférez un rashguard : le t-shirt s’accroche et se déchire.'] },
      { h2: 'La taille', paragraphs: ['Celle du guide de la marque. Les coupes Elion sont droites, les coupes Everlast plus larges : lisez les mesures de la fiche.'] },
    ],
    faq: [
      { question: 'T-shirt ou débardeur pour la boxe ?', answer: 'Le débardeur libère les épaules et tient chaud moins vite. Le t-shirt protège les épaules au sac et convient partout. C’est une affaire de préférence.' },
    ],
    guide: 'guide-des-tailles',
    match: starts(/^t-shirt|^polo/),
  },
  {
    slug: 'sweats-boxe',
    parent: 'textile-boxe',
    name: 'Sweats et vestes de boxe',
    eyebrow: 'SWEAT DE BOXE · CAPUCHE, ZIPPÉ, PEIGNOIR',
    title: 'Sweat de boxe : capuche, zippé, sans manches',
    description: 'Sweats de boxe à capuche, zippés, sans manches, vestes et peignoirs de boxe. Elion, Everlast, Venum, Hayabusa, Cleto Reyes. Tailles réelles, prix prévus, livraison en France.',
    prioritaires: ['sweat de boxe', 'sweats de boxe'],
    secondaires: ['sweat à capuche boxe', 'sweat zippé boxe', 'sweat Elion', 'sweat Everlast', 'peignoir de boxe', 'veste de boxe', 'sweat boxe femme'],
    intro: 'Le sweat de boxe sert avant et après la séance : échauffement, retour au calme, trajet. À capuche, zippé ou sans manches. Le peignoir de boxe reste l’habit du ring.',
    sections: [
      { h2: 'Capuche, zippé, sans manches', paragraphs: ['Le sweat à capuche tient chaud à l’échauffement. Le zippé s’enlève vite entre deux rounds. Le sans manches, l’été, libère les bras pour la corde. Le peignoir de boxe, avec capuche, se porte pour monter sur le ring.'] },
      { h2: 'La taille', paragraphs: ['Celle du guide de la marque. Un sweat d’échauffement se prend à sa taille, pas plus grand : il ne doit pas flotter à la corde.'] },
    ],
    faq: [
      { question: 'Peut-on s’entraîner en sweat ?', answer: 'À l’échauffement, oui. Pendant la séance, la plupart des pratiquants le retirent. Les sweats de perte de poids sont une autre catégorie, à utiliser avec prudence.' },
    ],
    guide: 'guide-des-tailles',
    match: starts(/^sweat|^veste|^peignoir/),
  },
  {
    slug: 'debardeurs-boxe',
    parent: 'textile-boxe',
    name: 'Débardeurs de boxe',
    eyebrow: 'DÉBARDEUR DE BOXE · ENTRAÎNEMENT ET COMPÉTITION',
    title: 'Débardeur de boxe : entraînement et compétition',
    description: 'Débardeurs de boxe anglaise pour l’entraînement et la compétition, homme et femme. Elion, Everlast, Adidas, Cleto Reyes, Champboxing. Tailles réelles, prix prévus, livraison en France.',
    prioritaires: ['débardeur de boxe', 'débardeurs de boxe'],
    secondaires: ['débardeur boxe anglaise', 'débardeur de compétition', 'débardeur Elion', 'débardeur Everlast', 'débardeur boxe femme', 'tenue de compétition boxe'],
    intro: 'Le débardeur libère les épaules pour la garde et les crochets. À l’entraînement, un débardeur respirant ; en compétition, le débardeur assorti au short, dans les couleurs du coin.',
    sections: [
      { h2: 'Entraînement et compétition', paragraphs: ['Le débardeur d’entraînement, en polyester ou en coton, sert au sac et à la technique. Le débardeur de compétition suit le règlement : couleur du coin, pas de motif gênant. Certaines fédérations imposent la coupe.'] },
      { h2: 'La taille', paragraphs: ['Près du corps sans serrer. Prenez la taille du guide de la marque et levez les bras : rien ne doit tirer.'] },
    ],
    faq: [
      { question: 'Le débardeur est-il obligatoire en compétition ?', answer: 'En boxe anglaise amateur, oui, assorti au short et aux couleurs du coin. Vérifiez le règlement de votre fédération.' },
    ],
    guide: 'guide-des-tailles',
    match: starts(/^débardeur/),
  },
  {
    slug: 'leggings',
    parent: 'textile-boxe',
    name: 'Leggings, spats et pantalons',
    eyebrow: 'LEGGING · SPATS, PANTALONS DE BOXE FRANÇAISE',
    title: 'Leggings, spats de grappling et pantalons de boxe',
    description: 'Leggings et spats pour le grappling et le MMA, pantalons de boxe française et de jogging. Elion, Venum, Everlast, Champboxing. Tailles réelles, prix prévus, livraison en France.',
    prioritaires: ['legging', 'spats'],
    secondaires: ['spats grappling', 'legging MMA', 'pantalon de boxe française', 'pantalon de jogging boxe', 'legging femme boxe', 'spats Elion'],
    intro: 'Les spats couvrent les jambes au sol : moins de frottements, moins d’infections de peau. Le pantalon de boxe française fait partie de la tenue de savate. Le jogging sert au trajet et à l’échauffement.',
    sections: [
      { h2: 'Spats, leggings, pantalons', paragraphs: ['Spats et leggings de compression se portent seuls ou sous un short en no-gi. Le pantalon de boxe française, ajusté et extensible, est obligatoire en compétition de savate. Le jogging, ample, ne sert pas sur le tapis.'] },
      { h2: 'La taille', paragraphs: ['Près du corps sans comprimer, à la taille du guide de la marque. Le pantalon de boxe française se prend à sa taille exacte.'] },
    ],
    faq: [
      { question: 'Faut-il des spats pour le JJB ?', answer: 'En no-gi, ils sont très répandus pour l’hygiène et les frottements. Sous le kimono, c’est une préférence.' },
    ],
    guide: 'guide-des-tailles',
    match: starts(/^legging|^spats|^pantalon/),
  },
  {
    slug: 'kimonos',
    parent: 'arts-martiaux',
    name: 'Kimonos',
    eyebrow: 'KIMONO · JJB, KARATÉ, JUDO',
    title: 'Kimono de JJB et de karaté : tailles A0 à A4',
    description: 'Kimonos de jiu-jitsu brésilien en A0 à A4, kimonos de karaté et de judo, adulte et enfant. Elion, Manto, Metal Boxe, Kwon, Dojo Master. Tissage, poids, prix prévus.',
    prioritaires: ['kimono', 'kimono de JJB'],
    secondaires: ['kimono JJB adulte', 'kimono JJB enfant', 'kimono karaté', 'kimono judo', 'kimono Elion Squale', 'kimono Manto', 'taille kimono A2', 'kimono blanc', 'kimono noir'],
    intro: 'Le kimono de JJB est tissé serré pour résister aux saisies ; ses tailles A0 à A4 suivent la taille et le poids. Le kimono de karaté est plus léger et plus ample. Chaque fiche indique le tissage et le poids.',
    sections: [
      { h2: 'JJB, karaté, judo', paragraphs: ['Le kimono de JJB, veste épaisse et pantalon renforcé, se porte avec une ceinture de JJB. Le kimono de karaté, léger, laisse les coups de pied libres. Le kimono de judo, très épais, résiste aux projections. Ils ne s’échangent pas.'] },
      { h2: 'Tailles A et rétrécissement', paragraphs: ['A0 à A4 selon la taille et le poids dans le tableau de la marque, avec des tailles L pour les grands minces. Un kimono en coton peut rétrécir au premier lavage : lavez à froid et séchez à l’air, ou choisissez un modèle prérétréci.'] },
    ],
    faq: [
      { question: 'Quelle taille de kimono de JJB ?', answer: 'Suivez le tableau taille et poids de la marque. Entre deux tailles, prenez la plus grande si le kimono n’est pas prérétréci.' },
      { question: 'Blanc, bleu ou noir ?', answer: 'En compétition IBJJF, blanc, bleu ou noir uniformes. À l’entraînement, la couleur est libre sauf règle de la salle.' },
    ],
    guide: 'choisir-protections',
    match: starts(/^kimono|^dobok|^hakama|^tenue de kung-fu|^pantalon de kung-fu/),
  },
  {
    slug: 'ceintures',
    parent: 'arts-martiaux',
    name: 'Ceintures',
    eyebrow: 'CEINTURE DE JJB · KARATÉ, JUDO',
    title: 'Ceinture de JJB, de karaté et de judo par grade',
    description: 'Ceintures de JJB, de karaté et de judo, blanches, bleues, violettes, marron et noires, adulte et enfant. Elion, Kwon, Metal Boxe. Longueurs réelles, prix prévus, livraison en France.',
    prioritaires: ['ceinture de JJB', 'ceinture'],
    secondaires: ['ceinture de JJB blanche', 'ceinture de JJB bleue', 'ceinture de karaté', 'ceinture de judo', 'ceinture enfant', 'longueur ceinture', 'ceinture Elion Squale'],
    intro: 'La ceinture marque le grade et ferme le kimono. En JJB, blanche, bleue, violette, marron, noire, avec une barre pour les degrés. En karaté et en judo, les couleurs suivent le système de chaque fédération.',
    sections: [
      { h2: 'Grades et longueurs', paragraphs: ['Une ceinture se prend à la longueur de la taille du kimono, A0 à A4 ou 200 à 300 cm selon la marque. Deux tours de taille et vingt centimètres de chaque côté du nœud : c’est la bonne longueur.'] },
      { h2: 'Entretien', paragraphs: ['Une ceinture de JJB se lave, contrairement à la légende : à froid, sans sèche-linge, pour qu’elle garde sa longueur.'] },
    ],
    faq: [
      { question: 'Quelle ceinture pour débuter le JJB ?', answer: 'La ceinture blanche. Le professeur la remet souvent avec le premier kimono ; sinon, prenez-la à la longueur du kimono.' },
    ],
    guide: 'choisir-protections',
    match: (p) => n(p).startsWith('ceinture') && !n(p).includes('ceinture de frappe'),
  },
  {
    slug: 'gants-de-boxe-enfant',
    parent: 'gants-de-boxe',
    name: 'Gants de boxe enfant',
    eyebrow: 'GANTS DE BOXE ENFANT · 4, 6 ET 8 OZ',
    title: 'Gants de boxe enfant : 4, 6 et 8 oz, de 5 à 14 ans',
    description: 'Gants de boxe pour enfant de 4, 6 et 8 oz, velcro, de 5 à 14 ans, avec les kits gants et bandes. Metal Boxe, RDX, Elion, Adidas, Everlast. Tailles réelles, prix prévus.',
    prioritaires: ['gants de boxe enfant', 'gants de boxe junior'],
    secondaires: ['gants de boxe 4 oz', 'gants de boxe 6 oz', 'gants de boxe 8 oz', 'gants de boxe enfant 6 ans', 'gants de boxe enfant 10 ans', 'kit boxe enfant', 'taille gants de boxe enfant', 'gants de boxe fille'],
    intro: 'Un enfant boxe avec des gants légers et fermés au velcro : 4 oz de 5 à 7 ans, 6 oz de 7 à 10 ans, 8 oz de 10 à 13 ans, selon la corpulence. Faites essayer avec les bandes, poing fermé.',
    sections: [
      { h2: 'Le poids selon l’âge', paragraphs: ['4 oz pour les plus petits, 6 oz vers 7 à 10 ans, 8 oz de 10 à 13 ans, 10 oz pour les adolescents. Ce sont des repères : un enfant grand pour son âge passe à la taille au-dessus. Le guide enfant détaille les tranches d’âge et l’essayage.'] },
      { h2: 'Velcro, coupe et essayage', paragraphs: ['Le velcro se ferme seul, sans aide. Enfilez les deux gants avec les bandes prévues, demandez à l’enfant de fermer le poing et de tenir sa garde : les doigts ne doivent pas flotter ni être comprimés.'] },
    ],
    faq: [
      { question: 'Quels gants de boxe pour un enfant de 8 ans ?', answer: '6 oz en général, 8 oz s’il est grand. Vérifiez le poids demandé par le cours et faites essayer avec les bandes.' },
      { question: 'Un enfant a-t-il besoin de bandes ?', answer: 'Oui dès qu’il frappe au sac ou aux pattes d’ours : des bandes de 2,50 m, faciles à mettre.' },
    ],
    guide: 'equipement-enfant',
    match: (p) => p.category === 'gants-de-boxe' && (p.audience === 'enfant' || /enfant|junior|kids?\b/.test(n(p)) || p.sizes.some((s) => /^(4|6) oz/.test(s))),
  },
  {
    slug: 'gants-de-boxe-a-lacets',
    parent: 'gants-de-boxe',
    name: 'Gants de boxe à lacets',
    eyebrow: 'GANTS DE BOXE À LACETS · SPARRING ET COMPÉTITION',
    title: 'Gants de boxe à lacets : sparring et compétition',
    description: 'Gants de boxe à lacets pour le sparring et la compétition, cuir, 8 à 18 oz. Elion, Cleto Reyes, Fairtex, Twins. Tailles réelles, prix prévus, livraison en France.',
    prioritaires: ['gants de boxe à lacets', 'gants à lacets'],
    secondaires: ['gants de boxe lacets ou velcro', 'gants de sparring à lacets', 'gants de compétition boxe', 'convertisseur lacets velcro', 'gants Cleto Reyes lacets', 'gants Elion lacets'],
    intro: 'Les lacets serrent le poignet mieux que le velcro et ne s’ouvrent pas au contact. Ils demandent quelqu’un pour les nouer : c’est le choix du sparring encadré et de la compétition.',
    sections: [
      { h2: 'Lacets ou velcro', paragraphs: ['Le velcro se met seul : entraînement, sac, cours collectif. Les lacets tiennent mieux et n’abîment pas le partenaire : sparring, compétition, avec un coach ou un partenaire pour serrer. Un convertisseur lacets-velcro permet de porter des gants à lacets seul.'] },
      { h2: 'Les marques à lacets', paragraphs: ['Cleto Reyes, Elion, Fairtex et Twins proposent des gants à lacets en cuir, de 8 à 18 oz. La fiche indique la coupe et le rembourrage.'] },
    ],
    faq: [
      { question: 'Peut-on mettre seul des gants à lacets ?', answer: 'Difficilement. Un convertisseur lacets-velcro, vendu à part, résout le problème pour l’entraînement.' },
    ],
    guide: 'choisir-gants-boxe',
    match: (p) => p.category === 'gants-de-boxe' && /lacets/.test(n(p)),
  },
  {
    slug: 'gants-de-boxe-sparring',
    parent: 'gants-de-boxe',
    name: 'Gants de boxe sparring',
    eyebrow: 'GANTS DE SPARRING · 14, 16 ET 18 OZ',
    title: 'Gants de boxe sparring 14, 16 et 18 oz',
    description: 'Gants de boxe de sparring de 14, 16 et 18 oz, rembourrage épais pour le travail avec partenaire. Cleto Reyes, Fairtex, Twins, Elion, Adidas. Tailles réelles, prix prévus.',
    prioritaires: ['gants de boxe sparring', 'gants de sparring'],
    secondaires: ['gants de boxe 16 oz', 'gants de boxe 14 oz', 'gants de boxe 18 oz', 'gants de sparring cuir', 'gants Cleto Reyes sparring', 'gants Fairtex sparring', 'poids gants sparring'],
    intro: 'Le sparring demande des gants plus lourds et plus rembourrés que l’entraînement au sac : 14 oz pour les poids légers, 16 oz pour la plupart des adultes, 18 oz pour les lourds. Ils protègent le partenaire autant que vous.',
    sections: [
      { h2: '14, 16 ou 18 oz', paragraphs: ['Le poids se choisit avec votre salle, selon votre gabarit et l’intensité du sparring. 16 oz est la norme dans la plupart des clubs. Les onces ne disent rien de la taille de la main : essayez avec les bandes.'] },
      { h2: 'Rembourrage et fermeture', paragraphs: ['Un gant de sparring a un rembourrage plus épais et plus souple qu’un gant de sac. Lacets pour le sparring encadré, velcro large pour l’entraînement. Cleto Reyes, Fairtex, Twins et Elion sont les marques les plus présentes.'] },
    ],
    faq: [
      { question: 'Peut-on faire du sparring avec des gants de 12 oz ?', answer: 'La plupart des salles l’interdisent : trop peu de rembourrage pour le partenaire. 14 oz minimum, 16 oz en règle générale.' },
    ],
    guide: 'choisir-gants-boxe',
    match: (p) => p.category === 'gants-de-boxe' && (/sparring/.test(n(p)) || p.sizes.some((s) => s.startsWith('18 oz'))),
  },
  {
    slug: 'materiel-boxe-enfant',
    parent: 'materiel-boxe',
    name: 'Matériel de boxe enfant',
    eyebrow: 'MATÉRIEL BOXE ENFANT · GANTS, PROTECTIONS, TENUES',
    title: 'Matériel de boxe enfant : gants, protections, tenues',
    description: 'Tout le matériel de boxe pour enfant : gants de 4 à 8 oz, bandes courtes, protège-dents junior, casques, protège-tibias, t-shirts et kimonos enfant. Tailles réelles, prix prévus.',
    prioritaires: ['matériel de boxe enfant', 'équipement boxe enfant'],
    secondaires: ['gants de boxe enfant', 'protège-dents enfant', 'casque de boxe enfant', 'kimono enfant', 'boxe enfant débutant', 'kit boxe enfant', 'matériel boxe junior'],
    intro: 'Un enfant a besoin de peu pour commencer : des gants légers, des bandes courtes et un protège-dents. Le casque et les protège-tibias viennent quand le cours le demande. Tout ici est en taille enfant.',
    sections: [
      { h2: 'Ce qu’il faut pour un premier cours', paragraphs: ['Des gants de 4 à 8 oz au velcro, des bandes de 2,50 m, un protège-dents junior. Beaucoup de salles prêtent les gants à la découverte : demandez avant d’acheter.'] },
      { h2: 'Tailles et essayage', paragraphs: ['Faites essayer les deux mains avec les bandes, le poing fermé. Pour le casque et les protège-tibias, mesurez et suivez la grille de la marque. Le guide enfant détaille chaque pièce par âge.'] },
    ],
    faq: [
      { question: 'À quel âge un enfant peut-il avoir ses gants ?', answer: 'Dès qu’il frappe au sac ou aux pattes d’ours en cours, en général vers 6 ans. Avant, l’éveil se fait souvent sans gants.' },
    ],
    guide: 'equipement-enfant',
    match: (p) => p.audience === 'enfant' || /\b(enfant|junior|kids?)\b/.test(n(p)),
  },
  {
    slug: 'materiel-boxe-femme',
    parent: 'materiel-boxe',
    name: 'Matériel de boxe femme',
    eyebrow: 'ÉQUIPEMENT BOXE FEMME · COUPES ET PROTECTIONS',
    title: 'Équipement de boxe femme : gants, brassières, protections',
    description: 'Matériel de boxe et de sports de combat pour femme : gants de 8 à 12 oz, brassières, protections pelviennes et poitrine, rashguards et shorts en coupe femme. Tailles réelles, prix prévus.',
    prioritaires: ['équipement de boxe femme', 'matériel de boxe femme'],
    secondaires: ['gants de boxe femme', 'brassière de sport boxe', 'protège-poitrine', 'protection pelvienne', 'rashguard femme', 'short de boxe femme', 'boxe femme débutante'],
    intro: 'Une étiquette « femme » ne dit rien de l’ajustement. Ce qui compte : un gant qui ferme bien sur une main plus fine, une brassière qui tient sans comprimer, des protections à la bonne taille. Voici les modèles en coupe femme et ceux qui conviennent à toutes les morphologies.',
    sections: [
      { h2: 'Gants et protections', paragraphs: ['Pour le sac et la technique, 8 à 12 oz selon le gabarit ; pour le sparring, le poids demandé par la salle. Protège-poitrine et protection pelvienne existent en tailles précises : mesurez, ne devinez pas.'] },
      { h2: 'Brassières, rashguards, shorts', paragraphs: ['La brassière se choisit sur le maintien en mouvement, pas sur la compression. Rashguards et shorts en coupe femme suivent le guide de la marque. Le guide « Équipement de boxe et de combat pour femme » explique comment comparer.'] },
    ],
    faq: [
      { question: 'Faut-il des gants « femme » ?', answer: 'Non. Il faut un gant qui va à votre main : essayez avec les bandes. Certaines coupes fines conviennent mieux, quelle que soit l’étiquette.' },
    ],
    guide: 'equipement-femme',
    match: (p) => p.audience === 'femme' || /\b(femme|women|brassière|pelvienne)\b/.test(n(p)),
  },
];

export const subfamilyFor = (slug: string) => SUBFAMILIES.find((s) => s.slug === slug);
export const subfamiliesOf = (parent: string) => SUBFAMILIES.filter((s) => s.parent === parent);
export const subfamilyProducts = (s: Subfamily, all: Product[]) => all.filter(s.match);
