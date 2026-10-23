/**
 * Les douze pages de tête (20/10/2026) : une requête qui rapporte, une page de rayon, et de quoi y être
 * la meilleure réponse de la première page. Relevé du 20/10 : sur ces requêtes, la page la plus complète
 * (Metal Boxe) aligne 1 500 à 2 600 mots, un guide et 5 à 9 questions ; Venum et Dragon Bleu servent
 * leurs produits en JavaScript, presque sans texte (.research/seo-2026-10-20/ecart-tetes.md).
 *
 * Pour chaque page : le H1 et le titre commencent par la requête exacte ; la description donne le
 * nombre de modèles et le prix d’entrée du jour ; sous la grille, le guide dit comment choisir, nomme un
 * modèle réel par usage avec son critère, chiffre les prix et les marques ; les questions sont celles
 * que posent les internautes (suggestions de recherche du 20/10), publiées en FAQPage.
 *
 * Règles tenues ici : aucun chiffre écrit à la main qui ne vienne d’un guide publié ou du texte déjà
 * relu des rayons ; tout le reste se calcule sur le catalogue du jour. La requête exacte paraît au plus
 * trois fois dans le texte, hors titre et H1. Aucune phrase de sept mots n’est partagée entre deux
 * rayons. Les liens s’écrivent [texte](/adresse/) dans les paragraphes.
 */
import { money, shop, livraison, estLourd, type Product } from './catalog';
import { dansLeRayon, ENFANT } from './rayons';
import { ouncesOf, OZ_COPY } from './facets';
import type { SeoFaq } from './seo-copy';

/* ------------------------------------------------------------------ outils */

/** « 1 042 » : l’espace fine de fr-FR (U+202F) manque à la police d’affichage ; l’insécable, comme money(). */
const fr = (n: number) => n.toLocaleString('fr-FR').replace(/\u202f/g, '\u00a0');
const nom = (p: Product) => p.name.toLowerCase();
const spec = (p: Product, ...cles: string[]) => cles.map((k) => p.specs?.[k] || '').join(' ').toLowerCase();
/** Les tailles d’un modèle, sans la couleur ni la précision entre parenthèses. */
const tailles = (p: Product) => p.sizes.map((s) => s.split(',')[0].replace(/\s*\(.*$/, '').trim());
const propose = (p: Product, re: RegExp) => tailles(p).some((s) => re.test(s));
const enfant = (p: Product) => p.audience === 'enfant' || ENFANT.test(p.name) || p.sizes.some((s) => /enfant|junior|kids?\b|\d+\s*-\s*\d+\s*ans|\d+\s*\/\s*\d+\s*ans/i.test(s));
const adulte = (p: Product) => p.audience !== 'enfant' && !ENFANT.test(p.name);
const velcro = (p: Product) => /agrippant/.test(spec(p, 'Fermeture'));
const aLacets = (p: Product) => /lacets/.test(spec(p, 'Fermeture'));
const matiere = (p: Product) => spec(p, 'Matières', 'Matière', 'Matière extérieure');
const enCuir = (p: Product) => /\bcuir\b/.test(nom(p) + ' ' + matiere(p)) && !/synth|simili|\bpu\b|vegan/.test(nom(p) + ' ' + matiere(p));
const enCoton = (p: Product) => /coton/.test(nom(p) + ' ' + matiere(p));
const liste = (xs: string[]) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' et ' + xs[xs.length - 1]);
const pluriel = (n: number, un: string, plusieurs: string) => `${fr(n)} ${n > 1 ? plusieurs : un}`;
/** « 6 m », « 4,50 m », « 1,80 m » : la façon dont le site écrit une longueur. */
const metres = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(2).replace('.', ',')) + ' m';
/** Un modèle cité dans une phrase : son nom entre guillemets, sans article qui jure avec lui. */
const cite = (p: Product) => `« ${p.name} »`;
/** Le modèle sans le nom générique qui le précède (« Sac de frappe sur pied Century Wavemaster » → « Century Wavemaster »). */
const citeModele = (p: Product) => `« ${p.name.replace(/^sac de frappe (sur pied )?/i, '')} »`;
const NI_MARQUE = /pr[ée]ciser|^Sélection /i;

/** Le prix d’un modèle tel que la carte l’affiche : « dès » quand ses tailles n’ont pas toutes le même prix. */
export function prixAffiche(p: Product) {
  const autres = (p.variants || []).map((v) => v.price).filter((x) => x > 0);
  const bas = Math.min(p.price, ...autres);
  return (autres.some((x) => x !== p.price) ? 'dès ' : '') + money(bas);
}
/** Ce que dit la fiche d’un modèle, en une ligne : fermeture, matière, tailles (« Auto-agrippant · Cuir · Nylon · 10 à 16 oz »). */
export function resumeFiche(p: Product) {
  const parts: string[] = [];
  const ferme = p.specs?.['Fermeture'];
  const mat = p.specs?.['Matières'] || p.specs?.['Matière'];
  if (ferme) parts.push(ferme);
  if (mat) parts.push(mat);
  const oz = ouncesOf(p);
  const t = tailles(p).filter((s) => s.length <= 14);
  if (oz.length > 1) parts.push(`${oz[0]} à ${oz[oz.length - 1]} oz`);
  else if (oz.length === 1) parts.push(`${oz[0]} oz`);
  else if (t.length > 4) parts.push(`${t[0]} à ${t[t.length - 1]}`);
  else if (t.length) parts.push(t.join(', '));
  return parts.join(' · ') || 'Voir la fiche';
}
/** « le moins cher », « le deuxième prix »… : le rang d’un modèle parmi ceux d’une même règle. Pour une règle
 *  rangée par prix, `choix()` le compte sur les prix distincts : deux modèles au même prix ont le même rang. */
const rang = (i: number, genre: 'm' | 'f' = 'm') =>
  i === 0 ? (genre === 'f' ? 'la moins chère' : 'le moins cher') : i === 1 ? 'le deuxième prix' : `le ${i + 1}ᵉ prix`;
/** « le plus cher du rayon », « le deuxième plus cher »… : compté sur les prix distincts des candidats. */
const plusCher = (p: Product, candidats: Product[]) => {
  const k = [...new Set(candidats.map((x) => x.price))].sort((a, b) => b - a).indexOf(p.price);
  return k <= 0 ? 'le plus cher du rayon' : k === 1 ? 'le deuxième plus cher du rayon' : `le ${k + 1}ᵉ plus cher du rayon`;
};
/** « le noir », « l’or » : une couleur des fiches, avec son article. */
const leCouleur = (c: string) => (/^[aeiouyéèêh]/i.test(c) ? 'l’' + c : 'le ' + c);

/* ------------------------------------------------------------------ les faits d’un rayon */

export type Marque = { nom: string; n: number; min: number; max: number };
export type Faits = {
  /** modèles listés par la page */
  n: number;
  /** modèles qui comptent dans les prix (lib/rayons.ts : pas de semelle, pas de boîte) */
  compte: number;
  min: number;
  q1: number;
  mediane: number;
  q3: number;
  max: number;
  marques: Marque[];
};

export function faits(slug: string, items: Product[]): Faits {
  const comptes = items.filter((p) => p.price > 0 && dansLeRayon(p.category, p) && dansLeRayon(slug, p));
  const prix = comptes.map((p) => p.price).sort((a, b) => a - b);
  const quantile = (q: number) => prix[Math.min(prix.length - 1, Math.max(0, Math.floor((prix.length - 1) * q)))] ?? 0;
  const groupes = new Map<string, Product[]>();
  for (const p of comptes) {
    if (!p.brand || NI_MARQUE.test(p.brand)) continue;
    const k = p.brand.trim().toLowerCase();
    groupes.set(k, [...(groupes.get(k) || []), p]);
  }
  const marques = [...groupes.values()]
    .map((ps) => {
      const graphies = new Map<string, number>();
      for (const p of ps) graphies.set(p.brand.trim(), (graphies.get(p.brand.trim()) || 0) + 1);
      // la graphie la plus fréquente, et à égalité celle qui n’est pas en capitales
      const nomMarque = [...graphies.entries()].sort((a, b) => b[1] - a[1] || Number(a[0] === a[0].toUpperCase()) - Number(b[0] === b[0].toUpperCase()))[0][0];
      const s = ps.map((p) => p.price).sort((a, b) => a - b);
      return { nom: nomMarque, n: ps.length, min: s[0], max: s[s.length - 1] };
    })
    .sort((a, b) => b.n - a.n || a.nom.localeCompare(b.nom, 'fr'));
  return { n: items.length, compte: comptes.length, min: prix[0] ?? 0, q1: quantile(0.25), mediane: prix[Math.floor(prix.length / 2)] ?? 0, q3: quantile(0.75), max: prix[prix.length - 1] ?? 0, marques };
}

/** « Elion (58 modèles), Fairtex (37) et Cleto Reyes (35) » */
const marquesTexte = (f: Faits, k = 4) => liste(f.marques.slice(0, k).map((m, i) => (i === 0 ? `${m.nom} (${pluriel(m.n, 'modèle', 'modèles')})` : `${m.nom} (${fr(m.n)})`)));

/** Les marques d’un rayon, une proposition chacune : « Fairtex, 37 modèles de 49,70 € à 287,90 €, de 8 à 16 oz ». */
function parMarque(slug: string, items: Product[], f: Faits, k: number, detail?: (ps: Product[]) => string, entre = false) {
  return f.marques
    .slice(0, k)
    .map((m) => {
      const ps = items.filter((p) => p.price > 0 && p.brand.trim().toLowerCase() === m.nom.toLowerCase() && dansLeRayon(p.category, p) && dansLeRayon(slug, p));
      const prix = m.min === m.max ? `à ${money(m.min)}` : entre ? `entre ${money(m.min)} et ${money(m.max)}` : `de ${money(m.min)} à ${money(m.max)}`;
      const d = detail ? detail(ps) : '';
      // « entre » : le détail d’abord, puis le prix (rayons qui traversent plusieurs familles)
      return entre ? `${m.nom} : ${d || pluriel(m.n, 'modèle', 'modèles')}, ${prix}` : `${m.nom}, ${pluriel(m.n, 'modèle', 'modèles')} ${prix}${d ? `, ${d}` : ''}`;
    })
    .join(' ; ');
}
/** L’étendue des tailles d’un groupe de modèles, dans l’ordre d’une grille : « du junior au XL ». */
function etendue(ps: Product[], ordre: [string, RegExp][]) {
  const vues = ordre.filter(([, re]) => ps.some((p) => propose(p, re))).map(([t]) => (t === 'Junior' ? 'junior' : t));
  return vues.length > 1 ? `du ${vues[0]} au ${vues[vues.length - 1]}` : vues.length ? `en ${vues[0]}` : '';
}

/* ------------------------------------------------------------------ les types d’un guide */

export type Contexte = { f: Faits; items: Product[]; all: Product[] };
type Texte = string | ((c: Contexte) => string);
export const texte = (t: Texte, c: Contexte) => (typeof t === 'function' ? t(c) : t);

export type Regle = {
  usage: string;
  /** cherche dans les modèles de la page (défaut) ou dans tout le catalogue */
  parmi?: 'page' | 'catalogue';
  filtre: (p: Product) => boolean;
  /** ordre des candidats : le prix croissant par défaut */
  ordre?: (a: Product, b: Product) => number;
  /** le critère écrit, vrai pour le modèle retenu : son rang parmi les candidats, leur nombre */
  critere: (o: { p: Product; i: number; n: number; candidats: Product[]; c: Contexte }) => string;
};
export type Choix = { usage: string; produit: Product; critere: string };
export type Cellule = string | { texte: string; href: string };
export type Tableau = { titre: string; colonnes: string[]; lignes: Cellule[][]; note?: string };

export type GuideRayon = {
  slug: string;
  /** la requête exacte, telle que les internautes la tapent */
  requete: string;
  /** le jour où le texte de la page a changé pour la dernière fois (AAAA-MM-JJ) : plan du site et graphe JSON-LD */
  revision: string;
  h1: string;
  eyebrow: string;
  titre: (c: Contexte) => string;
  description: (c: Contexte) => string;
  label: (c: Contexte) => string;
  intro: string;
  guide: { titre: string; chapeau: Texte; chapitres: { titre: string; texte: Texte[] }[] };
  usages: { titre: string; note: string; regles: Regle[] };
  tableau?: (c: Contexte) => Tableau | null;
  faq: (c: Contexte) => SeoFaq[];
  liens: { titre: string; liens: { href: string; texte: string }[] }[];
};

const parPrix = (a: Product, b: Product) => a.price - b.price || a.name.localeCompare(b.name, 'fr');
const nonNul = <T>(x: T | null): x is T => x !== null;

/** Un modèle par usage : le premier candidat que l’ordre désigne et qu’aucune ligne n’a déjà pris. */
export function choix(g: GuideRayon, c: Contexte): Choix[] {
  const pris = new Set<string>();
  const out: Choix[] = [];
  for (const r of g.usages.regles) {
    const base = r.parmi === 'catalogue' ? c.all : c.items;
    const candidats = base.filter((p) => p.price > 0 && r.filtre(p)).sort(r.ordre || parPrix);
    const k = candidats.findIndex((p) => !pris.has(p.id));
    if (k < 0) continue;
    const p = candidats[k];
    pris.add(p.id);
    // Rangée par prix (l’ordre par défaut), la règle compte les prix distincts : un modèle au même prix que celui
    // déjà retenu plus haut reste « le moins cher », pas « le deuxième prix ».
    const i = r.ordre ? k : [...new Set(candidats.map((x) => x.price))].indexOf(p.price);
    out.push({ usage: r.usage, produit: p, critere: r.critere({ p, i, n: candidats.length, candidats, c }) });
  }
  return out;
}

/** Les prix du rayon en trois tranches : le quart le moins cher, les deux du milieu, le dernier. */
export function tranches(f: Faits, items: Product[], slug: string) {
  const prix = items.filter((p) => p.price > 0 && dansLeRayon(p.category, p) && dansLeRayon(slug, p)).map((p) => p.price);
  return [
    { libelle: 'Le quart le moins cher', de: f.min, a: f.q1, n: prix.filter((x) => x <= f.q1).length },
    { libelle: 'Les deux quarts du milieu', de: f.q1, a: f.q3, n: prix.filter((x) => x > f.q1 && x <= f.q3).length },
    { libelle: 'Le quart le plus cher', de: f.q3, a: f.max, n: prix.filter((x) => x > f.q3).length },
  ].filter((t) => t.n > 0);
}

/** Un tableau « taille → modèles, premier prix » à partir d’une liste ordonnée de tailles. */
function tableauTailles(items: Product[], ordre: [string, RegExp][], titre: string, note?: string): Tableau | null {
  const lignes: Cellule[][] = [];
  for (const [libelle, re] of ordre) {
    const ps = items.filter((p) => p.price > 0 && propose(p, re));
    if (!ps.length) continue;
    lignes.push([libelle, fr(ps.length), money(Math.min(...ps.map((p) => p.price)))]);
  }
  return lignes.length >= 2 ? { titre, colonnes: ['Taille', 'Modèles', 'Dès'], lignes, note } : null;
}

const famille = (all: Product[], cat: string) => all.filter((p) => p.category === cat && p.price > 0 && dansLeRayon(cat, p));
const premier = (ps: Product[]) => [...ps].filter((p) => p.price > 0).sort(parPrix)[0];

/* ------------------------------------------------------------------ repères propres aux rayons */

/** Sacs de frappe : ce que désigne un nom du rayon. */
type GenreSac = 'poire' | 'fixation' | 'support' | 'mannequin' | 'pied' | 'eau' | 'suspendu' | 'autre';
export function genreSac(p: Product): GenreSac {
  const n = nom(p);
  if (/^(poire|punching|balle r)/.test(n)) return 'poire';
  if (/^(rotule|attache|cha[iî]ne|ressort|crochet|mousqueton|fixation|plateforme)/.test(n)) return 'fixation';
  if (/^(potence|portique)|rail de convoyage/.test(n)) return 'support';
  if (/^(mannequin|base de frappe|station|cible)/.test(n)) return 'mannequin';
  if (/sur pied/.test(n)) return 'pied';
  if (/aqua|hydro/.test(n)) return 'eau';
  if (n.startsWith('sac de frappe')) return 'suspendu';
  return 'autre';
}
/** La hauteur annoncée d’un sac (« 1,35 m », « 130 cm »), en mètres. */
function hauteur(p: Product): number | null {
  const m = /(\d[,.]\d{1,2})\s*m\b/.exec(p.name);
  if (m) return parseFloat(m[1].replace(',', '.'));
  const cm = /(\d{3})\s*cm\b/.exec(p.name + ' ' + (p.specs?.['Hauteur du sac'] || ''));
  return cm ? Number(cm[1]) / 100 : null;
}
/** Le poids annoncé dans le nom (« 45 kg »). */
const kilos = (p: Product) => {
  const m = /(\d{1,3})\s*kg\b/i.exec(p.name);
  return m ? Number(m[1]) : null;
};
const vide = (p: Product) => /\bvide\b/.test(nom(p) + ' ' + spec(p, 'Remplissage à réception'));
const sacs = (items: Product[]) => items.filter((p) => ['suspendu', 'pied', 'eau'].includes(genreSac(p)));

/** Bandes : la longueur annoncée (fiche, nom ou taille), en mètres. */
export function longueur(p: Product): number | null {
  for (const src of [p.specs?.['Longueur'] || '', p.name, ...p.sizes]) {
    const m = /(\d+(?:[.,]\d+)?)\s*(?:m\b|mètres?)/i.exec(src);
    if (m) {
      const x = parseFloat(m[1].replace(',', '.'));
      if (x >= 1.5 && x <= 7) return x;
    }
  }
  return null;
}

/** Protège-dents : une boîte n’en est pas un. */
const protegeDents = (p: Product) => nom(p).startsWith('protège-dents');
const bagues = (p: Product) => /braces|bagues/.test(nom(p));
const double = (p: Product) => /\bdouble\b/.test(nom(p));
const pdJunior = (p: Product) => protegeDents(p) && (enfant(p) || propose(p, /junior|enfant/i));

/** Kimonos : grammage lu dans le nom (« Squale 350 »), tailles A. */
const grammage = (p: Product) => {
  const m = /\b(350|450|550)\b/.exec(p.name);
  return m ? Number(m[1]) : null;
};
const TAILLES_A: [string, RegExp][] = ['A0', 'A1', 'A1L', 'A2', 'A2L', 'A3', 'A3L', 'A4', 'A4L'].map((t) => [t, new RegExp('^' + t + '$', 'i')]);

/** Tailles en lettres, dans l’ordre. */
const TAILLES_LETTRES: [string, RegExp][] = [
  ['Junior', /junior|enfant|small - medium/i],
  ['XS', /^xs(mall)?$/i],
  ['S', /^s$/i],
  ['S/M', /^s\/m$/i],
  ['M', /^m$/i],
  ['M/L', /^m\/l$/i],
  ['L', /^l$/i],
  ['L/XL', /^l\/xl$/i],
  ['XL', /^xl$/i],
  ['XXL', /^xxl$/i],
  ['XXXL', /^(xxxl|3xl)$/i],
  ['Taille unique', /^taille unique$/i],
];

/** Casques : la couverture que le nom annonce. */
const couverture = (p: Product) => (/intégral/.test(nom(p)) ? 'integral' : /à barre/.test(nom(p)) ? 'barre' : /face ouverte|\bouvert/.test(nom(p)) ? 'ouvert' : 'autre');
/** Casques : la grille en centimètres quand la marque la donne (« S (47-51 cm) »). */
function grilleCm(p: Product): [number, number] | null {
  const bornes = p.sizes.flatMap((s) => [...s.matchAll(/(\d{2})\s*-\s*(\d{2})\s*cm/gi)].flatMap((m) => [Number(m[1]), Number(m[2])]));
  return bornes.length ? [Math.min(...bornes), Math.max(...bornes)] : null;
}

const gantMMA = (p: Product) => p.category === 'gants-mma' && /gant/i.test(p.name);
/** Gants MMA : la paume ouverte, annoncée par la fiche (« Paume ») ou par le nom (« Open Palm »). */
const paumeOuverte = (p: Product) => /ouverte/.test(spec(p, 'Paume')) || /open palm/.test(nom(p));
const gantBoxe = (p: Product) => p.category === 'gants-de-boxe' && /^gants? /.test(nom(p));
const kimonoJJB = (p: Product) => nom(p).startsWith('kimono') && /jjb|jiu|bjj|\bgi\b/.test(nom(p));
const tibias = (p: Product) => nom(p).startsWith('protège-tibias');
const tibiaPied = (p: Product) => tibias(p) && /pied/.test(nom(p)) && !enCoton(p);
const surPied = (p: Product) => p.category === 'sacs-de-frappe' && genreSac(p) === 'pied';

/* ------------------------------------------------------------------ repères des six rayons de l’étape 2 (22/10) */

const typeSpec = (p: Product) => (p.specs?.['Type'] || '').toLowerCase();
const commence = (re: RegExp) => (p: Product) => re.test(nom(p));
/* accessoires */
const bandes = commence(/^bandes? de boxe/);
const sousGants = commence(/^(sous-gants|mitaines)/);
const tapes = commence(/^(finger tape|tape )/);
const hygiene = (p: Product) => /hygi/.test(typeSpec(p)) || /^(savon|spray|séchoir|boîte à savon|trousse|ciseaux)/.test(nom(p));
const gourde = (p: Product) => /gourde|bouteille/.test(typeSpec(p) + ' ' + nom(p));
const cordeASauter = commence(/^corde à sauter/);
/* protections */
const casque = (p: Product) => nom(p).startsWith('casque') && !nom(p).startsWith('casquette');
const coquille = commence(/^(coquille|protection pelvienne|support et coquille|support et pelvienne|short et coquille|short shock doctor)/);
const pourFemme = (p: Product) => /femme/.test(typeSpec(p) + ' ' + nom(p)) || nom(p).startsWith('brassière');
const articulation = commence(/^(coudières|chevillères|genouillères|strap |bracelet |ceinture mcdavid)/);
const coudieres = commence(/^coudières/);
const chevilleres = commence(/^chevillères/);
const pourEntraineur = commence(/^(ceinture de frappe|protège-cuisses|veste fairtex)/);
const plastron = commence(/^plastron/);
const protegePieds = commence(/^protège-pieds/);
const avantBras = commence(/^protège-avant-bras/);
const tibiaSeul = (p: Product) => tibias(p) && !/pied/.test(nom(p));
/* textile */
const shortAnglais = (p: Product) => nom(p).startsWith('short') && /boxe anglaise/.test(nom(p));
const shortThai = (p: Product) => nom(p).startsWith('short') && !nom(p).startsWith('short mma') && /tha[iï]|muay/.test(nom(p));
const shortMMA = commence(/^short mma/);
const tshirt = commence(/^(t-shirt|polo)/);
const debardeur = commence(/^débardeur/);
const rashguard = commence(/^rashguard/);
const sweat = commence(/^(sweat|veste)/);
const peignoir = commence(/^peignoir/);
const spats = commence(/^(spats|legging)/);
const pantalon = commence(/^pantalon/);
const brassiere = commence(/^brassière/);
const tenueSavate = (p: Product) => /^(combinaison|pantalon|débardeur)/.test(nom(p)) && /boxe française|savate/.test(nom(p));
const femmeTextile = (p: Product) => /femme|fille|brassière/.test(nom(p));
/* arts martiaux */
const kimono = commence(/^kimono/);
const kimonoJudo = (p: Product) => kimono(p) && /judo/.test(nom(p));
const kimonoKarate = (p: Product) => kimono(p) && /karat/.test(nom(p));
const dobok = commence(/^dobok/);
const hakama = commence(/^hakama/);
const ceintureGrade = (p: Product) => nom(p).startsWith('ceinture') && !/frappe|mcdavid/.test(nom(p));
const armeEntrainement = commence(/^(tanto|couteau|planche de rupture|étui pour armes)/);
const bebe = commence(/bébé/);
/** Les tailles en centimètres d’une tenue (« 150 cm ») : la plus petite et la plus grande. */
function centimetres(ps: Product[]): [number, number] | null {
  const cm = ps.flatMap((p) => tailles(p).map((s) => /^(\d{2,3})\s*cm$/i.exec(s)).filter((m): m is RegExpExecArray => Boolean(m)).map((m) => Number(m[1])));
  return cm.length ? [Math.min(...cm), Math.max(...cm)] : null;
}
/** Un tableau « type → modèles, premier prix » à partir de règles nommées ; chaque ligne peut lier sa page. */
function tableauTypes(items: Product[], types: [string, (p: Product) => boolean, string?][], titre: string, note?: string): Tableau | null {
  const lignes: Cellule[][] = [];
  for (const [libelle, test, href] of types) {
    const ps = items.filter((p) => p.price > 0 && test(p));
    if (!ps.length) continue;
    lignes.push([href ? { texte: libelle, href } : libelle, fr(ps.length), money(Math.min(...ps.map((p) => p.price)))]);
  }
  return lignes.length >= 2 ? { titre, colonnes: ['Type', 'Modèles', 'Dès'], lignes, note } : null;
}
/** « dès 5,90 € » d’un groupe, ou rien s’il est vide. */
const desDe = (ps: Product[]) => {
  const s = ps.filter((p) => p.price > 0).map((p) => p.price);
  return s.length ? money(Math.min(...s)) : null;
};
const compte = (ps: Product[], t: (p: Product) => boolean) => ps.filter((p) => p.price > 0 && t(p)).length;
/** « 3 kimonos de judo dès 16,90 € » ; au singulier quand il n’y en a qu’un. */
const combien = (ps: Product[], t: (p: Product) => boolean, un: string, plusieurs: string) => {
  const g = ps.filter((p) => p.price > 0 && t(p));
  return g.length ? `${pluriel(g.length, un, plusieurs)} dès ${desDe(g)}` : null;
};

/* ------------------------------------------------------------------ les douze rayons */

