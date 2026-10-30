// Offline purchasing-answer regression tests: no database, network, submission or commerce write.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requireNode = createRequire(resolve(root, 'package.json'));
const ts = requireNode('typescript');
const React = requireNode('react');
const { renderToStaticMarkup } = requireNode('react-dom/server');
const modules = new Map();
function load(path) {
  if (path.endsWith('.css')) return {};
  const file = [path, path + '.ts', path + '.tsx', path + '.json'].find((p) => {
    try { return statSync(p).isFile(); } catch { return false; }
  });
  assert.ok(file, 'Existing local module: ' + path);
  if (modules.has(file)) return modules.get(file).exports;
  const mod = { exports: {} };
  modules.set(file, mod);
  if (file.endsWith('.json')) {
    mod.exports = JSON.parse(readFileSync(file, 'utf8'));
    return mod.exports;
  }
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, resolveJsonModule: true },
  }).outputText;
  const requireLocal = (id) => id.startsWith('@/') ? load(resolve(root, id.slice(2))) : id.startsWith('.') ? load(resolve(dirname(file), id)) : requireNode(id);
  vm.compileFunction(code, ['exports', 'require', 'module'], { filename: file })(mod.exports, requireLocal, mod);
  return mod.exports;
}

globalThis.fetch = async () => { throw new Error('No network allowed in purchasing-answer tests'); };
const { buyingBrief, buyingDecision } = load(resolve(root, 'lib/buying-brief'));
const { BuyingBrief } = load(resolve(root, 'components/buying-brief'));
const { categories, categoryFor, getCategoryProducts, shop, livraison } = load(resolve(root, 'lib/catalog'));
const { SUBFAMILIES, subfamilyFor, subfamilyProducts } = load(resolve(root, 'lib/subfamilies'));
const { QUERY_MAP } = load(resolve(root, 'lib/seo-copy'));
const guides = JSON.parse(readFileSync(resolve(root, 'lib/data/guides.json'), 'utf8'));
const all = ['products', 'imported-products'].flatMap((file) => JSON.parse(readFileSync(resolve(root, 'lib/data', file + '.json'), 'utf8')));
const itemsOf = (scope) => categoryFor(scope) ? getCategoryProducts(categoryFor(scope), all) : subfamilyProducts(subfamilyFor(scope), all);
const htmlFor = (scope) => renderToStaticMarkup(React.createElement(BuyingBrief, { scope, name: categoryFor(scope)?.name || subfamilyFor(scope)?.name || scope, items: itemsOf(scope) }));

test('commercial query owners have substantive server-rendered buying answers', () => {
  const scopes = [...new Set(QUERY_MAP.map((q) => q.path.split('/')[1]))].filter((scope) => categoryFor(scope) || subfamilyFor(scope));
  assert.ok(scopes.length >= 20, 'covers the existing commercial query owners, not new synonym pages');
  for (const scope of scopes) {
    const brief = buyingBrief(scope, itemsOf(scope));
    assert.ok(brief, scope + ' has an answer');
    const html = htmlFor(scope);
    assert.ok(html.includes('data-buying-brief="' + scope + '"'), scope + ' SSR marker');
    assert.ok(html.includes('Prix TTC, hors livraison'), scope + ' price qualifier');
    assert.ok(brief.links.length >= 2, scope + ' has useful next steps');
    assert.ok(brief.minimum > 0 && brief.maximum >= brief.minimum);
    assert.doesNotMatch(html, /<script|best.seller|meilleures ventes|garanti.*premi/i);
  }
  console.info('Commercial keyword destinations checked:', scopes.length);
});

test('all existing category/subfamily decisions link only to actual routes', () => {
  const special = new Set(['/guide-des-tailles/', '/retours/', '/livraison/', '/contact/']);
  for (const { slug } of [...categories, ...SUBFAMILIES]) {
    const decision = buyingDecision(slug);
    assert.ok(decision, slug);
    for (const { href } of decision.links) {
      const segments = href.split('/').filter(Boolean);
      const known = special.has(href) || (segments[0] === 'guides' && guides.some((g) => g.slug === segments[1])) || categoryFor(segments[0]) || subfamilyFor(segments[0]);
      assert.ok(known, slug + ' -> ' + href);
      assert.notEqual(href, '/' + slug + '/', 'not a redundant self-link');
    }
  }
});

test('advice distinguishes gloves, protections and kimonos without a universal size promise', () => {
  const decisions = ['gants-de-boxe', 'protections-boxe', 'kimonos-jjb'].map((scope) => buyingDecision(scope).answer);
  assert.equal(new Set(decisions).size, 3);
  assert.match(decisions[0], /exercice|poids/);
  assert.match(decisions[1], /contacts|mesure/);
  assert.match(decisions[2], /kimono|tissage/);
  assert.doesNotMatch(decisions.join(' '), /toujours.*(?:10|12|14|16) oz|taille universelle/);
});

test('information pages and unknown routes do not receive a commercial fallback', () => {
  for (const scope of ['sports-de-combat', 'les-arts-martiaux', 'guides', 'inconnu']) assert.equal(buyingBrief(scope, all), null);
  assert.equal(buyingBrief('gants-de-boxe', []), null);
});

test('shoe prices do not start at the price of an insole', () => {
  const p = all.find((p) => p.category === 'chaussures-boxe' && /chaussure/i.test(p.name));
  assert.ok(p);
  const brief = buyingBrief('chaussures-boxe', [{ ...p, price: 100 }, { ...p, id: 'insole-fixture', name: 'Semelles', price: 1 }]);
  assert.equal(brief.count, 1);
  assert.ok(brief.minimum >= 100);
});

test('dispatch and transport facts use the existing commerce source and qualify heavy items', () => {
  const normal = buyingBrief('gants-de-boxe', itemsOf('gants-de-boxe'));
  assert.match(normal.fulfillment, new RegExp(shop.delais.expedition));
  assert.ok(normal.fulfillment.includes(livraison.relais));
  assert.ok(normal.fulfillment.includes(livraison.zone));
  const heavy = all.find((p) => /sac de frappe sur pied/i.test(p.name));
  assert.ok(heavy);
  const brief = buyingBrief('sacs-de-frappe-sur-pied', [heavy]);
  assert.match(brief.fulfillment, /sur devis/);
  assert.ok(!brief.fulfillment.includes(livraison.relais), 'no standard parcel quote for heavy-only set');
});

test('closed commerce never inherits a dispatch promise from the open-sale brief', () => {
  const previous = shop.ventesOuvertes;
  try {
    shop.ventesOuvertes = false;
    const brief = buyingBrief('gants-de-boxe', itemsOf('gants-de-boxe'));
    assert.match(brief.priceLabel, /prévus/);
    assert.ok(!brief.fulfillment.includes('Expédition sous'));
  } finally { shop.ventesOuvertes = previous; }
});

test('closed commerce does not invite a current order for heavy equipment either', () => {
  const previous = shop.ventesOuvertes;
  try {
    shop.ventesOuvertes = false;
    const heavy = all.find((p) => /sac de frappe sur pied/i.test(p.name));
    const brief = buyingBrief('sacs-de-frappe-sur-pied', [heavy]);
    assert.match(brief.fulfillment, /Ventes annoncées/);
    assert.match(brief.fulfillment, /sur devis/);
    assert.doesNotMatch(brief.fulfillment, /se commande|Expédition sous|avant de commander/);
  } finally { shop.ventesOuvertes = previous; }
});
