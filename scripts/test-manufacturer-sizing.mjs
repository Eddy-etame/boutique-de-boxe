// Offline checks of applicable manufacturer guidance; no account, network or commerce writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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
  const file = [path, path + '.ts', path + '.tsx'].find((p) => { try { return statSync(p).isFile(); } catch { return false; } });
  assert.ok(file, 'Existing local module: ' + path);
  if (modules.has(file)) return modules.get(file).exports;
  const mod = { exports: {} };
  modules.set(file, mod);
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const requireLocal = (id) => id.startsWith('@/') ? load(resolve(root, id.slice(2))) : id.startsWith('.') ? load(resolve(dirname(file), id)) : requireNode(id);
  vm.compileFunction(code, ['exports', 'require', 'module'], { filename: file })(mod.exports, requireLocal, mod);
  return mod.exports;
}
globalThis.fetch = async () => { throw new Error('Network forbidden in manufacturer sizing fixtures'); };
const { manufacturerSizingFor, MANUFACTURER_SIZING_GUIDES, FAIRTEX_SP5 } = load(resolve(root, 'lib/manufacturer-sizing'));
const { ManufacturerSizingGuide } = load(resolve(root, 'components/manufacturer-sizing'));
const catalogue = ['products', 'imported-products'].flatMap((name) => JSON.parse(readFileSync(resolve(root, 'lib/data', name + '.json'), 'utf8')));
const fixture = (overrides = {}) => ({ brand: 'Fairtex', category: 'gants-de-boxe', name: 'Gants Fairtex BGV1', sizes: ['10 oz', '12 oz'], sourceRef: '', ...overrides });

test('known manufacturers have primary references and unknown brands never inherit them', () => {
  assert.equal(manufacturerSizingFor(fixture()).guidePath, '/guide-des-tailles/#fairtex');
  assert.equal(manufacturerSizingFor(fixture({ brand: '  MÉTAL  BOXE ' })).guidePath, '/guide-des-tailles/#metal-boxe');
  for (const brand of ['Elion', 'Adidas', 'Fairtex style', 'Metal Boxing', '']) assert.equal(manufacturerSizingFor(fixture({ brand })), null);
  for (const guide of MANUFACTURER_SIZING_GUIDES) {
    const url = new URL(guide.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(['fr.fairtex.com', 'metal-boxe.com'].includes(url.hostname));
    assert.ok(!url.search && !url.hash, 'Stable manufacturer page, not a guessed model query');
  }
});

test('guidance is limited to relevant wearable families and actual available sizes', () => {
  for (const product of [
    fixture({ category: 'sacs-de-frappe', name: 'Sac Fairtex', sizes: ['180 cm'] }),
    fixture({ category: 'accessoires-boxe', name: 'Bandes Fairtex', sizes: ['4,5 m'] }),
    fixture({ category: 'gants-de-boxe', name: 'Gants de sac Fairtex', sizes: ['M', 'L'] }),
    fixture({ category: 'protections-boxe', name: 'Casque Fairtex HG10', sizes: ['L'] }),
    fixture({ category: 'textile-boxe', name: 'Rashguard Fairtex', sizes: ['M', 'L'] }),
    fixture({ brand: 'Metal Boxe', category: 'protections-boxe', name: 'Protège-dents Metal Boxe', sizes: ['Adulte'] }),
    fixture({ sizes: [] }),
  ]) assert.equal(manufacturerSizingFor(product), null, product.name);
  assert.equal(manufacturerSizingFor(fixture({ category: 'gants-mma', sizes: ['M', 'L'] })).id, 'fairtex');
  assert.equal(manufacturerSizingFor(fixture({ brand: 'Metal Boxe', category: 'protections-boxe', name: 'Protège-tibias Metal Boxe', sizes: ['S', 'M'] })).id, 'metal-boxe');
});

test('SP5 tables apply only to the explicitly matching Fairtex model', () => {
  const sp5 = catalogue.filter((p) => p.brand === 'Fairtex' && /\bSP5\b/.test(p.name));
  assert.equal(sp5.length, 4, 'Current catalogue has the four SP5 colour destinations');
  for (const p of sp5) {
    const guide = manufacturerSizingFor(p);
    assert.equal(guide.model, 'SP5');
    assert.equal(guide.guidePath, '/guide-des-tailles/#fairtex-sp5');
  }
  for (const model of ['SP3', 'SP6', 'SP7', 'SP8', 'SPK9']) {
    const guide = manufacturerSizingFor(fixture({ category: 'protections-boxe', name: 'Protège-tibias Fairtex ' + model, sizes: ['M', 'L'] }));
    assert.equal(guide.guidePath, '/guide-des-tailles/#fairtex');
    assert.equal(guide.model, undefined);
  }
  assert.equal(manufacturerSizingFor(fixture({ category: 'protections-boxe', name: 'Protège-tibias Fairtex SP50', sizes: ['M'] })), null);
  assert.equal(manufacturerSizingFor(fixture({ brand: 'Metal Boxe', category: 'protections-boxe', name: 'Protège-tibias SP5', sizes: ['M'] })).model, undefined);
  assert.deepEqual(FAIRTEX_SP5.rows.map((row) => [row.size, row.height, row.shin, row.foot]), [
    ['S', '150–160', '34', '14'], ['M', '160–179', '38', '15'], ['L', '179–185', '39', '15'], ['XL', '185–195', '42', '14'],
  ]);
});

test('current catalogue coverage never creates guidance for unverified brands or nonwearable products', () => {
  const covered = catalogue.filter((p) => manufacturerSizingFor(p));
  assert.ok(covered.length > 40, 'Meaningful supported product coverage');
  assert.ok(covered.every((p) => ['Fairtex', 'Metal Boxe'].includes(p.brand) && p.sizes.length));
  console.info('Applicable manufacturer references:', JSON.stringify(Object.fromEntries(['Fairtex', 'Metal Boxe'].map((brand) => [brand, covered.filter((p) => p.brand === brand).length]))));
});

test('the manufacturer guide is server-rendered with source links, scoped table and fit caveats', () => {
  const html = renderToStaticMarkup(React.createElement(ManufacturerSizingGuide));
  assert.match(html, /data-manufacturer-sizing="true"/);
  for (const id of ['fairtex', 'metal-boxe', 'fairtex-sp5']) assert.ok(html.includes('id="' + id + '"'));
  for (const { url } of MANUFACTURER_SIZING_GUIDES) assert.ok(html.includes('href="' + url + '"'));
  assert.match(html, /<caption>Fairtex SP5/);
  assert.equal((html.match(/<tbody>[\s\S]*?<\/tbody>/)[0].match(/<tr>/g) || []).length, 4);
  assert.match(html, /intervalles se touchent/);
  assert.match(html, /autre protège-tibias Fairtex/);
  assert.ok(html.includes('href="/contact/"'));
  assert.doesNotMatch(html, /<script|<img|taille garantie|taille universelle|8\/10|10\/10/);
});
