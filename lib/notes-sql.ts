import type { D1Database } from '@/db';
import { moyenneDeSomme, type Moyenne, type MotifRetrait } from './notes';

/**
 * Le stockage des notes des produits (20/10/2026), sur une base passée en paramètre : la boutique lui
 * donne sa connexion Postgres (lib/notes-stockage.ts), les tests une base simulée (scripts/test-notes.mjs).
 *
 * Une ligne par appareil et par modèle (index unique product_id + device_hash) : une nouvelle note du
 * même appareil met la ligne à jour, elle n'en ajoute jamais une seconde. Ni l'adresse IP ni
 * l'identifiant de l'appareil ne sont gardés en clair : seulement leurs empreintes salées (HMAC).
 * Une note retirée par l'atelier le reste quand son appareil la change : le retrait ne se contourne pas.
 */

/** Le schéma, posé une fois par instance par ensureSchema (lib/database.ts) ; le même SQL est dans drizzle/0007. */
export const NOTES_SCHEMA = [
  "CREATE TABLE IF NOT EXISTS product_ratings (id text PRIMARY KEY, product_id text NOT NULL, stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5), created_at text NOT NULL, updated_at text NOT NULL, ip_hash text NOT NULL, device_hash text NOT NULL, status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'retiree')), removed_reason text CHECK (removed_reason IS NULL OR removed_reason IN ('robot', 'doublon', 'abus', 'autre')), removed_detail text, removed_at text, removed_by text)",
  'CREATE UNIQUE INDEX IF NOT EXISTS product_ratings_appareil ON product_ratings (product_id, device_hash)',
  'CREATE INDEX IF NOT EXISTS product_ratings_connexion ON product_ratings (product_id, ip_hash)',
  'CREATE INDEX IF NOT EXISTS product_ratings_date ON product_ratings (updated_at)',
  // Comme toutes les tables : API publique de Supabase fermée, seul le serveur lit et écrit.
  'ALTER TABLE product_ratings ENABLE ROW LEVEL SECURITY',
];
/** Ce qui manque du schéma (table, index, RLS) : lu dans le catalogue système, sans verrou. */
export const NOTES_MANQUE =
  "SELECT (CASE WHEN to_regclass('product_ratings') IS NULL THEN 1 ELSE 0 END) + (CASE WHEN to_regclass('product_ratings_appareil') IS NULL THEN 1 ELSE 0 END) + (CASE WHEN to_regclass('product_ratings_connexion') IS NULL THEN 1 ELSE 0 END) + (CASE WHEN to_regclass('product_ratings_date') IS NULL THEN 1 ELSE 0 END) + (SELECT count(*) FROM pg_class WHERE oid = to_regclass('product_ratings') AND NOT relrowsecurity) AS missing";

/**
 * Plafond par connexion : trois appareils différents au plus notent un même modèle depuis une même
 * adresse réseau en trente jours (un foyer, un club). Au-delà, c'est un robot qui efface ses cookies.
 */
export const PLAFOND_CONNEXION = 3;
const FENETRE_CONNEXION = 30 * 86400000;
export const REFUS_CONNEXION = 'Ce modèle a déjà reçu plusieurs notes depuis cette connexion : une note par personne suffit.';

export type ResultatNote =
  | { statut: 'nouvelle' | 'modifiee'; moyenne: Moyenne | null; visible: boolean }
  | { refus: string };

/** Enregistre la note d'un appareil (création, ou mise à jour de sa note) ; rend la moyenne visible du modèle. */
export async function noter(
  database: D1Database,
  o: { produit: string; etoiles: number; ip: string; appareil: string },
  maintenant = new Date(),
): Promise<ResultatNote> {
  const now = maintenant.toISOString();
  const deja = await database
    .prepare('SELECT id FROM product_ratings WHERE product_id=? AND device_hash=?')
    .bind(o.produit, o.appareil)
    .first<{ id: string }>();
  if (!deja) {
    const depuis = new Date(maintenant.getTime() - FENETRE_CONNEXION).toISOString();
    const n = Number(
      await database
        .prepare('SELECT count(*) AS n FROM product_ratings WHERE product_id=? AND ip_hash=? AND created_at > ?')
        .bind(o.produit, o.ip, depuis)
        .first<number>('n'),
    );
    if (n >= PLAFOND_CONNEXION) return { refus: REFUS_CONNEXION };
  }
  // Le statut n'est jamais touché par une mise à jour : une note retirée reste retirée.
  const ligne = await database
    .prepare(
      "INSERT INTO product_ratings (id,product_id,stars,created_at,updated_at,ip_hash,device_hash,status) VALUES (?,?,?,?,?,?,?,'visible') ON CONFLICT (product_id,device_hash) DO UPDATE SET stars=excluded.stars, updated_at=excluded.updated_at, ip_hash=excluded.ip_hash RETURNING status",
    )
    .bind(crypto.randomUUID(), o.produit, o.etoiles, now, now, o.ip, o.appareil)
    .first<{ status: string }>();
  return { statut: deja ? 'modifiee' : 'nouvelle', moyenne: await moyenneEnBase(database, o.produit), visible: ligne?.status !== 'retiree' };
}

