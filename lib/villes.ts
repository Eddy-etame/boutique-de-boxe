/**
 * Pages « Boutique de boxe <ville> » et le carrefour « Boutique sport de
 * combat France » (29/09).
 *
 * Ce qui les distingue d'une page-ville où seul le nom change — faute que
 * Google sanctionne (« doorway ») et que la boutique refuse : chaque page est
 * bâtie sur des faits qui n'existent que pour sa ville — ses lieux de sports de
 * combat, leurs salles, leurs disciplines, leurs adresses, leurs nombres, sa
 * densité et son rang parmi les grandes villes, ses voisines — tirés du
 * Recensement des équipements sportifs du ministère des Sports et des
 * populations légales de l'Insee (scripts/villes-salles.mjs → data/villes.json),
 * sourcés et datés sur la page. Le texte lui-même suit les données : le premier
 * sac, la FAQ et les liens changent avec la boxe la plus déclarée de la ville.
 * Mesure du 29/09 (scratchpad similarite.py) : la part de phrases répétées d'une
 * ville à l'autre est ce qu'on surveille ; elle doit rester faible.
 *
 * Toulouse porte en plus les clubs Boxing Center et, pour les communes
 * voisines, un lien vers l'ACCUEIL de chaque site de proximité (choix d'Eddy :
 * faire monter les pages d'accueil, qui font monter le reste). Balma n'a plus
 * de club (vendu) : on y oriente vers Saint-Cyprien, le plus proche mesuré.
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
export type Voisine = { slug: string; nom: string; km: number };
export type Ville = Compte & {
  slug: string;
  nom: string;
  insee: string;
  population: number;
  departement: string;
  codeDepartement: string;
  region: string;
  horsService: number;
  fermes: string[];
  lieux: Lieu[];
  habitantsParLieu: number;
  rangDensite: number;
  voisines: Voisine[];
};
export type Commune = { nom: string; lieux: number; salles: number; boxe: number; frappe: number; disciplines: string[]; page: string | null };
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
  seuilFrappe: number;
  seuilHabitants: number;
  population: { nom: string; url: string };
};
export const FRANCE = data.france as unknown as Compte & { lieux: number; departements: number };
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
   (page « Nos clubs »), adresses vérifiées. Balma n'y est plus : vendu. */
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
/* Balma (29/09) : plus de club — vendu. Le plus proche, mesuré : Saint-Cyprien, 6,9 km par la route
   depuis la mairie (les autres 11 à 12 km, OSRM), et le seul sans changement en transports : métro A,
   8 stations de Balma-Gramont à St Cyprien – République (Tisséo, arrets-itineraire), puis 833 m à pied. */
export const BALMA = {
  site: 'https://club-boxe-toulouse.com/',
  avant: 'À Balma, il n’y a plus de club Boxing Center. Le plus proche est',
  lien: 'celui de Saint-Cyprien',
  apres: ' : le métro A y va sans changement, 8 stations de Balma-Gramont à Saint-Cyprien – République, puis 11 minutes à pied.',
};

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

const fr = (n: number) => n.toLocaleString('fr-FR');
const nb = (n: number, un: string, plusieurs: string) => `${fr(n)} ${n > 1 ? plusieurs : un}`;
const liste = (xs: string[]) => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' et ' + xs.at(-1) : xs[0] || '');
const min1 = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/* « à Toulouse », « au Havre » ; « de Toulouse », « du Havre », « d’Angers » ; « 1er », « 2e ». */
export const a = (nom: string) => (nom.startsWith('Le ') ? 'au ' + nom.slice(3) : 'à ' + nom);
export const de = (nom: string) => (nom.startsWith('Le ') ? 'du ' + nom.slice(3) : /^[AEIOUÉÈÎ]/.test(nom) ? 'd’' + nom : 'de ' + nom);
export const rang = (n: number) => (n === 1 ? '1re' : n + 'e');
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
  return liste(Object.entries(par).slice(0, max).map(([d, n]) => `${n} en ${min1(d)}`));
}
export const FRAPPE = ['Boxe anglaise', 'Savate boxe française', 'Muay-thaï', 'Kick-boxing', 'Full contact'];
const deFrappe = (par: Record<string, number>) => Object.fromEntries(Object.entries(par).filter(([d]) => FRAPPE.includes(d)));
/** « la boxe anglaise », « le muay-thaï » : chaque boxe avec son article. */
const ARTICLE: Record<string, string> = {
  'Boxe anglaise': 'la boxe anglaise',
  'Savate boxe française': 'la savate boxe française',
  'Muay-thaï': 'le muay-thaï',
  'Kick-boxing': 'le kick-boxing',
  'Full contact': 'le full contact',
};
const art = (d: string) => ARTICLE[d] || min1(d);
/** La boxe la plus déclarée de la ville : c'est elle qui décide du premier sac. */
export const boxeDominante = (par: Record<string, number>) => Object.keys(deFrappe(par))[0] || 'Boxe anglaise';
/** « 12 salles de boxe et 46 dojos et salles d’arts martiaux » */
const typesDeSalles = (c: { boxe: number; dojos: number }) =>
  liste([c.boxe ? nb(c.boxe, 'salle de boxe', 'salles de boxe') : '', c.dojos ? nb(c.dojos, 'dojo ou salle d’arts martiaux', 'dojos et salles d’arts martiaux') : ''].filter(Boolean));

