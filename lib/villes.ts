/**
 * Pages « Boutique de boxe <ville> » et le carrefour « Boutique sport de
 * combat France » (29/09).
 *
 * Ce qui les distingue d'une page-ville où seul le nom change — faute que
 * Google sanctionne (« doorway ») et que la boutique refuse : chaque page est
 * bâtie sur des faits qui n'existent que pour sa ville — ses lieux de sports de
 * combat, leurs salles, leurs disciplines, leurs adresses, leurs nombres —
 * tirés du Recensement des équipements sportifs du ministère des Sports
 * (scripts/villes-salles.mjs → data/villes.json), sourcés et datés sur la page.
 * Une ville sans assez de matière n'a pas de page (seuil du relevé).
 *
 * Toulouse porte en plus les clubs Boxing Center et, pour les communes
 * voisines, un lien vers l'ACCUEIL de chaque site de proximité (choix d'Eddy :
 * faire monter les pages d'accueil, qui font monter le reste).
 */
import data from './data/villes.json';
import { shop } from './catalog';
import type { SeoFaq, SeoSection } from './seo-copy';

export type Salle = { nom: string; boxe: boolean };
export type Lieu = {
  id: string;
  nom: string;
  adresse: string | null;
  codePostal: string | null;
  commune: string | null;
  proprietaire: string | null;
  site: string | null;
  salles: Salle[];
  disciplines: string[];
  frappe: boolean;
  maj: string | null;
};
type Compte = { salles: number; boxe: number; dojos: number; frappe: number; scolaires: number; parDiscipline: Record<string, number> };
export type Ville = Compte & { slug: string; nom: string; departement: string; region: string; lieux: Lieu[] };
export type Commune = { nom: string; lieux: number; salles: number; boxe: number; frappe: number; disciplines: string[] };
export type Groupe = Compte & { code: string; nom: string; lieux: number; communes: Commune[] };
export type Region = { slug: string; nom: string; groupes: Groupe[] };

export const SOURCE = data.source as {
  nom: string;
  editeur: string;
  licence: string;
  licenceUrl: string;
  url: string;
  maj: string;
  releve: string;
  seuil: number;
};
export const VILLES = data.villes as unknown as Ville[];
export const REGIONS = data.regions as unknown as Region[];

export const PREFIXE = 'boutique-de-boxe-';
export const CARREFOUR = 'boutique-sport-de-combat';
export const villePath = (slug: string) => '/' + PREFIXE + slug + '/';

export const villeFor = (path: string) =>
  path.startsWith(PREFIXE) ? VILLES.find((v) => PREFIXE + v.slug === path) : undefined;
export const regionFor = (path: string) =>
  path.startsWith(PREFIXE) ? REGIONS.find((r) => PREFIXE + r.slug === path) : undefined;

/** « 29 septembre 2026 » : la date de mise à jour du recensement. */
export const dateSource = () =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(SOURCE.maj + 'T12:00:00Z'));

/* Les clubs Boxing Center qui ont leur site — registre des sites de proximité
   (page « Nos clubs »), adresses vérifiées. */
export const CLUBS_BOXING_CENTER = [
  { nom: 'Boxing Center Toulouse Minimes', lieu: 'quartier des Minimes', site: 'https://boxe-toulouse.com/', recensement: 'I315550423' },
  { nom: 'Boxing Center Toulouse États-Unis', lieu: 'avenue des États-Unis', site: 'https://clubmma.fr/', recensement: 'I315550717' },
  { nom: 'Boxing Center Toulouse Saint-Cyprien', lieu: 'rive gauche, Saint-Cyprien', site: 'https://club-boxe-toulouse.com/', recensement: 'I315550718' },
  { nom: 'Boxing Center Portet-sur-Garonne', lieu: 'route d’Espagne, au sud', site: 'https://boxing-center-portet.fr/', recensement: null },
  { nom: 'Boxing Center Ramonville', lieu: 'terminus du métro B, au sud-est', site: 'https://mmatoulouse.com/', recensement: null },
];
/** Le site d'un lieu du recensement : celui du club quand c'est un club Boxing Center, sinon celui déclaré. */
export const siteDe = (l: Lieu) => CLUBS_BOXING_CENTER.find((c) => c.recensement === l.id)?.site || l.site;

