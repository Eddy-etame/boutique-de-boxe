import type { Product } from './catalog';

/**
 * Synchronisation avec la boutique du club (boutique.boxingcenter.fr).
 *
 * Treize références sont vendues aux deux endroits. La boutique du club fait foi : son catalogue
 * public (`/api/materiel`) donne le prix, le prix barré et l’état de chaque référence. Ici, on le
 * relit toutes les quinze minutes et le prix du club remplace le nôtre à la lecture du catalogue.
 *
 * Jamais bloquant : la page n’attend pas le club. Tant que la première lecture n’est pas revenue,
 * et si le club ne répond plus, le dernier relevé connu sert, sinon le prix du fichier. Un prix
 * aberrant (moins de la moitié ou plus du double du nôtre) n’est pas appliqué : il est signalé.
 */
const CLUB_URL = 'https://boutique.boxingcenter.fr/api/materiel';
const TTL = 15 * 60 * 1000;

export type ClubProduct = {
  id: string;
  name?: string;
  price_cents: number;
  price_was_cents?: number | null;
  active?: boolean;
  combinations?: { label?: string; name?: string }[];
};
type Snapshot = { at: number; syncedAt: string; products: Map<string, ClubProduct> };

declare global {
  var __clubSync: { snapshot: Snapshot | null; pending: Promise<void> | null; failedAt: number } | undefined;
}
const state = () => (globalThis.__clubSync ??= { snapshot: null, pending: null, failedAt: 0 });

async function refresh(): Promise<void> {
  const s = state();
  try {
    const res = await fetch(CLUB_URL, { signal: AbortSignal.timeout(8000), cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = (await res.json()) as { synced_at?: string; products?: ClubProduct[] };
    const rows = (data.products || []).filter((p) => p && typeof p.id === 'string' && Number.isInteger(p.price_cents) && p.price_cents > 0);
    if (!rows.length) throw new Error('catalogue vide');
    s.snapshot = { at: Date.now(), syncedAt: data.synced_at || '', products: new Map(rows.map((p) => [p.id, p])) };
  } catch (error) {
    s.failedAt = Date.now();
    console.error('club sync', error instanceof Error ? error.message : 'erreur');
  } finally {
    s.pending = null;
  }
}

/** Dernier relevé connu ; relance une lecture en arrière-plan quand il a vieilli. */
export function clubSnapshot(): Snapshot | null {
  const s = state();
  const stale = !s.snapshot || Date.now() - s.snapshot.at > TTL;
  // Après un échec, on laisse une minute avant de réessayer.
  if (stale && !s.pending && Date.now() - s.failedAt > 60000) s.pending = refresh();
  return s.snapshot;
}

/** Pour les scripts et l’atelier : attend la lecture en cours. */
export async function clubSnapshotNow(): Promise<Snapshot | null> {
  clubSnapshot();
  await state().pending;
  return state().snapshot;
}

export type ClubDifference = { id: string; field: 'prix' | 'absent du club' | 'inactif au club' | 'prix aberrant'; ours: string; club: string };

export function applyClub(products: Product[]): Product[] {
  const snap = clubSnapshot();
  if (!snap) return products;
  return products.map((p) => {
    const c = snap.products.get(p.id);
    if (!c || c.price_cents === p.price) return p;
    if (c.price_cents < p.price * 0.5 || c.price_cents > p.price * 2) return p;
    return { ...p, price: c.price_cents, variants: p.variants?.map((v) => (v.price === p.price ? { ...v, price: c.price_cents } : v)) };
  });
}

export function clubDifferences(fileProducts: Product[], snap: Snapshot): ClubDifference[] {
  const out: ClubDifference[] = [];
  const euro = (c: number) => (c / 100).toFixed(2).replace('.', ',') + ' €';
  for (const p of fileProducts.filter((x) => x.id.startsWith('mat-'))) {
    const c = snap.products.get(p.id);
    if (!c) out.push({ id: p.id, field: 'absent du club', ours: euro(p.price), club: '—' });
    else {
      if (c.active === false) out.push({ id: p.id, field: 'inactif au club', ours: 'publié', club: 'inactif' });
      if (c.price_cents !== p.price)
        out.push({ id: p.id, field: c.price_cents < p.price * 0.5 || c.price_cents > p.price * 2 ? 'prix aberrant' : 'prix', ours: euro(p.price), club: euro(c.price_cents) });
    }
  }
  return out;
}
