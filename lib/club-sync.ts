import type { Product } from './catalog';

/**
 * Synchronisation avec la boutique du club (boutique.boxingcenter.fr).
 *
 * Treize références sont vendues aux deux endroits. La boutique du club fait foi : son catalogue
 * public (`/api/materiel`) donne le prix, le prix barré et l’état de chaque référence.
 *
 * Un seul relevé pour toutes les instances (19/10, D12) : il est gardé en base (table club_snapshot,
 * une ligne, une date) et lu avec le catalogue, de façon synchrone. Chaque instance applique donc le
 * même prix : la fiche, le panier et le paiement ne se contredisent plus (« Le panier a changé »
 * au hasard d’une instance froide). Quand le relevé a plus de quinze minutes, l’instance qui le
 * remarque relit le club en arrière-plan et réécrit la ligne ; si le club ne répond plus, toutes
 * gardent le même dernier relevé. Sans base (panne), le dernier relevé lu par l’instance sert.
 *
 * Une référence désactivée au club est retirée de la vente ici aussi. Un prix aberrant (moins de la
 * moitié ou plus du double du nôtre) n’est pas appliqué : il est signalé (clubDifferences).
 */
const CLUB_URL = 'https://boutique.boxingcenter.fr/api/materiel';
export const CLUB_TTL = 15 * 60 * 1000;

export type ClubProduct = {
  id: string;
  name?: string;
  price_cents: number;
  price_was_cents?: number | null;
  active?: boolean;
  combinations?: { label?: string; name?: string }[];
};
export type Snapshot = { at: number; syncedAt: string; products: Map<string, ClubProduct> };
/** La ligne de la table club_snapshot. */
export type ClubRow = { payload: string; synced_at: string; read_at: number };

declare global {
  var __clubSync: { snapshot: Snapshot | null; pending: Promise<void> | null; failedAt: number } | undefined;
}
/** Le dernier relevé lu par cette instance (repli quand la base manque) et la relecture en cours. */
export const clubState = () => (globalThis.__clubSync ??= { snapshot: null, pending: null, failedAt: 0 });

/** Une référence exploitable : un identifiant, et un prix positif sauf si elle est désactivée. */
const usable = (p: ClubProduct | null | undefined): p is ClubProduct =>
  Boolean(p) &&
  typeof p!.id === 'string' &&
  (p!.active === false || (Number.isInteger(p!.price_cents) && p!.price_cents > 0));

/** La ligne gardée en base → relevé ; null si elle manque ou ne se lit pas. */
export function snapshotFromRow(row: ClubRow | null | undefined): Snapshot | null {
  if (!row?.payload) return null;
  try {
    const rows = (JSON.parse(row.payload) as ClubProduct[]).filter(usable);
    if (!rows.length) return null;
    return { at: Number(row.read_at) || 0, syncedAt: row.synced_at || '', products: new Map(rows.map((p) => [p.id, p])) };
  } catch {
    return null;
  }
}

/** Relit le catalogue public du club (8 s au plus) ; lève une erreur s’il ne répond pas ou s’il est vide. */
export async function fetchClub(): Promise<{ syncedAt: string; products: ClubProduct[] }> {
  // Cache de cinq minutes (13/10/2026) : « cache: 'no-store' » faisait échouer la régénération de l'accueil
  // (« Page changed from static to dynamic at runtime / », 500 vus en production) ; le relevé en base
  // tient déjà la fraîcheur, et les prix du club ne changent pas à la minute.
  const res = await fetch(CLUB_URL, { signal: AbortSignal.timeout(8000), next: { revalidate: 300 }, headers: { Accept: 'application/json' } });
  if (!res.ok) {
    await res.body?.cancel().catch(() => undefined);
    throw new Error('HTTP ' + res.status);
  }
  const data = (await res.json()) as { synced_at?: string; products?: ClubProduct[] };
  // Seuls les champs utiles sont gardés : identifiant, prix, prix barré, état.
  const products = (data.products || []).filter(usable).map(({ id, price_cents, price_was_cents, active }) => ({
    id,
    price_cents,
    price_was_cents: price_was_cents ?? null,
    ...(active === false ? { active: false } : {}),
  }));
  if (!products.length) throw new Error('catalogue vide');
  return { syncedAt: typeof data.synced_at === 'string' ? data.synced_at.slice(0, 40) : '', products };
}

/** Pour les scripts et l’atelier : relit le club tout de suite (sans passer par la base). */
export async function clubSnapshotNow(): Promise<Snapshot | null> {
  try {
    const data = await fetchClub();
    return { at: Date.now(), syncedAt: data.syncedAt, products: new Map(data.products.map((p) => [p.id, p])) };
  } catch {
    return clubState().snapshot;
  }
}

export type ClubDifference = { id: string; field: 'prix' | 'absent du club' | 'inactif au club' | 'prix aberrant'; ours: string; club: string };

/**
 * Le relevé appliqué au catalogue : prix du club, et retrait de la vente de ce que le club a
 * désactivé (fiche, listes, panier et paiement ne le proposent plus). Sans relevé : inchangé.
 */
export function applyClub(products: Product[], snap: Snapshot | null): Product[] {
  if (!snap) return products;
  const out: Product[] = [];
  for (const p of products) {
    const c = snap.products.get(p.id);
    if (!c) out.push(p);
    else if (c.active === false) continue;
    else if (c.price_cents === p.price || c.price_cents < p.price * 0.5 || c.price_cents > p.price * 2) out.push(p);
    else out.push({ ...p, price: c.price_cents, variants: p.variants?.map((v) => (v.price === p.price ? { ...v, price: c.price_cents } : v)) });
  }
  return out;
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