/* « Êtes-vous à côté ? » — l'ACCUEIL de chaque site de proximité, jamais une page
   intérieure : c'est l'accueil qu'on veut faire monter. L'ancre reprend le titre
   de chaque accueil : le lien dit ce que la page promet. */
export const A_COTE = [
  { commune: 'Colomiers', ancre: 'Club de boxe et MMA près de Colomiers', site: 'https://www.boxingcenter-colomiers.fr/' },
  { commune: 'Tournefeuille', ancre: 'Club de boxe et MMA près de Tournefeuille', site: 'https://www.boxingcenter-tournefeuille.fr/' },
  { commune: 'Blagnac', ancre: 'Club de Boxe Blagnac', site: 'https://www.club-boxe-blagnac.fr/' },
  { commune: 'Cugnaux', ancre: 'Club de boxe et MMA près de Cugnaux', site: 'https://www.boxingcenter-cugnaux.fr/' },
  { commune: 'Muret', ancre: 'Club de boxe et MMA près de Muret', site: 'https://www.boxingcenter-muret.fr/' },
  { commune: 'Labège', ancre: 'Club de boxe et MMA près de Labège', site: 'https://www.boxingcenter-labege.fr/' },
  { commune: 'L’Union', ancre: 'Club de boxe et MMA près de L’Union', site: 'https://www.boxingcenter-lunion.fr/' },
  { commune: 'Castelginest', ancre: 'Club de boxe et MMA près de Castelginest', site: 'https://www.boxingcenter-castelginest.fr/' },
];

/* Chaque discipline renvoie à la page du catalogue qui l'équipe. */
export const RAYON: Record<string, string> = {
  'Boxe anglaise': '/materiel-boxe/',
  'Savate boxe française': '/chaussures-boxe/',
  'Muay-thaï': '/protege-tibias/',
  'Kick-boxing': '/gants-de-boxe-sparring/',
  'Full contact': '/gants-de-boxe/',
  'Judo, jujitsu': '/kimonos/',
  Karaté: '/boutique-arts-martiaux/',
  Aïkido: '/ceintures/',
  Taekwondo: '/protections-boxe/',
  Lutte: '/shorts-mma/',
  Sambo: '/materiel-mma/',
  'Kung-fu, wushu': '/materiel-sport-de-combat/',
};

const nb = (n: number, un: string, plusieurs: string) => `${n.toLocaleString('fr-FR')} ${n > 1 ? plusieurs : un}`;
const liste = (xs: string[]) => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' et ' + xs.at(-1) : xs[0] || '');

/* « à Toulouse », « au Havre » ; « de Toulouse », « du Havre », « d’Angers ». */
export const a = (nom: string) => (nom.startsWith('Le ') ? 'au ' + nom.slice(3) : 'à ' + nom);
export const de = (nom: string) => (nom.startsWith('Le ') ? 'du ' + nom.slice(3) : /^[AEIOUÉÈÎ]/.test(nom) ? 'd’' + nom : 'de ' + nom);
const Maj = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/* La préposition de chaque département d'Île-de-France. */
const DANS: Record<string, string> = {
  '92': 'dans les Hauts-de-Seine',
  '93': 'en Seine-Saint-Denis',
  '94': 'dans le Val-de-Marne',
  '78': 'dans les Yvelines',
  '91': 'dans l’Essonne',
  '95': 'dans le Val-d’Oise',
  '77': 'en Seine-et-Marne',
};
export const dansDepartement = (g: { code: string; nom: string }) => DANS[g.code] || 'dans le département ' + g.nom;

/** Typographie française : l'espace avant « : ? ; ! » devient insécable — jamais un « ? » seul en début de ligne. */
export const fine = (s: string) => s.replace(/ ([:?;!])/g, ' $1');

/* Les ventes : « livrera Toulouse dès l’ouverture des ventes » tant qu'elles sont fermées,
   « livre Toulouse » ensuite (shop.ventesOuvertes, un seul interrupteur). */
const livrer = (ou: string) => (shop.ventesOuvertes ? `livre ${ou}` : `livrera ${ou} dès l’ouverture des ventes`);
export const livraison = (ou: string) =>
  `Boutique de Boxe est une boutique en ligne : elle ${livrer(ou)}, comme le reste de la France métropolitaine, à domicile ou en point relais. ${shop.ventesOuvertes ? 'Les tarifs et les délais sont' : 'Les tarifs prévus sont'} sur la page Livraison.`;

