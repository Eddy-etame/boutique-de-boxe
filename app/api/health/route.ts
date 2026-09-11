import postgres from 'postgres';

/**
 * État de la base, sans secret : le type de connexion configurée et la
 * catégorie de la panne, pour régler l’hébergement sans lire les journaux.
 */
export const dynamic = 'force-dynamic';

type Health = {
  db: 'ok' | 'no-url' | 'bad-url' | 'auth' | 'dns' | 'unreachable' | 'no-tables' | 'error';
  route: 'pooler' | 'direct' | 'local' | 'other' | 'none';
  port: number | null;
  tables: number;
  detail?: string;
  checkedAt: string;
};

function classify(url: string): Pick<Health, 'route' | 'port'> {
  try {
    const u = new URL(url);
    const port = Number(u.port || 5432);
    if (u.hostname.endsWith('pooler.supabase.com')) return { route: 'pooler', port };
    if (/^db\..*\.supabase\.co$/.test(u.hostname)) return { route: 'direct', port };
    if (/localhost|127\.0\.0\.1/.test(u.hostname)) return { route: 'local', port };
    return { route: 'other', port };
  } catch {
    return { route: 'none', port: null };
  }
}

export async function GET() {
  const checkedAt = new Date().toISOString();
  const url = process.env.DATABASE_URL?.trim();
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
  const answer = (h: Omit<Health, 'checkedAt'>, status = 200) =>
    Response.json({ ...h, checkedAt }, { status, headers });

  if (!url) return answer({ db: 'no-url', route: 'none', port: null, tables: 0 }, 503);
  const where = classify(url);
  if (where.route === 'none' || /\[YOUR-PASSWORD\]/i.test(url))
    return answer({ db: 'bad-url', ...where, tables: 0, detail: 'Chaîne de connexion incomplète.' }, 503);

  const sql = postgres(url, {
    max: 1,
    connect_timeout: 6,
    prepare: false,
    ssl: where.route === 'local' ? undefined : 'require',
  });
  try {
    const rows = await sql`select count(*)::int as n from pg_tables where schemaname = 'public'`;
    const tables = Number(rows[0]?.n ?? 0);
    return answer({ db: tables >= 8 ? 'ok' : 'no-tables', ...where, tables }, tables >= 8 ? 200 : 503);
  } catch (error) {
    const code = (error as { code?: string }).code || '';
    const message = String((error as Error).message || '');
    let db: Health['db'] = 'error';
    if (code === '28P01' || /password|authentication/i.test(message)) db = 'auth';
    else if (/ENOTFOUND|EAI_AGAIN/.test(code)) db = 'dns';
    else if (/CONNECT_TIMEOUT|ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENETUNREACH/.test(code) || /timeout/i.test(message)) db = 'unreachable';
    else if (code === '42P01') db = 'no-tables';
    return answer({ db, ...where, tables: 0, detail: code || (error as Error).name }, 503);
  } finally {
    void sql.end({ timeout: 1 }).catch(() => undefined);
  }
}
