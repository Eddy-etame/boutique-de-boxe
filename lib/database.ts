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
const KEEP_UPPER = new Set(['MMA', 'JJB', 'BJJ', 'UFC', 'FFB', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'K1', 'PU', 'EVA', 'BS', 'WB', 'WBC', 'IBF', 'WBO', 'ONE']);
/** Noms de flux fournisseurs (capitales, codes) rendus lisibles ; les 19 fiches d’origine ne bougent pas. */
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
function caseWord(w: string, first: boolean): string {
  const bare = w.replace(/[^A-Za-zÀ-ÿ0-9]/g, '');
  if (!bare) return w;
  if (KEEP_UPPER.has(bare.toUpperCase())) return w.toUpperCase();
  const shouty = /^[A-ZÀ-Ý0-9/&.'’-]+$/.test(w) && /[A-ZÀ-Ý]{3,}/.test(w) && !/\d/.test(w);
  if (!shouty) return first ? cap(w) : w;
  const lower = w.toLowerCase();
  return first ? cap(lower) : lower;
}
export function humanName(name: string, brand: string): string {
  let n = name.replace(/\s+/g, ' ').trim();
  // codes fournisseur : au moins cinq caractères, avec un chiffre, sans voyelle minuscule
  n = n.replace(/\s+\b(?=[A-Z0-9-]{5,}\b)(?=[A-Z0-9-]*\d)[A-Z0-9-]+\b/g, '');
  n = n.replace(/\s*-\s+/g, ', ').replace(/\s*,\s*,/g, ',').replace(/[,\s]+$/, '');
  const b = brand.trim();
  const brandDisplay = b.split(' ').map((w) => caseWord(w, true)).join(' ');
  const marker = '§BRAND§';
  if (b) {
    const re = new RegExp('\\b' + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    let seen = 0;
    n = n.replace(re, () => (seen++ === 0 ? marker : '')).replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',').trim();
  }
  n = n.split(' ').map((w, i) => (w === marker ? brandDisplay : caseWord(w, i === 0))).join(' ');
  return n.replace(/\s{2,}/g, ' ').trim();
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
    return [...all.values()].map((p) => (p.id.startsWith('bs-') || p.id.startsWith('lcd') ? { ...p, name: humanName(p.name, p.brand) } : p)).map((p) => {
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
    console.error('Catalogue storage unavailable', error instanceof Error ? error.name : 'StorageError');
    throw new Error('Le catalogue est temporairement indisponible. Réessayez dans quelques instants.');
  }
}
