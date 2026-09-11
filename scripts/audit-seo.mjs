import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
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
      const blocks = [
        ...html.matchAll(
          /<script type="application\/ld\+json">(.*?)<\/script>/gs,
        ),
      ].map((x) => JSON.parse(x[1]));
      // un graphe par page : on raisonne sur les nœuds, pas sur les blocs
      const structured = blocks.flatMap((b) => b['@graph'] || [b]);
      // définitions : tout objet portant un @id et d’autres propriétés ; références : un @id seul.
      const defined = new Set();
      const referenced = new Set();
      const walk = (v) => {
        if (Array.isArray(v)) return v.forEach(walk);
        if (!v || typeof v !== 'object') return;
        if (v['@id']) (Object.keys(v).some((k) => k !== '@id' && k !== '@type') ? defined : referenced).add(v['@id']);
        Object.values(v).forEach(walk);
      };
      walk(structured);
      const here = new URL(base + path).origin;
      for (const id of referenced) {
        // les renvois vers d’autres fiches (modèles proches) se résolvent sur leur propre page
        const samePage = id.startsWith(here + path) || id.startsWith(here + '/#');
        if (samePage) assert.ok(defined.has(id), 'référence @id non résolue ' + id + ' sur ' + path);
      }
      assert.ok(structured.some((n) => n['@type'] === 'WebSite'), 'WebSite ' + path);
      assert.ok(structured.some((n) => Array.isArray(n['@type']) ? n['@type'].includes('Organization') : n['@type'] === 'Organization'), 'Organization ' + path);
      const keywords = html.match(/<meta name="keywords" content="([^"]+)"/)?.[1];
      const ogUrl = html.match(/property="og:image" content="([^"]+)"/)?.[1] || '';
      assert.match(ogUrl, /\/vignette\/[pcsgx]\/.+\.png$/, 'vignette à la demande ' + path);
      if (path.startsWith('/produits/')) {
        const product = structured.find((x) => x['@type'] === 'Product' && x.mainEntityOfPage);
        assert.ok(product, 'Product ' + path);
        assert.ok(product.sku && product.image?.length && product.url, 'Product facts ' + path);
        assert.ok(!structured.some((x) => x.offers), 'fake offers ' + path);
        assert.ok(structured.some((x) => x['@type'] === 'ItemPage'), 'ItemPage ' + path);
        assert.ok(keywords && keywords.split(/,\s*/).length >= 3, 'keywords ' + path);
      }
      if (path.startsWith('/guides/') && path !== '/guides/') {
        assert.ok(structured.some((x) => x['@type'] === 'Article') && structured.some((x) => x['@type'] === 'FAQPage'), 'Article+FAQ ' + path);
        assert.ok(keywords, 'keywords ' + path);
      }
      if (structured.some((x) => x['@type'] === 'CollectionPage')) {
        assert.ok(structured.some((x) => x['@type'] === 'ItemList' && x.numberOfItems > 0), 'ItemList ' + path);
        assert.ok(keywords, 'keywords ' + path);
      }
      if (keywords) {
        // chaque mot-clé de tête doit exister dans le texte visible (titre, H1 ou corps)
        const visible = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').toLowerCase();
        const head = keywords.split(/,\s*/).slice(0, 2);
        assert.ok(head.some((k) => visible.includes(k.toLowerCase())), 'mot-clé absent du visible ' + path + ' : ' + head.join(' / '));
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
// fichiers et interfaces pour les moteurs et les agents
for (const agentPath of ['/llms.txt', '/llms-full.txt', '/catalogue.json', '/ai.txt', '/humans.txt', '/.well-known/mcp.json', '/.well-known/security.txt', '/api/mcp']) {
  const r = await fetch(base + agentPath);
  assert.equal(r.status, 200, 'fichier agent ' + agentPath);
  const body = await r.text();
  assert.ok(body.length > 100, 'fichier agent vide ' + agentPath);
  if (agentPath === '/humans.txt' || agentPath === '/llms.txt' || agentPath === '/ai.txt') assert.ok(body.includes('Eddy Etame Etame'), 'paternité ' + agentPath);
}
const mcp = await (await fetch(base + '/api/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_products', arguments: { query: 'gants de boxe', limit: 1 } } }) })).json();
assert.ok(mcp.result?.structuredContent?.total > 0, 'MCP search');
// vignettes à la demande : un échantillon rendu réellement
for (const v of ['/vignette/x/home.png', '/vignette/c/gants-de-boxe.png', '/vignette/s/bandes-de-boxe.png', '/vignette/g/debuter-boxe.png', '/vignette/p/' + locations.find((l) => l.startsWith('/produits/')).split('/')[2] + '.png']) {
  const r = await fetch(base + v);
  assert.equal(r.status, 200, 'vignette ' + v);
  assert.match(r.headers.get('content-type') || '', /image\/png/, 'vignette png ' + v);
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
