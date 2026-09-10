import { db, isAdmin, readCatalog } from '@/lib/database';
import ledger from '@/lib/data/import-ledger.json';
export const dynamic = 'force-dynamic';
const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
    },
  });
export async function GET(request: Request) {
  try {
    if (!(await isAdmin())) return reply({ error: 'Accès réservé.' }, 403);
    const query = new URL(request.url).searchParams;
    const q = (query.get('q') || '')
      .slice(0, 120)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const source = query.get('source') || '',
      state = query.get('state') || '';
    const products = await readCatalog();
    const active = new Set(products.map((p) => p.id));
    const archived = new Set(
      (
        await (
          await db()
        )
          .prepare('SELECT id FROM catalog_entries WHERE archived=1')
          .all<{ id: string }>()
      ).results.map((p) => p.id),
    );
    const all = ledger.map((p) => ({
      ...p,
      publication: active.has(p.id)
        ? 'published'
        : archived.has(p.id)
          ? 'archived'
          : p.publication,
    }));
    const filtered = all.filter(
      (p) =>
        (!source || p.source === source) &&
        (!state || p.publication === state) &&
        (!q ||
          (p.name + ' ' + p.id)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .includes(q)),
    );
    const pages = Math.max(1, Math.ceil(filtered.length / 40));
    const raw = Number(query.get('page'));
    const page =
      Number.isSafeInteger(raw) && raw > 0 ? Math.min(raw, pages) : 1;
    return reply({
      items: filtered.slice((page - 1) * 40, page * 40),
      total: filtered.length,
      page,
      pages,
      counts: {
        collected: all.length,
        ready: all.filter((p) => ['ready', 'published'].includes(p.publication))
          .length,
        review: all.filter((p) => p.publication === 'review').length,
      },
    });
  } catch {
    return reply(
      { error: 'Le registre est temporairement indisponible.' },
      503,
    );
  }
}
