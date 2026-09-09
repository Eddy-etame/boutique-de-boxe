import assert from 'node:assert/strict';
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
  if (path === '/signin-with-chatgpt') continue;
  const r = await fetch(base + path);
  assert.ok(r.status < 400, 'broken internal link ' + path);
}
assert.equal((await fetch(base + '/page-qui-n-existe-pas/')).status, 404);
for (const path of ['/recherche/', '/atelier/', '/desinscription/']) {
  const html = await (await fetch(base + path)).text();
  assert.match(html, /<meta name="robots" content="[^"]*noindex/);
}
const robots = await (await fetch(base + '/robots.txt')).text();
assert.match(robots, /Sitemap:/);
assert.ok(!robots.includes('Disallow: /\n'));
console.log(
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
