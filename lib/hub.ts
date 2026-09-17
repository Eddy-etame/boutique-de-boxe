import type { Product } from './catalog';
import { db } from './database';

/**
 * Les « tops » des pages-piliers, tous vrais.
 *
 *   La sélection de la semaine : un choix éditorial tournant. Le tirage est déterministe (page +
 *   année + numéro de semaine ISO) : tout le monde voit la même sélection, elle change chaque lundi,
 *   et elle varie les marques. Rien n’y prétend être une vente.
 *
 *   Les plus consultés : tirés de la mesure d’audience maison, sept derniers jours, en visites
 *   distinctes. Affichés seulement quand il y a assez de visites pour que cela veuille dire quelque
 *   chose ; sinon le bloc n’existe pas.
 *
 * Jamais de « meilleures ventes » avant des ventes : ce serait une allégation trompeuse.
 */
export function isoWeek(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  // Jeudi de la semaine : il donne l’année ISO.
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week, monday, sunday };
}

export function weekLabel(now = new Date()) {
  const { week, monday, sunday } = isoWeek(now);
  const day = (x: Date) => x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  return { week, range: `du ${day(monday)} au ${day(sunday)}` };
}

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function weeklySelection(scope: string, items: Product[], count = 4, now = new Date()): Product[] {
  const { year, week } = isoWeek(now);
  const rand = seeded(`${scope}:${year}:${week}`);
  // Une photo détourée et posée d’abord : la sélection est une vitrine.
  const pool = items.filter((p) => p.cut?.mode === 'pose' && p.price > 0);
  const source = (pool.length >= count ? pool : items).map((p) => ({ p, k: rand() })).sort((a, b) => a.k - b.k).map((x) => x.p);
  const picked: Product[] = [];
  const brands = new Set<string>();
  for (const p of source) {
    if (picked.length === count) break;
    if (brands.has(p.brand)) continue;
    brands.add(p.brand);
    picked.push(p);
  }
  // Une famille d’une seule marque : on complète sans la contrainte de marque.
  for (const p of source) {
    if (picked.length === count) break;
    if (!picked.includes(p)) picked.push(p);
  }
  return picked;
}

declare global {
  var __hubViews: { at: number; rows: { path: string; n: number }[] } | undefined;
}
const VIEWS_TTL = 10 * 60 * 1000;

/** Visites distinctes par fiche sur sept jours, relues au plus toutes les dix minutes. */
async function productViews(): Promise<{ path: string; n: number }[]> {
  const memo = globalThis.__hubViews;
  if (memo && Date.now() - memo.at < VIEWS_TTL) return memo.rows;
  try {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const rows = (
      await (await db())
        .prepare("SELECT path, count(DISTINCT sid)::int AS n FROM events WHERE type='view' AND path LIKE '/produits/%' AND created_at >= ? GROUP BY path ORDER BY n DESC LIMIT 300")
        .bind(since)
        .all<{ path: string; n: number }>()
    ).results;
    globalThis.__hubViews = { at: Date.now(), rows };
    return rows;
  } catch {
    // Table absente ou base injoignable : pas de bloc, jamais une erreur sur la page.
    globalThis.__hubViews = { at: Date.now(), rows: [] };
    return [];
  }
}

/** Les plus consultés de la page : au moins quatre modèles, chacun vu par au moins trois visites distinctes. */
export async function mostViewed(items: Product[], count = 4): Promise<Product[]> {
  const bySlug = new Map(items.map((p) => ['/produits/' + p.slug + '/', p]));
  const seen = (await productViews()).filter((r) => r.n >= 3 && bySlug.has(r.path)).slice(0, count);
  return seen.length >= count ? seen.map((r) => bySlug.get(r.path)!) : [];
}
