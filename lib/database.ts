import { cache } from 'react';
import { after } from 'next/server';
import type { PayplugEnvironment } from './payplug';
import type { Product } from './catalog';
import original from './data/products.json';
import imported from './data/imported-products.json';
// Les fichiers gardent le prix public relevé ; la règle de prix du propriétaire s’applique à la lecture (lib/pricing.ts).
const products = ([...original, ...imported] as unknown as Product[]).map(withOurPrice);
import { getSessionUser, DEV_OWNER_EMAIL } from './auth';
import { emailSession, estMembre } from './team';
import { d1Compat, type D1Database } from '@/db';
import { withCutout } from './cutouts';
import { withOurPrice } from './pricing';
import { applyClub, clubState, fetchClub, snapshotFromRow, CLUB_TTL, type ClubRow, type Snapshot } from './club-sync';
export async function runtime() {
  return process.env as unknown as PayplugEnvironment & {
    ADMIN_EMAIL?: string;
    RESEND_API_KEY?: string;
    MAIL_FROM?: string;
  };
}
export async function db(): Promise<D1Database> {
  return d1Compat();
}
/**
 * L'adresse de l'administrateur de cette requête, ou null (29/09) : d'abord une session d'équipe
 * (lien copié depuis l'administration, lib/team.ts), sinon une session Supabase (lien magique)
 * dont l'adresse est celle du propriétaire (ADMIN_EMAIL) ou d'un membre ajouté par lui.
 */
export async function adminEmail(): Promise<string | null> {
  const equipe = await emailSession();
  if (equipe) return equipe;
  const user = await getSessionUser();
  if (!user) return null;
  if (process.env.NODE_ENV === 'development' && user.email === DEV_OWNER_EMAIL) return user.email;
  return (await estMembre(user.email)) ? user.email.toLowerCase() : null;
}
export async function isAdmin() {
  return Boolean(await adminEmail());
}
/**
 * Schéma posé au premier usage sans gêner le service (19/10, D14). Au plus une fois par instance et
 * par partie, une lecture du catalogue système (aucun verrou) dit s’il manque quelque chose ; alors
 * seulement, les instructions passent dans une transaction avec lock_timeout = 2 s : derrière une
 * lecture longue, l’ALTER TABLE abandonne au lieu d’empiler toutes les requêtes de la table derrière
 * lui. Après un échec, nouvel essai cinq minutes plus tard. Le même SQL, complet, est dans
 * drizzle/0006_schema_du_service.sql, à passer une fois par le propriétaire.
 */
declare global {
  // eslint-disable-next-line no-var
  var __schemaReady: Map<string, { done: Promise<boolean>; failedAt: number }> | undefined;
}
export function ensureSchema(name: string, missing: string, apply: string[]): Promise<boolean> {
  const memo = (globalThis.__schemaReady ??= new Map());
  const known = memo.get(name);
  if (known && !(known.failedAt && Date.now() - known.failedAt > 300000)) return known.done;
  const entry = { done: Promise.resolve(false), failedAt: 0 };
  entry.done = (async () => {
    const database = await db();
    if (!Number(await database.prepare(missing).first<number>('missing'))) return true;
    await database.batch([database.prepare("SET LOCAL lock_timeout = '2s'"), ...apply.map((sql) => database.prepare(sql))]);
    return true;
  })().catch((error) => {
    entry.failedAt = Date.now();
    console.error('schéma', name, (error as { code?: string }).code || '', (error as Error).message);
    return false;
  });
  memo.set(name, entry);
  return entry.done;
}

/** Le relevé du club partagé par toutes les instances (lib/club-sync.ts). */
export const ensureClubTable = () =>
  ensureSchema(
    'club_snapshot',
    "SELECT (CASE WHEN to_regclass('club_snapshot') IS NULL THEN 1 ELSE 0 END) + (SELECT count(*) FROM pg_class WHERE oid = to_regclass('club_snapshot') AND NOT relrowsecurity) AS missing",
    [
      "CREATE TABLE IF NOT EXISTS club_snapshot (id text PRIMARY KEY, payload text NOT NULL, synced_at text NOT NULL DEFAULT '', read_at bigint NOT NULL)",
      'ALTER TABLE club_snapshot ENABLE ROW LEVEL SECURITY',
    ],
  );

/** Une seule lecture par requête : les métadonnées et la page partagent le résultat. */
async function readCatalogFromDb(): Promise<{ products: Product[]; club: Snapshot | null }> {
  const database = await db();
  const [entries, overrides, clubRow] = await Promise.all([
    database
      .prepare('SELECT id,payload,archived,updated_at FROM catalog_entries')
      .all<{
        id: string;
        payload: string;
        archived: number;
        updated_at: string;
      }>(),
    database
      .prepare(
        'SELECT product_id,name,description,price_cents,updated_at FROM product_overrides',
      )
      .all<{
        product_id: string;
        name: string;
        description: string;
        price_cents: number;
        updated_at: string;
      }>(),
    // Table pas encore créée (première mise en ligne) : pas de relevé, le premier relevé la crée.
    database
      .prepare("SELECT payload,synced_at,read_at FROM club_snapshot WHERE id='materiel'")
      .first<ClubRow>()
      .catch(() => null),
  ]);
  const all = new Map(products.map((p) => [p.id, p]));
  for (const e of entries.results) {
    if (e.archived) all.delete(e.id);
    else {
      // Une entrée illisible ne fait pas tomber tout le catalogue : elle est ignorée et signalée.
      try {
        all.set(e.id, { ...JSON.parse(e.payload), updatedAt: e.updated_at });
      } catch {
        console.error('catalogue : entrée illisible', e.id);
      }
    }
  }
  // Index par identifiant : lecture O(1) au lieu d’un find() sur 1 000 lignes.
  const overrideById = new Map(overrides.results.map((o) => [o.product_id, o]));
  return {
    club: snapshotFromRow(clubRow),
    products: [...all.values()].map((p) => {
      const o = overrideById.get(p.id);
      return o
        ? {
            ...p,
            name: o.name,
            description: o.description,
            price: o.price_cents,
            updatedAt: o.updated_at,
          }
        : p;
    }),
  };
}

