import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
const og = JSON.parse(
  readFileSync(new URL('../lib/data/og.json', import.meta.url), 'utf8'),
);
const base = process.env.QA_ORIGIN || 'http://localhost:3000';
const sitemap = await (await fetch(base + '/sitemap.xml')).text();
const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
  (x) => new URL(x[1]).pathname,
);
assert.ok(locations.length >= 40);
const reports = [],
  titles = new Set(),
  descriptions = new Set(),
  internal = new Set();
for (let i = 0; i < locations.length; i += 4) {
  await Promise.all(
    locations.slice(i, i + 4).map(async (path) => {
      const r = await fetch(base + path);
      assert.equal(r.status, 200, path);
      assert.equal(
        new URL(r.url).pathname,
        path,
        'redirected sitemap URL ' + path,
      );
      const html = await r.text();
      assert.equal(
        (html.match(/<h1(?:\s|>)/g) || []).length,
        1,
        'one H1 ' + path,
      );
      const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
      const desc = html.match(
        /<meta name="description" content="([^"]+)"/,
      )?.[1];
      assert.ok(title && desc, 'metadata ' + path);
      assert.ok(!titles.has(title), 'duplicate title ' + path);
      assert.ok(!descriptions.has(desc), 'duplicate description ' + path);
      titles.add(title);
      descriptions.add(desc);
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      assert.equal(new URL(canonical).pathname, path, 'canonical ' + path);
      const structured = [
        ...html.matchAll(
          /<script type="application\/ld\+json">(.*?)<\/script>/gs,
        ),
      ].map((x) => JSON.parse(x[1]));
      assert.ok(og[path], 'authored OG ' + path);
      assert.ok(html.includes(og[path].url), 'rendered OG ' + path);
      if (path.startsWith('/produits/')) {
        assert.ok(
          structured.some((x) => x['@type'] === 'Product'),
          'Product ' + path,
        );
        assert.ok(!structured.some((x) => x.offers), 'fake offers ' + path);
      }
      if (path !== '/')
        assert.ok(
          structured.some((x) => x['@type'] === 'BreadcrumbList'),
          'breadcrumb ' + path,
        );
      for (const match of html.matchAll(/href="(\/[^"#?]*)/g)) {
        if (!match[1].startsWith('/_') && !/\.(css|woff2?|svg)$/.test(match[1]))
          internal.add(match[1]);
      }
      reports.push({
        path,
        title,
        descriptionLength: desc.length,
        structured: structured.map((x) => x['@type']),
      });
    }),
  );
}
for (const path of internal) {
  if (path === '/signin-with-chatgpt' || locations.includes(path)) continue;
  const r = await fetch(base + path);
  assert.ok(r.status < 400, 'broken internal link ' + path);
}
assert.equal((await fetch(base + '/page-qui-n-existe-pas/')).status, 404);
for (const path of [
  '/recherche/',
  '/atelier/',
  '/desinscription/',
  '/panier/',
  '/recu/',
  '/paiement-retour/',
]) {
  const html = await (await fetch(base + path)).text();
  assert.match(html, /<meta name="robots" content="[^"]*noindex/);
}
const robots = await (await fetch(base + '/robots.txt')).text();
assert.match(robots, /Sitemap:/);
assert.ok(!robots.includes('Disallow: /\n'));
for (const page of ['0', '-1', '1.5', 'Infinity', '99999'])
  assert.equal(
    (await fetch(base + '/gants-de-boxe/?page=' + page)).status,
    404,
    'invalid catalogue page ' + page,
  );
const page2 = await (await fetch(base + '/gants-de-boxe/?page=2')).text();
assert.match(page2, /<link rel="canonical" href="[^"]+\?page=2"/);
mkdirSync(new URL('../outputs/', import.meta.url), { recursive: true });
writeFileSync(
  new URL('../outputs/seo.json', import.meta.url),
  JSON.stringify(
    {
      pages: reports.length,
      internalLinks: internal.size,
      uniqueTitles: titles.size,
      uniqueDescriptions: descriptions.size,
      seo: 'passed',
      pagesDetail: reports,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    pages: reports.length,
    internalLinks: internal.size,
    uniqueTitles: titles.size,
    uniqueDescriptions: descriptions.size,
    seo: 'passed',
  }),
);
