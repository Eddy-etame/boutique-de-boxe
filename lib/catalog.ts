export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  short: string;
  description: string;
  care?: string;
  use?: string;
  sizes: string[];
  specs: Record<string, string>;
  images: {
    src: string;
    small: string;
    width: number;
    height: number;
    alt: string;
  }[];
  notes: string[];
  audience: string;
  status: string;
  sourceRef: string;
  dateAdded: string;
  updatedAt?: string;
  seoDescription?: string;
  sourceUrl?: string;
  disciplines?: string[];
  variants?: { id:string; reference:string; label:string; attributes:Record<string,string>; price:number; imageUrl?:string }[];
};
export const shop = {
  name: 'Boutique de Boxe',
  origin: 'https://boutique-de-boxe.etame-eddy01.chatgpt.site',
  intendedDomain: 'https://boutique-de-boxe.com',
  email: 'boxingcenter31@gmail.com',
  phone: '09 54 14 74 72',
  entity: 'SAS BOXING CENTER',
  siren: '821 817 889',
  siret: '821 817 889 00016',
  address: '12 rue de Fenouillet, 31200 Toulouse',
  director: 'Sébastien DUTILH',
};
export const variantPrice = (p:Product, label:string) => p.variants?.find(v=>v.label===label)?.price ?? p.price;
export const money = (cents: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
    cents / 100,
  );