/* ── Le premier sac, par boxe dominante ─────────────────────────────────
   Le texte, la liste de la FAQ et les modèles montrés dépendent de la boxe
   la plus déclarée de la ville : pas la même page à Toulouse (anglaise) et
   là où la savate ou le muay-thaï dominent. */
const SAC: Record<string, { titre: string; essentiel: string; ensuite: string; liste: string; sources: string[] }> = {
  'Boxe anglaise': {
    titre: 'bandes, gants, protège-dents',
    essentiel: 'trois pièces sont personnelles dès le premier mois : des bandes de 4 m, une paire de gants — 10 oz pour le sac, 14 ou 16 oz pour la mise de gants — et un protège-dents',
    ensuite: 'Casque et chaussures montantes viennent avec l’opposition.',
    liste: 'des bandes de 4 m, des gants de 10 oz pour le sac ou de 14 à 16 oz pour boxer avec un partenaire, un protège-dents',
    sources: ['bandes-de-boxe', 'gants-de-boxe', 'gants-de-boxe-sparring', 'protege-dents', 'casques-de-boxe', 'chaussures-boxe', 'cordes-a-sauter', 'shorts-de-boxe'],
  },
  'Savate boxe française': {
    titre: 'chaussures, gants, protège-dents',
    essentiel: 'on boxe chaussé, pieds et poings : des chaussures de boxe française à semelle fine, des gants de 10 à 12 oz, des bandes et un protège-dents',
    ensuite: 'La coquille et le casque suivent quand viennent les assauts ; le club dit ce que la compétition exige.',
    liste: 'des chaussures de boxe française à semelle fine, des gants de 10 à 12 oz, des bandes, un protège-dents',
    sources: ['chaussures-boxe', 'gants-de-boxe', 'bandes-de-boxe', 'protege-dents', 'coquilles', 'casques-de-boxe', 'gants-de-boxe-sparring', 'cordes-a-sauter'],
  },
  'Muay-thaï': {
    titre: 'protège-tibias, gants, short thaï',
    essentiel: 'il faut protéger tibias et pieds : des protège-tibias avec protège-pied, des gants de 12 à 16 oz, des bandes, un protège-dents et une coquille',
    ensuite: 'Le short thaï, court et large, laisse passer le genou ; le casque n’arrive qu’en compétition amateur.',
    liste: 'des protège-tibias avec protège-pied, des gants de 12 à 16 oz, des bandes, un protège-dents, une coquille',
    sources: ['protege-tibias', 'gants-de-boxe', 'bandes-de-boxe', 'protege-dents', 'coquilles', 'shorts-de-boxe', 'gants-de-boxe-sparring', 'cordes-a-sauter'],
  },
  'Kick-boxing': {
    titre: 'gants, protège-tibias, coquille',
    essentiel: 'poings et jambes travaillent ensemble : des gants de 10 à 12 oz, des protège-tibias et pieds, des bandes, un protège-dents et une coquille',
    ensuite: 'Le casque vient avec la mise de gants ; certains clubs le demandent dès l’opposition légère.',
    liste: 'des gants de 10 à 12 oz, des protège-tibias et pieds, des bandes, un protège-dents, une coquille',
    sources: ['gants-de-boxe', 'protege-tibias', 'bandes-de-boxe', 'protege-dents', 'coquilles', 'casques-de-boxe', 'gants-de-boxe-sparring', 'shorts-de-boxe'],
  },
  'Full contact': {
    titre: 'gants, protège-pieds, casque',
    essentiel: 'il faut des gants de 10 oz, des protège-tibias et pieds, un casque et un protège-dents : les coups de pied portent au-dessus de la ceinture',
    ensuite: 'Les bandes protègent les poignets sous les gants ; le pantalon long reste la tenue des combats.',
    liste: 'des gants de 10 oz, des protège-tibias et pieds, un casque, un protège-dents',
    sources: ['gants-de-boxe', 'protege-tibias', 'casques-de-boxe', 'protege-dents', 'bandes-de-boxe', 'coquilles', 'gants-de-boxe-sparring', 'cordes-a-sauter'],
  },
};