/** La moyenne des notes visibles d'un modèle, ou null s'il n'en a aucune. */
export async function moyenneEnBase(database: D1Database, produit: string): Promise<Moyenne | null> {
  const r = await database
    .prepare("SELECT count(*) AS total, COALESCE(sum(stars),0) AS somme FROM product_ratings WHERE product_id=? AND status='visible'")
    .bind(produit)
    .first<{ total: number; somme: number }>();
  return r ? moyenneDeSomme(r.somme, r.total) : null;
}

/** Les moyennes visibles de tous les modèles notés, en une lecture. */
export async function moyennesEnBase(database: D1Database): Promise<Map<string, Moyenne>> {
  const r = await database
    .prepare("SELECT product_id, count(*) AS total, sum(stars) AS somme FROM product_ratings WHERE status='visible' GROUP BY product_id")
    .all<{ product_id: string; total: number; somme: number }>();
  const out = new Map<string, Moyenne>();
  for (const x of r.results) {
    const m = moyenneDeSomme(x.somme, x.total);
    if (m) out.set(x.product_id, m);
  }
  return out;
}

export type NoteAtelier = {
  id: string;
  product_id: string;
  stars: number;
  created_at: string;
  updated_at: string;
  status: 'visible' | 'retiree';
  removed_reason: MotifRetrait | null;
  removed_detail: string | null;
  removed_at: string | null;
  removed_by: string | null;
  /** Notes du même modèle depuis la même connexion (elle comprise) : au-delà d'une, un doublon possible. */
  meme_connexion: number;
};

/** Les notes pour l'atelier, les plus récentes d'abord, et les totaux. Aucune empreinte ne sort de la base. */
export async function notesAtelier(database: D1Database, limite = 500) {
  const [lignes, totaux] = await Promise.all([
    database
      .prepare(
        'SELECT r.id,r.product_id,r.stars,r.created_at,r.updated_at,r.status,r.removed_reason,r.removed_detail,r.removed_at,r.removed_by,(SELECT count(*) FROM product_ratings s WHERE s.product_id=r.product_id AND s.ip_hash=r.ip_hash) AS meme_connexion FROM product_ratings r ORDER BY r.updated_at DESC, r.id LIMIT ' + Math.max(1, Math.min(1000, Math.floor(limite) || 1)),
      )
      .all<NoteAtelier>(),
    database.prepare('SELECT status, count(*) AS n FROM product_ratings GROUP BY status').all<{ status: string; n: number }>(),
  ]);
  const compte = (s: string) => Number(totaux.results.find((t) => t.status === s)?.n || 0);
  return { notes: lignes.results.map((n) => ({ ...n, stars: Number(n.stars), meme_connexion: Number(n.meme_connexion) })), visibles: compte('visible'), retirees: compte('retiree') };
}

/** Retire une note visible, avec son motif, sa précision éventuelle, la date et l'auteur ; rend le modèle concerné. */
export async function retirer(
  database: D1Database,
  o: { id: string; motif: MotifRetrait; precision: string; par: string },
  maintenant = new Date(),
): Promise<string | null> {
  return database
    .prepare("UPDATE product_ratings SET status='retiree', removed_reason=?, removed_detail=?, removed_at=?, removed_by=? WHERE id=? AND status='visible' RETURNING product_id")
    .bind(o.motif, o.precision || null, maintenant.toISOString(), o.par, o.id)
    .first<string>('product_id');
}

/** Rétablit une note retirée : elle compte de nouveau dans la moyenne. */
export async function retablir(database: D1Database, id: string): Promise<string | null> {
  return database
    .prepare("UPDATE product_ratings SET status='visible', removed_reason=NULL, removed_detail=NULL, removed_at=NULL, removed_by=NULL WHERE id=? AND status='retiree' RETURNING product_id")
    .bind(id)
    .first<string>('product_id');
}
