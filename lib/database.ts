import { products, type Product } from './catalog';
import { getChatGPTUser } from '@/app/chatgpt-auth';
export async function runtime() {
  const { env } = await import('cloudflare:workers');
  return env as unknown as { DB: D1Database; ADMIN_EMAIL?: string };
}
export async function db() {
  return (await runtime()).DB;
}
export async function isAdmin() {
  const user = await getChatGPTUser();
  if (!user) return false;
  const env = await runtime();
  return Boolean(
    (env.ADMIN_EMAIL &&
      user.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase()) ||
    (process.env.NODE_ENV === 'development' &&
      user.email === 'seedy@sites.test'),
  );
}
export async function readCatalog(): Promise<Product[]> {
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
  } catch {
    return products;
  }
}
