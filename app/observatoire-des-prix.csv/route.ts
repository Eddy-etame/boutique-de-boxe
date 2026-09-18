import { readCatalog } from '@/lib/database';
import { observatory, observatoryCsv } from '@/lib/observatory';

/** L’observatoire des prix en CSV (séparateur « ; », prix en euros), pour un tableur. */
export const dynamic = 'force-dynamic';
let memo: { at: number; body: string } | null = null;

export async function GET() {
  if (!memo || Date.now() - memo.at > 300000) memo = { at: Date.now(), body: '﻿' + observatoryCsv(observatory(await readCatalog())) };
  return new Response(memo.body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'inline; filename="observatoire-des-prix-boutique-de-boxe.csv"',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
