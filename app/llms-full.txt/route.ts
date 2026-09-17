import { readCatalog } from '@/lib/database';
import { llmsFullTxt } from '@/lib/seo-text';

export const dynamic = 'force-dynamic';

// Mémo de rendu : le texte n’est recomposé qu’une fois par 5 min, même si la requête varie par une chaîne.
let memo: { at: number; body: string } | null = null;

export async function GET() {
  if (!memo || Date.now() - memo.at > 300000)
    memo = { at: Date.now(), body: llmsFullTxt(await readCatalog()) };
  return new Response(memo.body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