/** Le carrefour : la livraison dite sans ville. */
export const livraisonPartout = () =>
  shop.ventesOuvertes
    ? 'Où que vous soyez en France métropolitaine, la commande est livrée à domicile ou en point relais ; les tarifs et les délais sont sur la page Livraison.'
    : 'Où que vous soyez en France métropolitaine, la commande sera livrée à domicile ou en point relais dès l’ouverture des ventes ; les tarifs prévus sont sur la page Livraison.';

/** « 15 en boxe anglaise, 8 en savate boxe française et 5 en full contact » */
export function repartition(par: Record<string, number>, max = 3) {
  return liste(Object.entries(par).slice(0, max).map(([d, n]) => `${n} en ${d.charAt(0).toLowerCase() + d.slice(1)}`));
}
const FRAPPE = ['Boxe anglaise', 'Savate boxe française', 'Muay-thaï', 'Kick-boxing', 'Full contact'];
const deFrappe = (par: Record<string, number>) => Object.fromEntries(Object.entries(par).filter(([d]) => FRAPPE.includes(d)));
/** « 23 salles de boxe et 46 dojos » */
const typesDeSalles = (c: { boxe: number; dojos: number }) =>
  liste([c.boxe ? nb(c.boxe, 'salle de boxe', 'salles de boxe') : '', c.dojos ? nb(c.dojos, 'dojo ou salle d’arts martiaux', 'dojos et salles d’arts martiaux') : ''].filter(Boolean));

/* ── Ville ─────────────────────────────────────────────────────────────── */

export function villeTitre(v: { nom: string }) {
  return `Boutique de boxe ${v.nom} : salles et matériel`;
}

export function villeDescription(v: Ville) {
  const d = `Boutique de boxe ${v.nom} : ${nb(v.lieux.length, 'lieu', 'lieux')} de boxe et d’arts martiaux ${a(v.nom)}, d’après le recensement du ministère des Sports, et le matériel de chacun.`;
  return d.length <= 158 ? d : `Boutique de boxe ${v.nom} : ${v.lieux.length} lieux de boxe et d’arts martiaux recensés, et le matériel de chacun.`;
}

/** Les deux phrases d'en-tête : autonomes, citables, vraies pour cette ville seulement. */
export function villeChapeau(v: Ville) {
  return `${v.nom} compte ${nb(v.salles, 'salle de combat', 'salles de combat')} — ${typesDeSalles(v)} — dans ${nb(v.lieux.length, 'lieu ouvert', 'lieux ouverts')} aux clubs ou au public, d’après le Recensement des équipements sportifs du ministère des Sports mis à jour le ${dateSource()}. Boutique de Boxe, boutique en ligne basée à Toulouse, les recense ci-dessous avec le matériel que chacun demande.`;
}

export function villeSections(v: Ville): SeoSection[] {
  const avecSite = v.lieux.filter((l) => siteDe(l)).length;
  const p: string[] = [
    `${Maj(a(v.nom))}, les disciplines déclarées donnent le ton : ${repartition(v.parDiscipline, 5)}. Un lieu qui accueille plusieurs disciplines compte pour chacune.`,
    `${v.frappe} des ${v.lieux.length} lieux accueillent une boxe — anglaise, française, thaïe, kick-boxing ou full contact — et ${avecSite} publient un site. Pour un horaire, un tarif ou un cours d’essai, c’est le club qui fait foi.`,
  ];
  if (v.scolaires) p.push(`${nb(v.scolaires, 'autre salle, réservée', 'autres salles, réservées')} aux scolaires, ${v.scolaires > 1 ? 'ne sont pas listées' : 'n’est pas listée'}.`);
  return [
    { h2: fine(`Ce que disent les ${v.lieux.length} lieux ${de(v.nom)}`), paragraphs: p },
    { h2: fine(`Livraison ${a(v.nom)}`), paragraphs: [livraison(v.nom)] },
  ];
}

