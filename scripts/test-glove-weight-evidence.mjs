// Compatibility and wording checks for indicative catalogue comparison; no network or commerce.
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
  const requireLocal = (id) => id === './shop-interactions'
    ? { ProductCard: ({ product }) => React.createElement('article', { 'data-product': product.id }, product.name) }
    : id.startsWith('@/') ? load(resolve(root, id.slice(2))) : id.startsWith('.') ? load(resolve(dirname(file), id)) : requireNode(id);
  vm.compileFunction(code, ['exports', 'require', 'module'], { filename: file })(mod.exports, requireLocal, mod);
  return mod.exports;
}
globalThis.fetch = async () => { throw new Error('No network allowed in glove comparison fixtures'); };
const { recommendGloveWeight, parseNumber, parseUsage, GLOVE_WEIGHT_FAQ, GLOVE_WEIGHT_REVISION } = load(resolve(root, 'lib/glove-weight'));
const { GloveWeightTool } = load(resolve(root, 'components/glove-weight-tool'));

test('numeric catalogue/MCP contracts remain stable while results are explicitly indicative', () => {
  for (const [input, ounces, range] of [
    [{ usage: 'sac', kg: 70, age: 30 }, 10, [10, 12]],
    [{ usage: 'technique', kg: 82, age: 30 }, 14, [12, 14]],
    [{ usage: 'partenaire', kg: 70, age: 30 }, 16, [16, 16]],
    [{ usage: 'partenaire', kg: 95, age: 30 }, 18, [16, 18]],
    [{ usage: 'partenaire', kg: 50, age: 30 }, 14, [14, 16]],
    [{ usage: 'sac', age: 4 }, 4, [4, 4]],
    [{ usage: 'technique', age: 8 }, 6, [6, 6]],
    [{ usage: 'sac', age: 11 }, 8, [8, 8]],
    [{ usage: 'sac', age: 14 }, 10, [8, 10]],
  ]) {
    const actual = recommendGloveWeight(input);
    assert.equal(actual.ounces, ounces);
    assert.deepEqual(actual.range, range);
    assert.equal(actual.kind, 'indicative-comparison');
    assert.match(actual.caution, /outil, pas un tableau de tailles fabricant/);
    assert.match(actual.caution, /gant complet, pas seulement son rembourrage/);
  }
});

test('every usage and profile retains uncertainty, model and club checks', () => {
  for (const usage of ['sac', 'technique', 'partenaire']) {
    for (const age of [null, 4, 8, 12, 14, 17, 30]) {
      for (const kg of [null, 50, 70, 95]) {
        const result = recommendGloveWeight({ usage, age, kg });
        assert.ok(Number.isFinite(result.ounces));
        assert.ok(result.range[0] <= result.ounces && result.range[1] >= result.ounces);
        assert.match(result.caution, /ni une autorisation de sparring ou de compétition/);
        assert.doesNotMatch(result.why, /c’est le poids du travail|poids « à tout faire »|protège le partenaire autant/);
        if (age !== null && age < 18) assert.match(result.caution, /mineur.*encadrant/);
        if (age === null) assert.match(result.caution, /profil adulte/);
      }
    }
  }
});

test('the four-year-old boundary and adolescent profile labels are truthful', () => {
  assert.match(recommendGloveWeight({ usage: 'sac', age: 4 }).who, /moins de 7 ans/);
  assert.doesNotMatch(recommendGloveWeight({ usage: 'sac', age: 4 }).who, /5 à 7/);
  assert.match(recommendGloveWeight({ usage: 'partenaire', age: 14, kg: 70 }).who, /adolescent/);
  assert.doesNotMatch(recommendGloveWeight({ usage: 'partenaire', age: 14, kg: 70 }).who, /adultes/);
});

test('parsing rejects empty or nonfinite input and preserves supported usage values', () => {
  for (const value of ['', '  ', 'Infinity', NaN, {}, undefined]) assert.equal(parseNumber(value), null);
  assert.equal(parseNumber('70,5'), 70.5);
  assert.equal(parseUsage('partenaire'), 'partenaire');
  assert.equal(parseUsage('competition'), null);
});

test('shared visible/schema FAQ corrects the unit and removes universal brand and age prescriptions', () => {
  assert.equal(GLOVE_WEIGHT_FAQ.length, 5);
  const answers = GLOVE_WEIGHT_FAQ.map((faq) => faq.answer).join(' ');
  assert.match(answers, /gant complet, pas uniquement à sa mousse/);
  assert.match(answers, /L’âge seul ne permet pas de choisir/);
  assert.doesNotMatch(answers, /Fairtex et Twins compactes|Cleto Reyes allongée|12 oz pour un adulte|4 oz de 5 à 7 ans/);
  assert.equal(GLOVE_WEIGHT_REVISION, '2026-10-24');
  const page = readFileSync(resolve(root, 'app/outils/poids-de-gants/page.tsx'), 'utf8');
  assert.match(page, /const FAQ: SeoFaq\[\] = GLOVE_WEIGHT_FAQ/);
  assert.match(page, /dateModified: GLOVE_WEIGHT_REVISION/);
  assert.match(page, /https:\/\/www\.fairtex\.com\/pages\/faq/);
});

test('SSR preserves the GET/no-JavaScript form, indicative answer, source path and product exploration', () => {
  const fact = { oz: 10, count: 1, min: 2000, median: 2000, path: '/gants-de-boxe-10-oz/', picks: [{ id: 'test', name: 'Un modèle à comparer' }] };
  const html = renderToStaticMarkup(React.createElement(GloveWeightTool, { initial: { usage: 'sac', kg: 70, age: 30 }, facts: [fact] }));
  assert.ok(html.includes('method="get"') && html.includes('action="/outils/poids-de-gants/"'));
  assert.match(html, /<noscript>/);
  assert.match(html, /REPÈRE À FAIRE VALIDER/);
  assert.ok(html.includes('href="/guide-des-tailles/"') && html.includes('href="/contact/"'));
  assert.ok(html.includes('data-product="test"'));
  assert.doesNotMatch(html, /Quatre paires|une par marque|LE POIDS CONSEILLÉ/);
});