/** Le premier sac d'une ville (ou d'une région) : titre, texte, sources des modèles. */
export function villeKit(lieu: string, c: { frappe: number; parDiscipline: Record<string, number> }) {
  const dom = boxeDominante(c.parDiscipline);
  const s = SAC[dom];
  const nDom = c.parDiscipline[dom] || 0;
  const judo = c.parDiscipline['Judo, jujitsu'] || 0;
  const karate = c.parDiscipline['Karaté'] || 0;
  return {
    discipline: dom,
    h2: fine(`Le premier sac de sport ${lieu} : ${s.titre}`),
    paragraphs: [
      `${Maj(lieu)}, ${art(dom)} est la plus déclarée des boxes, dans ${nb(nDom, 'lieu', 'lieux')} sur ${c.frappe}. Pour y débuter, ${s.essentiel}.`,
      s.ensuite + (judo || karate ? ` Le judo est déclaré dans ${nb(judo, 'lieu', 'lieux')} et le karaté dans ${karate} : là, le kimono passe avant tout, choisi au poids du tissu et à la grille de la marque.` : ''),
    ],
    sources: s.sources,
  };
}

/* ── Ville ─────────────────────────────────────────────────────────────── */

export function villeTitre(v: { nom: string }) {
  return `Boutique de boxe ${v.nom} : salles et matériel`;
}

export function villeDescription(v: Ville) {
  const d = `Boutique de boxe ${v.nom} : ${nb(v.lieux.length, 'lieu', 'lieux')} de boxe et d’arts martiaux ${a(v.nom)}, dont ${v.frappe} où l’on boxe, d’après le ministère des Sports, et le matériel de chacun.`;
  return d.length <= 158 ? d : `Boutique de boxe ${v.nom} : ${v.lieux.length} lieux de boxe et d’arts martiaux, dont ${v.frappe} où l’on boxe, et le matériel de chacun.`;
}

/** L'étiquette sous le titre : la densité, fait propre à la ville. */
export function villeDensite(v: Ville) {
  return `Un lieu de sports de combat pour ${fr(v.habitantsParLieu)} habitants : ${rang(v.rangDensite)} des ${VILLES.length} grandes villes.`;
}

/** Les deux phrases d'en-tête : autonomes, citables, vraies pour cette ville seulement. */
export function villeChapeau(v: Ville) {
  return `${v.nom} compte ${nb(v.salles, 'salle de combat', 'salles de combat')} — ${typesDeSalles(v)} — dans ${nb(v.lieux.length, 'lieu ouvert', 'lieux ouverts')} aux clubs ou au public, d’après le Recensement des équipements sportifs du ministère des Sports mis à jour le ${dateSource()}. Boutique de Boxe, boutique de boxe en ligne, ${livrer(v.nom)} ; les ${v.frappe} lieux où l’on boxe ouvrent la liste ci-dessous.`;
}

export function villeSections(v: Ville): SeoSection[] {
  const avecSite = v.lieux.filter((l) => siteDe(l)).length;
  const ecartes = [
    v.scolaires ? nb(v.scolaires, 'salle réservée aux scolaires', 'salles réservées aux scolaires') : '',
    v.fermes.length ? nb(v.fermes.length, 'lieu fermé que le recensement porte encore', 'lieux fermés que le recensement porte encore') : '',
  ].filter(Boolean);
  const p: string[] = [
    `${Maj(a(v.nom))}, les disciplines déclarées donnent le ton : ${repartition(v.parDiscipline, 5)}.`,
    `${v.frappe} des ${v.lieux.length} lieux accueillent une boxe — ${liste(Object.keys(deFrappe(v.parDiscipline)).map(min1))} — et ${avecSite} publient un site.`,
  ];
  if (ecartes.length) p.push(`Ne sont pas listés : ${liste(ecartes)}.`);
  return [{ h2: fine(`Ce que disent les ${v.lieux.length} lieux ${de(v.nom)}`), paragraphs: p }];
}

