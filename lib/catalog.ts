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
  /** Photo principale détourée, posée sur la scène commune (lib/cutouts.ts). Absente : la photo d’origine sert. */
  cut?: {
    small: string;
    large: string;
    mode: 'pose' | 'cadre';
    edges: string[];
    tint: string;
    vivid: boolean;
    lum: number;
  };
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
  /** nom fournisseur d’origine, étiquettes de tailles d’origine, référence fabricant, couleurs (catalogue importé) */
  sourceName?: string;
  sourceBrand?: string;
  sourceSizes?: string[];
  reference?: string;
  referenceLabel?: 'Référence' | 'Référence interne';
  colors?: string[];
  review?: boolean;
};
export const shop = {
  name: 'Boutique de Boxe',
  // Identité publique fixe : le domaine boutique-de-boxe.com, servi sur www depuis son rattachement à Vercel
  // (17 septembre 2026 au soir : le domaine nu et l’alias vercel.app redirigent vers www). L’adresse
  // canonique est celle qui répond 200, jamais une adresse qui redirige.
  // Ni un aperçu ni une variable d’environnement périmée ne changent les canonicals (le .fr du 16 était une erreur).
  origin: 'https://www.boutique-de-boxe.com',
  intendedDomain: 'https://www.boutique-de-boxe.com',
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
    label: 'Gants de boxe, du 4 au 20 oz.',
    intro: 'Choisissez d’abord l’usage : sac, technique ou partenaire. Comparez ensuite le poids, la fermeture et la matière. Les tailles enfant sont indiquées sur chaque fiche.',
    description:
      'Découvrez les gants de boxe Metal Boxe : Blade, ERGO 90, Sparring et ONE enfant. Comparez les modèles, les poids et les prix prévus à l’ouverture.',
    families: ['gants-de-boxe'],
    guide: 'choisir-gants-boxe',
    number: '01',
  },
  {
    slug: 'gants-mma',
    name: 'Gants MMA',
    label: 'Doigts libres, paume ouverte.',
    intro: 'Les gants MMA laissent les doigts libres pour saisir. Regardez l’usage annoncé, le pouce, la paume et le guide de tailles de la marque.',
    description:
      'Explorez les gants MMA, leur fermeture et leurs tailles. Découvrez le modèle The Shell Metal Boxe et nos conseils pour préparer votre équipement.',
    families: ['gants-mma'],
    guide: 'choisir-gants-mma',
    number: '02',
  },
  {
    slug: 'protections-boxe',
    name: 'Protections de boxe',
    label: 'Casques, protège-dents, tibias, coquilles.',
    intro: 'Chaque protection a ses propres tailles et ses propres réglages. Vérifiez l’ajustement et suivez la notice du fabricant.',
    description:
      'Protège-dents adulte et enfant, protège-tibias pieds : comparez les protections de boxe et sports de combat, tailles et prix prévus.',
    families: ['protections-boxe'],
    guide: 'choisir-protections',
    number: '03',
  },
  {
    slug: 'textile-boxe',
    name: 'Textile de boxe',
    label: 'Shorts, t-shirts, rashguards.',
    intro: 'Suivez le guide de tailles de la marque, pas une équivalence entre marques. Chaque fiche indique les tailles réellement disponibles.',
    description:
      'Découvrez le textile de boxe : débardeurs, ensembles enfant, shorts et vêtements d’entraînement. Modèles, tailles et prix prévus à l’ouverture.',
    families: ['textile-boxe'],
    guide: 'guide-des-tailles',
    number: '04',
  },
  {
    slug: 'accessoires-boxe',
    name: 'Accessoires de boxe',
    label: 'Bandes, cordes, pattes d’ours.',
    intro: 'Les bandes se choisissent par longueur, 2,50 m ou 4 m. Cordes à sauter, pattes d’ours et accessoires d’entraînement complètent la liste.',
    description:
      'Bandes de boxe, cordes à sauter, pattes d’ours et accessoires d’entraînement : explorez le matériel pour préparer votre séance.',
    families: ['accessoires-boxe'],
    guide: 'debuter-boxe',
    number: '05',
  },
  {
    slug: 'sacs-de-frappe',
    name: 'Sacs de frappe',
    label: 'Sacs, poires, punching-balls.',
    intro: 'Avant d’acheter, mesurez l’espace et le support. Le poids, la longueur et la fixation sont indiqués sur chaque fiche.',
    description:
      'Préparez le choix de votre sac de frappe : installation, dimensions, usages et sélection de matériel de frappe pour la boxe.',
    families: ['sacs-de-frappe'],
    guide: 'debuter-boxe',
    number: '06',
  },
  {
    slug: 'materiel-boxe',
    name: 'Matériel de boxe anglaise',
    label: 'Tout pour la boxe anglaise.',
    intro: 'Gants, bandes, protections, textile et sacs de frappe : tout le matériel de boxe anglaise, avec les tailles et les prix prévus.',
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
    label: 'Tout pour le MMA.',
    intro: 'Gants MMA, protections, rashguards et shorts : tout le matériel de MMA, pour la frappe comme pour le sol.',
    description:
      'Équipement et matériel MMA : gants, protections, rashguards et accessoires. Comparez les références et préparez votre première séance.',
    families: ['gants-mma', 'protections-boxe', 'textile-boxe'],
    guide: 'debuter-mma',
    number: '02',
  },
  {
    slug: 'boutique-arts-martiaux',
    name: 'Matériel d’arts martiaux',
    label: 'Kimonos, ceintures, protections.',
    intro: 'Kimonos de JJB de A0 à A4, ceintures et protections. Chaque discipline a ses tailles : suivez le guide de la marque.',
    description:
      'Boutique arts martiaux : équipements JJB et grappling, kimonos et protections. Préparez vos choix avec des conseils par pratique.',
    families: ['arts-martiaux', 'protections-boxe'],
    guide: 'choisir-protections',
    number: '03',
  },
  {
    slug: 'materiel-sport-de-combat',
    name: 'Matériel de sports de combat',
    label: 'Tout le catalogue.',
    intro: 'Boxe, MMA et arts martiaux réunis : cherchez un modèle, une marque ou un type de matériel.',
    description:
      'Matériel de sports de combat en France : boxe, MMA, arts martiaux, protections, textile et accessoires. Découvrez le catalogue et les guides.',
    families: [],
    guide: 'debuter-boxe',
    number: '00',
  },

  {slug:'chaussures-boxe',name:'Chaussures de boxe et de lutte',label: 'Chaussures de boxe et de lutte.',intro: 'Pointures du 31 au 49 selon les modèles. Comparez la semelle et la tenue de la cheville sur chaque fiche.',description:'Chaussures de boxe et de lutte : modèles, pointures, maintien et semelles. Comparez les caractéristiques du catalogue Boutique de Boxe.',families:['chaussures-boxe'],guide:'guide-des-tailles',number:'07'},
  {slug:'equipement-entrainement',name:'Équipement d’entraînement',label: 'Pattes d’ours, paos, cordes.',intro: 'Le matériel qui se tient en main ou qui équipe l’espace d’entraînement : pattes d’ours, paos, cordes à sauter, élastiques.',description:'Équipement d’entraînement pour la boxe et les sports de combat : pattes d’ours, paos, cibles et préparation physique. Fiches et caractéristiques.',families:['equipement-entrainement'],guide:'debuter-boxe',number:'08'},
  {slug:'sacs-de-sport',name:'Sacs de sport',label: 'Pour transporter tout le reste.',intro: 'Sac à dos, sac de sport ou convertible : comparez le volume, les ouvertures et le portage sur chaque fiche.',description:'Sacs de sport pour votre équipement de boxe : formats, volumes, compartiments et modes de portage. Découvrez les modèles du catalogue.',families:['sacs-de-sport'],guide:'debuter-boxe',number:'09'},
  {slug:'arts-martiaux',name:'Arts martiaux',label: 'Kimonos, ceintures, armes d’entraînement.',intro: 'Kimonos de JJB de A0 à A4, kimonos de karaté, ceintures et armes d’entraînement. Suivez le tableau taille et poids de la marque.',description:'Matériel d’arts martiaux : kimonos de JJB et de karaté, ceintures, tenues et armes d’entraînement. Tailles réelles et prix prévus.',families:['arts-martiaux'],guide:'choisir-protections',number:'10'},
  {slug:'boutique-boxe',name:'Boutique boxe',label: 'Toute la boutique de boxe en ligne.',intro: 'Tout le matériel de boxe et de sports de combat, avec ses tailles réelles et ses prix prévus. Cherchez un modèle, une marque ou une famille.',description:'Boutique boxe en ligne : plus de 1 000 modèles de matériel de boxe, MMA et sports de combat. Gants, bandes, protections, sacs de frappe. Livraison dans toute la France.',families:[],guide:'debuter-boxe',number:'00'},
];
export const categoryFor = (slug: string) =>
  categories.find((c) => c.slug === slug);
