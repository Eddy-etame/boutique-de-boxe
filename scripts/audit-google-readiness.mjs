// Read-only HTTP checks. Technical eligibility is not Google index membership or ranking.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

// Bind Next with --hostname localhost too: NextRequest normalizes numeric loopback hosts.
const base = new URL(process.env.QA_ORIGIN || 'http://localhost:3105');
const canonicalOrigin = 'https://www.boutique-de-boxe.com';
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) || process.argv.includes('--allow-public-read'), 'Public auditing requires --allow-public-read.');
const decode = (text) => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const fetchText = async (path) => {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(90000) });
  assert.equal(response.status, 200, path + ' status');
  return response.text();
};
const sitemap = await fetchText('/sitemap.xml');
const sitemapPaths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => {
  const url = new URL(decode(match[1]));
  assert.equal(url.origin, canonicalOrigin);
  return url.pathname;
});
const queryResponse = await fetch(new URL('/api/mcp', base), {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 'readiness', method: 'tools/call', params: { name: 'get_query_map', arguments: {} } }),
});
assert.equal(queryResponse.status, 200);
const result = (await queryResponse.json()).result;
const structured = result?.structuredContent;
const queries = structured?.queries || structured || JSON.parse(result?.content?.[0]?.text || '[]');
assert.ok(Array.isArray(queries) && queries.length >= 18, 'Priority-query registry');
const paths = [...new Set([
  '/', ...queries.map((entry) => entry.path || new URL(entry.url).pathname),
  ...sitemapPaths.filter((path) => path.startsWith('/boutique-de-boxe-')),
  '/guides/choisir-gants-boxe/', '/produits/gants-boxe-blade-metal-boxe-noir-blanc/',
  '/produits/bouteille-650ml-infinity-noir/',
])];
const rows = [];
for (let index = 0; index < paths.length; index += 3) {
  await Promise.all(paths.slice(index, index + 3).map(async (path) => {
    assert.ok(sitemapPaths.includes(path), 'Intended destination in sitemap: ' + path);
    const html = await fetchText(path);
    const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0] || '';
    assert.equal((main.match(/<h1\b/g) || []).length, 1, 'One main heading: ' + path);
    const canonical = decode(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] || '');
    assert.equal(canonical, canonicalOrigin + path, 'Preserved canonical: ' + path);
    assert.match(html, /<meta name="robots" content="index, ?follow"/, 'Indexable: ' + path);
    assert.ok(!/<meta name="robots" content="[^"]*noindex/.test(html), 'No accidental noindex: ' + path);
    const title = decode(html.match(/<title>(.*?)<\/title>/s)?.[1] || '');
    assert.ok(title && html.includes('name="description"'), 'Metadata: ' + path);
    const buying = main.includes('data-buying-brief=');
    const local = /data-(?:city|region)-commerce="true"/.test(main);
    if (path.startsWith('/boutique-de-boxe-')) {
      assert.ok(local, 'City purchasing answer: ' + path);
      assert.ok(main.indexOf('id="commander"') < main.indexOf('id="equipement"'), 'Local commerce precedes equipment: ' + path);
      const directory = main.includes('data-region-commerce=') ? 'id="communes"' : 'id="lieux"';
      assert.ok(main.indexOf(directory) > main.indexOf('id="equipement"'), 'Equipment before retained directory: ' + path);
    }
    const graphs = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((match) => {
      const graph = JSON.parse(match[1]);
      return graph['@graph'] || [graph];
    });
    assert.ok(graphs.length, 'Parseable structured data: ' + path);
    const group = graphs.find((node) => node['@type'] === 'ProductGroup');
    for (const variant of group?.hasVariant || []) {
      const url = new URL(variant.url);
      assert.equal(url.origin, canonicalOrigin);
      assert.ok(url.searchParams.has('taille'), 'Selectable variant URL');
      assert.equal(variant.offers.url, variant.url, 'Offer and selected-size landing agree');
    }
    rows.push({ path, title, canonical, buyingBrief: buying, localCommerce: local, variants: group?.hasVariant?.length || 0 });
  }));
}
const buyingPages = rows.filter((row) => row.buyingBrief).length;
const localPages = rows.filter((row) => row.localCommerce).length;
assert.ok(buyingPages >= 27, 'Commercial query-owner purchasing coverage');
assert.ok(localPages >= 32, 'Existing city/region purchasing coverage');
// Page two retains a distinct canonical and does not repeat the page-one buying brief.
const second = await fetchText('/gants-de-boxe/?page=2');
assert.ok(second.includes('href="' + canonicalOrigin + '/gants-de-boxe/?page=2"'));
assert.ok(!second.includes('data-buying-brief='), 'No repeated page-one brief on pagination');
const variant = await fetchText('/produits/gants-boxe-blade-metal-boxe-noir-blanc/?taille=10+oz');
assert.ok(variant.includes('rel="canonical" href="' + canonicalOrigin + '/produits/gants-boxe-blade-metal-boxe-noir-blanc/"'), 'Variant keeps base organic canonical');
const report = {
  measuredAt: new Date().toISOString(), origin: base.origin,
  status: 'technical-readiness-only', googleIndexStatus: 'not measured', googleRankings: 'not measured',
  priorityQueries: queries.length, uniqueDestinations: rows.length, buyingPages, localPages,
  rows: rows.sort((a, b) => a.path.localeCompare(b.path)),
};
mkdirSync('outputs', { recursive: true });
writeFileSync('outputs/google-readiness.json', JSON.stringify(report, null, 2));
console.log(`PASS: ${queries.length} priority queries, ${rows.length} unique destinations; ${buyingPages} commercial briefs, ${localPages} local buying answers; canonicals, SSR, JSON-LD and pagination intact. Not a Google ranking report.`);
