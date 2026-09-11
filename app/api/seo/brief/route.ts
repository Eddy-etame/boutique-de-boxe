import { isAdmin } from '@/lib/database';
import { briefCoverage } from '@/lib/brief';

/** Couverture des mots-clés du brief pour l’atelier ; réservé à l’administrateur. */
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: 'Accès réservé.' }, { status: 403, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  const rows = briefCoverage();
  return Response.json({ rows, covered: rows.filter((r) => r.ok).length, total: rows.length }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