export function villeFaq(v: Ville): SeoFaq[] {
  const dom = boxeDominante(v.parDiscipline);
  const lieuxBoxe = v.lieux.filter((l) => l.salles.some((s) => s.boxe));
  const anglaise = v.lieux.filter((l) => l.disciplines.includes('Boxe anglaise'));
  // la réponse sur la boxe anglaise nomme d'autres lieux que celle sur les salles de boxe
  const dejaNommes = new Set(lieuxBoxe.slice(0, 3).map((l) => l.id));
  const autres = anglaise.filter((l) => !dejaNommes.has(l.id));
  const autour = [...VILLES].sort((x, y) => x.habitantsParLieu - y.habitantsParLieu);
  const i = autour.indexOf(v);
  const avant = autour[i - 1];
  const apres = autour[i + 1];
  const faq: SeoFaq[] = [
    {
      question: fine(`Où acheter du matériel de boxe ${a(v.nom)} ?`),
      answer: `En ligne, chez Boutique de Boxe, livré à domicile ou en point relais${shop.ventesOuvertes ? '' : ' à l’ouverture des ventes'}. Pour ${art(dom)}, la boxe la plus déclarée ${a(v.nom)}, le catalogue réunit ${SAC[dom].liste}.`,
    },
    {
      question: fine(`Combien de salles de boxe ${a(v.nom)} ?`),
      answer: lieuxBoxe.length
        ? `${Maj(nb(v.boxe, 'salle de boxe dédiée', 'salles de boxe dédiées'))}, dans ${nb(lieuxBoxe.length, 'lieu', 'lieux')} dont ${liste(lieuxBoxe.slice(0, 3).map((l) => l.nom))}. En tout, ${v.frappe} lieux déclarent une boxe : ${repartition(deFrappe(v.parDiscipline), 5)}.`
        : `Aucune salle n’y est classée « salle de boxe », mais ${v.frappe} lieux déclarent une boxe : ${repartition(deFrappe(v.parDiscipline), 5)}.`,
    },
  ];
  if (anglaise.length)
    faq.push({
      question: fine(`Où faire de la boxe anglaise ${a(v.nom)} ?`),
      answer: `Le recensement compte ${nb(anglaise.length, 'lieu', 'lieux')} où la boxe anglaise est déclarée ${a(v.nom)}${autres.length ? `, dont ${liste(autres.slice(-3).map((l) => l.nom))}` : ''}.`,
    });
  faq.push({
    question: fine(`Combien d’habitants pour une salle de sports de combat ${a(v.nom)} ?`),
    answer: `Un lieu pour ${fr(v.habitantsParLieu)} habitants (${fr(v.population)} habitants, population légale de l’Insee, pour ${v.lieux.length} lieux) : ${v.nom} se classe ${rang(v.rangDensite)} des ${VILLES.length} grandes villes${avant && apres ? `, entre ${avant.nom} (${fr(avant.habitantsParLieu)}) et ${apres.nom} (${fr(apres.habitantsParLieu)})` : avant ? `, derrière ${avant.nom} (${fr(avant.habitantsParLieu)})` : apres ? `, devant ${apres.nom} (${fr(apres.habitantsParLieu)})` : ''}.`,
  });
  return faq;
}

