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
export const readCatalog = cache(async function readCatalogOnce(): Promise<Product[]> {
  try {
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
    return [...all.values()].map((p) => {
      const o = overrides.results.find((o) => o.product_id === p.id);
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
  } catch (error) {
    // Base injoignable ou non migrée : le catalogue des fichiers reste lisible.
    // Panier, alertes, demandes et atelier répondent 503 tant que la base manque.
    console.error('Catalogue storage unavailable, serving the file catalogue', error instanceof Error ? error.name : 'StorageError');
    return products;
  }
});
