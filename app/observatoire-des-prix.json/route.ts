import { readCatalog } from '@/lib/database';
import { shop } from '@/lib/catalog';
import { observatory, observatorySentences } from '@/lib/observatory';

/** L’observatoire des prix en JSON : le même relevé que la page, pour les comparateurs, les chercheurs et les moteurs de réponse. */
export const dynamic = 'force-dynamic';
let memo: { at: number; body: string } | null = null;

export async function GET() {
  if (!memo || Date.now() - memo.at > 300000) {
    const o = observatory(await readCatalog());
    memo = {
      at: Date.now(),
      body: JSON.stringify({
        name: 'Observatoire des prix du matériel de boxe et de MMA',
        source: shop.name,
        url: shop.origin + '/observatoire-des-prix/',
        license: 'CC BY 4.0 — citer « Observatoire des prix, Boutique de Boxe » avec le lien',
        ...o,
        summary: observatorySentences(o),
        unit: 'centimes d’euro (min, q1, median, mean, q3, max)',
      }),
    };
  }
  return new Response(memo.body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