/** Paris, Marseille, Lyon : le recensement range les lieux par arrondissement. */
export function parArrondissement(v: Ville) {
  const o = new Map<string, { nom: string; lieux: number; frappe: number; boxe: number }>();
  for (const l of v.lieux) {
    const m = /(\d+)(?:er|e|ème)\s+arrondissement/i.exec(l.commune || '');
    if (!m) continue;
    const k = Number(m[1]);
    const x = o.get(String(k)) || { nom: rang(k).replace('1re', '1er'), lieux: 0, frappe: 0, boxe: 0 };
    x.lieux++;
    x.frappe += Number(l.frappe);
    x.boxe += l.salles.filter((s) => s.boxe).length;
    o.set(String(k), x);
  }
  return [...o.entries()].sort((x, y) => Number(x[0]) - Number(y[0])).map(([, x]) => x);
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
  return `Boutique de boxe ${r.nom} : ${fr(t.lieux)} lieux de boxe et d’arts martiaux hors Paris, commune par commune, et le matériel qu’ils demandent.`;
}
export function regionChapeau(r: Region) {
  const t = regionTotal(r);
  const g = parLieux(r);
  return `Hors Paris, l’${r.nom} compte ${nb(t.salles, 'salle de combat', 'salles de combat')} — ${typesDeSalles(t)} — dans ${fr(t.lieux)} lieux, d’après le Recensement des équipements sportifs du ministère des Sports mis à jour le ${dateSource()} : de ${g[0].lieux} lieux ${dansDepartement(g[0])} à ${g.at(-1)!.lieux} ${dansDepartement(g.at(-1)!)}. Boutique de Boxe les résume ci-dessous, commune par commune.`;
}
export function regionFaq(r: Region): SeoFaq[] {
  const g = parLieux(r);
  const communes = r.groupes.flatMap((x) => x.communes).sort((x, y) => y.lieux - x.lieux);
  const dom = boxeDominante(regionDisciplines(r));
  return [
    {
      question: fine(`Où acheter du matériel de boxe en ${r.nom} ?`),
      answer: `Boutique de Boxe est une boutique en ligne : elle ${livrer('toute l’' + r.nom)}, à domicile ou en point relais. Pour ${art(dom)}, la boxe la plus déclarée de la région, le catalogue réunit ${SAC[dom].liste}.`,
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
  return `Boutique de Boxe est une boutique sport de combat en ligne, basée à Toulouse, qui ${livrer('toute la France métropolitaine')}. Ville par ville, ${fr(lieux)} lieux de boxe et d’arts martiaux sont recensés ici d’après le ministère des Sports, avec le matériel que chacun demande.`;
}
/** Les chiffres de la France entière, en deux phrases citables. */
export function franceEnChiffres() {
  const top = Object.entries(FRANCE.parDiscipline).slice(0, 3);
  const boxes = Object.entries(FRANCE.parDiscipline).filter(([d]) => FRAPPE.includes(d));
  return [
    `En France métropolitaine, le Recensement des équipements sportifs compte ${fr(FRANCE.salles)} salles de combat dans ${fr(FRANCE.lieux)} lieux ouverts aux clubs ou au public, sur ${FRANCE.departements} départements. Les disciplines les plus déclarées sont ${liste(top.map(([d, n]) => `${min1(d)} (${fr(n)} lieux)`))}.`,
    `${fr(FRANCE.frappe)} lieux déclarent une boxe : ${liste(boxes.map(([d, n]) => `${fr(n)} en ${min1(d)}`))}. ${fr(FRANCE.boxe)} salles y sont classées « salle de boxe ».`,
  ];
}
export function carrefourFaq(): SeoFaq[] {
  const dense = [...VILLES].sort((x, y) => x.habitantsParLieu - y.habitantsParLieu);
  return [
    {
      question: fine('Existe-t-il une boutique sport de combat en ligne qui livre toute la France ?'),
      answer: `Oui : Boutique de Boxe, boutique sport de combat France basée à Toulouse (SAS Boxing Center), ${livrer('toute la France métropolitaine')}, à domicile ou en point relais.`,
    },
    {
      question: fine('Quelle grande ville a le plus de salles de sports de combat par habitant ?'),
      answer: `${dense[0].nom} : un lieu pour ${fr(dense[0].habitantsParLieu)} habitants, devant ${dense[1].nom} (${fr(dense[1].habitantsParLieu)}) et ${dense[2].nom} (${fr(dense[2].habitantsParLieu)}). À l’autre bout, ${dense.at(-1)!.nom} compte un lieu pour ${fr(dense.at(-1)!.habitantsParLieu)} habitants. Recensement du ministère des Sports et populations légales de l’Insee.`,
    },
    {
      question: fine('Comment trouver une salle de boxe dans ma ville ?'),
      answer: `Chaque commune de plus de ${fr(SOURCE.seuilHabitants)} habitants qui compte au moins ${SOURCE.seuil} lieux, dont ${SOURCE.seuilFrappe} où l’on boxe, a sa page sur Boutique de Boxe : les lieux du recensement, leurs disciplines, leurs adresses et leurs sites.`,
    },
  ];
}