/** Le premier sac, selon ce que la ville pratique : le texte, et les sous-familles d'où viennent les modèles. */
export function villeKit(lieu: string, c: { frappe: number; parDiscipline: Record<string, number> }) {
  const t = (d: string) => c.parDiscipline[d] || 0;
  const kimono = t('Judo, jujitsu') + t('Karaté') + t('Aïkido') + t('Taekwondo');
  const lieuxKimono = Math.max(t('Judo, jujitsu'), t('Karaté'));
  if (c.frappe >= 3)
    return {
      kind: 'frappe' as const,
      h2: fine(`Le premier sac de sport ${lieu} : gants, bandes, protège-dents`),
      paragraphs: [
        `${Maj(lieu)}, ${nb(c.frappe, 'lieu accueille', 'lieux accueillent')} une boxe. Pour y débuter, trois pièces sont personnelles dès le premier mois : les bandes, les gants et le protège-dents. Les gants se choisissent au poids — 10 oz pour le sac, 14 ou 16 oz pour la mise de gants — et les bandes se prennent en 4 m pour un adulte.`,
        kimono
          ? `Dans les ${lieuxKimono} lieux où l’on pratique le judo ou le karaté, le kimono passe avant le reste ; il se choisit au poids du tissu et à la grille de la marque. Casque et protège-tibias attendent que le club propose l’opposition.`
          : 'Casque et protège-tibias attendent que le club propose l’opposition : chaque salle a sa règle, mieux vaut la lui demander avant d’acheter.',
      ],
      sources: ['gants-de-boxe', 'gants-de-boxe-sparring', 'bandes-de-boxe', 'protege-dents', 'casques-de-boxe', 'protege-tibias', 'kimonos', 'ceintures'],
    };
  return {
    kind: 'kimono' as const,
    h2: fine(`Le premier sac de sport ${lieu} : kimono, ceinture, protections`),
    paragraphs: [
      `${Maj(lieu)}, le dojo domine : le kimono passe avant tout le reste. Il se choisit au poids du tissu et à la grille de la marque, pas à la taille de vêtement habituelle.`,
      'Pour les disciplines de frappe, ajoutez des protège-tibias et un protège-dents : le club précise lesquels sont acceptés en compétition.',
    ],
    sources: ['kimonos', 'kimonos', 'ceintures', 'protege-tibias', 'protege-dents', 'coquilles', 'bandes-de-boxe', 'gants-de-boxe'],
  };
}

export function villeFaq(v: Ville): SeoFaq[] {
  const anglaise = v.lieux.filter((l) => l.disciplines.includes('Boxe anglaise'));
  const kit = villeKit(a(v.nom), v);
  const faq: SeoFaq[] = [
    {
      question: fine(`Où acheter du matériel de boxe ${a(v.nom)} ?`),
      answer: `Boutique de Boxe est une boutique en ligne : elle ${livrer(v.nom)}, comme le reste de la France métropolitaine, avec plus de 1 000 modèles de gants, protections, textile et sacs de frappe.`,
    },
    {
      question: fine(`Combien de salles de boxe ${a(v.nom)} ?`),
      answer: `${Maj(typesDeSalles(v))}, dans ${nb(v.lieux.length, 'lieu', 'lieux')}, d’après le Recensement des équipements sportifs du ministère des Sports au ${dateSource()}. ${v.frappe} de ces lieux déclarent une boxe${Object.keys(deFrappe(v.parDiscipline)).length ? ' : ' + repartition(deFrappe(v.parDiscipline), 5) : ''}.`,
    },
  ];
  if (anglaise.length)
    faq.push({
      question: fine(`Où faire de la boxe anglaise ${a(v.nom)} ?`),
      answer: `Le recensement compte ${nb(anglaise.length, 'lieu', 'lieux')} où la boxe anglaise est déclarée ${a(v.nom)}, dont ${liste(anglaise.slice(0, 3).map((l) => l.nom))}. La liste complète, avec les adresses, est sur cette page.`,
    });
  faq.push({
    question: fine(`Quel matériel pour un premier cours ${a(v.nom)} ?`),
    answer:
      kit.kind === 'frappe'
        ? 'Des bandes de 4 m, une paire de gants (10 oz pour le sac, 14 ou 16 oz pour la mise de gants) et un protège-dents. Le reste attend que le club vous le demande.'
        : 'Un kimono à la grille de la marque et, pour les disciplines de frappe, des protège-tibias et un protège-dents.',
  });
  return faq;
}

/* ── Région (Île-de-France hors Paris) ─────────────────────────────────── */

export const regionTotal = (r: Region) =>
  r.groupes.reduce((o, g) => ({ lieux: o.lieux + g.lieux, salles: o.salles + g.salles, boxe: o.boxe + g.boxe, dojos: o.dojos + g.dojos, frappe: o.frappe + g.frappe }), { lieux: 0, salles: 0, boxe: 0, dojos: 0, frappe: 0 });
