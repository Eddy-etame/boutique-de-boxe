import { db, isAdmin, readCatalog } from '@/lib/database';
import { clientIp } from '@/lib/request';
import { categoryFor } from '@/lib/catalog';
import { SUBFAMILIES } from '@/lib/subfamilies';

/**
 * Mesure d’audience maison.
 *
 * POST : un événement envoyé par le navigateur, seulement si le visiteur a
 * accepté les cookies (cookie bdb_consent=accepted). Aucune adresse IP n’est
 * conservée ; l’IP sert uniquement à limiter le débit, hachée par heure.
 *
 * GET : les agrégats pour l’atelier (administrateur connecté) : pages vues,
 * sessions, entrées, sorties, enchaînements, modèles vus, conversions,
 * recherches, appareils, provenances.
 */
export const dynamic = 'force-dynamic';

const TYPES = new Set(['view', 'leave', 'click', 'add_to_cart', 'alert_submit', 'contact_submit', 'search', 'filter', 'consent']);
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
const cookie = (request: Request, name: string) => request.headers.get('cookie')?.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'))?.[1];

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  const database = await db();
  await database.prepare('CREATE TABLE IF NOT EXISTS events (id text PRIMARY KEY, vid text NOT NULL, sid text NOT NULL, type text NOT NULL, path text NOT NULL, referrer text NOT NULL DEFAULT \'\', data text NOT NULL DEFAULT \'{}\', device text NOT NULL DEFAULT \'\', created_at text NOT NULL)').run();
  await database.prepare('CREATE INDEX IF NOT EXISTS events_created ON events (created_at)').run();
  await database.prepare('CREATE INDEX IF NOT EXISTS events_sid ON events (sid)').run();
  await database.prepare('CREATE INDEX IF NOT EXISTS events_path_type ON events (path, type)').run();
  // Meme regle que les autres tables : securite par ligne activee, le service seul lit et ecrit.
  await database.prepare('ALTER TABLE events ENABLE ROW LEVEL SECURITY').run();
  tableReady = true;
}

// Seules ces cles sont conservees ; les nombres sont bornes, les textes coupes.
const NUM_KEYS = new Set(['w', 'h', 'dwell', 'depth', 'results']);
const STR_KEYS = new Set(['lang', 'label', 'href', 'kind', 'zone', 'source', 'product', 'q', 'value']);
function clean(d: unknown): string {
  if (!d || typeof d !== 'object') return '{}';
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d as Record<string, unknown>)) {
    if (NUM_KEYS.has(k) && typeof v === 'number' && Number.isFinite(v)) out[k] = Math.max(0, Math.min(Math.round(v), 86400000));
    else if (STR_KEYS.has(k) && typeof v === 'string') out[k] = v.slice(0, 160);
    else if (k === 'first' && v === true) out[k] = true;
  }
  return JSON.stringify(out);
}

const device = (ua: string) => (/ipad|tablet/i.test(ua) ? 'tablette' : /mobi|android|iphone/i.test(ua) ? 'téléphone' : 'ordinateur');

