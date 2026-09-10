// Textes des pages catégorie : le rail de trois questions, les filtres,
// la présentation de chaque famille et le message quand rien ne correspond.

import type { CategoryCopy } from './types';

// Espace insécable, à placer avant : ; ! ? et avant une unité (€, oz, m).
const nb = ' ';

// Les valeurs sont fixées côté code. Ici on ne décrit que la phrase à afficher.
const useWords: Record<string, string | undefined> = {
  sac: 'pour le sac',
  technique: 'pour la technique',
  partenaire: 'avec un partenaire',
  competition: 'pour la compétition',
};

const levelWords: Record<string, string | undefined> = {
  debut: 'pour débuter',
  regulier: 'pour s’entraîner',
  confirme: 'pour un niveau confirmé',
  enfant: 'pour un enfant',
};

const budgetWords: Record<string, string | undefined> = {
  '40': `sous 40${nb}€`,
  '80': `sous 80${nb}€`,
  '150': `sous 150${nb}€`,
  plus: 'sans limite de prix',
};

const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const categoryCopy: CategoryCopy = {
  rail: {
    title: 'Trois questions pour choisir',
    questions: {
      use: {
        label: `Pour quel entraînement${nb}?`,
        options: [
          { value: 'sac', label: 'Frapper le sac' },
          { value: 'technique', label: 'Travailler la technique' },
          { value: 'partenaire', label: 'Avec un partenaire' },
          { value: 'competition', label: 'Pour la compétition' },
        ],
      },
      level: {
        label: `Vous en êtes où${nb}?`,
        options: [
          { value: 'debut', label: 'Je commence' },
          { value: 'regulier', label: 'Je m’entraîne déjà' },
          { value: 'confirme', label: 'Je suis confirmé' },
          { value: 'enfant', label: 'Pour mon enfant' },
        ],
      },
      budget: {
        label: `Quel budget${nb}?`,
        options: [
          { value: '40', label: `Moins de 40${nb}€` },
          { value: '80', label: `Moins de 80${nb}€` },
          { value: '150', label: `Moins de 150${nb}€` },
          { value: 'plus', label: 'Sans limite' },
        ],
      },
    },
    // Exemple : « Pour le sac, en débutant, sous 40 € : 14 modèles. »
    sentence: ({ use, level, budget, count }) => {
      const bits = [
        use ? useWords[use] ?? use : '',
        level ? levelWords[level] ?? level : '',
        budget ? budgetWords[budget] ?? budget : '',
      ].filter(Boolean);
      const tail =
        count === 0
          ? 'aucun modèle'
          : `${count} modèle${count > 1 ? 's' : ''}`;
      if (!bits.length) return `${upperFirst(tail)}.`;
      return `${upperFirst(bits.join(', '))}${nb}: ${tail}.`;
    },
    reset: 'Effacer mes réponses',
  },

  filters: {
    search: 'Chercher un modèle ou une marque',
    brand: 'Marque',
    size: 'Taille',
    sort: 'Trier par',
    sortOptions: [
      { value: 'pertinence', label: 'Notre sélection' },
      { value: 'prix-croissant', label: 'Du moins cher au plus cher' },
      { value: 'prix-decroissant', label: 'Du plus cher au moins cher' },
      { value: 'nouveautes', label: 'Les derniers arrivés' },
    ],
  },

  families: {
    'gants-de-boxe': {
      title: 'Gants de boxe',
      intro: `Les gants vont du 4 au 20${nb}oz, à velcro ou à lacets. Vous y trouverez des modèles enfant, entraînement et sparring.`,
      question: `À quoi vont servir ces gants${nb}?`,
    },
    'gants-mma': {
      title: 'Gants MMA',
      intro:
        'Les doigts restent libres et la paume reste ouverte. Les tailles vont du junior à l’adulte, en S/M ou L/XL.',
      question: `Quelle est votre taille de main${nb}?`,
    },
    'protections-boxe': {
      title: 'Protections de boxe',
      intro:
        'Vous trouverez des casques, des protège-dents, des protège-tibias et des coquilles. Chaque protection a ses propres tailles.',
      question: `De quelles protections avez-vous besoin${nb}?`,
    },
    'textile-boxe': {
      title: 'Textile de boxe',
      intro:
        'Vous trouverez surtout des shorts, des t-shirts et des rashguards. Viennent ensuite les débardeurs, les sweats et les pantalons.',
      question: `Quelle taille portez-vous chez cette marque${nb}?`,
    },
    'accessoires-boxe': {
      title: 'Bandes et accessoires',
      intro: `Les bandes de 4,5${nb}m et 6${nb}m forment la plus grande part. Vous y trouverez aussi du tape, des sous-gants et des gourdes.`,
      question: `Quelle longueur de bandes vous faut-il${nb}?`,
    },
    'sacs-de-frappe': {
      title: 'Sacs de frappe',
      intro:
        'Vous trouverez des sacs, des poires de vitesse et des punching-balls. Les chaînes, les rotules et les attaches se prennent à part.',
      question: `Où allez-vous accrocher votre sac${nb}?`,
    },
    'chaussures-boxe': {
      title: 'Chaussures de boxe et lutte',
      intro:
        'Les pointures vont du 31 au 49 selon les modèles. Vous trouverez des chaussures de boxe, de lutte et de multiboxe.',
      question: `Quelle pointure prenez-vous dans cette marque${nb}?`,
    },
    'equipement-entrainement': {
      title: 'Équipement d’entraînement',
      intro: `Ce matériel s’utilise à deux${nb}: pattes d’ours, paos, raquettes et bâtons. Vous y trouverez aussi des cordes à sauter et des élastiques.`,
      question: `Qui va tenir ce matériel, vous ou votre partenaire${nb}?`,
    },
    'sacs-de-sport': {
      title: 'Sacs de sport',
      intro:
        'Vous choisissez un sac à dos, un sac de sport ou un modèle convertible. Les volumes vont du petit format au grand sac deux-en-un.',
      question: `Qu’avez-vous à transporter, gants compris${nb}?`,
    },
    'materiel-boxe': {
      title: 'Tout pour la boxe',
      intro:
        'Cette page réunit les gants, les bandes, les protections, le textile et les sacs. Cherchez par marque ou par mot, ou répondez aux trois questions.',
      question: `Que vous manque-t-il pour votre prochaine séance${nb}?`,
    },
    'materiel-mma': {
      title: 'Tout pour le MMA',
      intro:
        'Cette page réunit les gants MMA, les protections et le textile. Vous y trouverez des rashguards, des shorts et des protège-tibias.',
      question: `Votre séance est en frappe, au sol, ou les deux${nb}?`,
    },
    'boutique-arts-martiaux': {
      title: 'Matériel d’arts martiaux',
      intro:
        'Les kimonos de JJB vont de la taille A0 à A4. Vous y trouverez aussi des ceintures et des protections.',
      question: `Vous pratiquez avec ou sans kimono${nb}?`,
    },
    'materiel-sport-de-combat': {
      title: 'Tous les sports de combat',
      intro: `Cette page montre le catalogue entier${nb}: boxe, MMA et arts martiaux. Utilisez la recherche ou les filtres pour rejoindre une famille.`,
      question: `Vous cherchez un modèle précis, ou vous découvrez${nb}?`,
    },
  },

  empty: 'Aucun modèle ne correspond. Enlevez un filtre ou changez un mot de votre recherche.',
};
