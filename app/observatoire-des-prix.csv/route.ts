import { readCatalog, CACHE_SECOURS, catalogueDeSecours } from '@/lib/database';
import { observatory, observatoryCsv } from '@/lib/observatory';

/** L’observatoire des prix en CSV (séparateur « ; », prix en euros), pour un tableur. */
export const dynamic = 'force-dynamic';
let memo: { at: number; body: string; secours: boolean } | null = null;

export async function GET() {
  // Sans la base (catalogue de secours) : recomposé à chaque fois, et une minute de cache au plus (D30).
  if (!memo || memo.secours || Date.now() - memo.at > 300000) {
    const catalog = await readCatalog();
    memo = { at: Date.now(), body: '﻿' + observatoryCsv(observatory(catalog)), secours: catalogueDeSecours(catalog) };
  }
  return new Response(memo.body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'inline; filename="observatoire-des-prix-boutique-de-boxe.csv"',
      'Cache-Control': memo.secours ? CACHE_SECOURS : 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
