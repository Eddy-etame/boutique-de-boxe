/**
 * Notes des produits (20/10/2026). Le propriétaire : « les gens doivent pouvoir noter le produit, pas
 * écrire un texte, juste noter ». Une note, ce sont des étoiles de 1 à 5, sans texte ni compte ; une
 * seule par appareil et par modèle (le même appareil change sa note, il n'en ajoute pas une seconde).
 * La note publiée est la moyenne simple des notes visibles, avec leur nombre. Aucune note par défaut,
 * aucune note importée : sans note visible, la fiche n'affiche rien et ne publie aucun aggregateRating.
 *
 * Ce module ne lit ni la base, ni la requête, ni l'environnement : validation, moyenne, libellés et
 * données structurées, partagés par la fiche, l'API, l'atelier et les tests (scripts/test-notes.mjs).
 */

export const ETOILES = [1, 2, 3, 4, 5] as const;
export type Etoiles = (typeof ETOILES)[number];

/** Les seuls motifs de retrait (atelier). Une note basse n'en est pas un. */
export const MOTIFS_RETRAIT = ['robot', 'doublon', 'abus', 'autre'] as const;
export type MotifRetrait = (typeof MOTIFS_RETRAIT)[number];
export const LIBELLE_MOTIF: Record<MotifRetrait, string> = {
  robot: 'Robot',
  doublon: 'Doublon',
  abus: 'Abus manifeste',
  autre: 'Autre motif',
};

/** La moyenne publiée : valeur arrondie au dixième, nombre de notes visibles (au moins une). */
export type Moyenne = { valeur: number; total: number };

/** Où lire la règle de modération : la section de la FAQ, à côté de chaque affichage des notes. */
export const MODERATION_HREF = '/faq/#notes-des-produits';

export const etoilesValides = (v: unknown): v is Etoiles => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5;
export const motifValide = (v: unknown): v is MotifRetrait => typeof v === 'string' && (MOTIFS_RETRAIT as readonly string[]).includes(v);

/** Identifiant de modèle tel qu'il circule dans une demande : borné avant toute recherche dans le catalogue. */
const ID_PRODUIT = /^[A-Za-z0-9_.-]{1,120}$/;

export type DemandeNote = { produit: string; etoiles: Etoiles };
export type RefusNote = { erreur: string; statut: number };

/**
 * La demande d'une note, validée côté serveur : un modèle qui existe (`existe`), un entier de 1 à 5.
 * Rien d'autre n'est lu ; le champ piège se contrôle à part (champPiegeRempli).
 */
export function lireDemandeNote(data: unknown, existe: (id: string) => boolean): DemandeNote | RefusNote {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { erreur: 'Demande invalide.', statut: 400 };
  const d = data as Record<string, unknown>;
  if (typeof d.produit !== 'string' || !ID_PRODUIT.test(d.produit) || !existe(d.produit)) return { erreur: 'Ce modèle est introuvable.', statut: 404 };
  if (!etoilesValides(d.etoiles)) return { erreur: 'Choisissez une note de 1 à 5 étoiles.', statut: 400 };
  return { produit: d.produit, etoiles: d.etoiles };
}
export const estRefus = (v: DemandeNote | RefusNote): v is RefusNote => 'erreur' in v;

/** Le champ piège (« website », invisible pour un humain, comme sur les autres formulaires) : rempli = robot. */
export const champPiegeRempli = (data: unknown) => {
  const w = data && typeof data === 'object' ? (data as Record<string, unknown>).website : undefined;
  return w !== undefined && w !== null && w !== '';
};

/**
 * Filtre des robots déclarés : robots d'indexation et outils de script (curl, python, Go, Java…), qui
 * n'ont rien à noter. Un agent vide ou trop court est traité de même. Les noms sont précis : un
 * téléphone dont le modèle contient « bot » (CUBOT) reste un visiteur.
 */
const ROBOT =
  /(?:google|bing|yandex|baidu|duckduck|apple|petal|ahrefs|semrush|mj12|dot|gpt|claude|perplexity|amazon|facebook|twitter|linkedin|ads|seznam|qwant|exa|cc|you|yeti|sogou|discord|telegram|slack|whatsapp)bot|bytespider|crawler|spider|slurp|facebookexternalhit|headlesschrome|phantomjs|puppeteer|playwright|selenium|python-requests|python-urllib|aiohttp|httpx|curl\/|wget\/|go-http-client|java\/|okhttp|axios\/|node-fetch|undici|libwww-perl|scrapy|httpclient|postmanruntime|insomnia/i;
export const estRobot = (agent: string | null | undefined) => !agent || agent.trim().length < 12 || ROBOT.test(agent);