export const getCategoryProducts = (c: Category, all: Product[]) =>
  c.families.length ? all.filter((p) => c.families.includes(p.category)) : all;
/** Nom affiché sur les cartes et en titre : le nom lui-même. Seules les 19 fiches
 *  d’origine (sans `sourceName`) raccourcissent leur variante sur la carte. */
/**
 * Un modèle tel qu’une carte, un filtre ou la recherche en ont besoin, et rien d’autre. Les listes
 * partent dans le navigateur : avec la fiche entière (description, caractéristiques, toutes les
 * déclinaisons), une famille de 183 gants pesait 525 Ko de HTML. Le contrôle de vitesse
 * (scripts/check-speed.mjs) tient ce poids sous budget.
 */
export function listItem(p: Product): Product {
  const other = p.variants?.find((v) => v.price !== p.price);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    short: p.short.slice(0, 140),
    description: '',
    sizes: p.sizes,
    // Deux caractéristiques seulement, pour les sous-filtres (matière, fermeture) ; le reste attend la fiche.
    specs: Object.fromEntries(Object.entries(p.specs || {}).filter(([k]) => k === 'Matières' || k === 'Fermeture')),
    colors: p.colors,
    images: p.images.slice(0, 1),
    cut: p.cut,
    notes: [],
    audience: p.audience,
    status: p.status,
    sourceRef: p.sourceRef,
    dateAdded: p.dateAdded,
    // cleanName() ne regarde que la présence du nom d’origine ; « Dès » ne demande qu’un autre prix.
    sourceName: p.sourceName ? '1' : undefined,
    variants: other ? [{ id: '', reference: '', label: '', attributes: {}, price: other.price }] : undefined,
  };
}

export function cleanName(p: Product) {
  if (p.sourceName) return p.name;
  return p.name
    .replace(' Metal Boxe', '')
    .replace(' — noir et blanc', '')
    .replace(' — gel thermoformable', '');
}
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