/**
 * Relit le club et réécrit le relevé partagé (une ligne, une date), en arrière-plan : la page n’attend
 * jamais le club. Une relecture à la fois par instance, et une minute de pause après un échec ; si le
 * club ne répond pas, le relevé en base reste celui de toutes les instances.
 */
function refreshClubLater() {
  const s = clubState();
  if (s.pending || Date.now() - s.failedAt < 60000) return;
  s.pending = (async () => {
    try {
      const data = await fetchClub();
      await ensureClubTable();
      await (await db())
        .prepare(
          "INSERT INTO club_snapshot(id,payload,synced_at,read_at) VALUES ('materiel',?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,synced_at=excluded.synced_at,read_at=excluded.read_at",
        )
        .bind(JSON.stringify(data.products), data.syncedAt, Date.now())
        .run();
      // Cette instance voit le nouveau relevé à sa prochaine lecture ; les autres dans la minute (mémo).
      bustCatalog();
    } catch (error) {
      s.failedAt = Date.now();
      console.error('club sync', error instanceof Error ? error.message : 'erreur');
    } finally {
      s.pending = null;
    }
  })();
  try {
    // Après la réponse, sans la retarder ; la fonction reste en vie jusqu’à la fin du relevé.
    after(s.pending);
  } catch {
    /* hors requête (script, construction) : la promesse suit son cours */
  }
}

// Mémo en mémoire, partagé entre les requêtes d’une même instance : le catalogue
// (~2,6 Mo sérialisé) dépasse la limite de 2 Mo du cache de données de Next, donc
// on le garde ici. Sur globalThis, pas dans une variable de module : le rendu des
// pages (composants serveur) et les routes d’API sont empaquetés séparément et ne
// partageraient pas une variable de module ; globalThis est unique par instance,
// donc bustCatalog() vu par les deux. TTL court, et vidé sur-le-champ aux éditions.
const CATALOG_TTL = 60000;
declare global {
  // eslint-disable-next-line no-var
  var __catalogMemo: { at: number; data: Product[] } | null | undefined;
}
/** Vide le mémo du catalogue : à appeler après chaque écriture de l’atelier. */
export function bustCatalog() {
  globalThis.__catalogMemo = null;
}

/** Marque d’un catalogue servi sans la base (fichiers, ou dernier catalogue connu de l’instance). */
const SECOURS = Symbol.for('boutique.catalogueDeSecours');
/**
 * Vrai quand ce catalogue a été servi sans la base (19/10, D30) : il manque alors les produits de
 * l’atelier et les prix modifiés. Une réponse bâtie dessus ne se met pas en cache pour des heures.
 */
export const catalogueDeSecours = (catalog: Product[]) => Boolean((catalog as Product[] & { [SECOURS]?: true })[SECOURS]);
/** Cache d’une réponse bâtie sur le catalogue de secours : une minute au CDN, rien au navigateur. */
export const CACHE_SECOURS = 'public, max-age=0, s-maxage=60, must-revalidate';
/** L’en-tête Cache-Control d’une réponse bâtie sur ce catalogue : `normal`, ou une minute au plus sur le secours. */
export const cacheCatalogue = (catalog: Product[], normal: string) => (catalogueDeSecours(catalog) ? CACHE_SECOURS : normal);
const deSecours = (catalog: Product[]): Product[] => Object.defineProperty([...catalog], SECOURS, { value: true });

async function readCatalogOnce(): Promise<Product[]> {
  const memo = globalThis.__catalogMemo;
  if (memo && Date.now() - memo.at < CATALOG_TTL) return memo.data;
  try {
    // Chaque modèle emporte sa photo détourée quand elle existe (lib/cutouts.ts).
    // Les treize références du club suivent le relevé partagé, lu en base avec le catalogue (lib/club-sync.ts).
    const { products: fromDb, club } = await readCatalogFromDb();
    if (club) clubState().snapshot = club;
    if (!club || Date.now() - club.at > CLUB_TTL) refreshClubLater();
    const data = applyClub(fromDb, club).map(withCutout);
    globalThis.__catalogMemo = { at: Date.now(), data };
    return data;
  } catch (error) {
    // Base injoignable ou non migrée : le dernier catalogue connu, sinon celui des fichiers.
    // Panier, alertes, demandes et atelier répondent 503 tant que la base manque.
    const e = error as { name?: string; code?: string; message?: string };
    console.error('Catalogue storage unavailable, serving the file catalogue', e?.name || 'StorageError', e?.code || '', String(e?.message || '').slice(0, 160));
    return deSecours(globalThis.__catalogMemo?.data ?? applyClub(products, clubState().snapshot).map(withCutout));
  }
}
export const readCatalog = cache(readCatalogOnce);
/** Le catalogue relu sans aucun mémo : pour trancher un écart de prix avant de répondre « Le panier a changé ». */
export async function readCatalogFresh(): Promise<Product[]> {
  bustCatalog();
  return readCatalogOnce();
}