export const regionDisciplines = (r: Region) => {
  const par: Record<string, number> = {};
  for (const g of r.groupes) for (const [d, n] of Object.entries(g.parDiscipline)) par[d] = (par[d] || 0) + n;
  return Object.fromEntries(Object.entries(par).sort((x, y) => y[1] - x[1]));
};
const parLieux = (r: Region) => [...r.groupes].sort((x, y) => y.lieux - x.lieux);

export function regionTitre(r: Region) {
  return `Boutique de boxe ${r.nom} : salles et matériel`;
}
export function regionDescription(r: Region) {
  const t = regionTotal(r);
  return `Boutique de boxe ${r.nom} : ${t.lieux.toLocaleString('fr-FR')} lieux de boxe et d’arts martiaux hors Paris, commune par commune, et le matériel qu’ils demandent.`;
}
export function regionChapeau(r: Region) {
  const t = regionTotal(r);
  const g = parLieux(r);
  return `Hors Paris, l’${r.nom} compte ${nb(t.salles, 'salle de combat', 'salles de combat')} — ${typesDeSalles(t)} — dans ${t.lieux.toLocaleString('fr-FR')} lieux, d’après le Recensement des équipements sportifs du ministère des Sports mis à jour le ${dateSource()} : de ${g[0].lieux} lieux ${dansDepartement(g[0])} à ${g.at(-1)!.lieux} ${dansDepartement(g.at(-1)!)}. Boutique de Boxe les résume ci-dessous, commune par commune.`;
}
export function regionFaq(r: Region): SeoFaq[] {
  const g = parLieux(r);
  const communes = r.groupes.flatMap((x) => x.communes).sort((x, y) => y.lieux - x.lieux);
  return [
    {
      question: fine(`Où acheter du matériel de boxe en ${r.nom} ?`),
      answer: `Boutique de Boxe est une boutique en ligne : elle ${livrer('toute l’' + r.nom)}, comme le reste de la France métropolitaine. Paris a sa propre page.`,
    },
    {
      question: fine(`Quel département d’${r.nom} compte le plus de salles de sports de combat ?`),
      answer: `Hors Paris, c’est ${dansDepartement(g[0])} (${g[0].code}) qu’il y en a le plus : ${g[0].lieux} lieux et ${g[0].salles} salles de combat au ${dateSource()}, devant ${g[1].nom} (${g[1].lieux} lieux) et ${g[2].nom} (${g[2].lieux} lieux).`,
    },
    {
      question: fine(`Quelles communes d’${r.nom} ont le plus de lieux de sports de combat ?`),
      answer: `Hors Paris : ${liste(communes.slice(0, 4).map((c) => `${c.nom} (${c.lieux})`))}, d’après le recensement du ministère des Sports.`,
    },
  ];
}

/* ── Carrefour « Boutique sport de combat France » ─────────────────────── */

export const CARREFOUR_TITRE = 'Boutique sport de combat France : par ville';
export const CARREFOUR_DESCRIPTION =
  'Boutique sport de combat France : la boutique en ligne livre toute la France. Les lieux de boxe et d’arts martiaux des grandes villes, ville par ville.';
export function carrefourChapeau(lieux: number) {
  return `Boutique de Boxe est une boutique sport de combat en ligne, basée à Toulouse, qui ${livrer('toute la France métropolitaine')}. Ville par ville, ${lieux.toLocaleString('fr-FR')} lieux de boxe et d’arts martiaux sont recensés ici d’après le ministère des Sports, avec le matériel que chacun demande.`;
}
export const CARREFOUR_FAQ: SeoFaq[] = [
  {
    question: fine('Existe-t-il une boutique sport de combat en ligne qui livre toute la France ?'),
    answer: `Oui : Boutique de Boxe, boutique sport de combat France basée à Toulouse (SAS Boxing Center), ${livrer('toute la France métropolitaine')}, à domicile ou en point relais.`,
  },
  {
    question: fine('Comment trouver une salle de boxe dans ma ville ?'),
    answer: 'Chaque grande ville a sa page sur Boutique de Boxe : les lieux de boxe et d’arts martiaux du recensement du ministère des Sports, leurs salles, leurs disciplines, leurs adresses et leurs sites.',
  },
];
