import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * La mesure du maillage, privée : combien de liens internes chaque page reçoit, et lesquelles sont
 * orphelines. On ne pilote que ce qu'on mesure ; ce rapport ne sort jamais sur le site.
 *
 *   QA_ORIGIN=http://localhost:3100 node scripts/audit-links.mjs
 *   Sortie : outputs/links.json (par page : liens entrants, pages sources) et un résumé.
 *   Échoue si une page du plan du site reçoit moins de MIN liens entrants depuis d'autres pages.
 */
const base = process.env.QA_ORIGIN || 'http://localhost:3100';
const MIN = Number(process.env.MIN_INBOUND || 3);
const CONCURRENCY = Number(process.env.LINK_CONCURRENCY || 6);

const sitemap = await (await fetch(base + '/sitemap.xml')).text();
const pages = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
assert.ok(pages.length > 40, 'plan du site vide');
const known = new Set(pages);

const inbound = new Map(pages.map((p) => [p, new Set()]));
const outbound = new Map();
let done = 0;
async function crawl(path) {
  const r = await fetch(base + path, { headers: { 'x-forwarded-for': '203.0.113.9' } });
  if (r.status !== 200) return;
  const html = await r.text();
  // Le corps seulement : l'entête, le pied de page et les bandeaux lient tout le site, ils ne prouvent rien.
  const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] || '';
  const links = new Set();
  for (const m of main.matchAll(/href="(\/[^"#?]*)/g)) {
    const target = m[1].endsWith('/') ? m[1] : m[1] + '/';
    if (target !== path && known.has(target)) links.add(target);
  }
  outbound.set(path, links.size);
  for (const target of links) inbound.get(target).add(path);
}

const queue = [...pages];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const path = queue.shift();
      try {
        await crawl(path);
      } catch (error) {
        console.error('lecture impossible', path, error.message);
      }
      if (++done % 200 === 0) console.log(done + ' pages lues');
    }
  }),
);

const rows = pages.map((path) => ({ path, inbound: inbound.get(path).size, outbound: outbound.get(path) ?? 0, from: [...inbound.get(path)].slice(0, 12) }));
const orphans = rows.filter((r) => r.inbound < MIN && r.path !== '/');
const byKind = (p) => (p.startsWith('/produits/') ? 'produit' : p.startsWith('/guides/') ? 'guide' : p.startsWith('/marques/') ? 'marque' : 'page');
const summary = {};
for (const r of rows) {
  const k = byKind(r.path);
  summary[k] ??= { pages: 0, minInbound: Infinity, medianInbound: 0, orphans: 0, values: [] };
  summary[k].pages++;
  summary[k].values.push(r.inbound);
  summary[k].minInbound = Math.min(summary[k].minInbound, r.inbound);
  if (r.inbound < MIN) summary[k].orphans++;
}
for (const k of Object.keys(summary)) {
  const v = summary[k].values.sort((a, b) => a - b);
  summary[k].medianInbound = v[Math.floor(v.length / 2)];
  delete summary[k].values;
}
mkdirSync(new URL('../outputs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../outputs/links.json', import.meta.url), JSON.stringify({ base, date: new Date().toISOString(), min: MIN, summary, orphans, rows }, null, 2));
console.log(JSON.stringify({ pages: pages.length, min: MIN, summary, orphans: orphans.length, firstOrphans: orphans.slice(0, 15).map((o) => o.path + ' (' + o.inbound + ')') }, null, 2));
assert.equal(orphans.length, 0, orphans.length + ' page(s) reçoivent moins de ' + MIN + ' liens internes depuis le corps d’autres pages');
