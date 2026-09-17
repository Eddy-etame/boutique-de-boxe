import { cache } from 'react';
import type { PayplugEnvironment } from './payplug';
import type { Product } from './catalog';
import original from './data/products.json';
import imported from './data/imported-products.json';
const products = [...original,...imported] as unknown as Product[];
import { getSessionUser, DEV_OWNER_EMAIL } from './auth';
import { d1Compat, type D1Database } from '@/db';
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
export async function isAdmin() {
  const user = await getSessionUser();
  if (!user) return false;
  const env = await runtime();
  return Boolean(
    (env.ADMIN_EMAIL &&
      user.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase()) ||
    (process.env.NODE_ENV === 'development' &&
      user.email === DEV_OWNER_EMAIL),
  );
}
/** Une seule lecture par requête : les métadonnées et la page partagent le résultat. */
async function readCatalogFromDb(): Promise<Product[]> {
  const database = await db();
  const [entries, overrides] = await Promise.all([
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
  ]);
  const all = new Map(products.map((p) => [p.id, p]));
  for (const e of entries.results) {
    if (e.archived) all.delete(e.id);
    else all.set(e.id, { ...JSON.parse(e.payload), updatedAt: e.updated_at });
  }
  // Index par identifiant : lecture O(1) au lieu d’un find() sur 1 000 lignes.
  const overrideById = new Map(overrides.results.map((o) => [o.product_id, o]));
  return [...all.values()].map((p) => {
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
  });
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

export const readCatalog = cache(async function readCatalogOnce(): Promise<Product[]> {
  const memo = globalThis.__catalogMemo;
  if (memo && Date.now() - memo.at < CATALOG_TTL) return memo.data;
  try {
    const data = await readCatalogFromDb();
    globalThis.__catalogMemo = { at: Date.now(), data };
    return data;
  } catch (error) {
    // Base injoignable ou non migrée : le dernier catalogue connu, sinon celui des fichiers.
    // Panier, alertes, demandes et atelier répondent 503 tant que la base manque.
    console.error('Catalogue storage unavailable, serving the file catalogue', error instanceof Error ? error.name : 'StorageError');
    return globalThis.__catalogMemo?.data ?? products;
  }
});