export async function POST(request: Request) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Origine invalide.' }, 400);
  if (cookie(request, 'bdb_consent') !== 'accepted') return reply({ ok: false, reason: 'consent' }, 202);
  // Lecture bornée : on refuse un corps trop gros avant de le désérialiser.
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: 'Demande vide.' }, 400);
  let raw = '';
  let bytes = 0;
  const decoder = new TextDecoder();
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.length;
    if (bytes > 32000) {
      await reader.cancel();
      return reply({ error: 'Demande trop longue.' }, 413);
    }
    raw += decoder.decode(chunk.value, { stream: true });
  }
  raw += decoder.decode();
  let body: { events?: unknown[] } | null = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return reply({ error: 'Demande illisible.' }, 400);
  }
  const list = Array.isArray(body?.events) ? body!.events.slice(0, 25) : [];
  if (!list.length) return reply({ ok: true, stored: 0 });
  const database = await db();
  // limite : 600 événements par heure et par adresse
  const bucket = Math.floor(Date.now() / 3600000);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${clientIp(request)}:${bucket}:analytics`));
  const key = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  const hits = await database
    .prepare('INSERT INTO rate_limits(key,hits,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=rate_limits.hits+1 RETURNING hits')
    .bind(key, (bucket + 2) * 3600000)
    .first<number>('hits');
  if ((hits || 0) > 600) return reply({ error: 'Trop de demandes.' }, 429);
  await ensureTable();
  const dev = device(request.headers.get('user-agent') || '');
  const base = Date.now();
  // On rassemble les lignes valides puis on insère en un seul aller-retour.
  const rows: unknown[][] = [];
  for (const raw of list) {
    const e = raw as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    const type = str(e.t);
    const path = str(e.p);
    const sid = str(e.sid);
    const vid = cookie(request, 'bdb_vid') || str(e.vid);
    if (!TYPES.has(type) || !/^\/[^\s<>"']{0,200}$/.test(path) || /^\/(atelier|connexion|api)(\/|$)/.test(path) || !/^[a-z0-9-]{8,40}$/.test(sid) || !/^[a-z0-9-]{8,40}$/.test(vid)) continue;
    const referrer = typeof e.r === 'string' ? e.r.slice(0, 300) : '';
    const data = clean(e.d);
    const now = new Date(base + rows.length).toISOString();
    rows.push([crypto.randomUUID(), vid, sid, type, path, referrer, data, dev, now]);
  }
  if (rows.length) {
    const ph = rows.map(() => '(?,?,?,?,?,?,?,?,?)').join(',');
    await database
      .prepare(`INSERT INTO events(id,vid,sid,type,path,referrer,data,device,created_at) VALUES ${ph}`)
      .bind(...rows.flat())
      .run();
  }
  return reply({ ok: true, stored: rows.length });
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return reply({ error: 'Accès réservé.' }, 403);
  try {
    return await report(request);
  } catch (error) {
    console.error('analytics report', (error as Error).message);
    return reply({ error: 'Lecture de l’audience impossible pour le moment.' }, 500);
  }
}

async function report(request: Request) {
  const days = Math.min(Math.max(Number(new URL(request.url).searchParams.get('days')) || 30, 1), 365);
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const before = new Date(Date.now() - 2 * days * 86400000).toISOString();
  await ensureTable();
  const database = await db();
  const q = <T = Record<string, unknown>>(sql: string) => database.prepare(sql).bind(since).all<T>().then((r) => r.results);
  // La période précédente, de même longueur, pour lire les écarts — lancée avec les autres.
  const previousP = database
    .prepare(
      `SELECT
        (SELECT count(*)::int FROM events WHERE type='view' AND created_at>=? AND created_at<?) AS views,
        (SELECT count(DISTINCT sid)::int FROM events WHERE created_at>=? AND created_at<?) AS sessions,
        (SELECT count(DISTINCT vid)::int FROM events WHERE created_at>=? AND created_at<?) AS visitors,
        (SELECT round(avg((data::jsonb->>'dwell')::numeric)/1000)::int FROM events WHERE type='leave' AND created_at>=? AND created_at<?) AS dwell,
        (SELECT count(*)::int FROM (SELECT sid FROM events WHERE type='view' AND created_at>=? AND created_at<? GROUP BY sid HAVING count(*)=1) s) AS bounces`,
    )
    .bind(before, since, before, since, before, since, before, since, before, since)
    .first<Record<string, number>>();
  // Toutes ces lectures sont indépendantes : une seule vague au lieu de quatre.
  const addsP = q<{ path: string; n: number }>(`SELECT path, count(*)::int AS n FROM events WHERE type='add_to_cart' AND created_at>=? GROUP BY path`);
  const sessionsP = q<{ sid: string; started: string; ended: string; device: string; referrer: string; views: number }>(
    `SELECT sid, min(created_at) AS started, max(created_at) AS ended, max(device) AS device, max(referrer) AS referrer, count(*) FILTER (WHERE type='view')::int AS views
     FROM events WHERE created_at>=? GROUP BY sid HAVING count(*) FILTER (WHERE type='view') > 0 ORDER BY started DESC LIMIT 40`,
  );
  const productsP = readCatalog();

  const [totals, pages, entries, exits, transitions, conversions, devices, referrers, searches, byDay, previous, adds, sessions, products] = await Promise.all([
    database
      .prepare(
        `SELECT
          (SELECT count(*)::int FROM events WHERE type='view' AND created_at>=?) AS views,
          (SELECT count(DISTINCT sid)::int FROM events WHERE created_at>=?) AS sessions,
          (SELECT count(DISTINCT vid)::int FROM events WHERE created_at>=?) AS visitors,
          (SELECT round(avg((data::jsonb->>'dwell')::numeric)/1000)::int FROM events WHERE type='leave' AND created_at>=?) AS dwell,
          (SELECT count(*)::int FROM (SELECT sid FROM events WHERE type='view' AND created_at>=? GROUP BY sid HAVING count(*)=1) s) AS bounces`,
      )
      .bind(since, since, since, since, since)
      .first<Record<string, number>>(),
    database
      .prepare(
        `SELECT v.path, count(*)::int AS views, count(DISTINCT v.sid)::int AS sessions, l.dwell, l.depth
         FROM events v
         LEFT JOIN (
           SELECT path,
             round(avg((data::jsonb->>'dwell')::numeric)/1000)::int AS dwell,
             round(avg((data::jsonb->>'depth')::numeric))::int AS depth
           FROM events WHERE type='leave' AND created_at>=? GROUP BY path
         ) l ON l.path=v.path
         WHERE v.type='view' AND v.created_at>=?
         GROUP BY v.path, l.dwell, l.depth ORDER BY views DESC LIMIT 40`,
      )
      .bind(since, since)
      .all<{ path: string; views: number; sessions: number; dwell: number | null; depth: number | null }>()
      .then((r) => r.results),
    q<{ path: string; n: number }>(`SELECT path, count(*)::int AS n FROM (SELECT sid, path, row_number() OVER (PARTITION BY sid ORDER BY created_at ASC) rn FROM events WHERE type='view' AND created_at>=?) t WHERE rn=1 GROUP BY path ORDER BY n DESC LIMIT 15`),
    q<{ path: string; n: number }>(`SELECT path, count(*)::int AS n FROM (SELECT sid, path, row_number() OVER (PARTITION BY sid ORDER BY created_at DESC) rn FROM events WHERE type='view' AND created_at>=?) t WHERE rn=1 GROUP BY path ORDER BY n DESC LIMIT 15`),
    q<{ from_path: string; to_path: string; n: number }>(`SELECT from_path, to_path, count(*)::int AS n FROM (SELECT lag(path) OVER (PARTITION BY sid ORDER BY created_at) AS from_path, path AS to_path FROM events WHERE type='view' AND created_at>=?) t WHERE from_path IS NOT NULL AND from_path<>to_path GROUP BY from_path, to_path ORDER BY n DESC LIMIT 25`),
    q<{ type: string; n: number }>(`SELECT type, count(*)::int AS n FROM events WHERE created_at>=? AND type NOT IN ('view','leave') GROUP BY type ORDER BY n DESC`),
    q<{ device: string; n: number }>(`SELECT device, count(DISTINCT sid)::int AS n FROM events WHERE created_at>=? GROUP BY device ORDER BY n DESC`),
    q<{ host: string; n: number }>(`SELECT COALESCE(NULLIF(substring(referrer from '^https?://([^/]+)'), ''), 'accès direct') AS host, count(DISTINCT sid)::int AS n FROM events WHERE type='view' AND created_at>=? AND referrer NOT LIKE '%boutique-de-boxe%' GROUP BY host ORDER BY n DESC LIMIT 15`),
    q<{ query: string; n: number; none: number }>(`SELECT lower(data::jsonb->>'q') AS query, count(*)::int AS n, sum(CASE WHEN (data::jsonb->>'results')='0' THEN 1 ELSE 0 END)::int AS none FROM events WHERE type='search' AND created_at>=? AND (data::jsonb->>'q')<>'' GROUP BY query ORDER BY n DESC LIMIT 25`),
    q<{ day: string; views: number; sessions: number }>(`SELECT substring(created_at from 1 for 10) AS day, count(*)::int AS views, count(DISTINCT sid)::int AS sessions FROM events WHERE type='view' AND created_at>=? GROUP BY day ORDER BY day`),
    previousP,
    addsP,
    sessionsP,
    productsP,
  ]);

  // Noms lisibles pour les fiches, familles et sous-familles ; modèles vus sans ajout au panier.
  const nameOf = (path: string) => {
    const m = path.match(/^\/produits\/([^/]+)\/?$/);
    if (m) return products.find((p) => p.slug === m[1])?.name || path;
    const slug = path.replace(/^\/|\/$/g, '');
    return categoryFor(slug)?.name || SUBFAMILIES.find((s) => s.slug === slug)?.name || (path === '/' ? 'Accueil' : path);
  };

  // Parcours : les 40 dernières visites, page par page, avec le temps passé et ce qui s’y est fait.
  type Step = { sid: string; type: string; path: string; data: string; created_at: string };
  const steps = sessions.length
    ? (
        await database
          .prepare(
            `SELECT sid, type, path, data, created_at FROM events WHERE sid IN (${sessions.map(() => '?').join(',')}) AND type IN ('view','leave','add_to_cart','search','alert_submit','contact_submit','click') ORDER BY created_at ASC`,
          )
          .bind(...sessions.map((s) => s.sid))
          .all<Step>()
      ).results
    : [];
  const host = (r: string) => r.match(/^https?:\/\/([^/]+)/)?.[1] || (r ? r.slice(0, 40) : 'accès direct');
  const journeys = sessions.map((s) => {
    const own = steps.filter((e) => e.sid === s.sid);
    const pages: { path: string; name: string; dwell: number | null; marks: string[] }[] = [];
    for (const e of own) {
      let d: Record<string, unknown> = {};
      try { d = JSON.parse(e.data || '{}'); } catch { /* données illisibles */ }
      const last = pages[pages.length - 1];
      if (e.type === 'view') pages.push({ path: e.path, name: nameOf(e.path), dwell: null, marks: [] });
      else if (e.type === 'leave' && last && last.path === e.path) last.dwell = typeof d.dwell === 'number' ? Math.round(d.dwell / 1000) : last.dwell;
      else if (e.type === 'add_to_cart' && last) last.marks.push('ajout au panier');
      else if (e.type === 'search' && last && typeof d.q === 'string') last.marks.push('recherche « ' + d.q.slice(0, 40) + ' »' + (d.results === 0 ? ' (sans résultat)' : ''));
      else if (e.type === 'alert_submit' && last) last.marks.push('alerte demandée');
      else if (e.type === 'contact_submit' && last) last.marks.push('contact envoyé');
      else if (e.type === 'click' && last && d.zone === 'hero' && typeof d.label === 'string') last.marks.push('clic hero « ' + d.label.slice(0, 30) + ' »');
    }
    return { sid: s.sid, started: s.started, ended: s.ended, device: s.device, from: host(s.referrer || ''), views: s.views, converted: own.some((e) => e.type === 'add_to_cart' || e.type === 'alert_submit' || e.type === 'contact_submit'), pages };
  });
  const addByPath = new Map(adds.map((a) => [a.path, a.n]));
  const productViews = pages.filter((p) => p.path.startsWith('/produits/')).map((p) => ({ ...p, name: nameOf(p.path), adds: addByPath.get(p.path) || 0 }));
  const label = (rows: { path: string }[]) => rows.map((r) => ({ ...r, name: nameOf(r.path) }));

  return reply({
    days,
    since,
    totals: { ...totals, bounceRate: totals?.sessions ? Math.round((Number(totals.bounces) / Number(totals.sessions)) * 100) : 0 },
    previous: { ...previous, bounceRate: previous?.sessions ? Math.round((Number(previous.bounces) / Number(previous.sessions)) * 100) : 0 },
    byDay,
    pages: label(pages),
    entries: label(entries),
    exits: label(exits),
    transitions: transitions.map((t) => ({ ...t, from: nameOf(t.from_path), to: nameOf(t.to_path) })),
    products: productViews,
    suggestions: {
      viewedNotAdded: productViews.filter((p) => p.adds === 0).slice(0, 10),
      strongExits: label(exits).slice(0, 5),
      searchesWithoutResult: searches.filter((s) => s.none > 0).slice(0, 10),
    },
    conversions,
    devices,
    referrers,
    searches,
    journeys,
  });
}