export type Category = {
  slug: string;
  name: string;
  label: string;
  intro: string;
  description: string;
  families: string[];
  guide: string;
  number: string;
};
export const categories: Category[] = [
  {
    slug: 'gants-de-boxe',
    name: 'Gants de boxe',
    label: 'La précision commence ici.',
    intro:
      'Un gant se choisit d’abord pour ce que vous allez en faire. Travail au sac, exercices techniques, entraînement avec partenaire : comparez le modèle, sa fermeture et son poids, puis validez votre choix avec votre encadrant.',
    description:
      'Découvrez les gants de boxe Metal Boxe : Blade, ERGO 90, Sparring et ONE enfant. Comparez les modèles, les poids et les prix indicatifs.',
    families: ['gants-de-boxe'],
    guide: 'choisir-gants-boxe',
    number: '01',
  },
  {
    slug: 'gants-mma',
    name: 'Gants MMA',
    label: 'Le geste reste libre.',
    intro:
      'Des doigts libres pour saisir, une forme adaptée à une pratique précise. Les gants MMA se distinguent par leur construction et leur usage : comparez-les sans les confondre avec une paire destinée à la boxe anglaise.',
    description:
      'Explorez les gants MMA, leur fermeture et leurs tailles. Découvrez le modèle The Shell Metal Boxe et nos conseils pour préparer votre équipement.',
    families: ['gants-mma'],
    guide: 'choisir-gants-mma',
    number: '02',
  },
  {
    slug: 'protections-boxe',
    name: 'Protections de boxe',
    label: 'Les détails avant l’impact.',
    intro:
      'Protège-dents, protection tibias-pieds : le choix commence par l’ajustement et les règles de votre discipline. Examinez chaque produit et ses consignes d’utilisation avec la même attention que vos gants.',
    description:
      'Protège-dents adulte et enfant, protège-tibias pieds : comparez les protections de boxe et sports de combat, tailles et prix indicatifs.',
    families: ['protections-boxe'],
    guide: 'choisir-protections',
    number: '03',
  },
  {
    slug: 'textile-boxe',
    name: 'Textile de boxe',
    label: 'De l’espace pour bouger.',
    intro:
      'Un débardeur, un short ou une tenue complète : cherchez une coupe qui accompagne vos déplacements. Consultez les tailles présentées pour chaque modèle plutôt qu’un équivalent supposé entre marques.',
    description:
      'Découvrez le textile de boxe : débardeurs, ensembles enfant, shorts et vêtements d’entraînement. Modèles, tailles et prix indicatifs.',
    families: ['textile-boxe'],
    guide: 'guide-des-tailles',
    number: '04',
  },
  {
    slug: 'accessoires-boxe',
    name: 'Accessoires de boxe',
    label: 'Le rituel de préparation.',
    intro:
      'Les bandes et les accessoires prennent leur place avant la première reprise. Comparez les longueurs, préparez vos affaires et retrouvez les gestes d’entretien qui permettent de repartir avec un équipement propre et sec.',
    description:
      'Bandes de boxe, cordes à sauter, pattes d’ours et accessoires d’entraînement : explorez le matériel pour préparer votre séance.',
    families: ['accessoires-boxe'],
    guide: 'debuter-boxe',
    number: '05',
  },
  {
    slug: 'sacs-de-frappe',
    name: 'Sacs de frappe',
    label: 'Votre espace. Votre rythme.',
    intro:
      'Avant de choisir un sac de frappe, identifiez l’espace, le support et les usages prévus. Le poids, les dimensions et le système de fixation sont des critères de choix ; ils se vérifient sur chaque référence.',
    description:
      'Préparez le choix de votre sac de frappe : installation, dimensions, usages et sélection de matériel de frappe pour la boxe.',
    families: ['sacs-de-frappe'],
    guide: 'debuter-boxe',
    number: '06',
  },
  {
    slug: 'materiel-boxe',
    name: 'Matériel de boxe anglaise',
    label: 'Construisez votre équipement.',
    intro:
      'Gants, bandes, protections, textile et matériel de frappe : rassemblez les pièces utiles à votre pratique. Le catalogue de matériel de boxe relie chaque produit aux questions concrètes que vous vous posez avant de choisir.',
    description:
      'Matériel de boxe anglaise : gants, bandes, protections, tenues et sacs de frappe. Explorez le catalogue et les guides d’achat Boutique de Boxe.',
    families: [
      'gants-de-boxe',
      'protections-boxe',
      'accessoires-boxe',
      'textile-boxe',
      'sacs-de-frappe',
      'chaussures-boxe',
      'equipement-entrainement',
      'sacs-de-sport',
    ],
    guide: 'debuter-boxe',
    number: '01',
  },
  {
    slug: 'materiel-mma',
    name: 'Matériel MMA',
    label: 'De la frappe à la saisie.',
    intro:
      'Le MMA associe plusieurs situations d’entraînement. Retrouvez les gants MMA, les protections et les tenues adaptés à ces différents moments, avec des conseils pour distinguer les usages et les règles de votre salle.',
    description:
      'Équipement et matériel MMA : gants, protections, rashguards et accessoires. Comparez les références et préparez votre première séance.',
    families: ['gants-mma', 'protections-boxe', 'textile-boxe'],
    guide: 'debuter-mma',
    number: '02',
  },
  {
    slug: 'boutique-arts-martiaux',
    name: 'Matériel d’arts martiaux',
    label: 'Chaque discipline a ses codes.',
    intro:
      'JJB, grappling, pratique en kimono ou sans kimono : le vêtement et les protections se choisissent selon la séance. Identifiez d’abord les consignes de votre discipline, puis les caractéristiques de chaque équipement.',
    description:
      'Boutique arts martiaux : équipements JJB et grappling, kimonos et protections. Préparez vos choix avec des conseils par pratique.',
    families: ['arts-martiaux', 'protections-boxe'],
    guide: 'choisir-protections',
    number: '03',
  },
  {
    slug: 'materiel-sport-de-combat',
    name: 'Matériel de sports de combat',
    label: 'Trouvez votre point de départ.',
    intro:
      'Boxe anglaise, MMA, arts martiaux : partez de votre pratique ou de la pièce qui manque à votre équipement. Pratiquants, coachs et clubs disposent ici d’une lecture commune des produits, avec leurs différences utiles.',
    description:
      'Matériel de sports de combat en France : boxe, MMA, arts martiaux, protections, textile et accessoires. Découvrez le catalogue et les guides.',
    families: [],
    guide: 'debuter-boxe',
    number: '00',
  },

  {slug:'chaussures-boxe',name:'Chaussures de boxe et de lutte',label:'La pointure, puis les appuis.',intro:'Chaussures de boxe ou de lutte : comparez les modèles, les pointures réellement présentées et la construction de leur semelle. Les règles de votre salle déterminent les chaussures admises sur le sol ou le tapis.',description:'Chaussures de boxe et de lutte : modèles, pointures, maintien et semelles. Comparez les caractéristiques du catalogue Boutique de Boxe.',families:['chaussures-boxe'],guide:'guide-des-tailles',number:'07'},
  {slug:'equipement-entrainement',name:'Équipement d’entraînement',label:'Le matériel de la séance.',intro:'Pattes d’ours, paos, cibles et matériel de préparation physique : distinguéz les pièces que vous portez de celles qui équipent la salle. Les dimensions, la prise en main et l’installation se lisent modèle par modèle.',description:'Équipement d’entraînement pour la boxe et les sports de combat : pattes d’ours, paos, cibles et préparation physique. Fiches et caractéristiques.',families:['equipement-entrainement'],guide:'debuter-boxe',number:'08'},
  {slug:'sacs-de-sport',name:'Sacs de sport',label:'Préparez le trajet jusqu’à la salle.',intro:'Sac à dos, sac de sport ou modèle convertible : partez des pièces à transporter, puis comparez le volume, les ouvertures et les modes de portage décrits sur chaque fiche.',description:'Sacs de sport pour votre équipement de boxe : formats, volumes, compartiments et modes de portage. Découvrez les modèles du catalogue.',families:['sacs-de-sport'],guide:'debuter-boxe',number:'09'},
];
export const categoryFor = (slug: string) =>
  categories.find((c) => c.slug === slug);
export const getCategoryProducts = (c: Category, all: Product[]) =>
  c.families.length ? all.filter((p) => c.families.includes(p.category)) : all;
export function cleanName(p: Product) {
  return p.name
    .replace(' Metal Boxe', '')
    .replace(' — noir et blanc', '')
    .replace(' — gel thermoformable', '');
}
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