/**
 * L'adresse réseau qui compte pour la limite de débit et le plafond par connexion : une IPv4 entière,
 * une IPv6 ramenée à son préfixe /64 (un abonné en reçoit un entier, il en changerait à chaque note).
 */
export function reseauDe(ip: string): string {
  const v = ip.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/%.*$/, '');
  const v4 = /^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/.exec(v);
  if (v4) return v4[1];
  if (!v.includes(':')) return v || 'inconnue';
  const [tete, queue] = v.split('::');
  const a = tete ? tete.split(':') : [];
  const b = queue ? queue.split(':') : [];
  const groupes = v.includes('::') ? [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill('0'), ...b] : a;
  return groupes.slice(0, 4).map((g) => (parseInt(g, 16) || 0).toString(16)).join(':') + '::/64';
}

export type DemandeRetrait =
  | { id: string; action: 'retirer'; motif: MotifRetrait; precision: string }
  | { id: string; action: 'retablir' };

/**
 * Une demande de l'atelier : retirer une note (motif obligatoire choisi dans la liste, précision
 * obligatoire pour « autre », 200 caractères au plus) ou rétablir une note retirée.
 */
export function lireDemandeRetrait(data: unknown): DemandeRetrait | RefusNote {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { erreur: 'Demande invalide.', statut: 400 };
  const d = data as Record<string, unknown>;
  if (typeof d.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(d.id)) return { erreur: 'Note introuvable.', statut: 404 };
  if (d.action === 'retablir') return { id: d.id, action: 'retablir' };
  if (d.action !== 'retirer') return { erreur: 'Action inconnue.', statut: 400 };
  if (!motifValide(d.motif)) return { erreur: 'Choisissez le motif du retrait : robot, doublon, abus ou autre.', statut: 400 };
  const precision = typeof d.precision === 'string' ? d.precision.replace(/\s+/g, ' ').trim() : '';
  if (precision.length > 200) return { erreur: 'La précision tient en 200 caractères.', statut: 400 };
  if (d.motif === 'autre' && precision.length < 3) return { erreur: 'Pour « autre », précisez le motif du retrait.', statut: 400 };
  return { id: d.id, action: 'retirer', motif: d.motif, precision };
}

/** Moyenne simple de notes, arrondie au dixième ; null sans note valide. */
export function moyenneDe(notes: readonly number[]): Moyenne | null {
  const valides = notes.filter(etoilesValides);
  if (!valides.length) return null;
  return moyenneDeSomme(valides.reduce((a, b) => a + b, 0), valides.length);
}

/** Moyenne à partir d'une somme et d'un nombre (agrégat SQL), calculée en entiers : pas d'arrondi flottant. */
export function moyenneDeSomme(somme: unknown, total: unknown): Moyenne | null {
  const s = Number(somme);
  const n = Number(total);
  if (!Number.isFinite(s) || !Number.isInteger(n) || n < 1 || s < n || s > 5 * n) return null;
  return { valeur: Math.round((s * 10) / n) / 10, total: n };
}

/** « 4,6 » : la virgule française, toujours une décimale. */
export const virgule = (v: number) => v.toFixed(1).replace('.', ',');
/** « 1 note », « 12 notes », « 1 204 notes ». */
export const nombreDeNotes = (n: number) => `${n.toLocaleString('fr-FR')} note${n > 1 ? 's' : ''}`;
/** Ce qu'on lit près du prix : « ★ 4,6 · 12 notes ». */
export const libelleMoyenne = (m: Moyenne) => `★ ${virgule(m.valeur)} · ${nombreDeNotes(m.total)}`;
/** Ce qu'entend un lecteur d'écran : « Note moyenne 4,6 sur 5, 12 notes ». */
export const lectureMoyenne = (m: Moyenne) => `Note moyenne ${virgule(m.valeur)} sur 5, ${nombreDeNotes(m.total)}`;
/** « 1 étoile », « 4 étoiles » : le nom de chaque bouton du groupe. */
export const nomEtoiles = (n: number) => `${n} étoile${n > 1 ? 's' : ''}`;

/**
 * L'aggregateRating du Product (ou du ProductGroup) de la fiche, dès qu'une note visible existe ;
 * null sinon. La valeur est arrondie au dixième, l'échelle déclarée de 1 à 5.
 */
export function noteStructuree(m: Moyenne | null | undefined) {
  if (!m || !Number.isInteger(m.total) || m.total < 1 || !(m.valeur >= 1 && m.valeur <= 5)) return null;
  return {
    '@type': 'AggregateRating',
    ratingValue: Math.round(m.valeur * 10) / 10,
    ratingCount: m.total,
    bestRating: 5,
    worstRating: 1,
  };
}
