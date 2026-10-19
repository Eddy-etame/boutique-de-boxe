import { readCatalog, CACHE_SECOURS, catalogueDeSecours } from '@/lib/database';
import { llmsTxt } from '@/lib/seo-text';

export const dynamic = 'force-dynamic';

// Mémo de rendu : le texte n’est recomposé qu’une fois par 5 min, même si la requête varie par une chaîne.
let memo: { at: number; body: string; secours: boolean } | null = null;

export async function GET() {
  // Sans la base (catalogue de secours) : recomposé à chaque fois, et une minute de cache au plus (D30).
  if (!memo || memo.secours || Date.now() - memo.at > 300000) {
    const catalog = await readCatalog();
    memo = { at: Date.now(), body: llmsTxt(catalog), secours: catalogueDeSecours(catalog) };
  }
  return new Response(memo.body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': memo.secours ? CACHE_SECOURS : 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