export const GUIDES_RAYONS: GuideRayon[] = [
  /* ---------------------------------------------------------------- gants de boxe */
  {
    slug: 'gants-de-boxe',
    requete: 'gants de boxe',
    revision: '2026-10-22',
    h1: 'Gants de boxe',
    // Les deux requêtes du concours qui mènent ici, « vente gants de boxe » et « gants boxe » : dans le titre, le
    // surtitre et la description (scripts/audit-seo.mjs), nulle part ailleurs.
    eyebrow: 'GANTS BOXE · VENTE GANTS DE BOXE',
    titre: ({ items }) => {
      const oz = items.flatMap(ouncesOf);
      return `Gants de boxe : vente gants de boxe, gants boxe ${Math.min(...oz)} à ${Math.max(...oz)} oz`;
    },
    description: ({ f, items }) => {
      const oz = items.flatMap(ouncesOf);
      return `Gants boxe, vente gants de boxe : ${fr(f.n)} modèles dès ${money(f.min)}, de ${Math.min(...oz)} à ${Math.max(...oz)} oz, velcro ou lacets, cuir ou synthétique. Guide par usage, prix, marques.`;
    },
    label: ({ f, items }) => {
      const oz = items.flatMap(ouncesOf);
      return `${fr(f.n)} modèles, de ${Math.min(...oz)} à ${Math.max(...oz)} oz, dès ${money(f.min)}.`;
    },
    intro: 'L’usage d’abord, le poids ensuite : 10 oz au sac, 12 oz en technique, 14 à 16 oz face à un partenaire. Le guide d’achat suit la liste.',
    guide: {
      titre: 'Comment choisir ses gants de boxe',
      chapeau: ({ f }) => `${fr(f.compte)} paires, ${f.marques.length} marques, de ${money(f.min)} à ${money(f.max)} : ce qui départage deux modèles, puis un modèle réel pour chaque usage.`,
      chapitres: [
        {
          titre: 'L’usage fixe le poids',
          texte: [
            'Une paire se choisit pour ce que vous en ferez. Au sac et aux pattes d’ours, 10 oz suffisent : moins de mousse, plus de vitesse. En technique et en cours collectif, 12 oz font le poids à tout faire. Face à un partenaire, le rembourrage protège aussi l’autre : 14 oz pour les gabarits légers, 16 oz pour la plupart des adultes, 18 oz pour les lourds.',
            'Votre salle peut imposer un poids pour le sparring : demandez-le avant de commander. Le [calculateur de poids](/outils/poids-de-gants/) pose les trois questions utiles, la séance, votre poids et votre âge.',
          ],
        },
        {
          titre: 'Le gabarit affine le chiffre',
          texte: [
            'Sous 55 kg, on reste entre 10 et 12 oz ; de 55 à 75 kg, entre 12 et 14 oz ; au-delà, entre 14 et 16 oz. Ce sont des repères, pas des règles.',
            'Pour un enfant, l’âge donne une première indication : 4 oz de 5 à 7 ans, 6 oz de 7 à 10 ans, 8 oz de 10 à 13 ans, puis 10 oz à l’adolescence selon la corpulence. Une paire d’enfant se prend à sa main du jour, jamais pour grandir dedans.',
          ],
        },
        {
          titre: 'Une once n’est pas une pointure',
          texte: [
            'L’once mesure le rembourrage, pas la place pour la main. Deux paires de 14 oz peuvent chausser très différemment : essayez avec les bandes que vous porterez, fermez le poing, vérifiez que les doigts ne flottent pas et que le pouce se place sans forcer.',
            'Chaque marque a sa forme. Fairtex et Twins taillent compact, à la thaïlandaise ; Cleto Reyes, à la mexicaine, plus allongé ; Elion, Adidas et Everlast plus large, pour l’entraînement. Quand une paire vous va, notez son nom complet : la couleur ne suffit pas à retrouver la coupe.',
          ],
        },
        {
          titre: 'Velcro ou lacets',
          texte: [
            ({ items }) => {
              const v = items.filter((p) => velcro(p) && !aLacets(p)).length;
              const l = items.filter((p) => aLacets(p) && !velcro(p)).length;
              const deux = items.filter((p) => aLacets(p) && velcro(p)).length;
              return `La fermeture auto-agrippante, le velcro, équipe ${fr(v)} modèles du rayon : elle se serre seul, en quelques secondes, et convient à l’entraînement. Les lacets, sur ${fr(l)} modèles, et ${fr(deux)} autres qui annoncent les deux fermetures, tiennent mieux le poignet et ne s’ouvrent pas dans l’échange.`;
            },
            'Il faut quelqu’un pour les nouer : c’est le choix du sparring encadré et de la compétition. Seul à la salle, prenez le velcro.',
          ],
        },
        {
          titre: 'Cuir, cuir synthétique ou PU',
          texte: [
            'Le PU, léger et bon marché, suffit pour une séance par semaine. Le cuir synthétique technique tient la distance à deux séances. À partir de trois, le cuir devient le moins coûteux à l’usage : il se remplace moins souvent et finit par prendre la forme de la main.',
            ({ items }) => `${fr(items.filter((p) => adulte(p) && enCuir(p)).length)} modèles adultes du rayon ont une enveloppe en cuir, d’après leur fiche. La matière ne dit rien du rembourrage : regardez aussi les coutures et l’épaisseur de mousse sur les jointures. Le guide [cuir ou synthétique](/guides/gants-de-boxe-cuir-ou-synthetique/) détaille l’écart.`,
          ],
        },
        {
          titre: 'Le rembourrage et le pouce',
          texte: [
            ({ items }) => {
              const r = (re: RegExp) => items.filter((p) => re.test(spec(p, 'Rembourrage'))).length;
              return `La mousse fait la protection. Les fiches du rayon annoncent une mousse triple densité sur ${fr(r(/triple/))} modèles, injectée sur ${fr(r(/inject/))}, double densité sur ${fr(r(/double/))}. Un gant de sparring porte un rembourrage plus épais et plus souple qu’un gant de sac ; celui d’un gant de compétition est trop mince pour le travail avec partenaire.`;
            },
            ({ items }) => `${fr(items.filter((p) => /attach/.test(spec(p, 'Pouce'))).length)} modèles annoncent un pouce attaché sur leur fiche. Essayez-le poing fermé : il doit trouver sa place sans forcer.`,
          ],
        },
        {
          titre: 'Selon la boxe pratiquée',
          texte: [
            'En boxe anglaise et en savate, la paire est la même : la savate se pratique avec les gants de l’anglaise. En boxe thaï, les modèles thaïlandais ont en général une paume plus souple, pensée pour saisir au corps-à-corps ; une paire d’anglaise convient pour apprendre. Les gants mexicains, comme Cleto Reyes, ont la réputation d’un rembourrage ferme.',
            ({ items }) => {
              const thai = items.filter((p) => /^(fairtex|twins)$/i.test(p.brand) && p.price > 0).map((p) => p.price);
              const cleto = items.filter((p) => /cleto/i.test(p.brand) && p.price > 0).map((p) => p.price);
              return `Au rayon, les ${fr(thai.length)} paires Fairtex et Twins vont de ${money(Math.min(...thai))} à ${money(Math.max(...thai))} ; les ${fr(cleto.length)} Cleto Reyes, de ${money(Math.min(...cleto))} à ${money(Math.max(...cleto))}.`;
            },
          ],
        },
        {
          titre: 'Les marques, une par une',
          texte: [
            ({ f, items }) =>
              `Ce que chaque marque propose ici : ${parMarque('gants-de-boxe', items, f, 6, (ps) => {
                const oz = ps.flatMap(ouncesOf);
                const cuir = ps.filter(enCuir).length;
                return [oz.length ? `de ${Math.min(...oz)} à ${Math.max(...oz)} oz` : '', cuir ? `${fr(cuir)} en cuir` : ''].filter(Boolean).join(', ');
              })}.`,
          ],
        },
        {
          titre: 'Commander sa paire en ligne',
          texte: ['Notez le poids, la fermeture et la taille de main que la marque recommande, puis comparez deux ou trois modèles du même usage. Si la paire reçue ne vous va pas, vous avez quatorze jours après la réception pour la renvoyer, non utilisée, dans son emballage ; pour changer de taille, écrivez avec le numéro de commande.'],
        },
        {
          titre: 'Faire durer une paire',
          texte: [
            'C’est l’humidité qui use une paire, bien avant les coups. Après chaque séance, passez un chiffon propre sur l’extérieur, ouvrez grand les gants et laissez-les sécher à l’air, loin d’un radiateur ; jamais jusqu’au lendemain dans le sac.',
            'Des bandes lavées à chaque fois gardent la sueur hors de la mousse : c’est ce qui limite le plus l’odeur. Le cuir apprécie une noisette de crème deux ou trois fois par an.',
          ],
        },
      ],
    },
    usages: {
      titre: 'Quel modèle pour quel usage',
      note: 'Pour chaque ligne, le premier prix du rayon qui répond au critère ; un modèle déjà retenu plus haut laisse la place au suivant.',
      regles: [
        { usage: 'Premier gant, au sac', filtre: (p) => gantBoxe(p) && adulte(p) && ouncesOf(p).includes(10), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles adultes proposés en 10 oz` },
        { usage: 'Technique, cours collectif', filtre: (p) => gantBoxe(p) && adulte(p) && ouncesOf(p).includes(12) && velcro(p), critere: ({ i, n }) => `${rang(i)} en 12 oz parmi les ${fr(n)} paires à velcro` },
        { usage: 'Sparring, gabarit moyen', filtre: (p) => gantBoxe(p) && adulte(p) && ouncesOf(p).includes(16), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} paires disponibles en 16 oz, le poids de sparring de la plupart des adultes` },
        { usage: 'Sparring, gabarit lourd', filtre: (p) => gantBoxe(p) && adulte(p) && Math.max(0, ...ouncesOf(p)) >= 18, critere: ({ i, n }) => `${rang(i)} parmi les ${fr(n)} qui montent à 18 oz ou au-delà` },
        { usage: 'Compétition, poignet serré', filtre: (p) => gantBoxe(p) && adulte(p) && aLacets(p) && !velcro(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles fermés par lacets seuls` },
        { usage: 'Lacets ou velcro au choix', filtre: (p) => gantBoxe(p) && aLacets(p) && velcro(p), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} paires à double fermeture` },
        { usage: 'Le sac, rien que le sac', filtre: (p) => nom(p).startsWith('gants de sac') || /sac/.test(spec(p, 'Type')), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} gants de sac, moins rembourrés qu’un gant de sparring` },
        { usage: 'Trois séances par semaine', filtre: (p) => gantBoxe(p) && adulte(p) && enCuir(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} paires adultes en cuir, la matière qui dure le plus` },
        { usage: 'Enfant de 5 à 10 ans', filtre: (p) => gantBoxe(p) && (ouncesOf(p).includes(4) || ouncesOf(p).includes(6)), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles proposés en 4 ou 6 oz` },
        { usage: 'Très grand gabarit', filtre: (p) => gantBoxe(p) && ouncesOf(p).includes(20), critere: ({ i, n }) => (n === 1 ? 'le seul modèle du rayon proposé en 20 oz' : `${rang(i)} des ${fr(n)} modèles proposés en 20 oz`) },
      ],
    },
    tableau: ({ items, all }) => {
      const lignes: Cellule[][] = [];
      const oz = [...new Set(items.flatMap(ouncesOf))].sort((a, b) => a - b);
      for (const o of oz) {
        const ps = items.filter((p) => p.price > 0 && ouncesOf(p).includes(o));
        const repere = OZ_COPY[o];
        const page = all.filter((p) => p.category === 'gants-de-boxe' && ouncesOf(p).includes(o)).length >= 6 && repere ? `/gants-de-boxe-${o}-oz/` : null;
        lignes.push([page ? { texte: `${o} oz`, href: page } : `${o} oz`, repere ? `${repere.who.charAt(0).toUpperCase() + repere.who.slice(1)} : ${repere.use}` : 'Le poids le plus lourd du rayon', fr(ps.length), money(Math.min(...ps.map((p) => p.price)))]);
      }
      return { titre: 'Les poids du rayon', colonnes: ['Poids', 'Pour qui, pour quoi', 'Modèles', 'Dès'], lignes, note: 'Repères du [guide des tailles](/guides/quelle-taille-gants-de-boxe/) ; nombre de modèles et premier prix tirés du catalogue du jour.' };
    },
    faq: ({ f, items }) => {
      const kids = items.filter((p) => p.price > 0 && (ouncesOf(p).includes(4) || ouncesOf(p).includes(6)));
      const nSac = items.filter((p) => nom(p).startsWith('gants de sac') || /sac/.test(spec(p, 'Type'))).length;
      return [
        { question: 'Quel gant choisir pour débuter la boxe ?', answer: 'Une paire d’entraînement à velcro, en 12 oz pour la plupart des adultes : assez de mousse pour le sac et la technique, et acceptée dans la majorité des cours. Passez à 14 ou 16 oz quand le travail à deux commence.' },
        { question: 'Combien d’onces choisir ?', answer: '10 oz au sac, 12 oz en technique, 14 à 16 oz avec un partenaire, 18 oz pour les lourds en sparring. Le chiffre se choisit à l’usage et au gabarit, jamais à la taille de la main.' },
        { question: 'Quelle taille pour une femme ?', answer: 'Le même raisonnement que pour un homme : 10 à 12 oz au sac et en technique selon le gabarit, 14 oz avec un partenaire. Une main fine cherche une coupe qui ferme bien, pas forcément moins d’onces.' },
        { question: 'Et pour un enfant ?', answer: `4 oz de 5 à 7 ans, 6 oz de 7 à 10 ans, 8 oz de 10 à 13 ans, fermés au velcro et essayés avec des bandes de 2,50 m. Le rayon compte ${fr(kids.length)} modèles proposés en 4 ou 6 oz${kids.length ? `, dès ${money(Math.min(...kids.map((p) => p.price)))}` : ''}.` },
        { question: 'Quels gants pour frapper dans un sac ?', answer: `Un 10 ou 12 oz à velcro, porté sur des bandes. Les ${fr(nSac)} gants de sac du rayon, moins rembourrés, se réservent au sac : ils ne servent pas au sparring.` },
        { question: 'Quel poids pour le sparring ?', answer: '16 oz pour la plupart des adultes, 14 oz pour les gabarits légers, 18 oz pour les lourds. Le rembourrage protège le partenaire autant que vos mains ; votre salle peut imposer son poids.' },
        { question: 'Combien coûte une bonne paire ?', answer: `Ici, de ${money(f.min)} à ${money(f.max)}, pour un prix médian de ${money(f.mediane)}. Le cuir coûte plus cher que le synthétique, mais il dure plus longtemps sous un usage intensif.` },
        { question: 'Quelle marque de gants choisir ?', answer: `Le rayon réunit ${marquesTexte(f)}, entre autres. Aucune n’est meilleure pour tout le monde : la coupe décide, compacte chez Fairtex et Twins, allongée chez Cleto Reyes, plus large chez Elion et Adidas.` },
        { question: 'Comment nettoyer des gants qui sentent ?', answer: 'Essuyez l’extérieur au chiffon, puis laissez sécher les gants grands ouverts, à l’air et loin d’une source de chaleur. Portez des bandes propres à chaque séance : elles gardent la sueur hors du rembourrage. Pour l’intérieur, suivez la notice du fabricant.' },
        { question: 'Pourquoi mettre des bandes sous les gants ?', answer: 'Le gant amortit le coup ; la bande tient la main. Elle garde le poignet dans l’axe, serre les métacarpes et épaissit les jointures. Elle boit aussi la sueur, si bien que la paire garde moins d’odeur et s’use moins vite.' },
        { question: 'Combien de temps dure une paire ?', answer: 'Cela dépend du nombre de séances et de la matière : le PU s’use le plus vite, le cuir dure le plus. Une paire séchée ouverte après chaque séance, et portée sur des bandes propres, tient plus longtemps.' },
      ];
    },
    liens: [
      { titre: 'Les sous-rayons', liens: [{ href: '/gants-de-boxe-enfant/', texte: 'gants de boxe enfant' }, { href: '/gants-de-boxe-a-lacets/', texte: 'gants à lacets' }, { href: '/gants-de-boxe-sparring/', texte: 'gants de sparring' }, { href: '/gants-de-boxe-cuir/', texte: 'gants en cuir' }, { href: '/gants-de-boxe-pas-cher/', texte: 'paires à 50 € et moins' }] },
      { titre: 'Les guides', liens: [{ href: '/guides/choisir-gants-boxe/', texte: 'choisir sa première paire' }, { href: '/guides/quelle-taille-gants-de-boxe/', texte: 'les poids selon l’âge et le gabarit' }, { href: '/guides/difference-gants-boxe-mma/', texte: 'boxe ou MMA : deux gants différents' }, { href: '/guides/comment-laver-ses-gants-de-boxe/', texte: 'laver ses gants et enlever l’odeur' }] },
      { titre: 'Les rayons voisins', liens: [{ href: '/bandes-de-boxe/', texte: 'bandes de boxe' }, { href: '/protege-dents/', texte: 'protège-dents boxe' }, { href: '/casques-de-boxe/', texte: 'casque de boxe' }, { href: '/gants-mma/', texte: 'gants MMA' }] },
    ],
  },

  /* ---------------------------------------------------------------- matériel de boxe */
  {
    slug: 'materiel-boxe',
    requete: 'matériel de boxe',
    revision: '2026-10-22',
    h1: 'Matériel de boxe',
    eyebrow: 'BOXE ANGLAISE · THAÏ · KICK · SAVATE',
    titre: ({ f }) => `Matériel de boxe : ${fr(f.n)} modèles, du premier cours au ring`,
    description: ({ f }) => `Matériel de boxe : ${fr(f.n)} modèles dès ${money(f.min)}, gants, bandes, protections, sacs de frappe, tenues, chaussures. Budget par niveau, guide, réponses.`,
    label: ({ f }) => `${fr(f.n)} modèles en huit rayons, dès ${money(f.min)}.`,
    intro: 'Bandes, gants et protège-dents pour commencer ; casque, coquille et chaussures quand le sparring arrive. Chaque modèle donne ses tailles réelles et son prix.',
    guide: {
      titre: 'Composer son équipement, du premier cours au ring',
      chapeau: ({ f }) => `Le matériel de boxe tient ici en huit rayons et ${fr(f.n)} modèles : ce qu’il faut à chaque étape, un modèle réel par besoin, puis le budget de chaque niveau.`,
      chapitres: [
        {
          titre: 'Le premier cours : trois pièces',
          texte: [
            'Des bandes, une paire de gants à velcro de 10 ou 12 oz et un protège-dents : le reste peut attendre. Beaucoup de salles prêtent des gants à la séance d’essai ; demandez avant d’acheter.',
            'Les bandes et le protège-dents passent en premier parce qu’ils sont personnels : ils ne se prêtent pas. La corde à sauter sert à l’échauffement de presque tous les cours.',
          ],
        },
        {
          titre: 'Quand le travail à deux commence',
          texte: [
            'Le sparring change la liste : des gants de 14 ou 16 oz, un casque si la salle le demande, une coquille. Les chaussures de boxe tiennent la cheville dans les déplacements ; au début, une paire de sport propre suffit.',
            'Attendez que votre entraîneur vous les demande : il vous dira aussi le poids de gants imposé.',
          ],
        },
        {
          titre: 'D’une boxe à l’autre',
          texte: [
            'La boxe anglaise ne frappe qu’avec les poings : gants, bandes, protège-dents et chaussures montantes font le tour. La boxe thaï ajoute des protège-tibias, un short court et, pour les coudes, des coudières. Le kick-boxing veut des protège-tibias qui couvrent le pied ; la savate se pratique chaussée.',
            'Les gants passent d’une boxe à l’autre : une paire de 14 ou 16 oz sert au sparring en anglaise comme en pieds-poings. Chaque discipline a sa page : [la boxe thaï](/materiel-boxe-thai/), [le kick-boxing](/materiel-kick-boxing/), [la savate](/materiel-boxe-francaise/).',
          ],
        },
        {
          titre: 'S’entraîner chez soi',
          texte: [
            'Un sac suspendu demande un support fait pour lui : poutre, dalle, potence murale ou portique. Sans pouvoir percer, le sac sur pied s’installe et se range dans un coin. Comptez pour son poids environ la moitié du vôtre.',
            'Ajoutez une corde à sauter et des gants de 10 ou 12 oz. Les articles encombrants arrivent à domicile, après un devis ; tout le reste voyage en colis.',
          ],
        },
        {
          titre: 'Commander en ligne sans se tromper de taille',
          texte: [
            'Chaque marque a sa grille, et deux paires de 12 oz de marques différentes ne chaussent pas pareil. Chaque fiche donne les tailles du fabricant, jamais une équivalence.',
            'Viennent ensuite l’usage, sac, technique ou partenaire, et la règle de votre salle. Avec ces trois réponses, le choix se réduit à quelques modèles.',
          ],
        },
      ],
    },
    usages: {
      titre: 'Un modèle réel pour chaque besoin',
      note: 'Le premier prix du catalogue pour chaque besoin, modèles adultes ; tous les rayons du matériel sont concernés.',
      regles: [
        { usage: 'Bander ses mains', parmi: 'catalogue', filtre: (p) => /^bandes? de boxe/.test(nom(p)) && longueur(p) === 4.5, critere: ({ i }) => `${rang(i, 'f')} en 4,50 m, la longueur d’une main d’adulte` },
        { usage: 'Les premiers gants', parmi: 'catalogue', filtre: (p) => gantBoxe(p) && adulte(p) && ouncesOf(p).includes(12) && velcro(p), critere: ({ i }) => `${rang(i)} en 12 oz à velcro` },
        { usage: 'Protéger les dents', parmi: 'catalogue', filtre: (p) => protegeDents(p) && adulte(p) && !propose(p, /junior|enfant/i), critere: ({ i }) => `${rang(i)} en taille adulte` },
        { usage: 'L’échauffement', parmi: 'catalogue', filtre: (p) => nom(p).startsWith('corde à sauter'), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} cordes à sauter` },
        { usage: 'Le sparring : la tête', parmi: 'catalogue', filtre: (p) => nom(p).startsWith('casque') && !nom(p).startsWith('casquette') && adulte(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} casques` },
        { usage: 'Le sparring : le bas-ventre', parmi: 'catalogue', filtre: (p) => nom(p).startsWith('coquille'), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} coquilles` },
        { usage: 'Les appuis sur le ring', parmi: 'catalogue', filtre: (p) => p.category === 'chaussures-boxe' && nom(p).startsWith('chaussures de boxe') && adulte(p), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} paires de chaussures de boxe` },
        { usage: 'À la maison, sans percer', parmi: 'catalogue', filtre: (p) => surPied(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} sacs à poser au sol` },
      ],
    },
    tableau: ({ all }) => {
      const familles: [string, string][] = [['gants-de-boxe', 'Gants de boxe'], ['accessoires-boxe', 'Bandes et accessoires'], ['protections-boxe', 'Protections'], ['textile-boxe', 'Textile'], ['sacs-de-frappe', 'Sacs de frappe'], ['chaussures-boxe', 'Chaussures'], ['equipement-entrainement', 'Équipement d’entraînement'], ['sacs-de-sport', 'Sacs de sport']];
      const lignes: Cellule[][] = familles
        .map(([slug, libelle]) => {
          // La ligne des sacs ne compte que les sacs : une chaîne à 8 € n’est pas le premier prix d’un sac de frappe.
          const ps = slug === 'sacs-de-frappe' ? sacs(famille(all, slug)) : famille(all, slug);
          const s = ps.map((p) => p.price).sort((a, b) => a - b);
          return s.length ? [{ texte: libelle, href: '/' + slug + '/' }, fr(s.length), money(s[0]), money(s[Math.floor(s.length / 2)])] : null;
        })
        .filter(nonNul);
      return { titre: 'Les huit rayons, en chiffres', colonnes: ['Rayon', 'Modèles', 'Dès', 'Prix médian'], lignes, note: 'Prix de vente du jour. Les semelles ne comptent pas parmi les chaussures ; la ligne des sacs de frappe ne compte que les sacs, sans poires, fixations ni supports.' };
    },
    faq: ({ f, all }) => {
      const kids = all.filter((p) => p.price > 0 && enfant(p) && ['gants-de-boxe', 'protections-boxe', 'accessoires-boxe', 'textile-boxe'].includes(p.category));
      return [
        { question: 'Quel matériel pour débuter la boxe anglaise ?', answer: 'Des bandes de 4,50 m, des gants de 12 oz, un protège-dents et une corde à sauter. Le casque et les chaussures arrivent avec le sparring, quand la salle les demande.' },
        { question: 'Quels accessoires sont indispensables ?', answer: 'Les bandes et la corde à sauter, dès la première séance. Les sous-gants, les mitaines et le tape viennent ensuite, selon le rythme des entraînements ; une boîte garde le protège-dents propre.' },
        { question: 'Quel kit pour un enfant ?', answer: `Des gants de 4 à 8 oz au velcro, des bandes de 2,50 m et un protège-dents junior ; le casque et les protège-tibias attendent que le cours les demande. Le catalogue compte ${fr(kids.length)} gants, protections, accessoires et tenues taillés pour l’enfant.` },
        { question: 'Quel matériel pour s’entraîner à la maison ?', answer: 'Un sac à la mesure de votre plafond, ou sur pied si vous ne pouvez pas percer, des gants de 10 ou 12 oz, des bandes et une corde à sauter. Mesurez la hauteur libre et vérifiez le support avant de choisir le sac.' },
        { question: 'Le même équipement sert-il en boxe thaï ?', answer: 'Les gants, les bandes et le protège-dents, oui. La boxe thaï demande en plus des protège-tibias, une coquille et un short court ; la boxe anglaise, des chaussures montantes pour le ring.' },
        { question: 'Quel matériel de boxe choisir ?', answer: 'Celui de la séance que vous allez faire : sac, technique ou travail à deux. Commencez par ce qui est personnel, les bandes et le protège-dents, puis prenez les gants au poids que la salle demande.' },
        { question: 'Où l’acheter en ligne ?', answer: `Ici : ${fr(f.n)} modèles, chacun avec les tailles de son fabricant et son prix TTC, payés par carte et expédiés sous ${shop.delais.expedition}, avec le point relais offert à partir de ${livraison.franco} d’achats.` },
        { question: 'Quelles marques choisir ?', answer: `${marquesTexte(f, 5)} sont les plus présentes. Une marque ne fait pas l’équipement : la grille du fabricant, l’usage et la règle de votre salle décident.` },
      ];
    },
    liens: [
      { titre: 'Par boxe et par niveau', liens: [{ href: '/materiel-boxe-debutant/', texte: 'pour débuter' }, { href: '/materiel-boxe-competition/', texte: 'pour la compétition' }, { href: '/materiel-boxe-enfant/', texte: 'pour un enfant' }, { href: '/materiel-boxe-femme/', texte: 'équipement de boxe femme' }] },
      { titre: 'Les guides', liens: [{ href: '/equipement-boxe-anglaise/', texte: 'l’équipement de la boxe anglaise seule' }, { href: '/guides/boxe-anglaise-materiel-indispensable/', texte: 'le matériel indispensable de la boxe anglaise' }, { href: '/guides/debuter-boxe/', texte: 'quel équipement pour un premier cours' }, { href: '/guides/choisir-protections/', texte: 'quelles protections, pour quel sport' }, { href: '/guides/sac-de-frappe-poids-hauteur-remplissage/', texte: 'le sac de frappe : poids et hauteur' }, { href: '/guides/corde-a-sauter-boxe-quelle-longueur/', texte: 'régler sa corde à sauter' }] },
      { titre: 'Les rayons voisins', liens: [{ href: '/gants-de-boxe/', texte: 'gants de boxe' }, { href: '/sacs-de-frappe/', texte: 'sac de frappe' }, { href: '/materiel-mma/', texte: 'matériel MMA' }, { href: '/materiel-sport-de-combat/', texte: 'le matériel des autres sports de combat' }] },
    ],
  },

  /* ---------------------------------------------------------------- sac de frappe */
  {
    slug: 'sacs-de-frappe',
    requete: 'sac de frappe',
    revision: '2026-10-22',
    h1: 'Sac de frappe',
    eyebrow: 'SUSPENDU · SUR PIED · À EAU',
    titre: ({ f }) => `Sac de frappe : suspendu, sur pied ou à eau, ${fr(f.n)} modèles`,
    description: ({ f, items }) => {
      const s = sacs(items);
      return `Sac de frappe suspendu, sur pied ou à eau : ${fr(f.n)} modèles, dont ${fr(s.length)} sacs dès ${money(Math.min(...s.map((p) => p.price)))}. Support, poids, hauteur : le guide pour choisir et bien l’installer.`;
    },
    label: ({ items }) => {
      const s = sacs(items);
      return `${fr(s.length)} sacs dès ${money(Math.min(...s.map((p) => p.price)))}, avec poires, mannequins et fixations.`;
    },
    intro: 'Le support décide avant le modèle : un plafond ou une potence pour le sac suspendu, rien à percer pour le sac sur pied. Le poids, lui, dépend du vôtre.',
    guide: {
      titre: 'Choisir un sac de frappe : support, poids, hauteur',
      chapeau: ({ f, items }) => {
        const kg = sacs(items).map(kilos).filter((x): x is number => x !== null);
        return `${fr(f.n)} articles, du sac de ${Math.min(...kg)} kg au portique de salle : trois questions règlent le choix, dans cet ordre.`;
      },
      chapitres: [
        {
          titre: 'Pouvez-vous fixer ?',
          texte: [
            'Un sac suspendu tire sur son point d’attache à chaque coup. Il lui faut un support prévu pour cela : une poutre, une dalle, une potence murale ou un portique posé au sol. Sur un plafond en plaques, ou si vous êtes locataire, restent le portique et le sac sur pied.',
            'Le sac sur pied ne demande aucune fixation : il se déplace, se range dans un coin et convient au garage comme à l’appartement.',
          ],
        },
        {
          titre: 'Le poids : environ la moitié du vôtre',
          texte: [
            'Le repère le plus répandu : un sac qui pèse à peu près la moitié de votre poids, autour de 30 kg pour 60 kg, de 40 kg pour 80 kg. Plus lourd, il bouge moins et renvoie davantage dans les poignets et les épaules ; plus léger, il se balance trop et casse le rythme.',
            ({ items }) => {
              const kg = sacs(items).map(kilos).filter((x): x is number => x !== null);
              return `Un débutant gagne à rester un peu en dessous. Les sacs du rayon qui annoncent leur poids vont de ${Math.min(...kg)} à ${Math.max(...kg)} kg.`;
            },
          ],
        },
        {
          titre: 'La hauteur : les poings ou les jambes',
          texte: [
            'Pour les poings, 1 m à 1,20 m suffisent. Pour les coups de pied bas, le genou et le muay-thaï, visez 1,50 m à 1,80 m.',
            ({ items }) => {
              const h = items.filter((p) => genreSac(p) === 'suspendu').map(hauteur).filter((x): x is number => x !== null);
              return `Le plus long du rayon mesure ${metres(Math.max(...h))}. Prévoyez autour du sac un cercle d’environ 1,50 m pour tourner et vous déplacer.`;
            },
          ],
        },
        {
          titre: 'Sur pied : remplir la base',
          texte: [
            'La base se remplit d’eau ou de sable. L’eau se verse et se vide vite : c’est le choix de qui déplace son sac. Le sable pèse plus et tient mieux en place, pour l’entraînement appuyé.',
            'Dans les deux cas, remplissez-la entièrement : une base à moitié pleine fait partie des erreurs de montage les plus courantes. Un tapis en caoutchouc limite la glisse.',
          ],
        },
        {
          titre: 'Sac à eau, poire, mannequin',
          texte: [
            ({ items }) => {
              const eau = items.filter((p) => genreSac(p) === 'eau');
              const kg = eau.map(kilos).filter((x): x is number => x !== null);
              return `Les ${fr(eau.length)} sacs à eau du rayon vont de ${Math.min(...kg)} à ${Math.max(...kg)} kg. La poire de vitesse travaille le rythme et la coordination. Le mannequin donne des cibles à hauteur réelle, tête, foie, plexus, pour la précision et les enchaînements.`;
            },
          ],
        },
        {
          titre: 'L’enveloppe : cuir ou synthétique',
          texte: [
            ({ items }) => {
              const s = items.filter((p) => genreSac(p) === 'suspendu');
              const cuir = s.filter(enCuir).length;
              const synth = s.filter((p) => !enCuir(p) && /synth|nylon|\bpu\b/.test(matiere(p))).length;
              return `Parmi les ${fr(s.length)} sacs suspendus, ${fr(cuir)} sont gainés de cuir selon leur fiche et ${fr(synth)} d’une matière synthétique ; les autres précisent la leur sur la fiche.`;
            },
            'Le cuir dure plus longtemps et coûte plus cher ; le synthétique s’entretient d’un coup de chiffon. Vérifiez de temps en temps la chaîne, les mousquetons et l’attache : ce sont eux qui portent le poids.',
          ],
        },
        {
          titre: 'Garni ou vide',
          texte: [
            ({ items }) => {
              const s = sacs(items);
              const v = s.filter(vide).length;
              const fiches = items.filter((p) => p.specs?.['Remplissage à réception']).length;
              return `Un sac garni se suspend dès qu’il arrive ; un sac vide se remplit chez soi. ${v > 1 ? `${fr(v)} sacs du rayon sont annoncés vides, d’après leur nom ou leur fiche` : v === 1 ? 'Un sac du rayon est annoncé vide, d’après son nom ou sa fiche' : 'Aucun sac du rayon n’est annoncé vide'}${fiches ? ` ; ${pluriel(fiches, 'fiche précise', 'fiches précisent')} le remplissage à la ligne « Remplissage à réception »` : ''}.`;
            },
            'Un sac vide se garnit de chutes de tissu, avec du sable au cœur pour le poids.',
          ],
        },
        {
          titre: 'La poire de vitesse : taille et plateforme',
          texte: [
            'Petite, de 13 à 16 cm, elle sert la vitesse ; grande, de 20 à 25 cm, elle apprend le rythme. Elle se monte sous une plateforme fixée au mur, avec un pivot, et se travaille avec des sous-gants ou des gants de sac fins.',
            ({ items }) => {
              const d = items
                .filter((p) => genreSac(p) === 'poire')
                .map((p) => {
                  const m = /(\d{2})\s*cm/i.exec([p.name, ...p.sizes, p.specs?.['Diamètre'] || ''].join(' '));
                  return m ? Number(m[1]) : null;
                })
                .filter((x): x is number => x !== null);
              return d.length ? `Les poires du rayon qui donnent leur diamètre vont de ${Math.min(...d)} à ${Math.max(...d)} cm.` : 'Chaque fiche donne le diamètre de la poire.';
            },
          ],
        },
        {
          titre: 'Marque par marque',
          texte: [
            ({ f, items }) =>
              `Les sacs et leurs supports, par marque : ${parMarque('sacs-de-frappe', items, f, 6, (ps) => {
                const g = (k: GenreSac) => ps.filter((p) => genreSac(p) === k).length;
                return [g('suspendu') ? pluriel(g('suspendu'), 'sac suspendu', 'sacs suspendus') : '', g('pied') ? pluriel(g('pied'), 'sac sur pied', 'sacs sur pied') : '', g('eau') ? pluriel(g('eau'), 'sac à eau', 'sacs à eau') : '', g('poire') ? pluriel(g('poire'), 'poire', 'poires') : '', g('fixation') ? pluriel(g('fixation'), 'fixation', 'fixations') : '', g('support') ? pluriel(g('support'), 'support', 'supports') : '', g('mannequin') ? pluriel(g('mannequin'), 'mannequin ou base', 'mannequins ou bases') : ''].filter(Boolean).join(', ');
              }, true)}.`,
          ],
        },
        {
          titre: 'Équiper une salle ou un club',
          texte: [
            ({ items }) => {
              const sup = items.filter((p) => genreSac(p) === 'support');
              const postes = sup.flatMap((p) => p.sizes.map((s) => /(\d+)\s*utilisateurs/i.exec(s)).filter((m): m is RegExpExecArray => Boolean(m)).map((m) => Number(m[1])));
              const rails = sup.filter((p) => /rail/.test(nom(p))).length;
              return `Pour une salle, le rayon réunit ${fr(sup.length)} potences et portiques${rails ? `, dont ${pluriel(rails, 'modèle à rail', 'modèles à rail')} qui portent plusieurs sacs` : ''}${postes.length ? ` ; la plus grande accueille jusqu’à ${Math.max(...postes)} utilisateurs à la fois` : ''}.`;
            },
            'Ces structures se livrent sur devis, comme les sacs, et se montent sur un sol ou un mur capable de les porter.',
          ],
        },
        {
          titre: 'Livraison et installation',
          texte: [
            ({ items }) => {
              const devis = items.filter((p) => estLourd(p)).length;
              return `${fr(devis)} articles du rayon, les sacs, les bases, les mannequins et les supports, se livrent à domicile sur devis : ils ne passent pas par le panier. Les ${fr(items.length - devis)} autres, poires, chaînes, ressorts et attaches, partent en colis, en point relais ou à domicile.`;
            },
            'Pour un devis, écrivez-nous depuis la page contact avec le modèle et votre code postal.',
          ],
        },
      ],
    },
    usages: {
      titre: 'Quel modèle pour quelle installation',
      note: 'Le premier prix de chaque usage, sauf la ligne des coups de pied, retenue pour sa hauteur.',
      regles: [
        { usage: 'Pour un enfant', filtre: (p) => enfant(p) && ['pied', 'suspendu', 'eau'].includes(genreSac(p)), critere: ({ i, n }) => (n === 1 ? 'le seul sac du rayon pensé pour l’enfant' : `${rang(i)} des ${fr(n)} sacs pour enfant`) },
        { usage: 'Appartement, sans percer', filtre: (p) => genreSac(p) === 'pied' && adulte(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} sacs sur pied ; base à remplir d’eau ou de sable` },
        { usage: 'Premier sac à suspendre', filtre: (p) => genreSac(p) === 'suspendu', critere: ({ p, i, n }) => `${rang(i)} des ${fr(n)} sacs suspendus${vide(p) ? ', livré vide' : ''}` },
        { usage: 'Coups de pied, muay-thaï', filtre: (p) => genreSac(p) === 'suspendu' && hauteur(p) !== null, ordre: (a, b) => (hauteur(b) || 0) - (hauteur(a) || 0) || parPrix(a, b), critere: ({ p, i }) => (i === 0 ? `le plus long du rayon : ${metres(hauteur(p) || 0)}` : `${metres(hauteur(p) || 0)} de hauteur`) },
        { usage: 'Sac à eau', filtre: (p) => genreSac(p) === 'eau', critere: ({ i, n, candidats }) => { const kg = candidats.map(kilos).filter((x): x is number => x !== null); return `${rang(i)} des ${fr(n)} sacs à eau, proposés de ${Math.min(...kg)} à ${Math.max(...kg)} kg`; } },
        { usage: 'Rythme et coordination', filtre: (p) => nom(p).startsWith('poire de vitesse'), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} poires de vitesse ; plateforme à prévoir` },
        { usage: 'Cibles à hauteur d’homme', filtre: (p) => nom(p).startsWith('mannequin'), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} mannequins de frappe` },
        { usage: 'Accrocher au plafond', filtre: (p) => nom(p).startsWith('attache plafond'), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} attaches de plafond` },
        { usage: 'Sans plafond porteur', filtre: (p) => genreSac(p) === 'support', critere: ({ i, n }) => `${rang(i)} des ${fr(n)} potences et portiques` },
      ],
    },
    tableau: ({ items }) => {
      const genres: [GenreSac, string][] = [['suspendu', 'Sacs suspendus'], ['pied', 'Sacs sur pied'], ['eau', 'Sacs à eau'], ['mannequin', 'Mannequins, bases et cibles'], ['poire', 'Poires de vitesse'], ['fixation', 'Fixations'], ['support', 'Potences et portiques']];
      const lignes: Cellule[][] = genres
        .map(([g, libelle]) => {
          const ps = items.filter((p) => p.price > 0 && genreSac(p) === g);
          if (!ps.length) return null;
          const lourds = ps.filter((p) => estLourd(p)).length;
          return [libelle, fr(ps.length), money(Math.min(...ps.map((p) => p.price))), lourds === ps.length ? 'Sur devis' : lourds === 0 ? 'En colis' : 'Selon le modèle'];
        })
        .filter(nonNul);
      return { titre: 'Le rayon, type par type', colonnes: ['Type', 'Modèles', 'Dès', 'Livraison'], lignes, note: '« Sur devis » : livraison à domicile chiffrée sur demande, hors panier.' };
    },
    faq: ({ items, all }) => {
      const prixDe = (g: GenreSac) => items.filter((p) => p.price > 0 && genreSac(p) === g && adulte(p)).map((p) => p.price);
      const fourchette = (g: GenreSac) => {
        const s = prixDe(g);
        return s.length ? `de ${money(Math.min(...s))} à ${money(Math.max(...s))}` : '';
      };
      const kid = items.find((p) => enfant(p) && genreSac(p) === 'pied');
      const nGantsSac = all.filter((p) => p.category === 'gants-de-boxe' && (nom(p).startsWith('gants de sac') || /sac/.test(spec(p, 'Type')))).length;
      return [
        { question: 'Quel sac de frappe choisir pour débuter ?', answer: 'Celui que votre logement peut porter : suspendu si un plafond ou une potence le permet, sur pied sinon. Restez un peu sous la moitié de votre poids ; pour les poings, 1 m à 1,20 m de hauteur suffisent.' },
        { question: 'Combien doit peser un sac ?', answer: 'Environ la moitié de votre poids : autour de 30 kg pour 60 kg, de 40 kg pour 80 kg. Un débutant reste un peu en dessous ; un frappeur qui travaille la puissance peut monter.' },
        { question: 'Quelle hauteur prendre ?', answer: '1 m à 1,20 m pour les poings, 1,50 m à 1,80 m pour les coups de pied et le muay-thaï. Gardez autour un cercle libre d’environ 1,50 m.' },
        { question: 'Comment accrocher un sac au plafond ?', answer: 'Sur une poutre ou une dalle, avec une attache prévue pour le poids, puis une chaîne ou un ressort. Un plafond en plaques ne convient pas : il reste le portique, posé au sol, ou le sac sur pied.' },
        { question: 'Comment remplir un sac livré vide ?', answer: 'Avec des chutes de tissu, et du sable au cœur pour gagner du poids. La base d’un sac sur pied, elle, se remplit d’eau ou de sable, jusqu’en haut.' },
        { question: 'Sac sur pied ou suspendu ?', answer: 'Pour le cardio, la technique et les enchaînements, le sac sur pied fait aussi bien. Pour les frappes lourdes, le suspendu reste plus stable ; une base remplie de sable et un tapis en caoutchouc réduisent l’écart.' },
        { question: 'Quels gants pour frapper au sac ?', answer: `Des 10 ou 12 oz à velcro, sur des bandes. Le rayon des gants compte aussi ${fr(nGantsSac)} gants de sac, moins rembourrés, réservés à cet usage.` },
        { question: 'Combien coûte un sac ?', answer: `Ici, un sac suspendu coûte ${fourchette('suspendu')}, un sac sur pied ${fourchette('pied')}, un sac à eau ${fourchette('eau')}. Ce sont des prix de vente ; leur livraison se chiffre sur devis.` },
        ...(kid ? [{ question: 'Existe-t-il un modèle pour enfant ?', answer: `Oui : le modèle sur pied ${citeModele(kid)}, à ${money(kid.price)}. Sa base se remplit d’eau ou de sable, comme celle des modèles adultes.` }] : []),
        { question: 'Peut-on installer un sac en appartement ?', answer: 'Oui, sur pied, sans percer : comptez un cercle libre d’environ 1,50 m autour et un tapis dessous. Un sac suspendu demande une poutre, une dalle ou un portique ; pensez aussi au bruit pour les voisins.' },
        ...(() => {
          const long = [...items].filter((p) => genreSac(p) === 'suspendu' && hauteur(p) !== null).sort((a, b) => (hauteur(b) || 0) - (hauteur(a) || 0))[0];
          return [{ question: 'Quel sac pour le muay-thaï ?', answer: `Un sac long, de 1,50 m à 1,80 m, pour les coups de pied bas et les genoux.${long ? ` Le plus long du rayon, le ${citeModele(long)}, mesure ${metres(hauteur(long) || 0)}.` : ''}` }];
        })(),
      ];
    },
    liens: [
      { titre: 'Les sous-rayons', liens: [{ href: '/sacs-de-frappe-sur-pied/', texte: 'sac de frappe sur pied' }, { href: '/poires-de-vitesse/', texte: 'poire de vitesse et punching-ball' }] },
      { titre: 'Les guides', liens: [{ href: '/guides/sac-de-frappe-suspendu-ou-sur-pied/', texte: 'suspendu ou sur pied : lequel choisir' }, { href: '/outils/poids-de-gants/', texte: 'le bon poids de gants pour le sac' }, { href: '/guides/comment-fixer-un-sac-de-frappe/', texte: 'fixer son sac : plafond, mur, potence' }, { href: '/guides/sac-de-frappe-poids-hauteur-remplissage/', texte: 'poids, hauteur, remplissage : lequel choisir' }] },
      { titre: 'Les rayons voisins', liens: [{ href: '/gants-de-boxe/', texte: 'gants de boxe' }, { href: '/bandes-de-boxe/', texte: 'bandes de boxe' }, { href: '/pattes-d-ours/', texte: 'pattes d’ours et paos' }, { href: '/equipement-entrainement/', texte: 'équipement d’entraînement' }] },
    ],
  },

  /* ---------------------------------------------------------------- gants MMA */
  {
    slug: 'gants-mma',
    requete: 'gants mma',
    revision: '2026-10-22',
    h1: 'Gants MMA',
    eyebrow: 'FRAPPER ET SAISIR',
    titre: ({ f }) => `Gants MMA : ${fr(f.n)} modèles à doigts libres, dès ${money(f.min)}`,
    description: ({ f }) => `Gants MMA : ${fr(f.n)} modèles dès ${money(f.min)} pour l’entraînement, le sparring ou la compétition, du junior au XL. Paume, pouce, taille : le guide pour choisir.`,
    label: ({ f }) => `${fr(f.n)} modèles à doigts libres, dès ${money(f.min)}.`,
    intro: 'Les doigts restent libres pour saisir. Choisissez d’abord la séance, sparring ou compétition, puis la taille de main dans la grille de la marque.',
    guide: {
      titre: 'Comment choisir ses gants MMA',
      chapeau: ({ f }) => `${fr(f.n)} modèles, ${f.marques.length} marques : la séance, l’intérieur de la main et la mesure départagent deux paires.`,
      chapitres: [
        {
          titre: 'Sparring, entraînement ou compétition',
          texte: [
            'Les fabricants séparent les modèles d’entraînement et de sparring, plus rembourrés, des gants de compétition de 4 oz, qui suivent les règles des fédérations. Un gant vu sur un combat professionnel n’est pas un conseil pour une première séance.',
            ({ items }) => `${fr(items.filter((p) => /sparring/.test(nom(p))).length)} modèles du rayon portent la mention sparring dans leur nom. Faites préciser au club la liste de chaque cours : frappes debout, travail mixte ou sol.`,
          ],
        },
        {
          titre: 'Paume, doigts, pouce',
          texte: [
            'Enfilez les deux gants, ouvrez doucement les mains, puis refermez-les. Aucune couture ne doit appuyer entre les doigts, aucune boucle ne doit tirer. Certaines constructions dégagent la paume, d’autres attachent le pouce ou enveloppent davantage.',
            ({ items }) => `${fr(items.filter(paumeOuverte).length)} modèles annoncent une paume ouverte, sur leur fiche ou dans leur nom.`,
          ],
        },
        {
          titre: 'La taille : mesurer la main',
          texte: [
            'Les tailles S, M ou L/XL ne se valent pas d’une marque à l’autre. Mesurez le tour de la paume sous les articulations, sans le pouce, puis reportez-vous au tableau du fabricant, avec ou sans bandes selon ce que demande la salle.',
            'Trop grand, le gant tourne à la frappe ; trop petit, il comprime le pouce. Le tableau des tailles, plus bas, dit combien de modèles existent dans chacune.',
          ],
        },
        {
          titre: 'Doigts libres ou gants de boxe',
          texte: [
            'Pour le sparring debout, la plupart des salles demandent des gants de boxe de 14 ou 16 oz : ils protègent mieux le partenaire. Les gants à doigts libres servent aux exercices qui mêlent frappes et saisies.',
            'Pour de longues séances au sac, une paire de boxe ménage mieux les mains. Le guide [boxe ou MMA : quelles différences](/guides/difference-gants-boxe-mma/) compare les deux.',
          ],
        },
        {
          titre: 'Entre deux cours',
          texte: ['Contrôlez les coutures, les boucles des doigts, le revêtement et la fermeture. Nettoyez selon la notice, puis laissez sécher hors du sac. Signalez une zone abîmée au coach avant un exercice à deux.'],
        },
      ],
    },
    usages: {
      titre: 'Quel modèle pour quelle séance',
      note: 'Une paire par séance : la moins chère qui coche le critère, sauf à la dernière ligne, choisie au sommet des prix.',
      regles: [
        { usage: 'Coupe femme', filtre: (p) => /femme/.test(nom(p)), critere: ({ i, n }) => (n === 1 ? 'le seul modèle coupé pour la femme' : `${rang(i)} des ${fr(n)} coupes femme`) },
        { usage: 'Enfant, junior', filtre: (p) => propose(p, /^junior$/i), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles proposés en junior` },
        { usage: 'Premier cours', filtre: (p) => adulte(p), critere: ({ p, i }) => `${rang(i)} du rayon${p.sizes.length ? ', tailles ' + liste(tailles(p)) : ''}` },
        { usage: 'Sparring', filtre: (p) => /sparring/.test(nom(p)) && !/super sparring/.test(nom(p)), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} gants de la série « Sparring »` },
        { usage: 'Rembourrage renforcé', filtre: (p) => /super sparring/.test(nom(p)), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} déclinaisons « Super Sparring »` },
        { usage: 'Paume dégagée', filtre: (p) => paumeOuverte(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles à paume ouverte` },
        { usage: 'En cuir', filtre: (p) => enCuir(p), critere: ({ i, n }) => (n === 1 ? 'le seul modèle en cuir du rayon' : `${rang(i)} des ${fr(n)} modèles en cuir`) },
        { usage: 'Haut de gamme', filtre: () => true, ordre: (a, b) => b.price - a.price, critere: ({ p, candidats }) => `${plusCher(p, candidats)}${p.sizes.length ? ', en ' + liste(tailles(p)) : ''}` },
      ],
    },
    tableau: ({ items }) => tableauTailles(items, TAILLES_LETTRES.concat([['Adulte', /^adulte$/i]]), 'Les tailles du rayon', 'Chaque marque a sa grille : la lettre ne se transpose pas de l’une à l’autre.'),
    faq: ({ f, items }) => {
      const femme = items.find((p) => /femme/.test(nom(p)));
      const junior = items.filter((p) => propose(p, /^junior$/i));
      return [
        { question: 'Quels gants MMA choisir pour débuter ?', answer: 'Un modèle d’entraînement rembourré, à la taille du tableau de la marque, accepté par votre salle. Les gants de compétition de 4 oz viennent plus tard.' },
        { question: 'Quelle taille prendre ?', answer: 'Mesurez le tour de la paume sous les articulations, sans le pouce, et lisez le tableau du fabricant. Une taille ne se transpose pas d’une marque à l’autre.' },
        { question: 'Sparring ou compétition : quelle différence ?', answer: 'Le gant de sparring est plus rembourré, pour l’entraînement à deux. Le gant de compétition, de 4 oz, suit le règlement de l’épreuve ; il ne sert au sparring qu’avec l’accord de la salle.' },
        { question: 'Comment les nettoyer ?', answer: 'Selon la notice du modèle, puis séchage à l’air, hors du sac. Profitez-en pour contrôler les coutures, les boucles et la fermeture.' },
        { question: 'Peut-on frapper au sac avec ?', answer: 'Oui, avec un modèle d’entraînement rembourré et des bandes. Pour de longues séances au sac, des gants de boxe protègent mieux les mains.' },
        { question: 'Doigts libres ou gants de boxe pour le sparring ?', answer: 'Debout, la plupart des salles demandent des gants de boxe de 14 ou 16 oz. Les doigts libres servent quand frappes et saisies se mêlent.' },
        ...(femme ? [{ question: 'Existe-t-il des modèles pour femme ?', answer: `Oui, un : ${cite(femme)}, à ${money(femme.price)}. Les autres modèles sont mixtes ; la mesure de la main compte plus que l’étiquette.` }] : []),
        ...(junior.length ? [{ question: 'Et pour un enfant ?', answer: `${fr(junior.length)} modèles existent en taille junior, dès ${money(Math.min(...junior.map((p) => p.price)))}. Demandez au club si le cours des jeunes travaille avec des doigts libres.` }] : []),
        { question: 'Quelles marques au rayon ?', answer: `${marquesTexte(f, 5)}. Chaque marque a son tableau de tailles, repris sur la fiche.` },
      ];
    },
    liens: [
      { titre: 'Les guides', liens: [{ href: '/guides/choisir-gants-mma/', texte: 'choisir ses gants pour l’entraînement' }, { href: '/guides/mma-equipement-obligatoire-debuter/', texte: 'l’équipement obligatoire pour débuter' }] },
      { titre: 'Les rayons voisins', liens: [{ href: '/materiel-mma/', texte: 'matériel MMA' }, { href: '/gants-de-boxe-sparring/', texte: 'gants de boxe sparring' }, { href: '/shorts-mma/', texte: 'short MMA' }, { href: '/rashguards/', texte: 'rashguard' }, { href: '/protege-dents/', texte: 'protège-dents' }] },
    ],
  },

  /* ---------------------------------------------------------------- protège-dents */
  {
    slug: 'protege-dents',
    requete: 'protège dents boxe',
    revision: '2026-10-22',
    h1: 'Protège-dents boxe',
    eyebrow: 'LA PREMIÈRE PROTECTION',
    titre: () => 'Protège-dents boxe : à mouler, double ou pour bagues',
    description: ({ f, items }) => `Protège-dents boxe : ${fr(items.filter(protegeDents).length)} modèles dès ${money(f.min)}, à mouler, double arcade, pour appareil dentaire, adulte et junior. Mouler, choisir, entretenir : le guide.`,
    label: ({ f, items }) => {
      const boites = items.filter((p) => nom(p).startsWith('boîte')).length;
      return `${fr(items.filter(protegeDents).length)} protège-dents dès ${money(f.min)}, adulte et junior${boites ? `, et ${pluriel(boites, 'boîte', 'boîtes')}` : ''}.`;
    },
    intro: 'Il sert dès le premier travail à deux. À mouler dans l’eau chaude, simple ou double, adulte ou junior, avec des modèles prévus pour les bagues.',
    guide: {
      titre: 'Choisir et mouler son protège-dents',
      chapeau: ({ f, items }) => `${fr(items.filter(protegeDents).length)} modèles de ${f.marques.length} marques : la forme, la taille et la présence de bagues décident.`,
      chapitres: [
        {
          titre: 'Simple ou double',
          texte: [
            'Le simple protège l’arcade du haut : il gêne moins la respiration et convient à la plupart des usages. Le double couvre les deux mâchoires ; il sert au contact appuyé, ou quand la salle l’impose.',
            ({ items }) => {
              const d = items.filter((p) => protegeDents(p) && double(p));
              return `Le rayon compte ${pluriel(d.length, 'modèle double', 'modèles doubles')}, dont ${fr(d.filter(bagues).length)} pour bagues.`;
            },
          ],
        },
        {
          titre: 'Adulte ou junior',
          texte: [
            'La taille junior va jusqu’à 11 ans environ, l’adulte au-delà, selon la grille de la marque. Comme tout équipement d’enfant, il se prend à la bonne taille, jamais trop grand pour durer.',
            ({ items }) => `${fr(items.filter(pdJunior).length)} modèles existent en taille enfant ou junior.`,
          ],
        },
        {
          titre: 'Avec un appareil dentaire',
          texte: [
            'Un protège-dents classique se moule sur les dents ; sur des bagues, il ne le faut pas. Les modèles prévus pour les appareils ne se moulent pas : suivez leur notice et demandez conseil à votre orthodontiste, surtout pour un enfant.',
            ({ items }) => `${fr(items.filter((p) => protegeDents(p) && bagues(p)).length)} modèles du rayon sont conçus pour les bagues.`,
          ],
        },
        {
          titre: 'Mouler sans se tromper',
          texte: [
            'Trempez le protège-dents dans l’eau chaude le temps indiqué par la notice, placez-le sur les dents du haut, mordez et aspirez, puis passez-le à l’eau froide. S’il ne va pas, il se remoule.',
            'Les temps et les températures changent d’un modèle à l’autre : n’improvisez pas avec la notice d’un autre. Moulez-le chez vous, avant le cours.',
          ],
        },
        {
          titre: 'Entretien, remplacement',
          texte: [
            'Rincez-le après chaque séance et rangez-le dans une boîte aérée. Il est personnel : il ne se prête pas, même rincé. Remplacez-le quand il se déforme, se perce ou ne tient plus.',
            ({ items }) => {
              const b = items.filter((p) => nom(p).startsWith('boîte') && p.price > 0);
              return b.length ? `Le rayon propose ${pluriel(b.length, 'boîte', 'boîtes')} de rangement, dès ${money(Math.min(...b.map((p) => p.price)))}.` : 'Une boîte aérée le garde propre entre deux séances.';
            },
          ],
        },
      ],
    },
    usages: {
      titre: 'Quel protège-dents pour quel usage',
      note: 'Pour chaque usage, le modèle le moins cher dont le nom ou les tailles répondent au besoin.',
      regles: [
        { usage: 'Petit budget, adulte', filtre: (p) => protegeDents(p) && adulte(p) && !propose(p, /junior|enfant/i), critere: ({ i }) => `${rang(i)} des protège-dents adultes du rayon` },
        { usage: 'Enfant', filtre: (p) => pdJunior(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles pour enfant ou junior` },
        { usage: 'Entraînement courant', filtre: (p) => /gel max/.test(nom(p)) && adulte(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} Gel Max, la série la plus représentée` },
        { usage: 'Bagues, une arcade', filtre: (p) => protegeDents(p) && bagues(p) && !double(p), critere: ({ i, n }) => (n === 1 ? 'le seul modèle simple prévu pour les bagues' : `${rang(i)} des ${fr(n)} modèles simples pour bagues`) },
        { usage: 'Bagues, deux arcades', filtre: (p) => protegeDents(p) && bagues(p) && double(p), critere: ({ i, n }) => (n === 1 ? 'le seul modèle double prévu pour les bagues' : `${rang(i)} des ${fr(n)} doubles pour bagues`) },
        { usage: 'Contact appuyé', filtre: (p) => protegeDents(p) && double(p) && !bagues(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} doubles sans bagues` },
        { usage: 'Plusieurs sports', filtre: (p) => /multi-?sport/.test(nom(p)), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles multisports` },
        { usage: 'Le ranger entre deux séances', filtre: (p) => nom(p).startsWith('boîte'), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} boîtes de rangement` },
      ],
    },
    tableau: ({ items }) => {
      const types: [string, (p: Product) => boolean][] = [
        ['Simple, adulte', (p) => protegeDents(p) && !double(p) && !bagues(p) && !pdJunior(p)],
        ['Enfant ou junior', pdJunior],
        ['Pour bagues', (p) => protegeDents(p) && bagues(p)],
        ['Double arcade', (p) => protegeDents(p) && double(p)],
        ['Boîtes de rangement', (p) => nom(p).startsWith('boîte')],
      ];
      const lignes: Cellule[][] = types
        .map(([libelle, test]) => {
          const ps = items.filter((p) => p.price > 0 && test(p));
          return ps.length ? [libelle, fr(ps.length), money(Math.min(...ps.map((p) => p.price)))] : null;
        })
        .filter(nonNul);
      return { titre: 'Le rayon, type par type', colonnes: ['Type', 'Modèles', 'Dès'], lignes, note: 'Un modèle peut compter dans deux lignes : un double pour bagues, par exemple.' };
    },
    faq: ({ f, items }) => [
      { question: 'Quel protège-dents choisir pour la boxe ?', answer: 'Un modèle à mouler, simple, à votre taille : adulte, ou junior jusqu’à 11 ans environ. Le double sert au contact appuyé ou quand la salle l’impose ; avec des bagues, un modèle prévu pour elles.' },
      { question: 'Comment mouler un protège-dents ?', answer: 'Dans l’eau chaude le temps que donne la notice, puis sur les dents du haut : mordez, aspirez, passez-le à l’eau froide. Il se remoule si le résultat ne va pas.' },
      { question: 'Quelle taille prendre ?', answer: `Junior jusqu’à 11 ans environ, adulte au-delà, selon la marque. Le rayon compte ${fr(items.filter(pdJunior).length)} modèles pour enfant ou junior et ${fr(items.filter((p) => protegeDents(p) && !pdJunior(p)).length)} pour adulte.` },
      { question: 'Peut-on boxer avec un appareil dentaire ?', answer: 'Oui, avec un protège-dents prévu pour les bagues, qui ne se moule pas. Demandez conseil à votre orthodontiste avant la première séance.' },
      { question: 'Comment le mettre et le garder en place ?', answer: 'Placez-le sur les dents du haut. Bien moulé, il tient sans que vous serriez les dents ; s’il bouge, remoulez-le en suivant sa notice.' },
      { question: 'Est-il obligatoire ?', answer: 'Dans la plupart des salles, dès qu’il y a du travail à deux, même léger. Pour le sac et la technique en solo, non.' },
      { question: 'Le même pour la boxe thaï et le MMA ?', answer: 'Oui : un protège-dents sert dans toutes les boxes comme au MMA. Prenez un double si le contact devient appuyé ou si la salle le demande.' },
      { question: 'Quelle marque choisir ?', answer: `${marquesTexte(f)}. Chaque modèle suit sa propre notice : c’est elle qui fait foi.` },
      { question: 'Quand le remplacer ?', answer: 'Quand il se déforme, se perce ou ne tient plus en place. Un protège-dents ne se prête pas, même rincé.' },
      { question: 'Peut-on retourner un protège-dents ?', answer: 'Pas une fois descellé : pour des raisons d’hygiène, un protège-dents ouvert après la livraison ne peut pas être repris. Vérifiez la taille, adulte ou junior, avant d’ouvrir l’emballage.' },
    ],
    liens: [
      { titre: 'Les guides', liens: [{ href: '/guides/choisir-protections/', texte: 'quelles protections pour les sports de combat' }, { href: '/guides/equipement-enfant/', texte: 'équiper un enfant pour ses premiers cours' }, { href: '/guides/comment-mouler-un-protege-dents/', texte: 'mouler son protège-dents, étape par étape' }, { href: '/guides/protege-dents-appareil-dentaire/', texte: 'avec un appareil dentaire : lequel, comment' }] },
      { titre: 'Les rayons voisins', liens: [{ href: '/protections-boxe/', texte: 'protections de boxe' }, { href: '/casques-de-boxe/', texte: 'casques' }, { href: '/coquilles/', texte: 'coquilles' }, { href: '/protege-tibias/', texte: 'protège-tibias' }, { href: '/gants-de-boxe/', texte: 'gants de boxe' }] },
    ],
  },

  /* ---------------------------------------------------------------- short de boxe thaï */
  {
    slug: 'shorts-de-boxe-thai',
    requete: 'short de boxe thai',
    revision: '2026-10-22',
    h1: 'Short de boxe thaï',
    eyebrow: 'MUAY-THAÏ · KICK-BOXING · K-1',
    // Autant de marques que le titre en tient dans ses 60 caractères, jamais un nom coupé.
    titre: ({ f }) => {
      const debut = `Short de boxe thaï : ${fr(f.n)} modèles`;
      for (let k = 3; k >= 1; k--) {
        const t = `${debut} ${liste(f.marques.slice(0, k).map((m) => m.nom))}`;
        if (t.length <= 60) return t;
      }
      return debut;
    },
    description: ({ f }) => `Short de boxe thaï : ${fr(f.n)} modèles dès ${money(f.min)}, ${liste(f.marques.slice(0, 4).map((m) => m.nom))}. Coupe, matière, taille : le guide d’achat et les réponses.`,
    label: ({ f, items }) => {
      const ordre = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
      const vues = ordre.filter((t) => items.some((p) => propose(p, t === 'XXXL' ? /^(xxxl|3xl)$/i : t === 'XS' ? /^xs(mall)?$/i : new RegExp('^' + t + '$', 'i'))));
      return `${fr(f.n)} modèles, du ${vues[0]} au ${vues[vues.length - 1]}, dès ${money(f.min)}.`;
    },
    intro: 'Court, large aux cuisses et fendu sur les côtés : la coupe laisse monter le genou et partir le pied. La taille se lit au tour de taille, dans la grille de la marque.',
    guide: {
      titre: 'Choisir son short : coupe, matière, taille',
      chapeau: ({ f }) => `${fr(f.n)} modèles de ${f.marques.length} marques ; la coupe est commune, la taille et la matière font la différence.`,
      chapitres: [
        {
          titre: 'La coupe, pièce par pièce',
          texte: [
            'Une ceinture élastique haute et large, qui tient sans cordon apparent ; des jambes évasées qui s’arrêtent à mi-cuisse ; des fentes latérales qui libèrent la hanche. Rien ne retient la jambe quand le genou monte.',
            'Le même short sert au kick-boxing et au K-1, pour la même raison : la liberté des jambes.',
          ],
        },
        {
          titre: 'Satin, polyester, nylon',
          texte: [
            'Le satin, tenue traditionnelle, est léger, brillant et sèche vite. Le polyester mat se froisse moins et supporte mieux les lavages répétés.',
            ({ items }) => {
              const pn = items.filter((p) => /polyester/.test(matiere(p)) && /nylon/.test(matiere(p))).length;
              const ny = items.filter((p) => /nylon/.test(matiere(p)) && !/polyester/.test(matiere(p))).length;
              const po = items.filter((p) => /polyester/.test(matiere(p)) && !/nylon/.test(matiere(p))).length;
              return `Les fiches du rayon annoncent un mélange de polyester et de nylon sur ${fr(pn)} modèles, du nylon seul sur ${fr(ny)}, du polyester seul sur ${fr(po)}.`;
            },
          ],
        },
        {
          titre: 'La taille, au tour de taille',
          texte: [
            'Mesurez votre tour de taille et reportez-vous à la grille de la marque, pas à votre taille habituelle : les marques thaïlandaises taillent souvent plus petit que les européennes. Entre deux tailles, prenez la plus grande : la ceinture se resserre, la longueur ne s’allonge pas.',
            ({ items }) => `${fr(items.filter((p) => propose(p, /^(xxxl|3xl)$/i)).length)} modèles montent jusqu’au XXXL.`,
          ],
        },
        {
          titre: 'Thaï ou anglais',
          texte: ['Le short de boxe anglaise est long et ample, taillé pour une garde poings seuls : il gêne le coup de genou. Pour le muay-thaï, le kick-boxing et le K-1, c’est le court ; pour l’anglaise, l’autre, qui a [sa propre page](/shorts-de-boxe-anglaise/).'],
        },
        {
          titre: 'Pour qui',
          texte: [
            ({ items }) => {
              const kid = items.find(enfant);
              const t = kid ? tailles(kid) : [];
              return `Les coupes du rayon sont mixtes : le tour de taille compte plus qu’une étiquette homme ou femme.${kid ? ` Un modèle est taillé pour l’enfant, du ${t[0]} au ${t[t.length - 1]}.` : ''}`;
            },
          ],
        },
        {
          titre: 'Couleurs et motifs',
          texte: [
            ({ items }) => {
              const n = new Map<string, number>();
              for (const p of items) for (const c of new Set(p.colors || [])) n.set(c, (n.get(c) || 0) + 1);
              const tri = [...n.entries()].sort((a, b) => b[1] - a[1]);
              return tri.length >= 3 ? `D’après les fiches, ${leCouleur(tri[0][0])} domine, sur ${fr(tri[0][1])} modèles, devant ${leCouleur(tri[1][0])} (${fr(tri[1][1])}) et ${leCouleur(tri[2][0])} (${fr(tri[2][1])}). Un même modèle se décline souvent en plusieurs coloris : la grille montre chacun à part.` : 'Chaque fiche montre le coloris exact du modèle.';
            },
          ],
        },
        {
          titre: 'Marque par marque',
          texte: [({ f, items }) => `Dans le rayon : ${parMarque('shorts-de-boxe-thai', items, f, 5, (ps) => etendue(ps, TAILLES_LETTRES.filter(([t]) => !['Junior', 'S/M', 'M/L', 'L/XL', 'Taille unique'].includes(t))))}.`],
        },
        {
          titre: 'Muay-thaï, kick-boxing, K-1 : un même short',
          texte: [
            'Rien ne change dans la coupe d’une discipline à l’autre : court, fendu, ceinture haute. Le kick-boxing et le K-1 le portent pour la même liberté de jambes que le muay-thaï ; seule la règle d’une compétition peut imposer une couleur ou une tenue.',
            ({ items }) => `${fr(items.filter((p) => /kick/i.test(p.specs?.['Type'] || '')).length)} fiches du rayon le classent à la fois en boxe thaï et en kick-boxing.`,
          ],
        },
        {
          titre: 'Commander sa taille en ligne',
          texte: ['Prenez votre tour de taille, comparez-le à la grille de la fiche et notez la taille entre deux mesures. Si le short reçu ne tombe pas bien, vous disposez de quatorze jours après sa réception pour le renvoyer, non porté et dans son emballage ; un échange de taille se demande par e-mail, avec le numéro de commande.'],
        },
        {
          titre: 'Entretien',
          texte: ['Lavez-le à 30 °C, à l’envers, puis laissez-le sécher à l’air.'],
        },
      ],
    },
    usages: {
      titre: 'Quel short pour quel besoin',
      note: 'Sept besoins, sept shorts : à chaque fois le premier prix, et pour finir le plus cher du rayon.',
      regles: [
        { usage: 'Enfant', filtre: (p) => enfant(p), critere: ({ i, n }) => (n === 1 ? 'le seul short pour enfant du rayon' : `${rang(i)} des ${fr(n)} shorts pour enfant`) },
        { usage: 'Premier short', filtre: (p) => adulte(p), critere: ({ i }) => `${rang(i)} du rayon` },
        { usage: 'Grande taille', filtre: (p) => propose(p, /^(xxxl|3xl)$/i), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles qui vont jusqu’au XXXL` },
        { usage: 'Marque née en Thaïlande', filtre: (p) => /fairtex/i.test(p.brand), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} shorts Fairtex` },
        { usage: 'Le plus de motifs', parmi: 'page', filtre: (p) => p.brand === 'Wicked One', critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles Wicked One, la marque la plus présente` },
        { usage: 'Une autre signature', filtre: (p) => /8 weapons/i.test(p.brand) && adulte(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles adultes 8 Weapons` },
        { usage: 'Haut de gamme', filtre: () => true, ordre: (a, b) => b.price - a.price, critere: ({ p, candidats }) => plusCher(p, candidats) },
      ],
    },
    tableau: ({ items }) => tableauTailles(items, TAILLES_LETTRES.filter(([t]) => !['Junior', 'S/M', 'M/L', 'L/XL', 'Taille unique'].includes(t)), 'Les tailles du rayon', 'Tailles adultes ; la grille de chaque marque donne le tour de taille de chaque lettre.'),
    faq: ({ f, items }) => {
      const kid = items.find(enfant);
      const t = kid ? tailles(kid) : [];
      return [
        { question: 'Quel short de boxe thaï choisir ?', answer: 'Un short court, fendu, à ceinture haute, pris au tour de taille dans la grille de la marque. Le reste tient au goût : couleur, motif, matière.' },
        { question: 'Comment choisir sa taille ?', answer: 'Au tour de taille, dans la grille de la marque. Les marques thaïlandaises taillent souvent petit ; entre deux tailles, prenez la plus grande.' },
        { question: 'Se porte-t-il en kick-boxing ?', answer: 'Oui, c’est le short le plus porté en kick-boxing et en K-1, pour la liberté des jambes.' },
        { question: 'Satin ou polyester ?', answer: 'Le satin est la tenue traditionnelle, légère et brillante ; le polyester mat résiste mieux aux lavages. Les deux se lavent à 30 °C, à l’envers.' },
        { question: 'Un modèle pour femme ?', answer: 'Les coupes du rayon sont mixtes : la taille se prend au tour de taille, quelle que soit l’étiquette. Le guide de l’équipement pour femme explique comment comparer deux coupes.' },
        ...(kid ? [{ question: 'Et pour un enfant ?', answer: `Le rayon propose ${cite(kid)}, du ${t[0]} au ${t[t.length - 1]}, à ${money(kid.price)}.` }] : []),
        { question: 'Short thaï ou short MMA ?', answer: 'Le short thaï est large et court, pour les coups de pied ; le short MMA est ajusté, sans poche ni fermeture, pour le sol. Pour un cours de MMA, prenez le second.' },
        { question: 'Quelles marques au rayon ?', answer: `${marquesTexte(f, 5)}. La grille de tailles change d’une marque à l’autre.` },
        { question: 'Comment l’entretenir ?', answer: 'À 30 °C, à l’envers, puis séchage à l’air libre.' },
        { question: 'Combien coûte un short de boxe thaï ?', answer: `De ${money(f.min)} à ${money(f.max)} au rayon, avec une médiane à ${money(f.mediane)}.` },
        { question: 'Quelle différence avec un short de kick-boxing ?', answer: 'Aucune dans la coupe : le même short court et fendu sert au kick-boxing, au K-1 et au muay-thaï.' },
      ];
    },
    liens: [
      { titre: 'Les guides', liens: [{ href: '/guide-des-tailles/', texte: 'le guide des tailles' }, { href: '/guides/equipement-femme/', texte: 'choisir la bonne coupe quand on est une femme' }, { href: '/guides/short-de-boxe-quel-short-pour-quel-sport/', texte: 'le short admis en thaï, en kick et en MMA' }, { href: '/guides/protege-tibias-chaussette-ou-scratch/', texte: 'protège-tibias : chaussette ou scratch' }, { href: '/guides/coquille-et-protege-poitrine/', texte: 'la coquille sous le short, et pour qui' }, { href: '/guides/boxe-thai-ou-kick-boxing-differences/', texte: 'muay-thaï ou kick : ce qui change, règle par règle' }] },
      { titre: 'Les rayons voisins', liens: [{ href: '/materiel-boxe-thai/', texte: 'matériel de boxe thaï' }, { href: '/protege-tibias/', texte: 'protège-tibias' }, { href: '/shorts-mma/', texte: 'shorts MMA' }, { href: '/textile-boxe/', texte: 'textile de boxe' }] },
    ],
  },

  /* ---------------------------------------------------------------- kimono JJB */
  {
    slug: 'kimonos-jjb',
    requete: 'kimono jjb',
    revision: '2026-10-22',
    h1: 'Kimono JJB',
    // Deux requêtes du brief mènent ici, « kimono JJB » et « kimono de JJB » : le H1 porte l’une, le surtitre l’autre.
    eyebrow: 'KIMONO DE JJB · LE GI DU JIU-JITSU BRÉSILIEN',
    titre: ({ f }) => `Kimono JJB : choisir son kimono de JJB, ${fr(f.n)} modèles`,
    description: ({ f }) => `Kimono JJB : ${fr(f.n)} modèles dès ${money(f.min)}. Le kimono de JJB de A0 à A4 et L, 350 ou 450 g/m², blanc, bleu ou noir : taille, grammage, lavage.`,
    label: ({ f }) => `${fr(f.n)} modèles, de A0 à A4, dès ${money(f.min)}.`,
    intro: 'Plus court et plus ajusté qu’un kimono de judo, tissé serré pour résister aux saisies. La taille se lit dans le tableau taille et poids de la marque.',
    guide: {
      titre: 'Choisir son gi : taille, grammage, couleur',
      chapeau: ({ f }) => `${fr(f.n)} kimonos de ${f.marques.length} marques : la taille A d’abord, puis l’épaisseur du tissu et la couleur.`,
      chapitres: [
        {
          titre: 'Les tailles A, et les L',
          texte: [
            'De A0 à A4, la taille suit votre stature et votre poids dans le tableau de la marque. Deux personnes de même taille mais de poids différent ne portent pas le même kimono.',
            ({ items }) => `Les tailles L, plus longues à poids égal, conviennent aux silhouettes grandes et minces : ${fr(items.filter((p) => propose(p, /^a\dl$/i)).length)} modèles du rayon en proposent.`,
          ],
        },
        {
          titre: 'Le grammage dit la tenue',
          texte: [
            'Autour de 350 g/m², la veste est légère, sèche vite et convient aux débuts et à l’été. Autour de 450 g/m², elle est plus épaisse, plus difficile à saisir et plus chaude.',
            ({ items }) => `Au rayon : ${fr(items.filter((p) => grammage(p) === 350).length)} modèles en 350 et ${fr(items.filter((p) => grammage(p) === 450).length)} en 450, d’après leur nom ; le pantalon se serre par un cordon.`,
          ],
        },
        {
          titre: 'Ripstop, coton, lycra',
          texte: [
            ({ items }) => {
              const m = (re: RegExp, sans?: RegExp) => items.filter((p) => re.test(matiere(p)) && !(sans && sans.test(matiere(p)))).length;
              return `Les fiches annoncent du ripstop seul sur ${fr(m(/ripstop/, /coton|lycra/))} modèles, du coton seul sur ${fr(m(/coton/, /ripstop|lycra/))}, un mélange de lycra et de ripstop sur ${fr(m(/lycra/))}.`;
            },
            'Le ripstop est un tissage quadrillé qui limite les déchirures. Le coton se lave à froid pour garder sa taille ; le lycra, élastique, ajoute de l’aisance au tissu.',
          ],
        },
        {
          titre: 'Blanc, bleu ou noir',
          texte: [
            'En compétition IBJJF, le kimono est blanc, bleu ou noir, d’une seule couleur. À l’entraînement, la couleur est libre, sauf règle de la salle ; un gi à motifs se garde pour le dojo.',
            ({ items }) => {
              const c = (k: string) => items.filter((p) => (p.colors || []).includes(k)).length;
              const parts = [['blanc', 'blancs'], ['bleu', 'bleus'], ['noir', 'noirs']].map(([k, pl]) => [c(k), k, pl] as const).filter(([n]) => n > 0).map(([n, un, pl]) => `${fr(n)} ${n > 1 ? pl : un}`);
              return parts.length ? `D’après leurs fiches, le rayon compte ${liste(parts)}.` : 'Chaque fiche donne la couleur exacte du modèle.';
            },
          ],
        },
        {
          titre: 'Laver sans rétrécir',
          texte: ['Le coton rétrécit au premier lavage, surtout à chaud. Lavez à froid, séchez à l’air, jamais au sèche-linge. Entre deux tailles, demandez-vous si vous laverez chaud : si oui, prenez la plus grande.'],
        },
        {
          titre: 'Les marques du rayon',
          texte: [
            ({ f, items }) =>
              `Chez chaque marque : ${parMarque('kimonos-jjb', items, f, 5, (ps) => {
                const g = [...new Set(ps.map(grammage).filter((x): x is number => x !== null))].sort((a, b) => a - b);
                const a = ['A0', 'A1', 'A2', 'A3', 'A4'].filter((x) => ps.some((p) => tailles(p).some((s) => s.toUpperCase().startsWith(x))));
                return [g.length ? `en ${g.join(' et ')} g/m²` : '', a.length > 1 ? `de ${a[0]} à ${a[a.length - 1]}` : a.length ? `en ${a[0]}` : ''].filter(Boolean).join(', ');
              })}.`,
          ],
        },
        {
          titre: 'La ceinture, le rashguard',
          texte: [
            'La ceinture n’est pas toujours vendue avec le kimono : la fiche le précise. On commence en blanche, et sa longueur suit la taille du kimono.',
            'Beaucoup de pratiquants portent un rashguard sous le gi, pour l’hygiène. Sans kimono, en no-gi, la tenue change : voir l’[équipement JJB](/equipement-jjb/).',
          ],
        },
      ],
    },
    usages: {
      titre: 'Quel gi pour quel pratiquant',
      note: 'Chaque ligne retient le gi le moins cher qui remplit la condition, lue dans ses tailles, son nom ou sa couleur.',
      regles: [
        { usage: 'Premier kimono', filtre: () => true, critere: ({ p, i }) => `${rang(i)} du rayon${p.sizes.length ? ', de ' + tailles(p)[0] + ' à ' + tailles(p)[tailles(p).length - 1] : ''}` },
        { usage: 'Petit gabarit', filtre: (p) => propose(p, /^a0$/i), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles qui descendent en A0` },
        { usage: 'Grand et mince', filtre: (p) => propose(p, /^a\dl$/i), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles proposés en taille L` },
        { usage: 'Léger, pour l’été', filtre: (p) => grammage(p) === 350, critere: ({ i, n }) => `${rang(i)} des ${fr(n)} gis en 350 g/m²` },
        { usage: 'Épais, dur à saisir', filtre: (p) => grammage(p) === 450, critere: ({ i, n }) => `${rang(i)} des ${fr(n)} gis en 450 g/m²` },
        { usage: 'Compétition en blanc', filtre: (p) => (p.colors || []).includes('blanc'), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} kimonos blancs, couleur admise en compétition IBJJF` },
        { usage: 'Une autre marque', filtre: (p) => !/elion/i.test(p.brand), critere: ({ p, i }) => `${rang(i)} hors Elion, signé ${p.brand}` },
      ],
    },
    tableau: ({ items }) => tableauTailles(items, TAILLES_A, 'Les tailles du rayon', 'A0 à A4 suivent la stature et le poids ; les L allongent la taille à poids égal.'),
    faq: ({ f, items }) => [
      { question: 'Quel kimono JJB choisir ?', answer: 'Un gi à votre taille A, lue dans le tableau taille et poids de la marque. 350 g/m² pour débuter ou pour l’été, 450 pour la résistance ; blanc, bleu ou noir si vous visez la compétition.' },
      { question: 'Quelle taille de kimono JJB ?', answer: 'De A0 à A4, selon votre taille et votre poids dans le tableau de la marque ; les L allongent à poids égal. Sur un kimono qui n’est pas prérétréci, l’hésitation se tranche vers la taille au-dessus.' },
      { question: 'Quelle couleur choisir ?', answer: 'Blanc, bleu ou noir uni pour la compétition IBJJF. À l’entraînement, la couleur est libre, sauf règle de la salle.' },
      { question: 'Quelle marque ?', answer: `${marquesTexte(f, 5)}. Chacune a son tableau taille et poids, repris sur la fiche.` },
      ...(items.some((p) => /femme/.test(nom(p))) ? [] : [{ question: 'Un kimono pour femme ?', answer: 'Le rayon ne propose pas de coupe réservée : la taille A se lit à la stature et au poids, et les L conviennent aux silhouettes élancées.' }]),
      { question: 'Faut-il une ceinture ?', answer: 'Oui, une ceinture de JJB, blanche pour commencer. Elle n’est pas toujours vendue avec le kimono : la fiche le dit.' },
      { question: 'Peut-on pratiquer en kimono de judo ?', answer: 'Pour essayer, oui. Plus ample, à manches plus longues, il donne plus de prise à l’adversaire ; le gi de JJB devient utile quand la pratique s’installe.' },
      { question: 'Comment le laver sans qu’il rétrécisse ?', answer: 'À froid, avec un séchage à l’air, jamais au sèche-linge. Le coton rétrécit surtout au premier lavage chaud.' },
      { question: 'Combien coûte un kimono JJB ?', answer: `Entre ${money(f.min)} et ${money(f.max)} ici ; prix médian, ${money(f.mediane)}.` },
      { question: 'Le kimono noir est-il admis en compétition ?', answer: 'Oui : en IBJJF, le blanc, le bleu et le noir unis sont admis. Les motifs et les couleurs vives se gardent pour l’entraînement.' },
    ],
    liens: [
      { titre: 'Les guides', liens: [{ href: '/guides/debuter-mma/', texte: 'le matériel pour commencer le MMA et le grappling' }, { href: '/guide-des-tailles/', texte: 'lire un tableau de tailles' }] },
      { titre: 'Les rayons voisins', liens: [{ href: '/equipement-jjb/', texte: 'équipement JJB et grappling' }, { href: '/ceintures/', texte: 'ceinture de JJB' }, { href: '/rashguards/', texte: 'rashguards' }, { href: '/kimonos/', texte: 'kimonos de karaté et de judo' }, { href: '/boutique-arts-martiaux/', texte: 'boutique arts martiaux' }] },
    ],
  },

  /* ---------------------------------------------------------------- protège-tibias */
  {
    slug: 'protege-tibias',
    requete: 'protège tibia boxe',
    revision: '2026-10-22',
    h1: 'Protège-tibia boxe',
    eyebrow: 'MUAY-THAÏ · KICK-BOXING · MMA · KARATÉ',
    titre: ({ f }) => `Protège-tibia boxe : avec ou sans pied, ${fr(f.n)} modèles`,
    description: ({ f }) => `Protège-tibia boxe : ${fr(f.n)} modèles dès ${money(f.min)}, avec ou sans pied, coton, synthétique ou cuir, du junior au XL. Muay-thaï, kick, MMA : le guide pour choisir.`,
    label: ({ f }) => `${fr(f.n)} modèles, du junior au XL, dès ${money(f.min)}.`,
    intro: 'Ils absorbent les coups de pied donnés et reçus. Avec pied couvert pour les boxes pieds-poings et le MMA ; la taille se lit du genou à la cheville.',
    guide: {
      titre: 'Choisir ses protège-tibias : couverture, maintien, taille',
      chapeau: ({ f }) => `${fr(f.n)} modèles, ${f.marques.length} marques : la discipline fixe la couverture, la jambe fixe la taille.`,
      chapitres: [
        {
          titre: 'Avec ou sans pied',
          texte: ['Le modèle tibia et pied couvre aussi le cou-de-pied : c’est celui du muay-thaï, du kick-boxing et du MMA. Le protège-tibia seul, en tissu ou en mousse, sert au karaté et à la savate selon la fédération. Demandez ce que votre cours impose avant d’acheter.'],
        },
        {
          titre: 'Chaussette ou coque à sangles',
          texte: [
            'La chaussette en coton, fine, sert aux débuts et aux exercices sans opposition appuyée ; elle glisse peu. La coque rembourrée tient par des sangles, qui se règlent mieux : c’est elle qu’on porte au sparring.',
            ({ items }) => {
              const coton = items.filter((p) => enCoton(p) && p.price > 0);
              return `${fr(coton.length)} modèles du rayon sont en coton${coton.length ? `, dès ${money(Math.min(...coton.map((p) => p.price)))}` : ''} ; ${fr(items.filter(velcro).length)} se ferment par des sangles auto-agrippantes.`;
            },
          ],
        },
        {
          titre: 'La mousse et l’enveloppe',
          texte: [
            'Le MMA et le muay-thaï demandent un rembourrage épais, pied couvert ; les protège-tibias fins du karaté n’y suffisent pas.',
            ({ items }) => {
              const r = (re: RegExp) => items.filter((p) => re.test(spec(p, 'Rembourrage'))).length;
              const cuir = items.filter(enCuir).length;
              return `Les fiches annoncent une mousse haute densité sur ${fr(r(/haute densit/))} modèles, injectée sur ${fr(r(/inject/))}, double densité sur ${fr(r(/double densit/))} ; côté enveloppe, du synthétique et du PU, et du cuir sur ${fr(cuir)}.`;
            },
          ],
        },
        {
          titre: 'Selon votre niveau',
          texte: [
            'Pour les débuts et les exercices sans opposition appuyée, la chaussette en coton suffit. Le sparring demande une coque rembourrée, tenue par des sangles. Le cuir, plus cher, dure plus longtemps sous les frappes répétées.',
            ({ items }) => {
              const des = (t: (p: Product) => boolean) => {
                const s = items.filter((p) => p.price > 0 && t(p)).map((p) => p.price);
                return s.length ? money(Math.min(...s)) : null;
              };
              const coton = des(enCoton);
              const coque = des((p) => !enCoton(p) && !enCuir(p) && /synth|\bpu\b/.test(matiere(p)));
              const cuir = des(enCuir);
              return `Au rayon, le coton commence à ${coton}, les coques synthétiques ou en PU à ${coque}${cuir ? `, le cuir à ${cuir}` : ''}.`;
            },
          ],
        },
        {
          titre: 'Mesurer du genou à la cheville',
          texte: [
            'Mesurez la jambe du dessous du genou à la cheville, puis lisez la grille du fabricant. Si vous hésitez entre deux tailles, choisissez la plus grande, à condition que les sangles la tiennent bien.',
            'Deux sangles tiennent mieux qu’une : la protection ne doit ni tourner ni glisser quand vous frappez. Une coque qui bouge ne devient pas adaptée en serrant plus fort.',
          ],
        },
        {
          titre: 'Compléter la protection des jambes',
          texte: [
            ({ all }) => {
              const chev = all.filter((p) => nom(p).startsWith('chevill')).length;
              const pieds = all.filter((p) => nom(p).startsWith('protège-pieds')).length;
              const coq = all.filter((p) => nom(p).startsWith('coquille')).length;
              const parts = [
                chev ? `En boxe thaï, les chevillères tiennent la cheville sur le pivot : le catalogue en compte ${fr(chev)}.` : '',
                pieds ? `Le full contact protège le pied seul, avec des protège-pieds (${pluriel(pieds, 'modèle', 'modèles')}).` : '',
                coq ? `La coquille, enfin, s’impose dès le premier sparring : ${pluriel(coq, 'modèle', 'modèles')} au rayon des protections.` : '',
              ].filter(Boolean);
              return parts.join(' ') || 'La coquille s’impose dès le premier sparring.';
            },
          ],
        },
        {
          titre: 'Pour un enfant',
          texte: [
            'Il se choisit comme le reste de son équipement : à la taille du jour, essayé avant le cours, jamais pris trop grand pour durer. Une protection qui tourne ou glisse pendant l’essai appelle une autre taille.',
            ({ items }) => {
              const j = items.filter((p) => propose(p, /junior/i) && p.price > 0);
              return j.length ? `Le rayon en propose ${fr(j.length)} en junior, à partir de ${money(Math.min(...j.map((p) => p.price)))}.` : 'Demandez au club la taille attendue pour les plus jeunes.';
            },
          ],
        },
        {
          titre: 'En compétition',
          texte: ['Pour une rencontre, le règlement de l’épreuve et de votre catégorie décide du modèle admis ; une mention « pour tous les sports de combat » ne remplace pas cette vérification. Récupérez-le avec votre club avant d’acheter, surtout pour une première compétition.'],
        },
        {
          titre: 'Les marques et leurs tailles',
          texte: [({ f, items }) => `Ce que chaque marque couvre : ${parMarque('protege-tibias', items, f, 6, (ps) => etendue(ps, TAILLES_LETTRES.filter(([t]) => t !== 'Taille unique')))}.`],
        },
        {
          titre: 'Laver et ranger',
          texte: ['Un textile, une mousse et une coque ne se nettoient pas de la même façon : suivez la notice de chaque modèle. Sortez-les du sac dès la fin de la séance et mettez-les à l’air pour qu’ils sèchent.'],
        },
      ],
    },
    usages: {
      titre: 'Quel modèle pour quelle pratique',
      note: 'Le modèle retenu est, à chaque ligne, le moins coûteux de ceux qui remplissent la condition.',
      regles: [
        { usage: 'Enfant', filtre: (p) => propose(p, /junior/i), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles proposés en junior` },
        { usage: 'Débuter, karaté, savate', filtre: (p) => enCoton(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles en coton` },
        { usage: 'Kick-boxing, premier sparring', filtre: (p) => tibiaPied(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} tibias et pieds hors coton` },
        { usage: 'Muay-thaï, mousse dense', filtre: (p) => /haute densit/.test(spec(p, 'Rembourrage')), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles en mousse haute densité` },
        { usage: 'Marques nées en Thaïlande', filtre: (p) => /^(fairtex|twins)$/i.test(p.brand), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles Fairtex et Twins` },
        { usage: 'En cuir', filtre: (p) => enCuir(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles en cuir` },
        { usage: 'Petit gabarit adulte', filtre: (p) => propose(p, /^xs$/i), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles qui descendent au XS` },
      ],
    },
    tableau: ({ items }) => tableauTailles(items, TAILLES_LETTRES.filter(([t]) => !['XXL', 'XXXL', 'M/L'].includes(t)), 'Les tailles du rayon', 'La taille se mesure du dessous du genou à la cheville, dans la grille de chaque marque.'),
    faq: ({ items }) => {
      const junior = items.filter((p) => propose(p, /junior/i) && p.price > 0);
      const ft = items.filter((p) => /^(fairtex|twins)$/i.test(p.brand) && p.price > 0).map((p) => p.price);
      return [
        { question: 'Quel protège-tibia choisir pour la boxe ?', answer: 'Pour la boxe thaï, le kick-boxing ou le MMA : pied couvert et rembourrage épais. Pour le karaté et la savate, un modèle fin ou la chaussette en coton, selon la fédération. La taille se mesure du genou à la cheville.' },
        { question: 'Quelle taille prendre ?', answer: 'Celle de la grille du fabricant, mesurée sous le genou jusqu’à la cheville ; en cas d’hésitation, la plus grande, si les sangles tiennent.' },
        { question: 'Comment les mettre ?', answer: 'Enfilez le pied, centrez la coque sur le tibia, puis serrez les sangles. Rien ne doit tourner ni glisser quand vous frappez.' },
        { question: 'Comment les laver ?', answer: 'Selon la notice : le coton, la mousse et la coque ne se lavent pas pareil. Une fois la séance finie, sortez-les du sac et laissez l’air les sécher.' },
        { question: 'En faut-il en boxe anglaise ?', answer: 'Non : en boxe anglaise, seuls les poings touchent. Ils servent dès que les jambes frappent, en boxe thaï, en kick-boxing, en savate et en MMA.' },
        { question: 'Ceux du karaté servent-ils au MMA ?', answer: 'Rarement : trop fins et sans pied. Le MMA et le muay-thaï veulent un rembourrage épais, pied couvert.' },
        ...(junior.length ? [{ question: 'Et pour un enfant ?', answer: `${fr(junior.length)} modèles existent en junior, dès ${money(Math.min(...junior.map((p) => p.price)))}. Mesurez sa jambe comme celle d’un adulte, du genou à la cheville.` }] : []),
        { question: 'Est-il obligatoire en compétition ?', answer: 'Le règlement de l’épreuve en décide, selon la discipline et la catégorie. Vérifiez la liste avec votre club avant la rencontre.' },
        { question: 'Coton ou synthétique pour débuter ?', answer: 'Le coton pour les débuts et les exercices sans opposition appuyée ; une coque synthétique ou en PU dès que le sparring arrive.' },
        { question: 'À partir de quel âge ?', answer: 'Dès que le cours fait travailler les jambes au contact. Les tailles junior existent ; demandez au club ce qu’il attend pour les plus jeunes.' },
        ...(ft.length ? [{ question: 'Quelle marque pour la boxe thaï ?', answer: `Fairtex et Twins, les deux marques nées en Thaïlande, comptent ${fr(ft.length)} modèles au rayon, de ${money(Math.min(...ft))} à ${money(Math.max(...ft))}. Les tailles suivent la grille propre à chaque fabricant.` }] : []),
      ];
    },
    liens: [
      { titre: 'Les guides', liens: [{ href: '/guides/choisir-protections/', texte: 'choisir ses protections selon le contact' }, { href: '/guides/mma-equipement-obligatoire-debuter/', texte: 'ce que le MMA impose au premier cours' }, { href: '/guides/protege-tibias-chaussette-ou-scratch/', texte: 'chaussette ou scratch, quelle taille, pour quel sport' }, { href: '/guides/boxe-thai-ou-kick-boxing-differences/', texte: 'thaï ou kick : les techniques et le sac de chacun' }, { href: '/guides/boxe-anglaise-ou-savate-boxe-francaise/', texte: 'les protège-tibias de la savate, selon la rencontre' }] },
      { titre: 'Les rayons voisins', liens: [{ href: '/materiel-boxe-thai/', texte: 'matériel de boxe thaï' }, { href: '/materiel-kick-boxing/', texte: 'matériel de kick-boxing' }, { href: '/shorts-de-boxe-thai/', texte: 'short de boxe thaï' }, { href: '/coquilles/', texte: 'coquille de boxe' }, { href: '/protections-boxe/', texte: 'toutes les protections' }] },
    ],
  },

  /* ---------------------------------------------------------------- casque de boxe */
  {
    slug: 'casques-de-boxe',
    requete: 'casque de boxe',
    revision: '2026-10-22',
    h1: 'Casque de boxe',
    eyebrow: 'SPARRING · ENTRAÎNEMENT · COMPÉTITION',
    titre: ({ f }) => `Casque de boxe : ouvert, à barre ou intégral, ${fr(f.n)} modèles`,
    description: ({ f }) => `Casque de boxe : ${fr(f.n)} modèles dès ${money(f.min)}, ouverts, à barre ou intégraux, en cuir ou synthétique. Tour de tête, protection du nez, compétition : le guide.`,
    label: ({ f }) => `${fr(f.n)} modèles, ouverts ou intégraux, dès ${money(f.min)}.`,
    intro: 'Il arrive avec le sparring, quand votre salle le demande. Il se choisit au tour de tête et à la couverture : ouvert, à pommettes, à barre ou intégral.',
    guide: {
      titre: 'Choisir un casque : couverture, taille, réglages',
      chapeau: ({ f }) => `${fr(f.n)} modèles de ${f.marques.length} marques : la couverture d’abord, le tour de tête ensuite, les réglages pour finir.`,
      chapitres: [
        {
          titre: 'Quatre couvertures',
          texte: [
            'Ouvert, il laisse la vision libre et suffit à la technique. À pommettes, il protège les joues au sparring. À barre ou intégral, il protège aussi le nez et le menton, au prix d’une vision réduite : c’est le choix du sparring appuyé.',
            ({ items }) => {
              const c = (k: string) => items.filter((p) => couverture(p) === k).length;
              return `Les noms du rayon annoncent ${pluriel(c('ouvert'), 'casque à face ouverte', 'casques à face ouverte')}, ${fr(c('barre'))} à barre et ${fr(c('integral'))} intégraux ; les autres précisent leur couverture sur la fiche.`;
            },
          ],
        },
        {
          titre: 'Le tour de tête, puis l’essai',
          texte: [
            'Mesurez le tour de tête et suivez la grille de la marque. Enfilez le casque, bougez, esquivez : il ne doit ni tourner ni descendre sur les yeux. Un casque qui bouge ne devient pas adapté en serrant plus fort.',
            ({ items }) => {
              const avecCm = items.find((p) => grilleCm(p));
              if (!avecCm) return 'La fiche de chaque modèle reprend la grille du fabricant.';
              const lettres = avecCm.sizes.map((s) => /^(\w+)\s*\((\d{2})\s*-\s*(\d{2})\s*cm\)/i.exec(s)).filter((m): m is RegExpExecArray => Boolean(m));
              const vus = [...new Map(lettres.map((m) => [m[1], `${m[1]} de ${m[2]} à ${m[3]} cm`])).values()];
              return `Certaines marques donnent leur grille en centimètres ; chez ${avecCm.brand}, ${liste(vus)}.`;
            },
          ],
        },
        {
          titre: 'Fermeture et matière',
          texte: [
            ({ items }) => {
              const cuir = items.filter(enCuir).length;
              const synth = items.filter((p) => !enCuir(p) && /synth|\bpu\b|polyur/.test(matiere(p))).length;
              return `${fr(items.filter((p) => velcro(p) && !aLacets(p)).length)} modèles se ferment par une bande auto-agrippante, ${fr(items.filter(aLacets).length)} par lacets. Côté enveloppe, ${fr(cuir)} sont en cuir d’après leur fiche, ${fr(synth)} en synthétique ou en PU ; les autres la précisent sur la fiche.`;
            },
            'Le cuir dure plus longtemps ; le synthétique coûte moins et s’essuie d’un coup de chiffon.',
          ],
        },
        {
          titre: 'Compétition : le règlement décide',
          texte: [
            'En boxe amateur, le casque dépend de la fédération et de la catégorie. Les modèles dont le nom porte une mention fédérale l’affichent sur leur fiche ; aucune homologation n’est ajoutée ici qui n’y figure pas.',
            ({ items }) => {
              const n = items.filter((p) => /ffb|aiba/.test(nom(p))).length;
              return n ? `${pluriel(n, 'modèle du rayon porte', 'modèles du rayon portent')} la mention FFB ou AIBA dans leur nom.` : 'Aucun modèle du rayon ne porte de mention fédérale dans son nom.';
            },
          ],
        },
        {
          titre: 'Ce qu’il protège, ce qu’il ne protège pas',
          texte: ['Le casque réduit les coupures et les chocs superficiels ; il ne supprime pas le risque de commotion. Il ne change rien aux règles de la séance : l’intensité reste celle que fixe l’encadrant.'],
        },
        {
          titre: 'Entretien',
          texte: ['Après la séance, sortez-le du sac et laissez-le sécher ouvert. Nettoyez selon la notice et contrôlez sangles, coutures et doublure avant chaque sparring.'],
        },
      ],
    },
    usages: {
      titre: 'Quel casque pour quel usage',
      note: 'Un casque par besoin, le premier prix à chaque fois, selon ce que disent son nom et sa grille.',
      regles: [
        { usage: 'Enfant', filtre: (p) => p.sizes.some((s) => /enfant/i.test(s)) || enfant(p), critere: ({ i, n }) => (n === 1 ? 'le seul casque proposé en taille enfant' : `${rang(i)} des ${fr(n)} casques pour enfant`) },
        { usage: 'Entraînement, petit budget', filtre: (p) => adulte(p), critere: ({ i }) => `${rang(i)} du rayon` },
        { usage: 'Protéger le nez', filtre: (p) => couverture(p) === 'barre', critere: ({ i, n }) => `${rang(i)} des ${fr(n)} casques à barre` },
        { usage: 'Couverture maximale', filtre: (p) => couverture(p) === 'integral', critere: ({ i, n }) => `${rang(i)} des ${fr(n)} intégraux` },
        { usage: 'Boxe amateur', filtre: (p) => /ffb/.test(nom(p)), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles marqués FFB` },
        { usage: 'Tour de tête au centimètre', filtre: (p) => grilleCm(p) !== null, critere: ({ p }) => { const g = grilleCm(p)!; return `grille en centimètres, de ${g[0]} à ${g[1]} cm`; } },
        { usage: 'En cuir', filtre: (p) => enCuir(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} casques en cuir` },
        { usage: 'À lacets', filtre: (p) => aLacets(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} casques à lacets` },
      ],
    },
    tableau: ({ items }) => {
      const types: [string, string][] = [['ouvert', 'Face ouverte'], ['barre', 'À barre'], ['integral', 'Intégral'], ['autre', 'Non précisée dans le nom']];
      const lignes: Cellule[][] = types
        .map(([k, libelle]) => {
          const ps = items.filter((p) => p.price > 0 && couverture(p) === k);
          return ps.length ? [libelle, fr(ps.length), money(Math.min(...ps.map((p) => p.price)))] : null;
        })
        .filter(nonNul);
      return { titre: 'Le rayon par couverture', colonnes: ['Couverture', 'Modèles', 'Dès'], lignes, note: 'La couverture lue dans le nom du modèle ; la fiche la détaille pour les autres.' };
    },
    faq: ({ f, items }) => {
      const nez = items.filter((p) => ['barre', 'integral'].includes(couverture(p)) && p.price > 0);
      const avecCm = items.find((p) => grilleCm(p));
      const kid = items.find((p) => p.sizes.some((s) => /enfant/i.test(s)));
      return [
        { question: 'Quel casque de boxe choisir ?', answer: 'Ouvert pour la technique, à pommettes pour le sparring, à barre ou intégral pour protéger le nez et le menton au sparring appuyé. Puis le tour de tête, dans la grille de la marque.' },
        { question: 'Quel casque pour la boxe anglaise ?', answer: 'À l’entraînement, un ouvert ou à pommettes ; pour le sparring appuyé, une barre protège le nez. En compétition amateur, le règlement de la fédération décide du modèle.' },
        { question: 'Comment choisir sa taille ?', answer: `Mesurez le tour de tête et suivez la grille de la marque.${avecCm ? ` Chez ${avecCm.brand}, elle est donnée en centimètres, de ${grilleCm(avecCm)![0]} à ${grilleCm(avecCm)![1]} cm.` : ''}` },
        { question: 'Comment mettre un casque ?', answer: 'Ouvrez les fermetures, enfilez-le par le haut, puis réglez le menton et l’arrière du crâne. Une fois serré, il reste en place quand vous secouez la tête.' },
        { question: 'À quoi sert-il vraiment ?', answer: 'À réduire les coupures et les chocs superficiels. Il ne supprime pas le risque de commotion : gardez les consignes d’intensité du cours.' },
        ...(nez.length ? [{ question: 'Lequel protège le nez ?', answer: `Les casques à barre et les intégraux. Le rayon en compte ${fr(nez.length)} dont le nom l’annonce, dès ${money(Math.min(...nez.map((p) => p.price)))}.` }] : []),
        { question: 'Faut-il un casque pour débuter ?', answer: 'Non. Il arrive avec le sparring, quand la salle l’impose ; pour le sac et la technique, il ne sert à rien.' },
        { question: 'Comment le laver ?', answer: 'Selon la notice du modèle ; laissez-le sécher ouvert, hors du sac, et contrôlez les sangles et les coutures.' },
        { question: 'Où trouver un modèle pas cher ?', answer: `Le premier prix du rayon est à ${money(f.min)}, et le prix médian à ${money(f.mediane)}. La liste se trie par prix croissant.` },
        ...(kid ? [{ question: 'Un casque pour enfant ?', answer: `Oui : ${cite(kid)} existe en taille enfant, à ${money(kid.price)}.` }] : []),
      ];
    },
    liens: [
      { titre: 'Les guides', liens: [{ href: '/guides/choisir-protections/', texte: 'casque et protège-tibias : la tenue en mouvement' }, { href: '/guides/boxe-anglaise-materiel-indispensable/', texte: 'quand le casque arrive dans le sac' }, { href: '/guides/casque-de-boxe-obligatoire/', texte: 'obligatoire ou pas : les règlements, les études' }] },
      { titre: 'Les rayons voisins', liens: [{ href: '/protege-dents/', texte: 'protège-dents de boxe' }, { href: '/gants-de-boxe-sparring/', texte: 'gants de sparring 14, 16 et 18 oz' }, { href: '/materiel-boxe-competition/', texte: 'matériel de compétition' }, { href: '/protections-boxe/', texte: 'protections de boxe' }] },
    ],
  },

  /* ---------------------------------------------------------------- bandes de boxe */
  {
    slug: 'bandes-de-boxe',
    requete: 'bandes de boxe',
    revision: '2026-10-22',
    h1: 'Bandes de boxe',
    eyebrow: 'SOUS LE GANT, À CHAQUE SÉANCE',
    titre: ({ f, items }) => {
      const l = items.map(longueur).filter((x): x is number => x !== null);
      return `Bandes de boxe : ${fr(f.n)} modèles de ${metres(Math.min(...l))} à ${metres(Math.max(...l))}, dès ${money(f.min)}`;
    },
    description: ({ f, items }) => {
      const l = items.map(longueur).filter((x): x is number => x !== null);
      return `Bandes de boxe : ${fr(f.n)} modèles dès ${money(f.min)}, de ${metres(Math.min(...l))} à ${metres(Math.max(...l))}, semi-élastiques ou coton. Longueur, pose, lavage : le guide et les réponses. Livraison en France.`;
    },
    label: ({ f, items }) => {
      const l = items.map(longueur).filter((x): x is number => x !== null);
      return `${fr(f.n)} modèles, de ${metres(Math.min(...l))} à ${metres(Math.max(...l))}, dès ${money(f.min)}.`;
    },
    intro: 'Elles tiennent le poignet et protègent les articulations sous le gant. 4 à 4,50 m pour une main d’adulte, 2,50 m pour un enfant ; elles se lavent après chaque séance.',
    guide: {
      titre: 'Choisir et poser ses bandes',
      chapeau: ({ f }) => `${fr(f.n)} modèles, ${f.marques.length} marques : la longueur se choisit à la main, la matière au maintien voulu.`,
      chapitres: [
        {
          titre: 'Ce qu’elles font sous le gant',
          texte: [
            'Le gant amortit le coup ; dessous, la bande tient la main. Le poignet reste dans l’axe, les petits os du métacarpe restent serrés, les jointures gagnent une épaisseur.',
            'Second effet, moins connu : le tissu boit la sueur avant la mousse. Un gant porté sur des bandes sent moins et dure plus longtemps.',
          ],
        },
        {
          titre: 'La longueur, selon la main',
          texte: [
            'Une main d’adulte demande 4 à 4,50 m ; une petite main ou un enfant, 2,50 m. Plus la pose couvre le poignet et les jointures, plus il faut de longueur : en cas de doute, prenez la plus longue, on peut toujours faire un tour de plus.',
            ({ items }) => {
              const l = items.map(longueur).filter((x): x is number => x !== null);
              return `Le rayon va de ${metres(Math.min(...l))} à ${metres(Math.max(...l))} ; ${fr(l.filter((x) => x === 4.5).length)} modèles mesurent 4,50 m.`;
            },
          ],
        },
        {
          titre: 'Semi-élastiques ou coton',
          texte: [
            'Les semi-élastiques épousent la main et se serrent facilement : c’est le choix le plus courant. Le coton, plus rigide, tient mieux le poignet et convient aux frappeurs lourds. Les deux se portent sous tous les gants.',
            ({ items }) => `Au rayon, ${fr(items.filter((p) => /coton/.test(matiere(p)) && /lycra/.test(matiere(p))).length)} modèles mêlent coton et lycra, ${fr(items.filter((p) => /coton/.test(matiere(p)) && !/lycra|polyester|nylon/.test(matiere(p))).length)} sont en coton seul ; ${fr(items.filter((p) => /oui/.test(spec(p, 'Passant pour le pouce'))).length)} ont une boucle pour le pouce et ${fr(items.filter(velcro).length)} une fermeture auto-agrippante.`,
          ],
        },
        {
          titre: 'La pose, en quelques minutes',
          texte: [
            'Passez la boucle autour du pouce, faites quelques tours au poignet, montez sur la paume et couvrez les jointures, puis passez entre les doigts avant de revenir fermer au poignet. Réglez à votre main : plus de tours au poignet si vous vous le tordez, plus d’épaisseur sur les jointures si vous frappez fort.',
            'Comptez quelques cours pour retenir le geste.',
          ],
        },
        {
          titre: 'Laver, sécher, alterner',
          texte: [
            'Lavez-les après chaque séance, en machine à 30 °C dans un filet pour qu’elles ne s’emmêlent pas, et séchez-les à plat, jamais au sèche-linge. Une bande humide restée dans le sac se détend et sent.',
            'Plusieurs séances par semaine ? Deux jeux évitent de remettre une bande humide.',
          ],
        },
        {
          titre: 'Bandes ou sous-gants',
          texte: ['Le sous-gant s’enfile comme une mitaine, avec un rembourrage souvent en gel déjà placé sur les jointures : rien à apprendre, mais un maintien du poignet fixe. Pour le sparring et le sac lourd, la bande reste le choix le plus sûr. Les [sous-gants](/sous-gants/) ont leur page.'],
        },
        {
          titre: 'Les marques, longueur par longueur',
          texte: [
            ({ f, items }) =>
              `Ce que propose chaque marque : ${parMarque('bandes-de-boxe', items, f, 5, (ps) => {
                const l = ps.map(longueur).filter((x): x is number => x !== null);
                return l.length ? (Math.min(...l) === Math.max(...l) ? `en ${metres(l[0])}` : `de ${metres(Math.min(...l))} à ${metres(Math.max(...l))}`) : '';
              })}.`,
          ],
        },
        {
          titre: 'Sous quels gants, en quelle couleur',
          texte: [
            'Sous des gants de boxe, la bande longue couvre le poignet et les jointures. Sous des gants à doigts libres, la règle vient de la salle : faites l’essai avec ce qu’elle demande de porter dessous.',
            ({ items }) => {
              const n = new Map<string, number>();
              for (const p of items) for (const c of new Set(p.colors || [])) n.set(c, (n.get(c) || 0) + 1);
              const tri = [...n.entries()].sort((a, b) => b[1] - a[1]);
              return tri.length >= 4 ? `Côté couleurs, le rayon décline ${fr(tri.length)} teintes ; ${leCouleur(tri[0][0])} arrive en tête (${fr(tri[0][1])} modèles), devant ${leCouleur(tri[1][0])}, ${leCouleur(tri[2][0])} et ${leCouleur(tri[3][0])}. Deux paires de couleurs différentes aident à ne jamais remettre la même deux fois de suite.` : 'Chaque fiche montre le coloris de la paire.';
            },
          ],
        },
      ],
    },
    usages: {
      titre: 'Quelle paire pour quelle main',
      note: 'Les deux lignes de longueur retiennent la mesure extrême ; les autres, le premier prix du critère.',
      regles: [
        { usage: 'Enfant, petite main', filtre: (p) => (longueur(p) || 9) <= 3, ordre: (a, b) => (longueur(a) || 9) - (longueur(b) || 9) || parPrix(a, b), critere: ({ p, i }) => (i === 0 ? `la plus courte du rayon : ${metres(longueur(p) || 0)}` : `${metres(longueur(p) || 0)} de long`) },
        { usage: 'Adulte, usage courant', filtre: (p) => longueur(p) === 4.5, critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} paires de 4,50 m` },
        { usage: 'Grande main, pose couvrante', filtre: (p) => longueur(p) !== null, ordre: (a, b) => (longueur(b) || 0) - (longueur(a) || 0) || parPrix(a, b), critere: ({ p, i }) => (i === 0 ? `la plus longue du rayon : ${metres(longueur(p) || 0)}` : `${metres(longueur(p) || 0)} de long`) },
        { usage: 'Maintien, coton seul', filtre: (p) => /coton/.test(matiere(p)) && !/lycra|polyester|nylon/.test(matiere(p)), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} paires en coton seul` },
        { usage: 'Boucle pour le pouce', filtre: (p) => /oui/.test(spec(p, 'Passant pour le pouce')), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} paires avec boucle pour le pouce` },
        { usage: 'Marque née en Thaïlande', filtre: (p) => /fairtex/i.test(p.brand), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} paires Fairtex` },
        { usage: 'Trame ajourée', filtre: (p) => /mesh/.test(nom(p)), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} paires à trame ajourée, dite mesh` },
      ],
    },
    tableau: ({ items }) => {
      const groupes: [string, (x: number) => boolean, string][] = [
        ['2,50 m', (x) => x <= 2.5, 'Enfant, petite main'],
        ['3 à 3,50 m', (x) => x > 2.5 && x <= 3.5, 'Petite main'],
        ['4 à 4,50 m', (x) => x > 3.5 && x <= 4.5, 'Main d’adulte'],
        ['5 m et plus', (x) => x > 4.5, 'Grande main, pose très couvrante'],
      ];
      const lignes: Cellule[][] = groupes
        .map(([libelle, test, qui]) => {
          const ps = items.filter((p) => p.price > 0 && longueur(p) !== null && test(longueur(p)!));
          return ps.length ? [libelle, qui, fr(ps.length), money(Math.min(...ps.map((p) => p.price)))] : null;
        })
        .filter(nonNul);
      const sans = items.filter((p) => longueur(p) === null).length;
      return { titre: 'Les longueurs du rayon', colonnes: ['Longueur', 'Pour qui', 'Modèles', 'Dès'], lignes, note: sans ? `${pluriel(sans, 'modèle ne donne', 'modèles ne donnent')} pas sa longueur sur la fiche.` : undefined };
    },
    faq: ({ items }) => {
      const l = items.map(longueur);
      return [
        { question: 'Comment mettre des bandes de boxe ?', answer: 'Boucle au pouce, quelques tours au poignet, la paume et les jointures, un passage entre les doigts, puis retour au poignet pour fermer. Quelques cours suffisent à retenir le geste.' },
        { question: 'Quelle longueur choisir ?', answer: '4 à 4,50 m pour une main d’adulte, 2,50 m pour un enfant ou une petite main. Plus la pose couvre, plus il faut de longueur.' },
        { question: '4 m ou 4,50 m ?', answer: `Les deux couvrent une main d’adulte ; 4,50 m laisse un tour de plus au poignet ou aux jointures. Le rayon compte ${fr(l.filter((x) => x === 4).length)} modèles de 4 m et ${fr(l.filter((x) => x === 4.5).length)} de 4,50 m.` },
        { question: 'Semi-élastiques ou coton ?', answer: 'Semi-élastiques pour la facilité, coton pour le maintien du poignet. Les deux vont sous n’importe quel gant.' },
        { question: 'Pourquoi mettre des bandes ?', answer: 'Pour tenir le poignet dans l’axe, serrer les métacarpes et épaissir les jointures sous le gant. Elles boivent aussi la sueur, ce qui garde le gant plus sain.' },
        { question: 'Comment les laver ?', answer: 'Après chaque séance, à 30 °C dans un filet, puis séchage à plat. Jamais au sèche-linge.' },
        { question: 'Bandes ou sous-gants ?', answer: 'Les bandes tiennent mieux le poignet et se règlent à la main ; les sous-gants s’enfilent en dix secondes. Pour le sparring et le sac lourd, les bandes.' },
        { question: 'Peut-on boxer sans ?', answer: 'On le peut, mais le poignet est moins tenu, les jointures moins couvertes, et la sueur entre directement dans le gant, qui s’use plus vite.' },
        { question: 'Bandage ou bandes : quelle différence ?', answer: 'Aucune : le bandage désigne le geste, les bandes le produit.' },
        { question: 'Combien de paires prévoir ?', answer: 'Une pour commencer ; deux dès que vous vous entraînez plusieurs fois par semaine, pour ne jamais remettre une paire humide.' },
      ];
    },
    liens: [
      { titre: 'Les guides', liens: [{ href: '/guides/bandes-de-boxe-ou-sous-gants/', texte: 'bandes ou sous-gants : que mettre sous ses gants' }, { href: '/guides/boxe-anglaise-materiel-indispensable/', texte: 'le premier achat de la boxe anglaise' }, { href: '/guides/comment-mettre-des-bandes-de-boxe/', texte: 'mettre ses bandes, étape par étape' }] },
      { titre: 'Les rayons voisins', liens: [{ href: '/sous-gants/', texte: 'sous-gants et mitaines' }, { href: '/gants-de-boxe/', texte: 'gants de boxe' }, { href: '/accessoires-boxe/', texte: 'accessoires de boxe' }, { href: '/materiel-boxe-debutant/', texte: 'matériel de boxe débutant' }] },
    ],
  },

  /* ---------------------------------------------------------------- matériel MMA */
  {
    slug: 'materiel-mma',
    requete: 'matériel mma',
    revision: '2026-10-22',
    h1: 'Matériel MMA',
    // « équipement MMA », seconde requête du brief pour cette page : dans le titre, le surtitre et la description.
    eyebrow: 'ÉQUIPEMENT MMA · FRAPPES, SAISIES, SOL',
    titre: ({ f }) => `Matériel MMA et équipement MMA : ${fr(f.n)} modèles dès ${money(f.min)}`,
    description: ({ f }) => `Matériel MMA et équipement MMA : ${fr(f.n)} modèles dès ${money(f.min)}, gants à doigts libres, protège-tibias, coquilles, rashguards, shorts. Le guide, séance par séance.`,
    label: ({ f }) => `${fr(f.n)} modèles pour frapper et lutter, dès ${money(f.min)}.`,
    intro: 'Un cours mêle frappes debout, saisies et sol : le matériel suit la séance. Protège-dents, short sans poche et rashguard d’abord ; les gants selon ce que la salle demande.',
    guide: {
      titre: 'Composer son sac de MMA, séance par séance',
      chapeau: ({ f }) => `Le matériel MMA tient ici en ${fr(f.n)} modèles, gants, protections et tenues : ce qu’il faut au premier cours, puis avec le contact, puis plus tard.`,
      chapitres: [
        {
          titre: 'Le premier cours',
          texte: [
            'Un protège-dents, un short sans poche ni fermeture, un t-shirt ou un rashguard : c’est la tenue minimale de presque toutes les salles. Le protège-dents se moule chez soi, avant le cours ; le short ne doit rien avoir qui accroche au sol.',
            ({ all }) => {
              const pd = premier(all.filter((p) => protegeDents(p) && adulte(p) && !propose(p, /junior|enfant/i)));
              const sh = premier(all.filter((p) => nom(p).startsWith('short mma') && adulte(p)));
              const rg = premier(all.filter((p) => nom(p).startsWith('rashguard') && adulte(p)));
              const total = [pd, sh, rg].reduce((s, p) => s + (p?.price || 0), 0);
              return `Au premier prix du catalogue, ces trois pièces reviennent à ${money(total)}.`;
            },
          ],
        },
        {
          titre: 'Les gants, selon la séance',
          texte: [
            'Quand la séance mêle coups et saisies, il faut une paire à doigts libres, rembourrée, prise dans la grille du fabricant. Le sparring debout se fait souvent en gants de boxe, 14 ou 16 oz selon le gabarit. Les modèles de compétition, à 4 oz, attendent votre premier combat.',
            ({ all }) => {
              const g = all.filter((p) => gantMMA(p) && p.price > 0);
              const b = all.filter((p) => gantBoxe(p) && adulte(p) && ouncesOf(p).includes(16) && p.price > 0);
              return `${fr(g.length)} paires à doigts libres au rayon, dès ${money(Math.min(...g.map((p) => p.price)))} ; ${fr(b.length)} gants de boxe en 16 oz au catalogue, dès ${money(Math.min(...b.map((p) => p.price)))}.`;
            },
          ],
        },
        {
          titre: 'Protège-tibias et coquille',
          texte: ['Les protège-tibias avec pied couvert protègent aux coups de pied donnés et reçus ; la coquille protège au sol comme debout. Les deux deviennent nécessaires dès qu’il y a du contact. Prenez vos mesures, comparez-les au tableau du fabricant : une protection qui tourne ne s’arrange pas en serrant plus fort.'],
        },
        {
          titre: 'Quand le sparring s’installe',
          texte: [
            ({ all }) => {
              const casques = all.filter((p) => nom(p).startsWith('casque') && !nom(p).startsWith('casquette'));
              const nez = casques.filter((p) => ['barre', 'integral'].includes(couverture(p))).length;
              return `Le casque arrive sur indication de l’entraîneur. Le catalogue en propose ${fr(casques.length)}, dont ${fr(nez)} à barre ou intégraux, qui couvrent aussi le nez ; les ouverts laissent la vision libre, au prix d’une protection moindre du visage.`;
            },
            'Respectez l’intensité décidée par l’encadrant : aucune protection ne rend un coup à la tête sans risque.',
          ],
        },
        {
          titre: 'Sous les gants',
          texte: ['Bandes ou sous-gants sous une paire à doigts libres : la salle décide, et l’essai se fait avec ce qu’elle demande. Le maintien du poignet est meilleur avec des bandes ; le sous-gant fait gagner du temps au vestiaire.'],
        },
        {
          titre: 'La tenue du sol',
          texte: [
            'Le rashguard protège la peau des frottements et sèche vite ; les spats couvrent les jambes. Une tenue propre à chaque cours fait partie de l’équipement : videz le sac du matériel humide aussitôt rentré.',
            ({ items }) => `Le rayon compte ${fr(items.filter((p) => nom(p).startsWith('rashguard')).length)} rashguards, ${fr(items.filter((p) => nom(p).startsWith('short mma')).length)} shorts MMA et ${fr(items.filter((p) => /^(spats|legging)/.test(nom(p))).length)} spats et leggings.`,
          ],
        },
        {
          titre: 'Selon votre niveau',
          texte: ['Pour débuter : protège-dents, short, rashguard, et les gants que la salle prête ou demande. Quand l’entraînement devient régulier : votre propre paire à doigts libres, des protège-tibias et une coquille. En vue d’une compétition : les gants de 4 oz et la tenue que fixe l’organisateur.'],
        },
        {
          titre: 'Les marques, famille par famille',
          texte: [
            ({ f, items }) =>
              `Ce que chaque marque apporte au rayon : ${parMarque('materiel-mma', items, f, 5, (ps) => {
                const fam = (c: string) => ps.filter((p) => p.category === c).length;
                return [fam('gants-mma') ? pluriel(fam('gants-mma'), 'paire de gants', 'paires de gants') : '', fam('protections-boxe') ? pluriel(fam('protections-boxe'), 'protection', 'protections') : '', fam('textile-boxe') ? pluriel(fam('textile-boxe'), 'pièce de textile', 'pièces de textile') : ''].filter(Boolean).join(', ');
              }, true)}.`,
          ],
        },
        {
          titre: 'Ce qui peut attendre',
          texte: ['Le casque, les gants de compétition et les chaussures de lutte viennent avec le sparring appuyé ou la compétition, sur indication de votre entraîneur. Avant d’acheter deux paires de gants, faites la liste des séances réelles de votre semaine.'],
        },
        {
          titre: 'Compétition : la liste de l’organisateur',
          texte: ['Il n’existe pas de liste universelle qui rende un équipement obligatoire en MMA : les règles dépendent de l’organisation. L’IMMAF, par exemple, a ses propres règles de compétition ; récupérez la version applicable avec votre club.'],
        },
      ],
    },
    usages: {
      titre: 'Le premier prix de chaque pièce',
      note: 'Modèles adultes du catalogue ; les gants de boxe viennent du rayon voisin, pour le sparring debout.',
      regles: [
        { usage: 'Premier cours : la bouche', parmi: 'catalogue', filtre: (p) => protegeDents(p) && adulte(p) && !propose(p, /junior|enfant/i), critere: ({ i }) => `${rang(i)} pour adulte, tout le catalogue confondu` },
        { usage: 'Premier cours : le short', parmi: 'catalogue', filtre: (p) => nom(p).startsWith('short mma') && adulte(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} shorts MMA pour adulte, sans poche ni fermeture` },
        { usage: 'Premier cours : le haut', parmi: 'catalogue', filtre: (p) => nom(p).startsWith('rashguard') && adulte(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} rashguards pour adulte` },
        { usage: 'Frappes et saisies', parmi: 'catalogue', filtre: (p) => gantMMA(p) && adulte(p), critere: ({ i }) => `${rang(i)} des gants à doigts libres` },
        { usage: 'Sparring debout', parmi: 'catalogue', filtre: (p) => gantBoxe(p) && adulte(p) && ouncesOf(p).includes(16), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} gants de boxe en 16 oz` },
        { usage: 'Coups de pied', parmi: 'catalogue', filtre: (p) => tibiaPied(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} protège-tibias et pieds hors coton` },
        { usage: 'Le contact', parmi: 'catalogue', filtre: (p) => nom(p).startsWith('coquille'), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} coquilles` },
        { usage: 'Jambes au sol', parmi: 'catalogue', filtre: (p) => /^(spats|legging)/.test(nom(p)) && adulte(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} spats et leggings pour adulte` },
      ],
    },
    tableau: ({ all }) => {
      const pieces: [string, string, string, (p: Product) => boolean][] = [
        ['Protège-dents adulte', '/protege-dents/', 'Premier cours', (p) => protegeDents(p) && adulte(p) && !propose(p, /junior|enfant/i)],
        ['Short MMA', '/shorts-mma/', 'Premier cours', (p) => nom(p).startsWith('short mma')],
        ['Rashguard', '/rashguards/', 'Premier cours', (p) => nom(p).startsWith('rashguard')],
        ['Gants à doigts libres', '/gants-mma/', 'Travail mixte', gantMMA],
        ['Gants de boxe 16 oz', '/gants-de-boxe-16-oz/', 'Sparring debout', (p) => gantBoxe(p) && adulte(p) && ouncesOf(p).includes(16)],
        ['Protège-tibias', '/protege-tibias/', 'Dès le contact', tibias],
        ['Coquille', '/coquilles/', 'Dès le contact', (p) => nom(p).startsWith('coquille')],
        ['Spats et leggings', '/leggings/', 'Au sol', (p) => /^(spats|legging)/.test(nom(p))],
        ['Casque', '/casques-de-boxe/', 'Plus tard', (p) => nom(p).startsWith('casque') && !nom(p).startsWith('casquette')],
      ];
      const lignes: Cellule[][] = pieces
        .map(([libelle, href, quand, test]) => {
          const ps = all.filter((p) => p.price > 0 && test(p));
          return ps.length ? [{ texte: libelle, href }, quand, fr(ps.length), money(Math.min(...ps.map((p) => p.price)))] : null;
        })
        .filter(nonNul);
      return { titre: 'Le sac de MMA, pièce par pièce', colonnes: ['Pièce', 'Quand', 'Modèles', 'Dès'], lignes, note: 'Le moment vient du guide « MMA : l’équipement obligatoire pour débuter » ; les chiffres, du catalogue.' };
    },
    faq: ({ all, items }) => {
      const kids = items.filter((p) => p.price > 0 && enfant(p));
      const kit = items.some((p) => /\b(kit|pack)\b/i.test(p.name));
      const pd = premier(all.filter((p) => protegeDents(p) && adulte(p) && !propose(p, /junior|enfant/i)));
      const sh = premier(all.filter((p) => nom(p).startsWith('short mma') && adulte(p)));
      const rg = premier(all.filter((p) => nom(p).startsWith('rashguard') && adulte(p)));
      const total = [pd, sh, rg].reduce((s, p) => s + (p?.price || 0), 0);
      return [
        { question: 'Quel équipement pour commencer le MMA ?', answer: 'Un protège-dents, un short sans poche et un rashguard ou un t-shirt. Puis les gants que la salle demande : à doigts libres pour le travail mixte, de boxe en 14 ou 16 oz pour le sparring debout.' },
        { question: 'Quel matériel MMA choisir pour s’entraîner ?', answer: 'Celui de vos séances réelles : gants et protège-tibias pour la frappe, rashguard, short et spats pour le sol, protège-dents et coquille dès le contact. Faites la liste avec votre club.' },
        { question: 'Quel matériel pour un enfant ?', answer: `Demandez la liste du cours : les règles des jeunes ne se déduisent pas de celles des adultes. Le rayon compte ${fr(kids.length)} modèles enfant ou junior${kids.length ? `, dès ${money(Math.min(...kids.map((p) => p.price)))}` : ''}.` },
        { question: 'Quels accessoires prévoir ?', answer: 'Une boîte pour le protège-dents, des bandes ou des sous-gants si la salle les demande sous les gants, et un sac qui sépare le linge humide du propre.' },
        { question: 'Existe-t-il un kit tout compris ?', answer: kit ? `Le rayon en propose ; vérifiez la taille de chaque pièce. Au premier prix, protège-dents, short et rashguard reviennent à ${money(total)}.` : `Pas de kit tout fait ici : chaque pièce se choisit à sa taille. Au premier prix, protège-dents, short et rashguard reviennent à ${money(total)}.` },
        { question: 'Le casque est-il obligatoire ?', answer: 'Pas pour débuter. Il arrive avec le sparring appuyé, quand l’entraîneur le demande.' },
        { question: 'Peut-on faire du MMA en gants de boxe ?', answer: 'Debout, oui, et c’est souvent demandé. Pour les saisies et le sol, il faut des doigts libres.' },
        { question: 'Quelle tenue en compétition ?', answer: 'Celle de l’organisateur : couleur, modèle, matériel fourni. Consultez ses instructions avec votre encadrant.' },
        { question: 'Quelles protections pour le sparring ?', answer: 'Protège-dents et coquille d’abord, protège-tibias avec pied couvert dès que les jambes frappent, et le casque si l’entraîneur le demande. Chaque protection se règle à la taille de sa marque.' },
        { question: 'Faut-il des gants pour le grappling ?', answer: 'Pas forcément : un cours de grappling sans frappes n’en demande souvent pas. Rashguard, short ou spats et protège-dents suffisent ; demandez la liste à votre club.' },
      ];
    },
    liens: [
      { titre: 'Les guides', liens: [{ href: '/guides/mma-equipement-obligatoire-debuter/', texte: 'l’équipement obligatoire pour débuter' }, { href: '/guides/debuter-mma/', texte: 'quel matériel pour commencer' }, { href: '/guides/difference-gants-boxe-mma/', texte: 'gants de boxe et gants MMA : les différences' }, { href: '/guides/short-de-boxe-quel-short-pour-quel-sport/', texte: 'short de MMA, de thaï ou de kick : lequel' }, { href: '/guides/protege-tibias-chaussette-ou-scratch/', texte: 'choisir ses protège-tibias' }] },
      { titre: 'Les rayons voisins', liens: [{ href: '/gants-mma/', texte: 'gants MMA' }, { href: '/shorts-mma/', texte: 'short MMA' }, { href: '/rashguards/', texte: 'rashguard MMA et JJB' }, { href: '/equipement-jjb/', texte: 'équipement JJB' }, { href: '/protege-tibias/', texte: 'protège-tibia boxe' }] },
    ],
  },

  /* ---------------------------------------------------------------- matériel sport de combat */
  // « boutique sport de combat France » appartient à /boutique-sport-de-combat/ (CONCOURS-MOTS-CLES.md) : cette page
  // garde sa requête, « matériel sport de combat », et renvoie vers la boutique par un lien, pas par son titre.
  {
    slug: 'materiel-sport-de-combat',
    requete: 'matériel sport de combat',
    revision: '2026-10-22',
    h1: 'Matériel sport de combat',
    eyebrow: 'NEUF DISCIPLINES · UN CATALOGUE',
    titre: ({ f }) => `Matériel sport de combat : boxe, MMA, JJB, ${fr(f.n)} modèles`,
    description: ({ f }) => `Matériel sport de combat : ${fr(f.n)} modèles dès ${money(f.min)} pour la boxe, le MMA, le JJB et le karaté. Ce que demande chaque discipline, rayon par rayon.`,
    label: ({ f }) => `${fr(f.n)} modèles, ${f.marques.length} marques, dès ${money(f.min)}.`,
    intro: 'Boxe anglaise, savate, muay-thaï, kick-boxing, MMA, jiu-jitsu brésilien, karaté : tout le catalogue, avec les tailles réelles et les prix TTC. Le tableau par discipline suit la liste.',
    guide: {
      titre: 'S’équiper selon sa discipline',
      chapeau: ({ f }) => `${fr(f.n)} modèles de ${f.marques.length} marques : ce qui s’achète en premier, ce que chaque famille de disciplines ajoute, puis un premier achat réel pour chacune.`,
      chapitres: [
        {
          titre: 'Commencer par ce qui ne se prête pas',
          texte: [
            'Le protège-dents et les bandes vous appartiennent : un club en prête rarement, et on ne les partage pas. Les gants de votre discipline viennent ensuite, ou le kimono si elle se pratique en tenue.',
            'Le casque, les protège-tibias et le sac de frappe peuvent attendre que la pratique s’installe et que le club vous les demande ; le tableau par discipline, plus bas, dit dans quel ordre.',
          ],
        },
        {
          titre: 'Frapper, saisir, ou les deux',
          texte: [
            'Seuls les poings comptent en boxe anglaise. Le kick-boxing, la savate et le karaté y ajoutent les pieds ; le muay-thaï, les genoux et les coudes. Plus le corps frappe, plus la liste des protections s’allonge : des gants et des bandes partout, des protège-tibias dès que les jambes entrent en jeu.',
            'Le judo et le jiu-jitsu brésilien saisissent au lieu de frapper : ils demandent surtout une tenue solide et presque aucune protection. Le MMA réunit les deux familles, d’où ses gants à doigts libres.',
          ],
        },
        {
          titre: 'Les protections, de la tête aux pieds',
          texte: [
            'Le protège-dents sert dans tous les sports de combat dès le travail à deux. Le casque arrive avec le sparring, selon la règle du club ; la coquille, dès que le contact commence en pieds-poings et en MMA. Le karaté se contente souvent d’un protège-tibia fin, quand la boxe thaï veut un rembourrage épais qui couvre aussi le pied.',
            ({ all }) => {
              const ps = famille(all, 'protections-boxe');
              return ps.length ? `Le rayon des protections réunit ${fr(ps.length)} modèles, dès ${money(Math.min(...ps.map((p) => p.price)))} ; chacun se règle à la grille de sa marque.` : 'Chaque protection se règle à la grille de sa marque.';
            },
          ],
        },
        {
          titre: 'Les tailles, marque par marque',
          texte: ['Aucune taille ne se convertit d’une marque à l’autre : chaque fiche donne la grille du fabricant, telle qu’il la publie. Les onces d’un gant sont un poids, les lettres d’un short une coupe, les A d’un kimono une stature et un poids.'],
        },
        {
          titre: 'Ce que proposent les rayons',
          texte: [
            ({ all }) => {
              const fam: [string, string][] = [['textile-boxe', 'le textile'], ['gants-de-boxe', 'les gants de boxe'], ['protections-boxe', 'les protections'], ['accessoires-boxe', 'les accessoires'], ['equipement-entrainement', 'l’équipement d’entraînement'], ['sacs-de-frappe', 'les sacs de frappe'], ['chaussures-boxe', 'les chaussures'], ['arts-martiaux', 'les arts martiaux'], ['sacs-de-sport', 'les sacs de sport'], ['gants-mma', 'les gants MMA']];
              const tri = fam.map(([s, l]) => [l, famille(all, s).length] as const).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
              return `Le plus fourni est ${tri[0][0]}, avec ${fr(tri[0][1])} modèles ; suivent ${liste(tri.slice(1, 4).map(([l, n]) => `${l} (${fr(n)})`))}. Le tableau des rayons, plus bas, donne pour chacun le nombre de marques et la fourchette de prix.`;
            },
          ],
        },
        {
          titre: 'Les marques, famille par famille',
          texte: [
            ({ all }) => {
              const fam: [string, string][] = [['gants-de-boxe', 'les gants de boxe'], ['gants-mma', 'les gants à doigts libres'], ['protections-boxe', 'les protections'], ['arts-martiaux', 'les kimonos et les ceintures']];
              const parties = fam
                .map(([s, l]) => {
                  const m = faits(s, famille(all, s)).marques.slice(0, 2);
                  return m.length ? `${l}, ${liste(m.map((x) => `${x.nom} (${fr(x.n)})`))}` : '';
                })
                .filter(Boolean);
              return `Les deux marques les plus présentes, rayon par rayon : ${parties.join(' ; ')}. Une marque ne choisit pas à votre place : la grille de tailles et l’usage décident.`;
            },
          ],
        },
        {
          titre: 'Commander, recevoir',
          texte: ['Le panier se paie par carte ; la livraison, les délais et les retours sont détaillés sur la page de la [boutique sport de combat en France](/boutique-sport-de-combat/). Les sacs de frappe, les bases et les portiques se livrent à domicile, sur devis.'],
        },
      ],
    },
    usages: {
      titre: 'Un premier achat par discipline',
      note: 'Pour chaque discipline, la pièce qu’elle demande en premier, au prix le plus bas du catalogue, en taille adulte.',
      regles: [
        { usage: 'Boxe anglaise', parmi: 'catalogue', filtre: (p) => gantBoxe(p) && adulte(p) && ouncesOf(p).includes(12) && velcro(p), critere: ({ i }) => `${rang(i)} des gants à velcro proposés en 12 oz` },
        { usage: 'Boxe thaï, kick-boxing', parmi: 'catalogue', filtre: (p) => tibiaPied(p) && adulte(p), critere: ({ i }) => `${rang(i)} des protège-tibias et pieds hors coton` },
        { usage: 'MMA', parmi: 'catalogue', filtre: (p) => gantMMA(p) && adulte(p), critere: ({ i }) => `${rang(i)} des gants MMA, doigts libres` },
        { usage: 'Jiu-jitsu brésilien', parmi: 'catalogue', filtre: (p) => kimonoJJB(p), critere: ({ i, n }) => (n === 1 ? 'le seul kimono de JJB du catalogue' : `${rang(i)} des ${fr(n)} kimonos de JJB`) },
        { usage: 'Karaté', parmi: 'catalogue', filtre: (p) => nom(p).startsWith('kimono de karat') && adulte(p), critere: ({ i, n }) => (n === 1 ? 'le seul kimono de karaté du catalogue' : `${rang(i)} des ${fr(n)} kimonos de karaté`) },
        { usage: 'Savate boxe française', parmi: 'catalogue', filtre: (p) => nom(p).startsWith('chaussures') && /savate|boxe française|rivat|isba/.test(nom(p) + ' ' + p.brand.toLowerCase()), critere: ({ i, n }) => (n === 1 ? 'la seule paire pour la savate' : `${rang(i, 'f')} des ${fr(n)} paires pour la savate`) },
        { usage: 'Toutes les disciplines', parmi: 'catalogue', filtre: (p) => protegeDents(p) && adulte(p) && !propose(p, /junior|enfant/i), critere: ({ i }) => `${rang(i)} des protège-dents, utile partout` },
        { usage: 'Chez soi', parmi: 'catalogue', filtre: (p) => surPied(p) && adulte(p), critere: ({ i }) => `${rang(i)} parmi les sacs sur pied, sans fixation` },
      ],
    },
    tableau: ({ all }) => {
      const fam: [string, string][] = [['gants-de-boxe', 'Gants de boxe'], ['gants-mma', 'Gants MMA'], ['protections-boxe', 'Protections'], ['textile-boxe', 'Textile'], ['accessoires-boxe', 'Accessoires'], ['sacs-de-frappe', 'Sacs de frappe'], ['chaussures-boxe', 'Chaussures'], ['equipement-entrainement', 'Équipement d’entraînement'], ['arts-martiaux', 'Arts martiaux'], ['sacs-de-sport', 'Sacs de sport']];
      const lignes: Cellule[][] = fam
        .map(([slug, libelle]) => {
          const ps = famille(all, slug);
          const s = ps.map((p) => p.price).sort((a, b) => a - b);
          const marques = new Set(ps.map((p) => p.brand.trim().toLowerCase()).filter((b) => b && !NI_MARQUE.test(b))).size;
          return s.length ? [{ texte: libelle, href: '/' + slug + '/' }, fr(s.length), fr(marques), money(s[0]), money(s[s.length - 1])] : null;
        })
        .filter(nonNul);
      return { titre: 'Les rayons du catalogue', colonnes: ['Rayon', 'Modèles', 'Marques', 'Dès', 'Jusqu’à'], lignes, note: 'Prix de vente du jour ; dans chaque rayon, seuls les articles du rayon comptent, pas les semelles ni les boîtes.' };
    },
    faq: ({ f, all }) => {
      const premierDe = (t: (p: Product) => boolean) => premier(all.filter((p) => p.price > 0 && t(p)));
      const somme = (ps: (Product | undefined)[]) => (ps.every(Boolean) ? (ps as Product[]).reduce((s, p) => s + p.price, 0) : null);
      const anglaise = somme([premierDe((p) => /^bandes? de boxe/.test(nom(p)) && longueur(p) === 4.5), premierDe((p) => gantBoxe(p) && adulte(p) && ouncesOf(p).includes(12) && velcro(p)), premierDe((p) => protegeDents(p) && adulte(p) && !propose(p, /junior|enfant/i))]);
      const mma = somme([premierDe((p) => protegeDents(p) && adulte(p) && !propose(p, /junior|enfant/i)), premierDe((p) => nom(p).startsWith('short mma') && adulte(p)), premierDe((p) => nom(p).startsWith('rashguard') && adulte(p))]);
      const jjb = somme([premierDe(kimonoJJB), premierDe((p) => nom(p).startsWith('ceinture') && /jjb|jiu|bjj/.test(nom(p)))]);
      const budgets = [anglaise !== null ? `${money(anglaise)} pour la boxe anglaise (bandes de 4,50 m, gants de 12 oz à velcro, protège-dents)` : '', mma !== null ? `${money(mma)} pour le MMA (protège-dents, short sans poche, rashguard)` : '', jjb !== null ? `${money(jjb)} pour le jiu-jitsu brésilien (kimono et ceinture)` : ''].filter(Boolean);
      return [
        { question: 'Quel matériel pour débuter un sport de combat ?', answer: 'Ce qui ne se prête pas d’abord, un protège-dents et des bandes, puis les gants de la discipline, ou un kimono pour le judo, le jiu-jitsu brésilien et le karaté. Le casque, les protège-tibias et le sac viennent avec la pratique.' },
        { question: 'Quelles protections pour quel sport de combat ?', answer: 'Le protège-dents partout dès le travail à deux, le casque au sparring selon le club, la coquille et les protège-tibias quand les coups de pied arrivent, en boxe thaï, en kick-boxing comme en MMA. Les disciplines de saisie en demandent peu.' },
        ...(budgets.length ? [{ question: 'Combien coûte un premier équipement ?', answer: `Au premier prix du catalogue : ${liste(budgets)}. Ce sont des prix de vente TTC, hors livraison.` }] : []),
        { question: 'Le matériel est-il le même pour tous les sports de combat ?', answer: 'Non. Les gants, les protections et le textile changent selon la discipline : un gant de boxe thaï n’a pas la coupe d’un gant de boxe anglaise, un gant MMA laisse les doigts libres.' },
        { question: 'Peut-on garder les mêmes gants d’une boxe à l’autre ?', answer: 'Pour apprendre, une paire d’anglaise suffit en boxe thaï comme en kick-boxing. Le MMA, lui, demande des doigts libres dès que l’on saisit.' },
        { question: 'Quels sports de combat sont couverts ?', answer: 'Boxe anglaise, savate, muay-thaï, kick-boxing, full contact, MMA, jiu-jitsu brésilien, judo et karaté. Chaque fiche indique la discipline concernée.' },
        { question: 'Quelles marques trouve-t-on ?', answer: `${marquesTexte(f, 6)}, parmi ${fr(f.marques.length)} marques. Chaque fiche donne la grille de tailles de son fabricant.` },
      ];
    },
    liens: [
      { titre: 'Par discipline', liens: [{ href: '/materiel-boxe/', texte: 'matériel de boxe' }, { href: '/materiel-mma/', texte: 'matériel MMA' }, { href: '/materiel-boxe-thai/', texte: 'boxe thaï' }, { href: '/materiel-kick-boxing/', texte: 'kick-boxing' }, { href: '/materiel-boxe-francaise/', texte: 'savate boxe française' }, { href: '/equipement-jjb/', texte: 'jiu-jitsu brésilien' }, { href: '/arts-martiaux/', texte: 'matériel d’arts martiaux' }] },
      { titre: 'Les guides', liens: [{ href: '/guides/', texte: 'tous les guides d’achat' }, { href: '/guides/choisir-protections/', texte: 'les protections de chaque sport' }, { href: '/sports-de-combat/', texte: 'les sports de combat en France' }, { href: '/guides/boxe-thai-ou-kick-boxing-differences/', texte: 'boxe thaï ou kick-boxing : les différences' }, { href: '/guides/boxe-anglaise-ou-savate-boxe-francaise/', texte: 'boxe anglaise ou savate : les deux tenues' }] },
      { titre: 'La boutique', liens: [{ href: '/livraison/', texte: 'livraison et délais' }, { href: '/retours/', texte: 'retours et échanges' }, { href: '/boutique-sport-de-combat/', texte: 'boutique sport de combat en France' }] },
    ],
  },
  /* ---------------------------------------------------------------- accessoires de boxe (22/10) */
  {
    slug: 'accessoires-boxe',
    requete: 'accessoires boxe',
    revision: '2026-10-22',
    h1: 'Accessoires de boxe',
    eyebrow: 'ACCESSOIRES BOXE · BANDES, SOUS-GANTS, TAPE, HYGIÈNE',
    titre: ({ f }) => `Accessoires boxe : bandes, sous-gants, tape, ${fr(f.n)} modèles`,
    description: ({ f }) => `Accessoires boxe : ${fr(f.n)} modèles dès ${money(f.min)} : bandes, sous-gants gel, mitaines, tape, hygiène. Ce qui sert à chaque séance, et dans quel ordre l’acheter.`,
    label: ({ f }) => `${fr(f.n)} modèles, dès ${money(f.min)} : bandes, sous-gants, tape, hygiène.`,
    intro: 'Tout ce qui entoure les gants dans le sac : les bandes et les sous-gants d’abord, puis le tape, de quoi boire et de quoi garder le matériel propre. Le guide suit la liste.',
    guide: {
      titre: 'Choisir ses accessoires de boxe',
      chapeau: ({ f }) => `${fr(f.n)} modèles de ${f.marques.length} marques, de ${money(f.min)} à ${money(f.max)} : ce qui est indispensable, ce qui rend service, et un modèle réel pour chaque besoin.`,
      chapitres: [
        {
          titre: 'Les bandes, avant tout le reste',
          texte: [
            'Elles passent avant les gants : personnelles, lavées après chaque cours, elles tiennent le poignet et retiennent la sueur avant la mousse du gant. Une main d’adulte se bande avec 4 ou 4,50 m, celle d’un enfant avec 2,50 m.',
            ({ items }) => {
              const b = items.filter((p) => bandes(p) && p.price > 0);
              const l = b.map(longueur).filter((x): x is number => x !== null);
              return `${fr(b.length)} paires au rayon, longues de ${metres(Math.min(...l))} jusqu’à ${metres(Math.max(...l))}, dont ${fr(l.filter((x) => x === 4.5).length)} en 4,50 m ; les fiches annoncent un mélange de coton et de lycra sur ${fr(b.filter((p) => /coton/.test(matiere(p)) && /lycra/.test(matiere(p))).length)} d’entre elles. Leur page, [bandes de boxe](/bandes-de-boxe/), détaille la longueur et la pose.`;
            },
          ],
        },
        {
          titre: 'Sous-gants et mitaines : s’équiper en dix secondes',
          texte: [
            'Un sous-gant se passe d’un geste, gel ou mousse déjà en place sur les jointures, une sangle autour du poignet. Il va vite et protège bien au sac ; pour le sparring, la bande se règle mieux. Les mitaines de maintien, plus fines, servent sous les gants de sac et aux pattes d’ours.',
            ({ items }) => {
              const sg = items.filter((p) => sousGants(p) && p.price > 0);
              const gel = sg.filter((p) => /gel/.test(nom(p) + ' ' + spec(p, 'Rembourrage', 'Matières'))).length;
              return `Le rayon en compte ${fr(sg.length)}, dès ${desDe(sg)}, dont ${fr(gel)} à gel ; une paire de mitaines existe en junior. Le guide [bandes ou sous-gants](/guides/bandes-de-boxe-ou-sous-gants/) tranche selon la séance.`;
            },
          ],
        },
        {
          titre: 'Le tape : les doigts et les bandes',
          texte: [
            'Le finger tape, 1 cm de large, s’enroule entre deux phalanges pour tenir les doigts que les saisies fatiguent, au jiu-jitsu brésilien et au grappling. Le tape de 2,5 cm ferme un bandage ou protège une jointure sous le gant.',
            ({ items }) => {
              const t = items.filter((p) => tapes(p) && p.price > 0);
              return t.length ? `${pluriel(t.length, 'référence', 'références')} au rayon, dès ${desDe(t)} ; les rouleaux de finger tape se vendent par trois.` : 'Chaque fiche donne la largeur et la longueur du rouleau.';
            },
          ],
        },
        {
          titre: 'Boire, sauter, ranger',
          texte: [
            ({ items, all }) => {
              const g = items.filter((p) => gourde(p) && p.price > 0);
              const c = all.filter((p) => cordeASauter(p) && p.price > 0);
              const parts = [
                g.length ? `${fr(g.length)} gourdes et bouteilles, de ${money(Math.min(...g.map((p) => p.price)))} à ${money(Math.max(...g.map((p) => p.price)))}, pour la bouteille que chaque salle demande.` : '',
                c.length ? `La corde à sauter, elle, a son propre rayon : ${fr(c.length)} modèles dès ${desDe(c)}, dans l’[équipement d’entraînement](/cordes-a-sauter/) ; presque tous les cours s’échauffent avec.` : '',
              ].filter(Boolean);
              return parts.join(' ');
            },
            'Le sac qui transporte le tout a aussi sa page : les [sacs de sport](/sacs-de-sport/) avec compartiment pour les gants.',
          ],
        },
        {
          titre: 'Garder le matériel propre',
          texte: [
            'Ce sont la sueur et l’humidité qui abîment un gant, bien plus que les coups. Un séchoir absorbant glissé dans chaque gant après la séance, un spray désinfectant de temps en temps, et des bandes propres à chaque fois : voilà ce qui fait durer une paire.',
            ({ items }) => {
              const h = items.filter((p) => hygiene(p) && p.price > 0);
              return h.length ? `Le rayon réunit ${fr(h.length)} articles d’hygiène et de soins, dès ${desDe(h)} : séchoir, spray, savon, boîte à savon, trousse de soins, ciseaux.` : 'Chaque fiche dit à quoi sert l’article.';
            },
          ],
        },
        {
          titre: 'Dans quel ordre acheter',
          texte: [
            'Les bandes dès le premier cours, avec un protège-dents pris au rayon des protections. Les sous-gants quand on veut gagner du temps au vestiaire ; le tape, la corde et le séchoir quand les séances deviennent régulières. Rien de cela ne presse, et rien de cela ne se prête.',
            'La page [matériel de boxe débutant](/materiel-boxe-debutant/) chiffre le premier sac en entier.',
          ],
        },
        {
          titre: 'Les marques du rayon',
          texte: [
            ({ f, items }) =>
              `Ce que chacune apporte : ${parMarque('accessoires-boxe', items, f, 5, (ps) => {
                const n = (t: (p: Product) => boolean) => ps.filter(t).length;
                return [n(bandes) ? pluriel(n(bandes), 'paire de bandes', 'paires de bandes') : '', n(sousGants) ? pluriel(n(sousGants), 'sous-gant ou mitaine', 'sous-gants et mitaines') : '', n(tapes) ? 'du tape' : '', n(gourde) ? pluriel(n(gourde), 'bouteille', 'bouteilles') : '', n(hygiene) ? 'des articles de soins' : ''].filter(Boolean).join(', ');
              }, true)}.`,
          ],
        },
      ],
    },
    usages: {
      titre: 'Quel accessoire pour quel besoin',
      note: 'Chaque besoin reçoit le premier prix du rayon qui y répond ; une référence déjà citée cède sa ligne à la suivante.',
      regles: [
        { usage: 'Bander une main d’adulte', filtre: (p) => bandes(p) && longueur(p) === 4.5, critere: ({ i, n }) => `${rang(i, 'f')} parmi ${fr(n)} paires longues de 4,50 m` },
        { usage: 'Bander une main d’enfant', filtre: (p) => bandes(p) && (longueur(p) || 9) <= 2.5, critere: ({ p, i, n }) => (n === 1 ? `la seule paire en ${metres(longueur(p) || 0)}` : `${rang(i, 'f')} des ${fr(n)} paires en ${metres(longueur(p) || 0)}`) },
        { usage: 'Poignet tenu, coton seul', filtre: (p) => bandes(p) && /coton/.test(matiere(p)) && !/lycra|polyester|nylon/.test(matiere(p)), critere: ({ i, n }) => `${rang(i, 'f')} parmi ${fr(n)} paires tout coton, les plus rigides` },
        { usage: 'S’équiper en dix secondes', filtre: (p) => nom(p).startsWith('sous-gants'), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} sous-gants` },
        { usage: 'Aux pattes d’ours, au sac', filtre: (p) => nom(p).startsWith('mitaines'), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} mitaines de maintien` },
        { usage: 'Tenir ses doigts au JJB', filtre: (p) => nom(p).startsWith('finger tape'), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} finger tapes, 1 cm de large` },
        { usage: 'Fermer un bandage', filtre: (p) => nom(p).startsWith('tape '), critere: () => 'le tape de 2,5 cm du rayon' },
        { usage: 'Sécher ses gants', filtre: (p) => nom(p).startsWith('séchoir'), critere: () => 'le séchoir absorbant du rayon' },
        { usage: 'Désinfecter', filtre: (p) => nom(p).startsWith('spray'), critere: () => 'le spray désinfectant du rayon' },
        { usage: 'Boire à la salle', filtre: (p) => gourde(p), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} gourdes et bouteilles` },
      ],
    },
    tableau: ({ items }) =>
      tableauTypes(
        items,
        [
          ['Bandes', bandes, '/bandes-de-boxe/'],
          ['Sous-gants et mitaines', sousGants, '/sous-gants/'],
          ['Tape et finger tape', tapes],
          ['Hygiène et soins', hygiene],
          ['Gourdes et bouteilles', gourde],
          ['Le reste : corde, convertisseur de lacets, porte-clés', (p) => !bandes(p) && !sousGants(p) && !tapes(p) && !hygiene(p) && !gourde(p)],
        ],
        'Les accessoires, type par type',
        'Comptes et premiers prix TTC, lus dans le catalogue du jour.',
      ),
    faq: ({ f, items, all }) => {
      const c = all.filter((p) => cordeASauter(p) && p.price > 0);
      const mitJunior = items.find((p) => nom(p).startsWith('mitaines') && propose(p, /junior/i));
      return [
        { question: 'Quels accessoires de boxe faut-il pour commencer ?', answer: 'Des bandes à la longueur de votre main et, au rayon des protections, un protège-dents : ces deux-là sont personnels. Les sous-gants, le tape et la corde viennent avec la régularité des séances.' },
        { question: 'Sous-gants gel ou bandes : lequel prendre ?', answer: 'Le sous-gant va vite et protège bien les jointures au sac ; la bande se règle à la main et tient le poignet, ce qui compte avec un partenaire. Beaucoup finissent par avoir les deux.' },
        { question: 'Quelle longueur de bandes pour un adulte ?', answer: '4 ou 4,50 m ; la seconde laisse un tour de plus sur le poignet ou les jointures. Les enfants et les petites mains prennent 2,50 m.' },
        { question: 'À quoi sert le finger tape ?', answer: 'À maintenir les articulations des doigts, que les prises de manches fatiguent au jiu-jitsu brésilien ; 1 cm de large, il s’enroule entre deux phalanges, jamais sur l’articulation elle-même.' },
        { question: 'Comment entretenir ses gants et ses bandes ?', answer: 'Les bandes se lavent après chaque cours, à 30 °C dans un filet, et sèchent à plat. Les gants s’ouvrent et sèchent à l’air ; un séchoir absorbant accélère les choses, un spray désinfecte l’intérieur.' },
        { question: 'Un enfant a-t-il besoin d’accessoires particuliers ?', answer: `Des bandes de 2,50 m, à sa main${mitJunior ? `, et des mitaines en taille junior si le club accepte les sous-gants (${cite(mitJunior)}, à ${money(mitJunior.price)})` : ''}. Le protège-dents junior est au rayon des protections.` },
        ...(c.length ? [{ question: 'Faut-il une corde à sauter ?', answer: `Presque tous les cours s’échauffent avec. Elle a son rayon, dans l’équipement d’entraînement : ${fr(c.length)} modèles, dès ${desDe(c)}.` }] : []),
        { question: 'Quelles marques trouve-t-on au rayon ?', answer: `${marquesTexte(f, 5)}. Chaque fiche donne la longueur, la matière et la fermeture.` },
        { question: 'Combien coûtent les accessoires ?', answer: `De ${money(f.min)} à ${money(f.max)} au rayon, avec un prix médian de ${money(f.mediane)}. Les bandes et le tape sont les moins chers ; les gourdes et les sous-gants à gel, les plus chers.` },
      ];
    },
    liens: [
      { titre: 'Les sous-rayons', liens: [{ href: '/bandes-de-boxe/', texte: 'bandes de boxe' }, { href: '/sous-gants/', texte: 'sous-gants et mitaines' }, { href: '/cordes-a-sauter/', texte: 'cordes à sauter' }] },
      { titre: 'Les guides', liens: [{ href: '/guides/bandes-de-boxe-ou-sous-gants/', texte: 'bandes ou sous-gants, selon la séance' }, { href: '/guides/debuter-boxe/', texte: 'l’équipement du premier cours' }, { href: '/guides/corde-a-sauter-boxe-quelle-longueur/', texte: 'la corde à sauter : laquelle, à quelle longueur' }] },
      { titre: 'Les rayons voisins', liens: [{ href: '/protections-boxe/', texte: 'protections de boxe' }, { href: '/gants-de-boxe/', texte: 'gants de boxe' }, { href: '/sacs-de-sport/', texte: 'sacs de sport' }, { href: '/materiel-boxe-debutant/', texte: 'le premier sac, chiffré' }] },
    ],
  },

  /* ---------------------------------------------------------------- protections de boxe (22/10) */
  {
    slug: 'protections-boxe',
    requete: 'protections boxe',
    revision: '2026-10-22',
    h1: 'Protections de boxe',
    eyebrow: 'PROTECTIONS BOXE · DENTS, TÊTE, TIBIAS, BAS-VENTRE',
    titre: ({ f }) => `Protections boxe : ${fr(f.n)} modèles, du protège-dents au casque`,
    description: ({ f }) => `Protections boxe : ${fr(f.n)} modèles dès ${money(f.min)}. Protège-dents, casques, tibias, coquilles, coudières : dans quel ordre les acheter, à quelle taille.`,
    label: ({ f }) => `${fr(f.n)} modèles, dès ${money(f.min)} : de la bouche aux tibias.`,
    intro: 'Le protège-dents dès le premier exercice à deux, le casque et la coquille avec le sparring, les protège-tibias quand les jambes se mettent à frapper. Chaque pièce se prend dans la grille de son fabricant.',
    guide: {
      titre: 'Choisir ses protections de boxe',
      chapeau: ({ f }) => `${fr(f.n)} protections de ${f.marques.length} marques, de ${money(f.min)} à ${money(f.max)} : ce que chaque pièce protège, quand elle devient nécessaire, et un modèle réel par besoin.`,
      chapitres: [
        {
          titre: 'Dans l’ordre où le club les demande',
          texte: [
            'Le protège-dents vient en premier, parce que le contact commence tôt, même léger. Le casque et la coquille arrivent quand le sparring s’installe ; le protège-poitrine, pour les femmes, suit la règle de la salle. Les protège-tibias ne servent qu’aux boxes où les jambes frappent.',
            'En muay-thaï, les coudières s’ajoutent pour le travail des coudes à deux, et les chevillères tiennent la cheville sur les pivots. Avant d’acheter, demandez la liste de votre cours : elle change d’un club à l’autre.',
          ],
        },
        {
          titre: 'Le protège-dents',
          texte: [
            'Simple pour l’arcade du haut, double quand le contact est appuyé ; à mouler chez soi dans l’eau chaude, sauf les modèles pour bagues, qui ne se moulent pas. Il se choisit adulte ou junior, et il ne se prête jamais.',
            ({ items }) => `${fr(compte(items, protegeDents))} modèles au rayon, dont ${fr(compte(items, pdJunior))} en taille junior, ${fr(compte(items, (p) => protegeDents(p) && bagues(p)))} pour les bagues et ${fr(compte(items, (p) => protegeDents(p) && double(p)))} à double arcade. Leur page, [protège-dents](/protege-dents/), explique le moulage.`,
          ],
        },
        {
          titre: 'Le casque',
          texte: [
            'Il se prend au tour de tête, dans la grille du fabricant, et se juge en bougeant : s’il tourne ou descend sur les yeux, changez de taille. Ouvert, il laisse voir ; à barre ou intégral, il couvre le nez et le menton pour le sparring appuyé.',
            ({ items }) => {
              const c = items.filter((p) => casque(p) && p.price > 0);
              return `${fr(c.length)} casques, dès ${desDe(c)} : ${fr(c.filter(enCuir).length)} en cuir d’après leur fiche, ${fr(c.filter((p) => ['barre', 'integral'].includes(couverture(p))).length)} à barre ou intégraux, ${fr(c.filter((p) => /ffb|aiba/.test(nom(p))).length)} marqués FFB ou AIBA dans leur nom. La page [casque de boxe](/casques-de-boxe/) les compare couverture par couverture.`;
            },
          ],
        },
        {
          titre: 'Coquille, protège-poitrine, plastron',
          texte: [
            'La coquille protège le bas-ventre, debout comme au sol : coquille seule, ou short de compression qui la tient. Les femmes ont une protection pelvienne à leur morphologie et, pour la poitrine, une brassière à coques. Le plastron, lui, est la cuirasse du taekwondo.',
            ({ items }) => {
              const parts = [combien(items, (p) => coquille(p) && !pourFemme(p), 'coquille ou support', 'coquilles et supports'), combien(items, pourFemme, 'protection pour femme', 'protections pour femmes'), combien(items, plastron, 'plastron', 'plastrons')].filter(Boolean);
              return `Au rayon : ${liste(parts as string[])}.`;
            },
          ],
        },
        {
          titre: 'Protège-tibias et protège-pieds',
          texte: [
            'Le pied est couvert en pieds-poings et en MMA ; le tibia seul suffit au karaté comme à la savate, d’après leur fédération ; le full contact protège le pied à part, avec un protège-pieds. La taille se prend sur la jambe, de la base du genou à la malléole.',
            ({ items }) => `${fr(compte(items, tibias))} protège-tibias, dont ${fr(compte(items, tibiaPied))} avec le pied couvert hors coton et ${fr(compte(items, (p) => tibias(p) && enCoton(p)))} en coton ; ${fr(compte(items, protegePieds))} protège-pieds. Leur page, [protège-tibia boxe](/protege-tibias/), détaille mousse, sangles et tailles.`,
          ],
        },
        {
          titre: 'Coudes, chevilles, genoux, avant-bras',
          texte: [
            ({ items }) => {
              const parts = [combien(items, coudieres, 'paire de coudières', 'paires de coudières'), combien(items, chevilleres, 'paire de chevillères', 'paires de chevillères'), combien(items, (p) => nom(p).startsWith('genouillères'), 'paire de genouillères', 'paires de genouillères'), combien(items, avantBras, 'protège-avant-bras', 'protège-avant-bras'), combien(items, (p) => nom(p).startsWith('protège-oreilles'), 'protège-oreilles', 'protège-oreilles')].filter(Boolean);
              return `Les coudières servent au muay-thaï, quand les coudes travaillent à deux ; les chevillères tiennent l’articulation sur le pivot ; les genouillères et les protège-avant-bras viennent du taekwondo et de la préparation physique ; le protège-oreilles, du grappling. Au rayon : ${liste(parts as string[])}.`;
            },
          ],
        },
        {
          titre: 'Pour l’entraîneur',
          texte: [
            ({ items }) => {
              const e = items.filter((p) => pourEntraineur(p) && p.price > 0);
              return e.length ? `Celui qui tient les paos encaisse les coups de pied : ceinture de frappe pour le ventre, protège-cuisses, veste de protection. ${pluriel(e.length, 'modèle', 'modèles')} au rayon, de ${money(Math.min(...e.map((p) => p.price)))} à ${money(Math.max(...e.map((p) => p.price)))}.` : 'Les paos et les pattes d’ours sont dans l’équipement d’entraînement.';
            },
          ],
        },
        {
          titre: 'La taille, pièce par pièce',
          texte: [
            'Le casque au tour de tête, les protège-tibias à la longueur du tibia, la coquille au tour de taille ou de hanches selon la marque, le protège-dents en adulte ou junior : chaque fiche reprend la grille du fabricant, sans équivalence entre marques. Une protection qui tourne ou glisse à l’essai appelle une autre taille, pas un serrage de plus.',
          ],
        },
        {
          titre: 'En compétition',
          texte: ['Ce qui est admis en compétition, du casque au protège-dents, dépend de la fédération, de l’âge et de la catégorie ; le club connaît la liste. Quand un modèle porte une mention fédérale dans son nom, sa fiche la reprend telle quelle, sans rien y ajouter. La page [matériel de boxe de compétition](/materiel-boxe-competition/) rassemble gants, casques et coquilles de combat.'],
        },
        {
          titre: 'Entretien',
          texte: ['Après le cours, tout sort du sac et sèche à l’air ; chaque notice dit comment laver sa matière, mousse, coque ou textile. Le protège-dents se rince et se range dans une boîte aérée. Contrôlez sangles et coutures avant un sparring.'],
        },
        {
          titre: 'Les marques du rayon',
          texte: [
            ({ f, items }) =>
              `Marque par marque : ${parMarque('protections-boxe', items, f, 6, (ps) => {
                const n = (t: (p: Product) => boolean) => ps.filter(t).length;
                return [n(casque) ? pluriel(n(casque), 'casque', 'casques') : '', n(protegeDents) ? pluriel(n(protegeDents), 'protège-dents', 'protège-dents') : '', n(tibias) ? pluriel(n(tibias), 'protège-tibias', 'protège-tibias') : '', n(coquille) ? pluriel(n(coquille), 'coquille', 'coquilles') : '', n(articulation) ? pluriel(n(articulation), 'maintien articulaire', 'maintiens articulaires') : ''].filter(Boolean).join(', ');
              }, true)}.`,
          ],
        },
      ],
    },
    usages: {
      titre: 'Quelle protection pour quel moment',
      note: 'Le premier prix du rayon pour chaque besoin, en taille adulte sauf mention ; une pièce déjà citée laisse sa ligne à la suivante.',
      regles: [
        { usage: 'Dès le premier cours', filtre: (p) => protegeDents(p) && adulte(p) && !propose(p, /junior|enfant/i), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} protège-dents adultes` },
        { usage: 'Enfant : les dents', filtre: (p) => pdJunior(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} protège-dents enfant ou junior` },
        { usage: 'Premier casque', filtre: (p) => casque(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} casques` },
        { usage: 'Nez et menton couverts', filtre: (p) => casque(p) && ['barre', 'integral'].includes(couverture(p)), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} casques à barre ou intégraux` },
        { usage: 'Le bas-ventre, homme', filtre: (p) => nom(p).startsWith('coquille'), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} coquilles` },
        { usage: 'Le bas-ventre, femme', filtre: (p) => pourFemme(p) && !brassiere(p), critere: ({ i, n }) => (n === 1 ? 'la seule protection pelvienne pour femme' : `${rang(i, 'f')} des ${fr(n)} protections pelviennes pour femme`) },
        { usage: 'La poitrine', filtre: (p) => brassiere(p), critere: ({ i, n }) => (n === 1 ? 'la seule brassière à coques du rayon' : `${rang(i, 'f')} des ${fr(n)} brassières à coques`) },
        { usage: 'Boxe thaï, kick : les tibias', filtre: (p) => tibiaPied(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} parmi ${fr(n)} protège-tibias à pied couvert, hors coton` },
        { usage: 'Karaté, savate : le tibia seul', filtre: (p) => tibiaSeul(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} protège-tibias sans le pied` },
        { usage: 'Full contact : le pied', filtre: (p) => protegePieds(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} protège-pieds` },
        { usage: 'Muay-thaï : les coudes', filtre: (p) => coudieres(p), critere: ({ i, n }) => `${rang(i, 'f')} parmi ${fr(n)} paires de coudières` },
        { usage: 'La cheville sur le pivot', filtre: (p) => chevilleres(p), critere: ({ i, n }) => `${rang(i, 'f')} parmi ${fr(n)} paires de chevillères` },
        { usage: 'Tenir les paos', filtre: (p) => pourEntraineur(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} protections d’entraîneur` },
      ],
    },
    tableau: ({ items }) =>
      tableauTypes(
        items,
        [
          ['Protège-dents', protegeDents, '/protege-dents/'],
          ['Casques', casque, '/casques-de-boxe/'],
          ['Protège-tibias', tibias, '/protege-tibias/'],
          ['Protège-pieds et avant-bras', (p) => protegePieds(p) || avantBras(p)],
          ['Coquilles et protections pelviennes', (p) => coquille(p) || (pourFemme(p) && !brassiere(p)), '/coquilles/'],
          ['Brassières à coques', brassiere],
          ['Coudières, chevillères, genouillères', articulation],
          ['Ceintures de frappe, protège-cuisses, plastrons', (p) => pourEntraineur(p) || plastron(p)],
        ],
        'Les protections, type par type',
        'Comptes et premiers prix du catalogue du jour ; les boîtes de protège-dents ne sont pas comptées.',
      ),
    faq: ({ f, items }) => {
      const prix = (t: (p: Product) => boolean) => premier(items.filter((p) => p.price > 0 && t(p)));
      const jeu = [prix((p) => protegeDents(p) && adulte(p) && !propose(p, /junior|enfant/i)), prix((p) => casque(p) && adulte(p)), prix((p) => nom(p).startsWith('coquille')), prix((p) => tibiaPied(p) && adulte(p))];
      const total = jeu.every(Boolean) ? (jeu as Product[]).reduce((s, p) => s + p.price, 0) : null;
      const kid = items.find((p) => casque(p) && p.sizes.some((s) => /enfant/i.test(s)));
      const bras = items.find((p) => brassiere(p) && p.price > 0);
      return [
        { question: 'Quelles protections de boxe pour débuter ?', answer: 'Un protège-dents, et c’est tout tant qu’il n’y a pas de sparring. Le casque, la coquille et, selon la boxe, les protège-tibias s’ajoutent quand le club les demande.' },
        { question: 'Le casque est-il obligatoire en boxe ?', answer: 'À l’entraînement, la salle décide, en général dès le sparring. Pour la compétition amateur, c’est le règlement fédéral qui tranche, selon l’âge et la catégorie : renseignez-vous auprès du club avant d’acheter.' },
        { question: 'Quelle protection pour une femme ?', answer: `Une protection pelvienne coupée pour la morphologie féminine, et pour la poitrine une brassière à coques${bras ? `, comme ${cite(bras)} à ${money(bras.price)}, de ${tailles(bras)[0]} à ${tailles(bras)[tailles(bras).length - 1]}` : ''}. Le guide de l’équipement pour femme détaille les coupes.` },
        { question: 'Coquille : comment choisir la taille ?', answer: 'Dans la grille de la marque, au tour de taille ou de hanches selon le modèle. Bien réglée, elle ne remonte pas et ne gêne pas la hanche quand le genou monte.' },
        { question: 'Quelles protections changent d’une boxe à l’autre ?', answer: 'L’anglaise se contente du protège-dents, du casque et de la coquille. Pieds-poings et MMA ajoutent les protège-tibias ; le muay-thaï, les coudières et souvent les chevillères ; le full contact, les protège-pieds.' },
        { question: 'Y a-t-il des protections pour les enfants ?', answer: `Oui : ${fr(compte(items, pdJunior))} protège-dents junior, ${fr(compte(items, (p) => tibias(p) && propose(p, /junior/i)))} protège-tibias en junior${kid ? `, et ${cite(kid)} existe en taille enfant` : ''}. Chaque pièce se prend à la taille du jour, essayée avant le cours.` },
        { question: 'Comment laver ses protections ?', answer: 'Selon la notice de chaque modèle : une mousse, une coque et un textile ne se lavent pas pareil. Tout sèche à l’air, hors du sac ; le protège-dents se rince après chaque séance.' },
        { question: 'Quelles marques au rayon ?', answer: `${marquesTexte(f, 6)}. La grille du fabricant est reprise sur chaque fiche.` },
        ...(total !== null ? [{ question: 'Combien coûte un jeu de protections complet ?', answer: `Au premier prix du rayon, protège-dents, casque, coquille et protège-tibias à pied couvert reviennent à ${money(total)}. Le prix médian du rayon est de ${money(f.mediane)}.` }] : []),
      ];
    },
    liens: [
      { titre: 'Les sous-rayons', liens: [{ href: '/protege-dents/', texte: 'protège-dents' }, { href: '/casques-de-boxe/', texte: 'casques de boxe' }, { href: '/protege-tibias/', texte: 'protège-tibias' }, { href: '/coquilles/', texte: 'coquilles et protections pelviennes' }] },
      { titre: 'Les guides', liens: [{ href: '/guides/choisir-protections/', texte: 'quelle protection pour quel sport' }, { href: '/guides/equipement-enfant/', texte: 'protéger un enfant' }, { href: '/guides/equipement-femme/', texte: 'l’équipement pour femme' }, { href: '/guides/casque-de-boxe-obligatoire/', texte: 'le casque est-il obligatoire ?' }, { href: '/guides/coquille-et-protege-poitrine/', texte: 'coquille et protège-poitrine : pour qui' }, { href: '/guides/protege-dents-appareil-dentaire/', texte: 'protège-dents avec un appareil dentaire' }] },
      { titre: 'Les rayons voisins', liens: [{ href: '/gants-de-boxe/', texte: 'gants de boxe' }, { href: '/materiel-boxe-thai/', texte: 'matériel de boxe thaï' }, { href: '/materiel-mma/', texte: 'matériel MMA' }, { href: '/materiel-boxe-competition/', texte: 'matériel de compétition' }] },
    ],
  },

  /* ---------------------------------------------------------------- textile de boxe (22/10) */
  {
    slug: 'textile-boxe',
    requete: 'textile boxe',
    revision: '2026-10-22',
    h1: 'Textile de boxe',
    eyebrow: 'TEXTILE BOXE · SHORTS, T-SHIRTS, RASHGUARDS, SWEATS',
    titre: ({ f }) => `Textile boxe : shorts, t-shirts, rashguards, ${fr(f.n)} modèles`,
    description: ({ f }) => `Textile boxe : ${fr(f.n)} modèles dès ${money(f.min)} : shorts anglais, thaï et MMA, t-shirts, rashguards, spats, sweats. La coupe par discipline, la taille par marque.`,
    label: ({ f, items }) => `${fr(f.n)} modèles, ${etendue(items, TAILLES_LETTRES.filter(([t]) => !['Junior', 'S/M', 'M/L', 'L/XL', 'Taille unique'].includes(t)))}, dès ${money(f.min)}.`,
    intro: 'Un short par discipline, long pour l’anglaise, court pour le muay-thaï, sans poche pour le MMA ; un haut qui sèche vite ; un sweat pour l’échauffement. La taille se lit dans la grille de chaque marque.',
    guide: {
      titre: 'Choisir sa tenue de boxe',
      chapeau: ({ f }) => `${fr(f.n)} pièces de ${f.marques.length} marques, de ${money(f.min)} à ${money(f.max)} : la coupe qui convient à votre discipline, la matière qui sèche, et la taille qui tient en mouvement.`,
      chapitres: [
        {
          titre: 'Le short dit la discipline',
          texte: [
            'Le short d’anglaise descend vers le genou et marque la ceinture, celle que l’adversaire n’a pas le droit de franchir ; le thaï s’arrête à mi-cuisse et s’ouvre sur les côtés pour le genou et le coup de pied ; le short MMA colle à la jambe, sans rien qui accroche au sol.',
            ({ items }) => `Au rayon : ${fr(compte(items, shortAnglais))} [shorts de boxe anglaise](/shorts-de-boxe-anglaise/), ${fr(compte(items, shortThai))} [shorts de boxe thaï](/shorts-de-boxe-thai/) et ${fr(compte(items, shortMMA))} [shorts MMA](/shorts-mma/), chacun avec sa page et ses conseils de taille.`,
          ],
        },
        {
          titre: 'Le haut : t-shirt, débardeur, rashguard',
          texte: [
            'Le t-shirt et le débardeur suffisent au sac et à la technique ; le débardeur est aussi la tenue de l’anglaise sur le ring. Le rashguard, près du corps, protège la peau des frottements du tapis et sèche vite : c’est le haut du grappling, du no-gi et du MMA, porté seul ou sous le kimono.',
            ({ items }) => {
              const r = items.filter((p) => rashguard(p) && p.price > 0);
              const courtes = r.filter((p) => /courtes/.test(spec(p, 'Manches'))).length;
              const longues = r.filter((p) => /longues/.test(spec(p, 'Manches'))).length;
              return `${fr(compte(items, tshirt))} t-shirts, ${fr(compte(items, debardeur))} débardeurs et ${fr(r.length)} rashguards, dont ${fr(courtes)} à manches courtes et ${fr(longues)} à manches longues d’après leur fiche.`;
            },
          ],
        },
        {
          titre: 'Les jambes : spats, pantalons, combinaison',
          texte: [
            'Les spats couvrent les jambes au sol, seuls ou sous le short. Le pantalon de jogging sert à l’échauffement ; le pantalon ajusté et la combinaison sont la tenue de la savate, où l’arbitre doit lire les touches.',
            ({ items }) => {
              const parts = [combien(items, spats, 'paire de spats ou legging', 'spats et leggings'), combien(items, pantalon, 'pantalon', 'pantalons'), combien(items, tenueSavate, 'tenue de savate', 'tenues de savate')].filter(Boolean);
              return `Au rayon : ${liste(parts as string[])}. La page [matériel de boxe française](/materiel-boxe-francaise/) dit ce que la savate demande en plus.`;
            },
          ],
        },
        {
          titre: 'Sweats, vestes, peignoirs',
          texte: [
            ({ items }) => {
              const s = items.filter((p) => sweat(p) && p.price > 0);
              const pe = items.filter((p) => peignoir(p) && p.price > 0);
              return `Le sweat se porte pour s’échauffer et pour rentrer ; le peignoir à capuche, pour monter sur le ring. ${fr(s.length)} sweats et vestes dès ${desDe(s)}${pe.length ? `, ${fr(pe.length)} peignoirs dès ${desDe(pe)}` : ''}.`;
            },
          ],
        },
        {
          titre: 'Femmes, enfants',
          texte: [
            ({ items }) => {
              const fe = items.filter((p) => femmeTextile(p) && p.price > 0);
              const en = items.filter((p) => enfant(p) && p.price > 0);
              return `${fr(fe.length)} pièces sont coupées pour les femmes, brassières comprises, dès ${desDe(fe)} ; les autres coupes sont mixtes et se prennent à la mesure. Pour les enfants, ${fr(en.length)} modèles, dès ${desDe(en)}, en tailles d’âge ou de stature.`;
            },
            'Les pages [matériel de boxe femme](/materiel-boxe-femme/) et [matériel de boxe enfant](/materiel-boxe-enfant/) réunissent ces coupes avec le reste de l’équipement.',
          ],
        },
        {
          titre: 'La taille se lit dans la grille de sa marque',
          texte: [
            'Un short se prend au tour de taille, un pantalon à la stature, un haut au tour de poitrine : la grille de la fiche fait foi, et une coupe thaïlandaise taille souvent une lettre en dessous d’une coupe européenne. Entre deux tailles, la plus grande pour un short, la plus ajustée pour un rashguard.',
            'Essayez en levant les bras et en fléchissant les jambes : la tenue doit rester en place sans qu’on y pense.',
          ],
        },
        {
          titre: 'Matières et séchage',
          texte: [
            ({ items }) => {
              const m = (re: RegExp) => items.filter((p) => re.test(matiere(p))).length;
              return `Le polyester sèche vite et tient les lavages ; le coton est plus doux mais garde l’humidité ; l’élasthanne donne l’aisance des rashguards et des spats. D’après les fiches, ${fr(m(/polyester/))} pièces contiennent du polyester, ${fr(m(/coton/))} du coton et ${fr(m(/lasthanne|lycra|spandex/))} une fibre élastique.`;
            },
          ],
        },
        {
          titre: 'Les marques du rayon',
          texte: [
            ({ f, items }) =>
              `Marque par marque : ${parMarque('textile-boxe', items, f, 6, (ps) => {
                const n = (t: (p: Product) => boolean) => ps.filter(t).length;
                return [n((p) => nom(p).startsWith('short')) ? pluriel(n((p) => nom(p).startsWith('short')), 'short', 'shorts') : '', n(tshirt) ? pluriel(n(tshirt), 't-shirt', 't-shirts') : '', n(rashguard) ? pluriel(n(rashguard), 'rashguard', 'rashguards') : '', n(sweat) ? pluriel(n(sweat), 'sweat ou veste', 'sweats et vestes') : '', n(debardeur) ? pluriel(n(debardeur), 'débardeur', 'débardeurs') : ''].filter(Boolean).join(', ');
              }, true)}.`,
          ],
        },
        {
          titre: 'Entretien',
          texte: ['Tout se lave à 30 °C, sur l’envers ; le rashguard et les spats n’aiment pas le sèche-linge, qui détend la fibre élastique. Arriver propre à chaque cours fait partie du matériel : une tenue lavée, sur le tapis plus qu’ailleurs.'],
        },
      ],
    },
    usages: {
      titre: 'Quelle pièce pour quelle discipline',
      note: 'Par besoin, la pièce la moins chère du rayon en taille adulte ; une pièce déjà citée passe la main à la suivante.',
      regles: [
        { usage: 'Boxe anglaise : le short', filtre: (p) => shortAnglais(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} shorts d’anglaise, longs et amples` },
        { usage: 'Boxe anglaise : le débardeur', filtre: (p) => debardeur(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} débardeurs` },
        { usage: 'Muay-thaï, kick : le short', filtre: (p) => shortThai(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} shorts thaï adultes, courts et fendus` },
        { usage: 'MMA, grappling : le short', filtre: (p) => shortMMA(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} parmi ${fr(n)} shorts MMA, ajustés et sans poche` },
        { usage: 'Sur le tapis : le haut', filtre: (p) => rashguard(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} rashguards adultes` },
        { usage: 'Sur le tapis : les jambes', filtre: (p) => spats(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} parmi ${fr(n)} spats et leggings du rayon` },
        { usage: 'Savate : la tenue', filtre: (p) => tenueSavate(p), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} tenues de boxe française` },
        { usage: 'S’échauffer', filtre: (p) => sweat(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} sweats et vestes` },
        { usage: 'Monter sur le ring', filtre: (p) => peignoir(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} peignoirs à capuche` },
        { usage: 'Femme : le haut', filtre: (p) => brassiere(p), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} brassières` },
        { usage: 'Enfant', filtre: (p) => enfant(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} modèles taillés pour l’enfant` },
      ],
    },
    tableau: ({ items }) =>
      tableauTypes(
        items,
        [
          ['Shorts de boxe anglaise', shortAnglais, '/shorts-de-boxe-anglaise/'],
          ['Shorts de boxe thaï', shortThai, '/shorts-de-boxe-thai/'],
          ['Shorts MMA', shortMMA, '/shorts-mma/'],
          ['T-shirts', tshirt, '/t-shirts-boxe/'],
          ['Débardeurs', debardeur, '/debardeurs-boxe/'],
          ['Rashguards', rashguard, '/rashguards/'],
          ['Spats, leggings, pantalons', (p) => spats(p) || pantalon(p), '/leggings/'],
          ['Sweats, vestes, peignoirs', (p) => sweat(p) || peignoir(p), '/sweats-boxe/'],
          ['Brassières', brassiere],
        ],
        'Le textile, type par type',
        'Comptes du catalogue du jour et premier prix TTC de chaque type.',
      ),
    faq: ({ f, items }) => {
      const prix = (t: (p: Product) => boolean) => premier(items.filter((p) => p.price > 0 && t(p)));
      const ang = prix((p) => shortAnglais(p) && adulte(p));
      const haut = prix((p) => tshirt(p) && adulte(p));
      const fe = items.filter((p) => femmeTextile(p) && p.price > 0);
      const en = items.filter((p) => enfant(p) && p.price > 0);
      return [
        { question: 'Quel short pour quelle boxe ?', answer: 'Long et ample pour la boxe anglaise, court et fendu pour le muay-thaï comme pour le kick-boxing ou le K-1, ajusté et sans poche pour le MMA et le grappling. Le short thaï sert aussi au sac, quelle que soit la boxe.' },
        { question: 'Comment choisir la taille d’un short de boxe ?', answer: 'Avec votre tour de taille reporté dans la grille de sa marque, jamais d’après votre taille habituelle : les coupes thaïlandaises taillent plus petit. Le short se porte à la taille, pas sur les hanches.' },
        { question: 'Le rashguard est-il obligatoire ?', answer: 'Pas partout, mais la plupart des salles de grappling et de JJB no-gi le demandent : il protège la peau et ne donne aucune prise. Sous le kimono, il tient lieu de sous-vêtement.' },
        { question: 'Un t-shirt en coton suffit-il à l’entraînement ?', answer: 'Au sac et en technique, oui. Dès que la séance fait transpirer longtemps, un polyester technique sèche sur vous ; le coton, lui, reste mouillé.' },
        { question: 'Que porter pour la savate ?', answer: 'Une tenue près du corps, pour que l’arbitre lise les touches : combinaison intégrale, ou pantalon ajusté et débardeur. Les gants sont ceux de la boxe anglaise ; les chaussures, propres à la savate.' },
        { question: 'Y a-t-il du textile pour les femmes ?', answer: `Oui : ${fr(fe.length)} pièces coupées pour elles, brassières, shorts, rashguards, sweats, dès ${desDe(fe)}. Le reste du rayon est mixte et se prend à la mesure, pas à l’étiquette.` },
        { question: 'Et pour les enfants ?', answer: `${fr(en.length)} modèles, dès ${desDe(en)} : ensembles short et débardeur, t-shirts, rashguards, shorts, en tailles d’âge ou de stature. La taille d’aujourd’hui, pas celle de l’an prochain.` },
        { question: 'Comment laver un rashguard ?', answer: 'À 30 °C, sur l’envers, sans adoucissant, puis à plat ou sur un cintre : le sèche-linge détend la fibre élastique et le rashguard perd son maintien.' },
        { question: 'Quelles marques au rayon ?', answer: `${marquesTexte(f, 6)}. Chaque marque a sa grille ; la fiche la reprend.` },
        ...(ang && haut ? [{ question: 'Combien coûte une tenue de boxe complète ?', answer: `Au premier prix du rayon, un short d’anglaise et un t-shirt reviennent à ${money(ang.price + haut.price)} ; le prix médian d’une pièce est de ${money(f.mediane)}.` }] : []),
      ];
    },
    liens: [
      { titre: 'Les sous-rayons', liens: [{ href: '/shorts-de-boxe-anglaise/', texte: 'shorts de boxe anglaise' }, { href: '/shorts-de-boxe-thai/', texte: 'short de boxe thaï' }, { href: '/shorts-mma/', texte: 'shorts MMA' }, { href: '/rashguards/', texte: 'rashguards' }, { href: '/t-shirts-boxe/', texte: 't-shirts' }, { href: '/sweats-boxe/', texte: 'sweats et vestes' }, { href: '/leggings/', texte: 'spats et pantalons' }] },
      { titre: 'Les guides', liens: [{ href: '/guide-des-tailles/', texte: 'lire une grille de tailles' }, { href: '/guides/equipement-femme/', texte: 'la coupe quand on est une femme' }, { href: '/guides/equipement-enfant/', texte: 'habiller un enfant pour le cours' }, { href: '/guides/short-de-boxe-quel-short-pour-quel-sport/', texte: 'quel short pour quel sport, et ce que la règle accepte' }] },
      { titre: 'Les rayons voisins', liens: [{ href: '/materiel-boxe/', texte: 'matériel de boxe' }, { href: '/materiel-mma/', texte: 'matériel MMA' }, { href: '/chaussures-boxe/', texte: 'chaussures de boxe' }, { href: '/materiel-boxe-femme/', texte: 'matériel de boxe femme' }] },
    ],
  },

  /* ---------------------------------------------------------------- boutique boxe (22/10) : tout le catalogue */
  {
    slug: 'boutique-boxe',
    requete: 'boutique boxe',
    revision: '2026-10-22',
    h1: 'Boutique boxe',
    // « matos boxe », seconde requête du concours pour cette page : dans le titre, le surtitre et un H2 (le titre du guide).
    eyebrow: 'BOUTIQUE BOXE · MATOS BOXE',
    titre: ({ f }) => `Boutique boxe : matos boxe, gants, sacs, MMA, ${fr(f.n)} modèles`,
    description: ({ f }) => `Boutique boxe en ligne, matos boxe : ${fr(f.n)} modèles dès ${money(f.min)}, gants, bandes, protections, sacs de frappe, textile, chaussures. Prix TTC, livraison en France.`,
    label: ({ f }) => `Toute la boutique : ${fr(f.n)} modèles de ${f.marques.length} marques, dès ${money(f.min)}.`,
    intro: 'Tout le matériel de boxe et de sports de combat, avec ses tailles réelles et ses prix TTC. Cherchez un modèle, une marque ou une famille ; le guide, sous la liste, dit ce que vend chaque rayon.',
    guide: {
      titre: 'Le matos boxe, rayon par rayon',
      chapeau: ({ f }) => `Une boutique de boxe en ligne, rien d’autre : ${fr(f.n)} modèles en dix rayons, ${f.marques.length} marques, de ${money(f.min)} à ${money(f.max)}. Ce que vend chaque rayon, par où commencer, comment commander.`,
      chapitres: [
        {
          titre: 'Une boutique en ligne, pas un club',
          texte: [
            'Boutique de Boxe vend du matériel, et seulement cela : ni cours, ni salle, ni planning. Chaque modèle a sa fiche, avec les tailles telles que la marque les publie, sa référence fabricant, ses couleurs et son prix de vente TTC.',
            'Rien n’y est inventé : pas de stock affiché, pas de remise barrée, pas d’avis fabriqué. Les notes sous les fiches viennent des visiteurs, sans vérification d’achat, et la [page des questions](/faq/#notes-des-produits) dit comment elles sont modérées.',
          ],
        },
        {
          titre: 'Ce que vend chaque rayon',
          texte: [
            ({ all }) => {
              const fam: [string, string, string][] = [['gants-de-boxe', 'les gants de boxe', '/gants-de-boxe/'], ['gants-mma', 'les gants MMA', '/gants-mma/'], ['protections-boxe', 'les protections', '/protections-boxe/'], ['textile-boxe', 'le textile', '/textile-boxe/'], ['accessoires-boxe', 'les accessoires', '/accessoires-boxe/'], ['chaussures-boxe', 'les chaussures', '/chaussures-boxe/'], ['equipement-entrainement', 'l’équipement d’entraînement', '/equipement-entrainement/'], ['arts-martiaux', 'les arts martiaux', '/arts-martiaux/'], ['sacs-de-sport', 'les sacs de sport', '/sacs-de-sport/']];
              const parts = fam.map(([s, l, href]) => {
                const ps = famille(all, s);
                return ps.length ? `[${l}](${href}), ${fr(ps.length)} modèles dès ${desDe(ps)}` : '';
              }).filter(Boolean);
              const sa = sacs(famille(all, 'sacs-de-frappe'));
              return `${liste(parts)} ; [les sacs de frappe](/sacs-de-frappe/), ${fr(sa.length)} sacs dès ${desDe(sa)}, se livrent sur devis avec leurs supports.`;
            },
          ],
        },
        {
          titre: 'Par où commencer',
          texte: [
            'En premier, ce qui vous appartient : des bandes et un protège-dents. Puis les gants, au poids que votre salle demande, et le short de votre boxe. Le casque, la coquille, les chaussures et le sac de frappe viennent quand la pratique s’installe.',
            'La page [matériel de boxe](/materiel-boxe/) chiffre le sac de chaque niveau, du premier cours au ring ; celle du [matériel de boxe débutant](/materiel-boxe-debutant/) ne garde que les trois pièces du départ.',
          ],
        },
        {
          titre: 'Les boxes et les sports de combat couverts',
          texte: [
            ({ all }) => {
              const d = (k: string) => all.filter((p) => (p.disciplines || []).includes(k)).length;
              return `Boxe anglaise, muay-thaï, kick-boxing, savate, MMA, jiu-jitsu brésilien, karaté, judo, taekwondo, krav maga : chaque discipline a sa page d’entrée, avec ce qu’elle demande d’abord. D’après les fiches, ${fr(d('boxe-thai'))} modèles sont classés boxe thaï, ${fr(d('boxe-anglaise'))} boxe anglaise, ${fr(d('mma'))} MMA et ${fr(d('jjb'))} jiu-jitsu brésilien.`;
            },
            'Voir la [boxe thaï](/materiel-boxe-thai/), puis le [kick-boxing](/materiel-kick-boxing/), la [savate](/materiel-boxe-francaise/), le [MMA](/materiel-mma/), le [JJB](/equipement-jjb/) et les [arts martiaux](/boutique-arts-martiaux/).',
          ],
        },
        {
          titre: 'Les marques',
          texte: [({ f }) => `${marquesTexte(f, 8)} sont les plus présentes, parmi ${fr(f.marques.length)} marques. Chacune garde sa grille de tailles, reprise telle quelle sur la fiche : rien n’est converti d’une marque à l’autre, et chaque [marque a sa page](/marques/).`],
        },
        {
          titre: 'Commander, payer, être livré',
          texte: [
            () => `Le panier se paie par carte sur la page sécurisée de PayPlug ; la commande part sous ${shop.delais.expedition}. Livraison en ${livraison.zone}, ${livraison.tarifs}. Le matériel lourd se livre à domicile sur devis ; ${livraison.horsZone}.`,
            'Quatorze jours après la réception pour changer d’avis : la page [retours et échanges](/retours/) dit comment faire.',
          ],
        },
        {
          titre: 'Les prix',
          texte: [
            ({ f }) => `Les prix sont des prix de vente, toutes taxes comprises, hors livraison. Quand une marque fait varier le prix selon la taille, la carte dit « dès » et la fiche donne chaque prix. Au catalogue, la moitié des modèles coûte moins de ${money(f.mediane)} ; l’[observatoire des prix](/observatoire-des-prix/) suit ces chiffres chaque semaine.`,
          ],
        },
      ],
    },
    usages: {
      titre: 'Un premier achat par rayon',
      note: 'Pour chaque rayon, le modèle adulte le moins cher qui remplit son rôle, tout le catalogue confondu.',
      regles: [
        { usage: 'Gants de boxe', filtre: (p) => gantBoxe(p) && adulte(p) && ouncesOf(p).includes(12) && velcro(p), critere: ({ i, n }) => `${rang(i)} au catalogue parmi ${fr(n)} gants adultes de 12 oz à velcro` },
        { usage: 'Bandes', filtre: (p) => bandes(p) && longueur(p) === 4.5, critere: ({ i, n }) => `${rang(i, 'f')} au catalogue parmi ${fr(n)} paires de 4,50 m` },
        { usage: 'Protège-dents', filtre: (p) => protegeDents(p) && adulte(p) && !propose(p, /junior|enfant/i), critere: ({ i, n }) => `${rang(i)} au catalogue parmi ${fr(n)} protège-dents adultes` },
        { usage: 'Short', filtre: (p) => shortAnglais(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} au catalogue parmi ${fr(n)} shorts d’anglaise` },
        { usage: 'Chaussures', filtre: (p) => p.category === 'chaussures-boxe' && nom(p).startsWith('chaussures de boxe') && adulte(p), critere: ({ i, n }) => `${rang(i, 'f')} au catalogue parmi ${fr(n)} paires de chaussures de boxe` },
        { usage: 'Sac de frappe', filtre: (p) => surPied(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} au catalogue parmi ${fr(n)} sacs sur pied, sans rien à percer` },
        { usage: 'Gants MMA', filtre: (p) => gantMMA(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} au catalogue parmi ${fr(n)} gants à doigts libres` },
        { usage: 'Rashguard', filtre: (p) => rashguard(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} au catalogue parmi ${fr(n)} rashguards adultes` },
        { usage: 'Kimono', filtre: (p) => kimonoJJB(p), critere: ({ i, n }) => `${rang(i)} au catalogue parmi ${fr(n)} kimonos de jiu-jitsu brésilien` },
        { usage: 'Corde à sauter', filtre: (p) => cordeASauter(p), critere: ({ i, n }) => `${rang(i, 'f')} au catalogue parmi ${fr(n)} cordes à sauter` },
      ],
    },
    tableau: ({ all }) => {
      const fam: [string, string][] = [['gants-de-boxe', 'Gants de boxe'], ['gants-mma', 'Gants MMA'], ['protections-boxe', 'Protections'], ['textile-boxe', 'Textile'], ['accessoires-boxe', 'Accessoires'], ['sacs-de-frappe', 'Sacs de frappe'], ['chaussures-boxe', 'Chaussures'], ['equipement-entrainement', 'Équipement d’entraînement'], ['arts-martiaux', 'Arts martiaux'], ['sacs-de-sport', 'Sacs de sport']];
      const lignes: Cellule[][] = fam
        .map(([slug, libelle]) => {
          const ps = slug === 'sacs-de-frappe' ? sacs(famille(all, slug)) : famille(all, slug);
          const s = ps.map((p) => p.price).sort((a, b) => a - b);
          const marques = new Set(ps.map((p) => p.brand.trim().toLowerCase()).filter((b) => b && !NI_MARQUE.test(b))).size;
          return s.length ? [{ texte: libelle, href: '/' + slug + '/' }, fr(s.length), fr(marques), money(s[0]), money(s[Math.floor(s.length / 2)])] : null;
        })
        .filter(nonNul);
      return { titre: 'Les dix rayons de la boutique', colonnes: ['Rayon', 'Modèles', 'Marques', 'Dès', 'Prix médian'], lignes, note: 'Prix de vente du jour. Seuls les sacs comptent sur la ligne des sacs de frappe ; les semelles ne sont pas des chaussures.' };
    },
    faq: ({ f }) => [
      { question: 'Matos boxe : que trouve-t-on dans cette boutique ?', answer: `Tout ce qu’une séance demande : bandes, gants du 4 au 20 oz, protège-dents, casque, protège-tibias, short, chaussures, sac de frappe et corde, soit ${fr(f.n)} modèles de ${fr(f.marques.length)} marques, livrés dans toute la ${livraison.zone}.` },
      { question: 'Boutique de Boxe est-elle liée à un club ?', answer: 'Non. C’est une boutique en ligne indépendante de matériel de boxe et de sports de combat, ouverte à tous les pratiquants, sans cours ni salle. L’éditeur est nommé dans les mentions légales.' },
      { question: 'Peut-on commander en ligne et payer par carte ?', answer: `Oui, depuis le ${shop.ouverture.long} : les prix affichés sont les prix de vente TTC, et le paiement se fait par carte sur la page sécurisée de PayPlug, jamais sur la boutique elle-même.` },
      { question: 'Livrez-vous partout en France ?', answer: `Dans toute la ${livraison.zone}, à domicile ou en point relais : ${livraison.tarifs}. Le matériel lourd se livre sur devis ; ${livraison.horsZone}.` },
      { question: 'Combien de temps pour recevoir sa commande ?', answer: `La commande part sous ${shop.delais.expedition} après le paiement ; la livraison arrive au plus tard sous ${shop.delais.livraisonMax}. Si un modèle manque, vous êtes prévenu avant tout envoi.` },
      { question: 'Peut-on renvoyer un article ?', answer: 'Oui, pendant quatorze jours après la réception, non utilisé et dans son emballage ; un protège-dents descellé fait exception, pour l’hygiène. Pour changer de taille, écrivez-nous avec votre numéro de commande.' },
      { question: 'Les prix affichés sont-ils définitifs ?', answer: 'Ce sont les prix de vente TTC, hors livraison ; le prix payé est celui affiché au moment de la commande, les frais de livraison s’ajoutent dans le panier avant le paiement.' },
      { question: 'Quelles marques vend la boutique ?', answer: `${marquesTexte(f, 8)}, parmi ${fr(f.marques.length)} marques ; chacune a sa page et sa grille de tailles.` },
      { question: 'Comment trouver un modèle précis ?', answer: 'Par la recherche en haut de page, par le rayon, par la marque ou par la discipline. Chaque fiche donne la référence fabricant : elle sert à comparer avec une autre boutique.' },
    ],
    liens: [
      { titre: 'Les rayons', liens: [{ href: '/gants-de-boxe/', texte: 'gants de boxe' }, { href: '/protections-boxe/', texte: 'protections' }, { href: '/textile-boxe/', texte: 'textile' }, { href: '/sacs-de-frappe/', texte: 'sacs de frappe' }, { href: '/accessoires-boxe/', texte: 'accessoires' }] },
      { titre: 'Par discipline', liens: [{ href: '/materiel-boxe/', texte: 'matériel de boxe' }, { href: '/materiel-mma/', texte: 'matériel MMA' }, { href: '/boutique-arts-martiaux/', texte: 'boutique arts martiaux' }, { href: '/materiel-sport-de-combat/', texte: 'matériel sport de combat' }] },
      { titre: 'La boutique', liens: [{ href: '/vente-materiel-de-boxe/', texte: 'comment se passe la vente' }, { href: '/livraison/', texte: 'livraison et délais' }, { href: '/retours/', texte: 'retours et échanges' }, { href: '/boutique-sport-de-combat/', texte: 'boutique sport de combat en France' }] },
    ],
  },

  /* ---------------------------------------------------------------- boutique arts martiaux (22/10) : tenues et protections */
  {
    slug: 'boutique-arts-martiaux',
    requete: 'boutique arts martiaux',
    revision: '2026-10-22',
    h1: 'Boutique arts martiaux',
    eyebrow: 'BOUTIQUE ARTS MARTIAUX · KIMONOS, CEINTURES, PROTECTIONS',
    titre: ({ f }) => `Boutique arts martiaux : kimonos, ceintures, ${fr(f.n)} modèles`,
    description: ({ f }) => `Boutique arts martiaux en ligne : ${fr(f.n)} modèles dès ${money(f.min)}, kimonos de JJB, judo et karaté, doboks, ceintures, protections. Tailles par marque, prix TTC.`,
    label: ({ f }) => `${fr(f.n)} modèles, dès ${money(f.min)} : le kimono, la ceinture et les protections.`,
    intro: 'Le kimono à sa taille et la ceinture blanche pour commencer ; les protections, protège-tibias, protège-pieds, casque, quand le combat arrive. Chaque art martial a sa tenue : le guide les distingue.',
    guide: {
      titre: 'S’équiper pour son art martial',
      chapeau: ({ f }) => `${fr(f.n)} modèles et ${f.marques.length} marques, entre ${money(f.min)} et ${money(f.max)} : le kimono selon la discipline, la ceinture selon le grade, les protections selon le contact.`,
      chapitres: [
        {
          titre: 'Un kimono par discipline',
          texte: [
            'Le gi de jiu-jitsu brésilien est coupé près du corps et tissé serré, pour ne rien laisser saisir ; le kimono de judo, plus ample et plus lourd, encaisse les prises ; celui de karaté est léger, pour la vitesse. Le dobok de taekwondo se reconnaît à son col en V, le hakama à sa jupe-pantalon plissée.',
            ({ items }) => {
              const parts = [combien(items, kimonoJJB, 'kimono de JJB', 'kimonos de JJB'), combien(items, kimonoJudo, 'kimono de judo', 'kimonos de judo'), combien(items, kimonoKarate, 'kimono de karaté', 'kimonos de karaté'), combien(items, dobok, 'dobok', 'doboks'), combien(items, hakama, 'hakama', 'hakamas')].filter(Boolean);
              return `Au rayon : ${liste(parts as string[])}. Les [kimonos de JJB](/kimonos-jjb/) ont leur page, grammage par grammage.`;
            },
          ],
        },
        {
          titre: 'La taille : A pour le JJB, centimètres ailleurs',
          texte: [
            ({ items }) => {
              const cm = centimetres(items.filter((p) => kimono(p) || dobok(p) || hakama(p)));
              const a = ['A0', 'A1', 'A2', 'A3', 'A4'].filter((x) => items.some((p) => kimonoJJB(p) && tailles(p).some((s) => s.toUpperCase().startsWith(x))));
              return `Le gi de JJB se taille de ${a[0]} à ${a[a.length - 1]}, d’après la stature et le poids ; judo, karaté et taekwondo se taillent à la stature, en centimètres${cm ? `, entre ${cm[0]} et ${cm[1]} cm dans ce rayon` : ''}. Dans tous les cas, la grille de la marque fait foi, et un enfant prend sa taille du jour.`;
            },
          ],
        },
        {
          titre: 'La ceinture',
          texte: [
            ({ items }) => {
              const c = items.filter((p) => ceintureGrade(p) && p.price > 0);
              const couleurs = [...new Set(c.flatMap((p) => p.colors || []))];
              return `On commence en blanche ; les suivantes se gagnent, et c’est le professeur qui les remet. ${c.length ? `${fr(c.length)} ceintures de JJB au rayon, à ${desDe(c)}${couleurs.length ? `, en ${liste(couleurs)}` : ''}, taillées comme le kimono, de A0 à A4.` : 'Chaque fiche donne la longueur de la ceinture.'}`;
            },
          ],
        },
        {
          titre: 'Les protections des arts martiaux',
          texte: [
            'Au karaté, un protège-tibia fin ou en coton et des protège-pieds suffisent souvent ; le taekwondo ajoute le plastron et les protège-avant-bras ; le jiu-jitsu brésilien demande peu, un protège-dents et parfois un protège-oreilles. Ce que le club impose décide, pas le catalogue.',
            ({ items }) => {
              const parts = [combien(items, (p) => tibias(p) && (enCoton(p) || tibiaSeul(p)), 'protège-tibia fin ou en coton', 'protège-tibias fins ou en coton'), combien(items, protegePieds, 'protège-pieds', 'protège-pieds'), combien(items, plastron, 'plastron', 'plastrons'), combien(items, avantBras, 'protège-avant-bras de taekwondo', 'protège-avant-bras de taekwondo'), combien(items, casque, 'casque', 'casques'), combien(items, protegeDents, 'protège-dents', 'protège-dents')].filter(Boolean);
              return `Au rayon des protections : ${liste(parts as string[])}.`;
            },
          ],
        },
        {
          titre: 'Armes d’entraînement et casse',
          texte: [
            ({ items }) => {
              const a = items.filter((p) => armeEntrainement(p) && p.price > 0);
              return a.length ? `Pour la self-défense et le travail des formes : ${liste(a.map((p) => `${citeModele(p)} à ${money(p.price)}`))}. Des répliques inoffensives, plastique ou mousse, réservées au cours encadré.` : 'Les armes d’entraînement sont au rayon des arts martiaux.';
            },
          ],
        },
        {
          titre: 'Sans kimono : rashguard et spats',
          texte: [
            ({ all }) => `En no-gi et en grappling, la tenue change : un rashguard et un short sans poche ou des spats. Le catalogue compte ${fr(all.filter((p) => rashguard(p) && p.price > 0).length)} rashguards et ${fr(all.filter((p) => spats(p) && p.price > 0).length)} spats et leggings ; la page [équipement JJB](/equipement-jjb/) réunit les deux tenues.`,
          ],
        },
        {
          titre: 'Laver un kimono',
          texte: ['Un kimono en coton se lave à l’eau froide et sèche sur un cintre ; au sèche-linge, il perd une taille. Le ripstop bouge moins. La ceinture s’aère entre deux cours et se lave rarement.'],
        },
        {
          titre: 'Les marques du rayon',
          texte: [
            ({ f, items }) =>
              `Marque par marque : ${parMarque('boutique-arts-martiaux', items, f, 6, (ps) => {
                const n = (t: (p: Product) => boolean) => ps.filter(t).length;
                return [n(kimono) ? pluriel(n(kimono), 'kimono', 'kimonos') : '', n(ceintureGrade) ? pluriel(n(ceintureGrade), 'ceinture', 'ceintures') : '', n(dobok) ? pluriel(n(dobok), 'dobok', 'doboks') : '', n((p) => p.category === 'protections-boxe') ? pluriel(n((p) => p.category === 'protections-boxe'), 'protection', 'protections') : ''].filter(Boolean).join(', ');
              }, true)}.`,
          ],
        },
      ],
    },
    usages: {
      titre: 'Quelle pièce pour quel art martial',
      note: 'Par ligne, le prix le plus bas du rayon qui convient, en taille adulte sauf mention.',
      regles: [
        { usage: 'JJB : le gi', filtre: (p) => kimonoJJB(p), critere: ({ i, n }) => `${rang(i)} parmi ${fr(n)} gis de jiu-jitsu brésilien` },
        { usage: 'JJB : la ceinture', filtre: (p) => ceintureGrade(p), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} ceintures` },
        { usage: 'Judo', filtre: (p) => kimonoJudo(p) && !bebe(p), critere: ({ i, n }) => (n === 1 ? 'le seul kimono de judo adulte' : `${rang(i)} des ${fr(n)} kimonos de judo, celui pour bébé à part`) },
        { usage: 'Karaté', filtre: (p) => kimonoKarate(p) && !bebe(p), critere: ({ i, n }) => (n === 1 ? 'le seul kimono de karaté adulte' : `${rang(i)} des ${fr(n)} kimonos de karaté`) },
        { usage: 'Taekwondo : le dobok', filtre: (p) => dobok(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} doboks` },
        { usage: 'Taekwondo : le plastron', filtre: (p) => plastron(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} plastrons` },
        { usage: 'Aïkido : le hakama', filtre: (p) => hakama(p), critere: ({ i, n }) => (n === 1 ? 'le seul hakama du rayon' : `${rang(i)} des ${fr(n)} hakamas`) },
        { usage: 'Tout-petits', filtre: (p) => bebe(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} kimonos pour bébé` },
        { usage: 'Karaté : les tibias', filtre: (p) => tibias(p) && enCoton(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} protège-tibias en coton` },
        { usage: 'Self-défense', filtre: (p) => /^(tanto|couteau)/.test(nom(p)), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} armes d’entraînement` },
      ],
    },
    tableau: ({ items }) =>
      tableauTypes(
        items,
        [
          ['Kimonos de JJB', kimonoJJB, '/kimonos-jjb/'],
          ['Kimonos de judo et de karaté', (p) => kimonoJudo(p) || kimonoKarate(p), '/kimonos/'],
          ['Doboks et hakama', (p) => dobok(p) || hakama(p)],
          ['Ceintures', ceintureGrade, '/ceintures/'],
          ['Armes d’entraînement', armeEntrainement],
          ['Protège-tibias et protège-pieds', (p) => tibias(p) || protegePieds(p), '/protege-tibias/'],
          ['Casques', casque, '/casques-de-boxe/'],
          ['Protège-dents', protegeDents, '/protege-dents/'],
          ['Plastrons, coquilles, maintiens', (p) => plastron(p) || coquille(p) || articulation(p)],
        ],
        'La boutique, type par type',
        'Nombre de modèles du jour et premier prix TTC par type.',
      ),
    faq: ({ f, items }) => {
      const prix = (t: (p: Product) => boolean) => premier(items.filter((p) => p.price > 0 && t(p)));
      const kk = prix((p) => kimonoKarate(p) && !bebe(p));
      const pd = prix((p) => protegeDents(p) && adulte(p) && !propose(p, /junior|enfant/i));
      const kids = items.filter((p) => p.price > 0 && (bebe(p) || enfant(p) || dobok(p)));
      return [
        { question: 'Quel kimono pour débuter ?', answer: 'Celui de votre discipline, à votre taille, en blanc : un gi de JJB pour le jiu-jitsu brésilien, un kimono de judo ou de karaté pour ces deux-là, un dobok pour le taekwondo. Beaucoup de clubs en prêtent un à l’essai.' },
        { question: 'Quelle taille de kimono prendre ?', answer: 'Dans la grille de la marque : par stature et poids pour les tailles A du JJB, par stature en centimètres pour le judo, le karaté et le taekwondo. Un kimono en coton rétrécit un peu au premier lavage.' },
        { question: 'Judo, karaté, JJB : les kimonos sont-ils interchangeables ?', answer: 'Pour essayer un cours, oui. Pour pratiquer, non : le judo veut une veste lourde qui résiste aux prises, le karaté une toile légère, le JJB une coupe ajustée que l’adversaire ne saisit pas.' },
        { question: 'Faut-il acheter sa ceinture ?', answer: 'La blanche, oui, si elle n’est pas vendue avec le kimono ; la fiche le précise. Les couleurs suivantes se gagnent et sont remises par le professeur.' },
        { question: 'Quelles protections pour le karaté ?', answer: 'Un protège-dents, des protège-tibias fins et des protège-pieds, une coquille pour les hommes ; le casque et le plastron selon la fédération et l’âge. Le club donne la liste.' },
        { question: 'Y a-t-il des kimonos pour les enfants ?', answer: `Oui : ${fr(kids.length)} modèles, dès ${desDe(kids)}, du kimono pour bébé aux doboks en centimètres. On achète à la taille d’aujourd’hui : un kimono trop grand gêne la prise.` },
        { question: 'Comment laver un kimono ?', answer: 'À l’eau froide, puis séchage sur un cintre, jamais au sèche-linge, surtout pour le coton. Le ripstop supporte mieux la machine.' },
        { question: 'Quelles marques trouve-t-on ?', answer: `${marquesTexte(f, 6)}. Chaque marque a sa grille, reprise sur la fiche.` },
        ...(kk && pd ? [{ question: 'Combien coûte un premier équipement d’arts martiaux ?', answer: `Au premier prix du rayon, un kimono de karaté et un protège-dents reviennent à ${money(kk.price + pd.price)} ; un gi de JJB avec sa ceinture, à ${money((prix(kimonoJJB)?.price || 0) + (prix(ceintureGrade)?.price || 0))}.` }] : []),
      ];
    },
    liens: [
      { titre: 'Les sous-rayons', liens: [{ href: '/kimonos/', texte: 'kimonos' }, { href: '/kimonos-jjb/', texte: 'kimonos de JJB' }, { href: '/ceintures/', texte: 'ceintures' }, { href: '/equipement-jjb/', texte: 'équipement JJB et grappling' }] },
      { titre: 'Les guides', liens: [{ href: '/guides/choisir-protections/', texte: 'les protections de chaque sport' }, { href: '/guide-des-tailles/', texte: 'lire une grille de tailles' }, { href: '/les-arts-martiaux/', texte: 'les arts martiaux et leurs dojos' }] },
      { titre: 'Les rayons voisins', liens: [{ href: '/arts-martiaux/', texte: 'matériel d’arts martiaux' }, { href: '/protections-boxe/', texte: 'protections' }, { href: '/materiel-mma/', texte: 'matériel MMA' }, { href: '/rashguards/', texte: 'rashguards' }] },
    ],
  },

  /* ---------------------------------------------------------------- matériel d’arts martiaux (22/10) : le rayon des tenues */
  {
    slug: 'arts-martiaux',
    requete: 'matériel arts martiaux',
    revision: '2026-10-22',
    h1: 'Matériel d’arts martiaux',
    eyebrow: 'MATÉRIEL ARTS MARTIAUX · KIMONOS, CEINTURES, ARMES',
    titre: ({ f }) => `Matériel arts martiaux : kimonos, ceintures, ${fr(f.n)} modèles`,
    description: ({ f }) => `Matériel arts martiaux : ${fr(f.n)} modèles dès ${money(f.min)}, kimonos de JJB, judo et karaté, doboks, hakama, ceintures, armes d’entraînement. Tissage, grammage, tailles.`,
    label: ({ f }) => `${fr(f.n)} modèles, dès ${money(f.min)} : kimonos, ceintures, armes d’entraînement.`,
    intro: 'Le rayon des tenues et de ce qui les accompagne : kimonos de jiu-jitsu brésilien, de judo et de karaté, doboks, hakama, ceintures, armes d’entraînement. Les protections sont au rayon voisin.',
    guide: {
      titre: 'Lire un kimono avant de l’acheter',
      chapeau: ({ f }) => `${fr(f.n)} modèles de ${f.marques.length} marques, de ${money(f.min)} à ${money(f.max)} : le tissage, le grammage et la coupe de chaque tenue, puis la ceinture et les armes d’entraînement.`,
      chapitres: [
        {
          titre: 'Tissage et grammage',
          texte: [
            'Le chiffre du nom, 350 ou 450, est le poids du tissu au mètre carré : le premier sèche vite et se porte l’été, le second résiste mieux aux saisies et pèse davantage sur les épaules. Le ripstop, reconnaissable à son quadrillage, arrête les déchirures ; le coton tissé serré est la toile classique.',
            ({ items }) => {
              const m = (re: RegExp) => items.filter((p) => re.test(matiere(p))).length;
              return `D’après les fiches, ${fr(m(/ripstop/))} tenues contiennent du ripstop, ${fr(m(/coton/))} du coton et ${fr(m(/polyester/))} du polyester, en mélange ou seul.`;
            },
          ],
        },
        {
          titre: 'La coupe selon l’art',
          texte: [
            'Le gi de jiu-jitsu brésilien colle au corps, manches et jambes courtes, pour ne rien offrir à saisir. Le kimono de judo a des revers épais et une veste ample, faits pour être agrippés. Le karaté veut une toile légère et large, qui claque. Le dobok s’enfile par la tête, col en V ; le hakama se noue par-dessus la veste, pour l’aïkido et le kendo.',
          ],
        },
        {
          titre: 'Les tailles : A0 à A4, ou la stature en centimètres',
          texte: [
            ({ items }) => {
              const cm = centimetres(items.filter((p) => kimono(p) || dobok(p) || hakama(p)));
              const parts = ['A0', 'A1', 'A2', 'A3', 'A4'].map((x) => [x, items.filter((p) => kimonoJJB(p) && p.price > 0 && tailles(p).some((s) => s.toUpperCase().startsWith(x))).length] as const).filter(([, n]) => n > 0);
              return `Les kimonos de JJB se taillent en A, d’après la stature et le poids du tableau de la marque : ${liste(parts.map(([x, n]) => `${x} sur ${fr(n)} modèles`))}. Les autres tenues se prennent à la stature${cm ? `, de ${cm[0]} à ${cm[1]} cm au rayon` : ''} ; les L du JJB allongent la coupe sans l’élargir.`;
            },
          ],
        },
        {
          titre: 'Les ceintures',
          texte: [
            ({ items }) => {
              const c = items.filter((p) => ceintureGrade(p) && p.price > 0);
              return `La ceinture suit le grade, de la blanche à la noire, et elle se choisit à la taille du kimono. ${c.length ? `${fr(c.length)} ceintures de JJB, toutes à ${desDe(c)}, de A0 à A4, en coton.` : 'Chaque fiche donne la longueur.'} Un kimono n’est pas toujours vendu avec la sienne : la fiche le dit quand la marque le précise.`;
            },
          ],
        },
        {
          titre: 'Les armes d’entraînement',
          texte: [
            ({ items }) => {
              const a = items.filter((p) => armeEntrainement(p) && p.price > 0);
              return a.length ? `Répliques en plastique ou en mousse pour le travail des défenses, planche de casse pour les enfants qui apprennent la frappe au karaté et au taekwondo, étui pour transporter le tout : ${liste(a.map((p) => `${citeModele(p)} (${money(p.price)})`))}. Pour la pratique encadrée, jamais ailleurs.` : 'Les armes d’entraînement arrivent avec la pratique encadrée.';
            },
          ],
        },
        {
          titre: 'Tout-petits et enfants',
          texte: [
            ({ items }) => {
              const b = items.filter((p) => bebe(p) && p.price > 0);
              const d = items.filter((p) => dobok(p) && p.price > 0);
              const cm = centimetres(d);
              return `${b.length ? `${pluriel(b.length, 'kimono pour bébé', 'kimonos pour bébé')}, à ${desDe(b)}, pour les cours d’éveil` : 'Les kimonos d’éveil se prennent à la stature'} ; les doboks${cm ? `, de ${cm[0]} à ${cm[1]} cm,` : ''} suivent la stature de l’enfant. Comme pour les gants, on prend la taille du jour.`;
            },
          ],
        },
        {
          titre: 'Les marques du rayon',
          texte: [
            ({ f, items }) =>
              `Marque par marque : ${parMarque('arts-martiaux', items, f, 6, (ps) => {
                const n = (t: (p: Product) => boolean) => ps.filter(t).length;
                return [n(kimonoJJB) ? pluriel(n(kimonoJJB), 'gi de JJB', 'gis de JJB') : '', n((p) => kimonoJudo(p) || kimonoKarate(p)) ? pluriel(n((p) => kimonoJudo(p) || kimonoKarate(p)), 'kimono de judo ou de karaté', 'kimonos de judo et de karaté') : '', n(dobok) ? pluriel(n(dobok), 'dobok', 'doboks') : '', n(ceintureGrade) ? pluriel(n(ceintureGrade), 'ceinture', 'ceintures') : '', n(armeEntrainement) ? pluriel(n(armeEntrainement), 'arme d’entraînement', 'armes d’entraînement') : ''].filter(Boolean).join(', ');
              }, true)}.`,
          ],
        },
        {
          titre: 'Entretien et durée',
          texte: ['Le coton rétrécit au premier lavage chaud : eau froide, cintre, pas de sèche-linge. Le ripstop garde sa taille. Lavez après chaque cours : un kimono porté deux fois sans lavage sent, et le tapis le sait. La ceinture, elle, s’aère.'],
        },
      ],
    },
    usages: {
      titre: 'Quelle tenue pour quelle pratique',
      note: 'Le modèle le moins cher du rayon qui remplit la condition, lue dans son nom ou ses tailles.',
      regles: [
        { usage: 'Premier gi de JJB', filtre: (p) => kimonoJJB(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} gis de JJB du rayon` },
        { usage: 'JJB, tissu épais', filtre: (p) => kimonoJJB(p) && grammage(p) === 450, critere: ({ i, n }) => `${rang(i)} parmi ${fr(n)} gis tissés en 450 g/m², les plus durs à saisir` },
        { usage: 'Judo', filtre: (p) => kimonoJudo(p) && !bebe(p), critere: ({ i, n }) => (n === 1 ? 'le seul kimono de judo adulte' : `${rang(i)} des kimonos de judo hors bébé`) },
        { usage: 'Karaté', filtre: (p) => kimonoKarate(p) && !bebe(p), critere: ({ i, n }) => (n === 1 ? 'le seul kimono de karaté adulte' : `${rang(i)} des ${fr(n)} kimonos de karaté`) },
        { usage: 'Taekwondo', filtre: (p) => dobok(p), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} doboks` },
        { usage: 'Aïkido, kendo', filtre: (p) => hakama(p), critere: ({ i, n }) => (n === 1 ? 'le seul hakama du rayon' : `${rang(i)} des ${fr(n)} hakamas`) },
        { usage: 'Bébé, éveil', filtre: (p) => bebe(p), critere: ({ i, n }) => `${rang(i)} parmi ${fr(n)} kimonos taillés pour bébé` },
        { usage: 'La ceinture', filtre: (p) => ceintureGrade(p), critere: ({ i, n }) => `${rang(i, 'f')} des ${fr(n)} ceintures` },
        { usage: 'Défenses au couteau', filtre: (p) => /^(tanto|couteau)/.test(nom(p)), critere: ({ i, n }) => `${rang(i)} des ${fr(n)} couteaux d’entraînement` },
        { usage: 'La casse', filtre: (p) => nom(p).startsWith('planche de rupture'), critere: ({ i, n }) => (n === 1 ? 'la seule planche de casse du rayon' : `${rang(i, 'f')} des ${fr(n)} planches de casse`) },
      ],
    },
    tableau: ({ items }) =>
      tableauTypes(
        items,
        [
          ['Kimonos de JJB', kimonoJJB, '/kimonos-jjb/'],
          ['Kimonos de judo', kimonoJudo],
          ['Kimonos de karaté', kimonoKarate],
          ['Doboks', dobok],
          ['Hakama', hakama],
          ['Ceintures', ceintureGrade, '/ceintures/'],
          ['Armes d’entraînement et casse', armeEntrainement],
        ],
        'Le rayon, tenue par tenue',
        'Comptes du jour ; premier prix de vente TTC par tenue.',
      ),
    faq: ({ f, items }) => {
      const a = items.filter((p) => armeEntrainement(p) && p.price > 0);
      const kids = items.filter((p) => p.price > 0 && (bebe(p) || dobok(p) || nom(p).startsWith('planche')));
      const sansCeinture = items.filter((p) => kimono(p) && /non incluse/i.test(p.specs?.['Ceinture'] || '')).length;
      return [
        { question: 'Quelle différence entre un kimono de judo et un kimono de karaté ?', answer: 'Le poids et la coupe. Le judo se saisit : veste lourde, revers épais, coutures renforcées. Le karaté frappe sans saisir : toile légère, veste ample, pantalon large pour les coups de pied.' },
        { question: 'Que veulent dire 350 et 450 sur un kimono de JJB ?', answer: 'Le poids du tissu de la veste, en grammes par mètre carré. 350 : léger, sèche vite, pour débuter et pour l’été. 450 : plus épais, plus difficile à saisir, plus chaud.' },
        { question: 'Comment choisir la taille d’un dobok ou d’un kimono en centimètres ?', answer: 'À la stature, dans la grille de la marque : la taille correspond à la hauteur du pratiquant. Entre deux, la plus grande si le tissu est en coton, qui rétrécit au lavage.' },
        { question: 'Le kimono est-il vendu avec la ceinture ?', answer: `Pas toujours${sansCeinture ? ` : ${pluriel(sansCeinture, 'fiche le précise', 'fiches le précisent')} explicitement, « ceinture non incluse »` : ''}. Quand la marque ne le dit pas, comptez sans, et prenez une ceinture blanche à part.` },
        { question: 'Un kimono rétrécit-il au lavage ?', answer: 'Le coton, oui, surtout au premier lavage chaud ; le ripstop presque pas. Lavez froid, séchez sur un cintre, et prenez la taille au-dessus si vous hésitez.' },
        ...(a.length ? [{ question: 'Quelles armes d’entraînement sont au rayon ?', answer: `${liste(a.map((p) => citeModele(p)))} : des copies en plastique ou en mousse, faites pour répéter les défenses et la casse, jamais pour autre chose.` }] : []),
        { question: 'Y a-t-il des tenues pour les enfants ?', answer: `Oui : ${fr(kids.length)} modèles, dès ${desDe(kids)}, du kimono pour bébé au dobok en centimètres, avec une planche de casse pour les plus jeunes.` },
        { question: 'Quelles marques trouve-t-on ?', answer: `${marquesTexte(f, 6)}. La grille de chaque marque figure sur ses fiches.` },
        { question: 'Combien coûte un kimono ?', answer: `Au rayon, de ${money(f.min)} à ${money(f.max)}, pour un prix médian de ${money(f.mediane)} ; les kimonos pour bébé et de karaté sont les moins chers, les gis de JJB en 450 les plus chers.` },
      ];
    },
    liens: [
      { titre: 'Les sous-rayons', liens: [{ href: '/kimonos/', texte: 'kimonos' }, { href: '/kimonos-jjb/', texte: 'kimono JJB' }, { href: '/ceintures/', texte: 'ceintures' }] },
      { titre: 'Les guides', liens: [{ href: '/guide-des-tailles/', texte: 'lire une grille de tailles' }, { href: '/guides/debuter-mma/', texte: 'commencer le MMA et le grappling' }, { href: '/les-arts-martiaux/', texte: 'les arts martiaux, leur origine et leurs dojos' }] },
      { titre: 'Les rayons voisins', liens: [{ href: '/boutique-arts-martiaux/', texte: 'boutique arts martiaux' }, { href: '/equipement-jjb/', texte: 'équipement JJB' }, { href: '/protections-boxe/', texte: 'protections' }, { href: '/materiel-sport-de-combat/', texte: 'matériel sport de combat' }] },
    ],
  },
  /* ---------------------------------------------------------------- équipement de boxe anglaise (23/10) */
  // La seule boxe aux poings seuls : pas de tibias, pas de coudes. Les faits réglementaires viennent du code
  // sportif de la boxe amateur 2026-2027 de la FFBoxe (règle 11, la tenue), cité en lien dans le chapitre.
  {
    slug: 'equipement-boxe-anglaise',
    requete: 'équipement boxe anglaise',
    revision: '2026-10-23',
    h1: 'Équipement de boxe anglaise',
    eyebrow: 'ÉQUIPEMENT BOXE ANGLAISE · LES POINGS SEULS',
    titre: ({ f }) => `Équipement boxe anglaise : ${fr(f.n)} modèles, dès ${money(f.min)}`,
    description: ({ f }) => `Équipement boxe anglaise : ${fr(f.n)} modèles dès ${money(f.min)} : gants, bandes, protège-dents, casque, chaussures, short, sac. La règle du club, puis celle du combat.`,
    label: ({ f }) => `${fr(f.n)} modèles, dès ${money(f.min)} : des bandes au sac de frappe.`,
    intro: 'Les poings frappent, le reste encaisse : bandes, gants et protège-dents dès le premier cours ; casque, coquille et chaussures montantes quand le travail à deux commence. Le guide suit la liste, avec la règle de la compétition amateur.',
    guide: {
      titre: 'S’équiper pour la boxe anglaise',
      chapeau: ({ f }) => `${fr(f.n)} modèles de ${f.marques.length} marques, de ${money(f.min)} à ${money(f.max)} : ce que chaque pièce fait, quand elle devient nécessaire, et ce que la fédération exige le jour d’un combat.`,
      chapitres: [
        {
          titre: 'Les mains : bandes, puis gants',
          texte: [
            'Les bandes passent en premier : elles tiennent le poignet dans l’axe, serrent les métacarpes et boivent la sueur avant qu’elle n’atteigne la mousse ; 4 ou 4,50 m pour un adulte, 2,50 m pour une main d’enfant. Les gants viennent ensuite, au poids de la séance : dix onces pour le sac, douze pour la technique, quatorze à seize dès qu’un partenaire est en face.',
            ({ items }) => {
              const b = items.filter((p) => bandes(p) && p.price > 0);
              const g = items.filter((p) => gantBoxe(p) && p.price > 0);
              return `${fr(b.length)} paires de bandes et ${fr(g.length)} paires de gants au rayon, dès ${desDe(b)} et ${desDe(g)} ; ${fr(g.filter((p) => velcro(p) && !aLacets(p)).length)} gants ferment au velcro, ${fr(g.filter(aLacets).length)} à lacets. Les pages [bandes de boxe](/bandes-de-boxe/) et [gants de boxe](/gants-de-boxe/) détaillent la pose et le poids.`;
            },
          ],
        },
        {
          titre: 'Les dents et la tête',
          texte: [
            'Le protège-dents se porte dès le premier exercice à deux : simple pour la plupart, double quand le contact appuie, à mouler dans l’eau chaude, chez soi, en quelques minutes. Le casque vient quand le sparring commence, selon ce que la salle impose : ouvert pour voir, à barre ou intégral pour couvrir le nez.',
            ({ items }) => {
              const pd = items.filter((p) => protegeDents(p) && p.price > 0);
              const c = items.filter((p) => casque(p) && p.price > 0);
              const couverts = c.filter((p) => couverture(p) === 'barre' || couverture(p) === 'integral').length;
              return `${fr(pd.length)} protège-dents dès ${desDe(pd)}, ${fr(c.length)} casques dès ${desDe(c)}, dont ${fr(couverts)} à barre ou intégraux. Le [protège-dents](/protege-dents/) et le [casque de boxe](/casques-de-boxe/) ont chacun leur page.`;
            },
          ],
        },
        {
          titre: 'Le bas-ventre et les appuis',
          texte: [
            'La coquille protège le bas-ventre dès le travail à deux ; elle se glisse sous le short, tenue par un support ou intégrée à un short de compression. Les chaussures de boxe montent sur la cheville et tiennent les pivots : pour commencer, une paire de sport propre réservée à la salle suffit, jusqu’à ce que le club demande des montantes.',
            ({ items }) => {
              const co = items.filter((p) => coquille(p) && p.price > 0);
              const ch = items.filter((p) => p.category === 'chaussures-boxe' && p.price > 0);
              return `${fr(co.length)} coquilles et supports dès ${desDe(co)} ; ${fr(ch.length)} paires de [chaussures de boxe](/chaussures-boxe/) dès ${desDe(ch)}, ${fr(ch.filter(enCuir).length)} en cuir d’après leur fiche.`;
            },
          ],
        },
        {
          titre: 'La tenue : short à la ceinture, débardeur',
          texte: [
            'Le short de boxe anglaise descend vers le genou sans le couvrir et marque la ceinture, limite basse des coups permis ; le débardeur se rentre dans le short. À l’entraînement, un short et un t-shirt qui sèchent vite font l’affaire ; la tenue réglementaire ne compte que le jour d’un combat.',
            ({ items }) => {
              const sh = items.filter((p) => shortAnglais(p) && p.price > 0);
              const de = items.filter((p) => debardeur(p) && p.price > 0);
              const pe = items.filter((p) => peignoir(p) && p.price > 0);
              return `${fr(sh.length)} [shorts de boxe anglaise](/shorts-de-boxe-anglaise/) dès ${desDe(sh)}, ${fr(de.length)} débardeurs dès ${desDe(de)}${pe.length ? `, et ${pluriel(pe.length, 'peignoir à capuche', 'peignoirs à capuche')} pour l’entrée sur le ring` : ''}.`;
            },
          ],
        },
        {
          titre: 'Le sac, les pattes d’ours, la corde',
          texte: [
            'Le sac de frappe travaille la puissance et les enchaînements : suspendu, il demande une poutre ou une potence ; sur pied, il se pose au sol et se range. Les pattes d’ours, tenues par un partenaire, affinent la précision ; la corde à sauter ouvre presque tous les cours.',
            ({ items }) => {
              const s = sacs(items).filter((p) => p.price > 0);
              const pa = items.filter((p) => /^pattes? d/.test(nom(p)) && p.price > 0);
              const co = items.filter((p) => cordeASauter(p) && p.price > 0);
              return `${fr(s.length)} [sacs de frappe](/sacs-de-frappe/) dès ${desDe(s)}, ${fr(pa.length)} paires de pattes d’ours dès ${desDe(pa)}, ${fr(co.length)} cordes dès ${desDe(co)}. Pour accrocher un sac sans se tromper de support, le guide [fixer un sac de frappe](/guides/comment-fixer-un-sac-de-frappe/) part du plafond.`;
            },
          ],
        },
        {
          // Deux chapitres plutôt qu’un : en trois colonnes, un seul paragraphe de 260 mots laissait un trou sous ses deux voisins.
          titre: 'Le jour du combat : les gants et le casque du code sportif amateur',
          texte: [
            'Le [code sportif de la boxe amateur 2026-2027 de la Fédération française de boxe](https://www.ffboxe.com/wp-content/uploads/2026/07/FFBoxe_Saison-2026-2027_Code-Sportif-Boxe-Amateur_VF_Validation_CODIR_2026-07-09.pdf), en vigueur depuis le 9 juillet 2026, fixe la tenue à sa règle 11. Les gants, de 10 onces (284 g) ou 12 onces (341 g) à la couleur du coin, sont validés par la fédération et fournis par l’organisation : les deux boxeurs portent la même marque et le même modèle, personne ne monte avec les siens. Seniors et juniors hommes en trois reprises de deux ou trois minutes boxent en 10 oz jusqu’aux mi-moyens (63 à 67 kg) et en 12 oz à partir des moyens légers (67 kg) ; toutes les autres catégories boxent en 10 oz.',
            'Le casque, sans pommette ni mentonnière et à la couleur du coin, est obligatoire pour toutes les catégories sauf les seniors hommes en trois fois trois minutes ; le protège-dents ne peut pas être rouge, même en partie ; la coquille ou la ceinture protectrice est obligatoire pour les hommes, conseillée pour les femmes comme le protège-poitrine.',
          ],
        },
        {
          titre: 'Le jour du combat : les bandes et la tenue de la règle 11',
          texte: [
            'Les bandes, souples et sèches, mesurent de 2,50 m à 4,50 m pour 5,7 cm de large au plus, enroulées à plat, croisées entre les doigts si l’on veut, sans épingle ; les bandages réutilisables du type Bandax sont interdits. Le short ne descend pas sous le genou, une bande élastique de 10 cm marque la ceinture quand short et maillot ont la même couleur, le legging est interdit dessous, le débardeur se rentre, les chaussettes ne cachent pas les genoux. Une tenue incomplète vaut disqualification.',
          ],
        },
        {
          titre: 'Les marques du rayon',
          texte: [({ f, items }) => `Ce que chacune apporte à l’anglaise : ${parMarque('equipement-boxe-anglaise', items, f, 6, undefined, true)}.`],
        },
        {
          titre: 'Commander, recevoir',
          texte: [() => `Paiement par carte chez PayPlug, sur sa page sécurisée ; expédition ${shop.delais.expedition} après la commande, en point relais à ${money(shop.livraison.relais)}, offert à partir de ${money(shop.livraison.franco)} d’achats, ou à domicile à ${money(shop.livraison.domicile)}. Les sacs de frappe voyagent à part, sur devis. Une pièce qui ne va pas se renvoie dans les quatorze jours qui suivent sa réception, non portée.`],
        },
      ],
    },
    usages: {
      titre: 'Un modèle par pièce, du premier cours au ring',
      note: 'Le premier prix du rayon qui remplit le rôle, en taille adulte ; une pièce déjà citée laisse sa place.',
      regles: [
        { usage: 'Bander les mains', filtre: (p) => bandes(p) && longueur(p) === 4.5, critere: ({ i, n }) => `${rang(i, 'f')} parmi ${fr(n)} bandes de 4,50 m, celles d’une main adulte` },
        { usage: 'Premiers gants, technique', filtre: (p) => gantBoxe(p) && adulte(p) && ouncesOf(p).includes(12) && velcro(p), critere: ({ i, n }) => `${rang(i)} parmi ${fr(n)} gants de 12 oz à velcro` },
        { usage: 'Sparring, la plupart des adultes', filtre: (p) => gantBoxe(p) && adulte(p) && ouncesOf(p).includes(16), critere: ({ i, n }) => `${rang(i)} parmi ${fr(n)} paires de 16 oz, le poids du sparring` },
        { usage: 'Protéger les dents', filtre: (p) => protegeDents(p) && adulte(p) && !propose(p, /junior|enfant/i), critere: ({ i, n }) => `${rang(i)} parmi ${fr(n)} protège-dents en taille adulte` },
        { usage: 'Le casque du sparring', filtre: (p) => casque(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} parmi ${fr(n)} casques, à régler au tour de tête` },
        { usage: 'Le bas-ventre', filtre: (p) => coquille(p), critere: ({ i, n }) => `${rang(i, 'f')} parmi ${fr(n)} coquilles et supports` },
        { usage: 'Tenir la cheville', filtre: (p) => p.category === 'chaussures-boxe' && nom(p).startsWith('chaussures de boxe') && adulte(p), critere: ({ i, n }) => `${rang(i, 'f')} parmi ${fr(n)} chaussures montantes` },
        { usage: 'Le short', filtre: (p) => shortAnglais(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} parmi ${fr(n)} shorts d’anglaise, longs et à la ceinture` },
        { usage: 'Le débardeur', filtre: (p) => debardeur(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} parmi ${fr(n)} débardeurs` },
        { usage: 'Frapper chez soi', filtre: (p) => surPied(p) && adulte(p), critere: ({ i, n }) => `${rang(i)} parmi ${fr(n)} sacs sur pied, rien à percer` },
        { usage: 'La précision à deux', filtre: (p) => /^pattes? d/.test(nom(p)), critere: ({ i, n }) => `${rang(i, 'f')} parmi ${fr(n)} pattes d’ours vendues par paire` },
        { usage: 'S’échauffer', filtre: (p) => cordeASauter(p), critere: ({ i, n }) => `${rang(i, 'f')} parmi ${fr(n)} cordes, l’échauffement de presque tous les cours` },
      ],
    },
    tableau: ({ items }) =>
      tableauTypes(
        items,
        [
          ['Bandes', bandes, '/bandes-de-boxe/'],
          ['Gants de boxe', gantBoxe, '/gants-de-boxe/'],
          ['Protège-dents', protegeDents, '/protege-dents/'],
          ['Casques', casque, '/casques-de-boxe/'],
          ['Coquilles et supports', coquille, '/coquilles/'],
          ['Chaussures', (p) => p.category === 'chaussures-boxe', '/chaussures-boxe/'],
          ['Shorts de boxe anglaise', shortAnglais, '/shorts-de-boxe-anglaise/'],
          ['Débardeurs', debardeur, '/debardeurs-boxe/'],
          ['Sacs de frappe', (p) => ['suspendu', 'pied', 'eau'].includes(genreSac(p)), '/sacs-de-frappe/'],
          ['Pattes d’ours', (p) => /^pattes? d/.test(nom(p)), '/pattes-d-ours/'],
          ['Cordes à sauter', cordeASauter, '/cordes-a-sauter/'],
        ],
        'L’équipement, pièce par pièce',
        'Comptes du jour et premier prix TTC ; le sac de frappe se livre sur devis, à domicile.',
      ),
    faq: ({ f, items }) => {
      const premierDe = (t: (p: Product) => boolean) => premier(items.filter((p) => p.price > 0 && t(p)));
      const pieces = [premierDe((p) => bandes(p) && longueur(p) === 4.5), premierDe((p) => gantBoxe(p) && adulte(p) && ouncesOf(p).includes(12) && velcro(p)), premierDe((p) => protegeDents(p) && adulte(p) && !propose(p, /junior|enfant/i)), premierDe((p) => casque(p) && adulte(p)), premierDe(coquille), premierDe((p) => p.category === 'chaussures-boxe' && nom(p).startsWith('chaussures de boxe') && adulte(p))];
      const complet = pieces.every(Boolean) ? pieces.reduce((s, p) => s + p!.price, 0) : null;
      const debut = pieces.slice(0, 3).every(Boolean) ? pieces.slice(0, 3).reduce((s, p) => s + p!.price, 0) : null;
      return [
        { question: 'Quel équipement de boxe anglaise pour débuter ?', answer: 'Quatre pièces : des bandes adaptées à votre main, une paire de gants de 12 oz fermée au velcro, un protège-dents à mouler et une corde. Casque, coquille et chaussures viennent quand le club les demande.' },
        { question: 'Quel poids de gants pour la boxe anglaise ?', answer: 'Dix onces au sac, douze en technique, quatorze à seize dès qu’on travaille à deux. En compétition amateur, 10 oz jusqu’aux mi-moyens et 12 oz au-delà pour les seniors et juniors hommes, 10 oz ailleurs : des gants fournis par l’organisation, pas les vôtres.' },
        { question: 'Faut-il des chaussures de boxe ?', answer: 'Pas le premier mois : une paire de sport propre, réservée à la salle, suffit. Les montantes tiennent la cheville dans les pivots et s’imposent avec le sparring et la compétition ; le code sportif amateur demande des chaussures de sport et des chaussettes qui ne cachent pas les genoux.' },
        { question: 'Faut-il un casque en boxe anglaise ?', answer: 'À l’entraînement, la salle décide, souvent dès le sparring. En compétition amateur, il l’est pour toutes les catégories sauf les seniors hommes en trois reprises de trois minutes, et il se porte sans pommette ni mentonnière.' },
        { question: 'Quelle longueur de bandes ?', answer: '4 ou 4,50 m pour un adulte, 2,50 m pour un enfant. La compétition amateur admet de 2,50 m à 4,50 m, 5,7 cm de large au plus, posées à plat et sans épingle.' },
        { question: 'Quelle tenue pour un combat amateur ?', answer: 'Short au-dessus du genou, débardeur rentré, chaussures de sport, chaussettes sous le genou, protège-dents d’une couleur autre que rouge, bandes réglementaires, coquille pour les hommes ; gants et casque validés par la fédération, aux couleurs du coin. Une tenue incomplète entraîne la disqualification.' },
        { question: 'Et pour une femme ?', answer: 'Le même matériel, avec une coupe à sa morphologie pour la coquille et, si elle le souhaite, un protège-poitrine : en compétition amateur, les deux sont conseillés sans être obligatoires, et la jupe-short peut remplacer le short.' },
        { question: 'Quel sac de frappe pour s’entraîner chez soi ?', answer: 'Un sac suspendu qui pèse autour de la moitié de votre poids, si une poutre ou une potence peut le porter ; sinon un sac sur pied, dont le socle se leste d’eau ou de sable. Le guide pour le fixer compare les supports.' },
        ...(complet !== null && debut !== null ? [{ question: 'Combien coûte l’équipement complet ?', answer: `Au premier prix du rayon, ${money(debut)} pour les trois pièces du premier cours (bandes, gants, protège-dents) et ${money(complet)} avec le casque, la coquille et les chaussures. Prix de vente TTC, hors livraison.` }] : []),
        { question: 'Quelles marques pour la boxe anglaise ?', answer: `${marquesTexte(f, 5)}, parmi ${fr(f.marques.length)} marques ; la grille de chaque fabricant est reprise sur sa fiche.` },
      ];
    },
    liens: [
      { titre: 'Les rayons de l’anglaise', liens: [{ href: '/gants-de-boxe/', texte: 'gants de boxe' }, { href: '/bandes-de-boxe/', texte: 'bandes de boxe' }, { href: '/protege-dents/', texte: 'protège-dents' }, { href: '/casques-de-boxe/', texte: 'casques de boxe' }, { href: '/coquilles/', texte: 'coquilles' }, { href: '/chaussures-boxe/', texte: 'chaussures de boxe' }, { href: '/shorts-de-boxe-anglaise/', texte: 'shorts de boxe anglaise' }] },
      { titre: 'Les guides', liens: [{ href: '/guides/boxe-anglaise-materiel-indispensable/', texte: 'le matériel indispensable, pièce par pièce' }, { href: '/guides/debuter-boxe/', texte: 'l’équipement du premier cours' }, { href: '/guides/comment-mettre-des-bandes-de-boxe/', texte: 'poser ses bandes' }, { href: '/guides/casque-de-boxe-obligatoire/', texte: 'le casque, selon les règlements' }, { href: '/guides/coquille-et-protege-poitrine/', texte: 'coquille et protège-poitrine, selon les règlements' }, { href: '/guides/boxe-anglaise-ou-savate-boxe-francaise/', texte: 'anglaise ou savate : ce qui change' }] },
      { titre: 'Les autres boxes', liens: [{ href: '/materiel-boxe/', texte: 'tout le matériel de boxe' }, { href: '/materiel-boxe-francaise/', texte: 'savate boxe française' }, { href: '/materiel-boxe-thai/', texte: 'boxe thaï' }, { href: '/materiel-boxe-competition/', texte: 'le matériel de compétition' }] },
    ],
  },
];

export const guideRayon = (slug: string) => GUIDES_RAYONS.find((g) => g.slug === slug);

/** Le texte d’un guide, à plat : pour llms-full.txt, l’atelier (lib/brief.ts) et les contrôles. */
export function guideEnTexte(g: GuideRayon, c: Contexte): { chapitres: string[]; faq: SeoFaq[]; choix: Choix[] } {
  const net = (s: string) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  return {
    chapitres: [net(texte(g.guide.chapeau, c)), ...g.guide.chapitres.map((ch) => `${ch.titre} : ${ch.texte.map((t) => net(texte(t, c))).join(' ')}`)],
    faq: g.faq(c),
    choix: choix(g, c),
  };
}
