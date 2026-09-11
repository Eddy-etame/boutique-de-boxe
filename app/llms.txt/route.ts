import { readCatalog } from '@/lib/database';
import { llmsTxt } from '@/lib/seo-text';

export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(llmsTxt(await readCatalog()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
  });
}
