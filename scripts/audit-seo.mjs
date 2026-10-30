import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
const base = process.env.QA_ORIGIN || 'http://localhost:3000';
// Un serveur local chargé coupe parfois une connexion (ECONNRESET) : on la rejoue, la vérification ne change pas.
const fetchOnce = globalThis.fetch;
globalThis.fetch = async (...args) => {
  for (let essai = 0; ; essai++) {
    try {
      return await fetchOnce(...args);
    } catch (error) {
      if (essai >= 4) throw error;
      await new Promise((r) => setTimeout(r, 2000 * (essai + 1)));
    }
  }
};
const expectedOrigin = 'https://www.boutique-de-boxe.com';
const obsoleteOrigin =
  /https?:\/\/(?:www\.)?boutique-de-boxe\.(?:fr|vercel\.app)|https?:\/\/boutique-de-boxe\.com|https?:\/\/boutique-de-boxe\.etame-eddy01\.chatgpt\.site/;
const assertPublicOrigin = (value, label) =>
  assert.equal(new URL(value).origin, expectedOrigin, label);
const sitemapResponse = await fetch(base + '/sitemap.xml');
assert.equal(sitemapResponse.status, 200, 'sitemap status');
assert.match(
  sitemapResponse.headers.get('content-type') || '',
  /(?:application|text)\/xml/,
  'sitemap XML content type',
);
const sitemap = await sitemapResponse.text();
assert.match(sitemap, /^<\?xml[^>]*>\s*<urlset[\s>]/, 'sitemap XML root');
assert.match(sitemap, /<\/urlset>\s*$/, 'sitemap XML closing root');
assert.doesNotMatch(
  sitemap,
  /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\dA-Fa-f]+;)/,
  'sitemap contains an unescaped XML entity',
);
const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((x) => {
  assertPublicOrigin(x[1], 'sitemap origin');
  const url = new URL(x[1]);
  assert.equal(url.search, '', 'parameter URL in sitemap');
  assert.equal(url.hash, '', 'fragment URL in sitemap');
  return new URL(x[1]).pathname;
});
assert.ok(locations.length >= 40);
assert.ok(locations.length <= 50000, 'sitemap URL limit');
assert.equal(new Set(locations).size, locations.length, 'duplicate sitemap URL');
for (const image of sitemap.matchAll(/<image:loc>(.*?)<\/image:loc>/g)) {
  const url = new URL(image[1]);
  assert.equal(url.protocol, 'https:', 'sitemap image HTTPS');
  assert.ok(!url.hostname.includes('https') && !url.hostname.includes('http:'), 'double image origin');
  assertPublicOrigin(url.href, 'third-party sitemap image');
  assert.ok(!obsoleteOrigin.test(url.href), 'obsolete image origin');
}
for (const lastmod of sitemap.matchAll(/<lastmod>(.*?)<\/lastmod>/g)) {
  const timestamp = Date.parse(lastmod[1]);
  assert.ok(Number.isFinite(timestamp), 'invalid sitemap lastmod ' + lastmod[1]);
  assert.ok(timestamp <= Date.now(), 'future sitemap lastmod ' + lastmod[1]);
}
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
      assertPublicOrigin(canonical, 'canonical origin ' + path);
      assert.ok(
        !obsoleteOrigin.test(html),
        'ancienne origine publique ' + path,
      );
      for (const alternate of html.matchAll(
        /<link rel="alternate"[^>]*href="([^"]+)"/g,
      ))
        assertPublicOrigin(alternate[1], 'hreflang origin ' + path);
      for (const social of html.matchAll(
        /<meta (?:property="og:(?:url|image)"|name="twitter:image") content="([^"]+)"/g,
      ))
        assertPublicOrigin(social[1], 'social origin ' + path);
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
        if (v['@id'])
          (Object.keys(v).some((k) => k !== '@id' && k !== '@type')
            ? defined
            : referenced
          ).add(v['@id']);
        Object.values(v).forEach(walk);
      };
      walk(structured);
      const here = expectedOrigin;
      for (const id of referenced) {
        // les renvois vers d’autres fiches (modèles proches) se résolvent sur leur propre page
        const samePage =
          id.startsWith(here + path) || id.startsWith(here + '/#');
        if (samePage)
          assert.ok(
            defined.has(id),
            'référence @id non résolue ' + id + ' sur ' + path,
          );
      }
      assert.ok(
        structured.some((n) => n['@type'] === 'WebSite'),
        'WebSite ' + path,
      );
      assert.ok(
        structured.some((n) =>
          Array.isArray(n['@type'])
            ? n['@type'].includes('Organization')
            : n['@type'] === 'Organization',
        ),
        'Organization ' + path,
      );
      const keywords = html.match(
        /<meta name="keywords" content="([^"]+)"/,
      )?.[1];
      const ogUrl =
        html.match(/property="og:image" content="([^"]+)"/)?.[1] || '';
      assert.match(
        ogUrl,
        /\/vignette\/[pcsgx]\/.+\.png$/,
        'vignette à la demande ' + path,
      );
      if (path.startsWith('/produits/')) {
        // Depuis l’ouverture des ventes (13/10), une fiche à plusieurs tailles publie un ProductGroup dont
        // chaque taille (hasVariant) porte son offre ; une fiche sans déclinaison reste un Product.
        const product = structured.find(
          (x) => (x['@type'] === 'Product' || x['@type'] === 'ProductGroup') && x.mainEntityOfPage,
        );
        assert.ok(product, 'Product ' + path);
        assert.ok(
          (product.sku || product.productGroupID) && product.image?.length && product.url,
          'Product facts ' + path,
        );
        const noeudsProduit = [...structured, ...structured.flatMap((x) => (Array.isArray(x.hasVariant) ? x.hasVariant : []))];
        // L’offre suit l’interrupteur des ventes : absente tant que rien ne se vend, complète le jour J.
        const enVente = !structured.some((x) => (x.additionalProperty || []).some((a) => a.name === 'Disponibilité' && typeof a.value === 'string' && a.value.startsWith('En vente le ')));
        if (!enVente) assert.ok(!noeudsProduit.some((x) => x.offers), 'fake offers ' + path);
        else assert.ok(noeudsProduit.some((x) => x.offers && x.offers.price && x.offers.priceCurrency === 'EUR' && x.offers.availability), 'offre absente ' + path);
        assert.ok(
          structured.some((x) => x['@type'] === 'ItemPage'),
          'ItemPage ' + path,
        );
        assert.ok(
          keywords && keywords.split(/,\s*/).length >= 3,
          'keywords ' + path,
        );
      }
      if (path.startsWith('/guides/') && path !== '/guides/') {
        assert.ok(
          structured.some((x) => x['@type'] === 'Article') &&
            structured.some((x) => x['@type'] === 'FAQPage'),
          'Article+FAQ ' + path,
        );
        assert.ok(keywords, 'keywords ' + path);
      }
      if (structured.some((x) => x['@type'] === 'CollectionPage')) {
        assert.ok(
          structured.some(
            (x) => x['@type'] === 'ItemList' && x.numberOfItems > 0,
          ),
          'ItemList ' + path,
        );
        assert.ok(keywords, 'keywords ' + path);
      }
      if (keywords) {
        // chaque mot-clé de tête doit exister dans le texte visible (titre, H1 ou corps)
        const visible = html
          .replace(/<script[\s\S]*?<\/script>/g, '')
          .replace(/<[^>]+>/g, ' ')
          .toLowerCase();
        const head = keywords.split(/,\s*/).slice(0, 2);
        assert.ok(
          head.some((k) => visible.includes(k.toLowerCase())),
          'mot-clé absent du visible ' + path + ' : ' + head.join(' / '),
        );
      }
      // Questions frequentes : visibles et en FAQPage sur l'accueil, chaque fiche et les pages de service qui en portent.
      if (path === '/' || path.startsWith('/produits/') || ['/faq/', '/livraison/', '/retours/'].includes(path)) {
        assert.ok(structured.some((x) => x['@type'] === 'FAQPage'), 'FAQPage ' + path);
        assert.ok(html.includes('class="seo-faq"'), 'FAQ visible ' + path);
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
  if ((i + 4) % 100 === 0) console.info(`Audited ${Math.min(i + 4, locations.length)}/${locations.length} sitemap pages`);
}
for (const path of internal) {
  if (path === '/signin-with-chatgpt' || locations.includes(path)) continue;
  const r = await fetch(base + path);
  assert.ok(r.status < 400, 'broken internal link ' + path);
}
assert.equal((await fetch(base + '/page-qui-n-existe-pas/')).status, 404);
for (const path of [
  '/recherche/',
  '/admin/',
  '/merci/',
  '/desinscription/',
  '/panier/',
  '/recu/',
  '/paiement-retour/',
]) {
  const html = await (await fetch(base + path)).text();
  assert.match(html, /<meta name="robots" content="[^"]*noindex/);
}
// fichiers et interfaces pour les moteurs et les agents
for (const agentPath of [
  '/llms.txt',
  '/llms-full.txt',
  '/catalogue.json',
  '/ai.txt',
  '/humans.txt',
  '/.well-known/mcp.json',
  '/.well-known/security.txt',
  '/api/mcp',
]) {
  const r = await fetch(base + agentPath);
  assert.equal(r.status, 200, 'fichier agent ' + agentPath);
  const body = await r.text();
  assert.ok(body.length > 100, 'fichier agent vide ' + agentPath);
  assert.ok(
    !obsoleteOrigin.test(body),
    'ancienne origine fichier agent ' + agentPath,
  );
  if (
    agentPath === '/humans.txt' ||
    agentPath === '/llms.txt' ||
    agentPath === '/ai.txt'
  )
    assert.ok(body.includes('Eddy Etame Etame'), 'paternité ' + agentPath);
}
const mcp = await (
  await fetch(base + '/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'search_products',
        arguments: { query: 'gants de boxe', limit: 1 },
      },
    }),
  })
).json();
assert.ok(mcp.result?.structuredContent?.total > 0, 'MCP search');
// vignettes à la demande : un échantillon rendu réellement
for (const v of [
  '/vignette/x/home.png',
  '/vignette/c/gants-de-boxe.png',
  '/vignette/s/bandes-de-boxe.png',
  '/vignette/g/debuter-boxe.png',
  '/vignette/p/' +
    locations.find((l) => l.startsWith('/produits/')).split('/')[2] +
    '.png',
]) {
  const r = await fetch(base + v);
  assert.equal(r.status, 200, 'vignette ' + v);
  assert.match(
    r.headers.get('content-type') || '',
    /image\/png/,
    'vignette png ' + v,
  );
}
// Mots-cles prioritaires du brief : chaque requete a sa page, et la page la porte dans le titre, le H1 ou l'accroche,
// la description, le texte visible (au moins deux fois) et le graphe ; l'accueil y mene par un lien.
const fold = (t) =>
  String(t || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
const queryMapRaw = (
  await (
    await fetch(base + '/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'get_query_map', arguments: {} },
      }),
    })
  ).json()
).result;
const queryMap = (
  queryMapRaw?.structuredContent?.queries ||
  queryMapRaw?.structuredContent ||
  JSON.parse(queryMapRaw?.content?.[0]?.text || '[]')
).map((e) => ({ query: e.query, path: e.path || new URL(e.url).pathname }));
assert.ok(queryMap.length >= 18, 'carte des requetes du brief');
const homeHtml = await (await fetch(base + '/')).text();
const homeAnchors = [
  ...homeHtml.matchAll(/<a [^>]*href="(\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g),
].map((m) => ({ href: m[1], text: fold(m[2].replace(/<[^>]+>/g, ' ')) }));
const briefReport = [];
// Variants of one intent share one readable title; requiring all three would reward repetition.
const metadataAliases = new Map([['gants boxe', 'gants de boxe'], ['vente gants de boxe', 'gants de boxe']]);
for (const { query, path } of queryMap) {
  const html = await (await fetch(base + path)).text();
  const q = fold(query);
  const metadataQuery = path === '/gants-de-boxe/' ? metadataAliases.get(q) || q : q;
  const title = fold(html.match(/<title>([^<]+)<\/title>/)?.[1]);
  const description = fold(
    html.match(/<meta name="description" content="([^"]+)"/)?.[1],
  );
  // Le H1 et le surtitre de la page elle-même : l’entête porte son propre surtitre (panneau « Rayons »).
  const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] || html;
  const h1 = fold(
    main.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, ' '),
  );
  const eyebrow = fold((main.match(/class="eyebrow"[^>]*>([^<]+)</) || [])[1]);
  const visible = fold(
    html
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  );
  const occurrences = visible.split(metadataQuery).length - 1;
  const exactQueryOccurrences = visible.split(q).length - 1;
  const graph = fold(
    [
      ...html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      ),
    ]
      .map((m) => m[1])
      .join(' '),
  );
  const linked =
    homeAnchors.some(
      (a) =>
        a.href === path &&
        (a.text.includes(q) || (q.includes(a.text) && a.text.length > 3)),
    ) || homeAnchors.some((a) => a.href === path);
  const checks = {
    title: title.includes(metadataQuery),
    heading: h1.includes(metadataQuery) || eyebrow.includes(metadataQuery),
    description: description.includes(metadataQuery),
    visible: occurrences >= 2,
    graph: graph.includes(q),
    linked,
  };
  briefReport.push({ query, path, metadataQuery, occurrences, exactQueryOccurrences, ...checks });
  for (const [name, ok] of Object.entries(checks))
    assert.ok(ok, `mot-cle du brief « ${query} » : ${name} manque sur ${path}`);
}
const robots = await (await fetch(base + '/robots.txt')).text();
assert.ok(
  robots.includes('Sitemap: ' + expectedOrigin + '/sitemap.xml'),
  'robots sitemap origin',
);
assert.ok(robots.includes('Host: ' + expectedOrigin), 'robots host');
assert.ok(!robots.includes('Disallow: /\n'));
// Listes paginées par le proxy (un seul segment) : ?page=N (2 à 9999) est servi par la page statique
// /<liste>/page-N/, sous sa canonique ?page=N. Depuis le 19/10 (proxy.ts), une valeur mal formée sert la
// page 1 sous sa seule adresse canonique ; un numéro bien formé au-delà de la dernière page n’existe pas.
const paginationSamples = ['/gants-de-boxe/', '/bandes-de-boxe/', '/gants-de-boxe-noirs/'];
for (const path of paginationSamples) {
  for (const page of ['0', '-1', '1.5', 'Infinity', '99999']) {
    const r = await fetch(base + path + '?page=' + page);
    if (r.status !== 404) {
      assert.equal(r.status, 200, 'invalid catalogue page ' + path + '?page=' + page);
      const canonical = (await r.text()).match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      assert.equal(canonical, expectedOrigin + path, 'invalid catalogue page canonical ' + path + '?page=' + page);
    }
  }
  assert.equal((await fetch(base + path + '?page=9999')).status, 404, 'catalogue page beyond the last ' + path);
  const response = await fetch(base + path + '?page=2');
  assert.equal(response.status, 200, 'pagination status ' + path);
  const html = await response.text();
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  assert.equal(canonical, expectedOrigin + path + '?page=2', 'pagination canonical ' + path);
  assert.match(html, /<title>[^<]*Page 2[^<]*<\/title>/, 'pagination title ' + path);
  assert.match(html, /"position":37/, 'pagination first item position ' + path);
  assert.doesNotMatch(html, /href="\?page=1"/, 'duplicate page-one link ' + path);
}
// Pages de marque : HTML statique, ?page=N lu dans le navigateur (app/marques/[brand]/page.tsx) — une seule
// adresse canonique quelle que soit la valeur, jamais de « Page N » dans le titre.
for (const path of ['/marques/elion/', '/marques/elion/textile-boxe/']) {
  for (const page of ['2', '9999']) {
    const r = await fetch(base + path + '?page=' + page);
    assert.equal(r.status, 200, 'brand page status ' + path + '?page=' + page);
    const html = await r.text();
    assert.equal(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1], expectedOrigin + path, 'brand page canonical ' + path + '?page=' + page);
    assert.doesNotMatch(html, /<title>[^<]*Page \d+[^<]*<\/title>/, 'brand page title ' + path + '?page=' + page);
  }
}
const slashRedirect = await fetch(base + '/gants-de-boxe', {
  redirect: 'manual',
});
assert.equal(slashRedirect.status, 308, 'missing trailing slash redirect');
assert.equal(
  new URL(slashRedirect.headers.get('location'), base).pathname,
  '/gants-de-boxe/',
  'missing trailing slash destination',
);
mkdirSync(new URL('../outputs/', import.meta.url), { recursive: true });
writeFileSync(
  new URL('../outputs/seo.json', import.meta.url),
  JSON.stringify(
    {
      canonicalOrigin: expectedOrigin,
      pages: reports.length,
      internalLinks: internal.size,
      uniqueTitles: titles.size,
      uniqueDescriptions: descriptions.size,
      seo: 'passed',
      briefKeywords: briefReport,
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
