// Offline regression: full-product facts must survive the compact catalogue payload.
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
const modules = new Map();
function load(path) {
  const file = [path, path + '.ts', path + '.json'].find((p) => { try { return statSync(p).isFile(); } catch { return false; } });
  assert.ok(file, path);
  if (modules.has(file)) return modules.get(file).exports;
  const mod = { exports: {} }; modules.set(file, mod);
  if (file.endsWith('.json')) { mod.exports = JSON.parse(readFileSync(file, 'utf8')); return mod.exports; }
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true } }).outputText;
  const localRequire = (id) => id.startsWith('@/') ? load(resolve(root, id.slice(2))) : id.startsWith('.') ? load(resolve(dirname(file), id)) : requireNode(id);
  vm.compileFunction(code, ['exports', 'require', 'module'], { filename: file })(mod.exports, localRequire, mod);
  return mod.exports;
}
globalThis.fetch = async () => { throw Error('No network allowed in material checks'); };
const { materialSpec, listItem } = load(resolve(root, 'lib/catalog'));
const { materialOf } = load(resolve(root, 'lib/facets'));
const all = ['products', 'imported-products'].flatMap((name) => JSON.parse(readFileSync(resolve(root, 'lib/data', name + '.json'), 'utf8')));

test('three actual legacy PU gloves remain discoverable through material filters', () => {
  const legacy = all.filter((p) => p.category === 'gants-de-boxe' && p.specs?.['Matière extérieure'] === 'PU');
  assert.equal(legacy.length, 3);
  for (const p of legacy) {
    assert.equal(materialOf(p), 'Synthétique', p.slug);
    assert.equal(materialOf(listItem(p)), 'Synthétique', p.slug + ' compact payload');
    assert.equal(listItem(p).specs['Matières'], 'PU');
  }
});
test('all 1042 compact products retain the same material classification', () => {
  assert.equal(all.length, 1042);
  for (const p of all) {
    const compact = listItem(p);
    assert.equal(materialOf(compact), materialOf(p), p.slug);
    assert.deepEqual([compact.id, compact.slug, compact.price, compact.sizes], [p.id, p.slug, p.price, p.sizes]);
    assert.ok(Object.keys(compact.specs).every((key) => key === 'Matières' || key === 'Fermeture'));
  }
});
test('synthetic leather is not classified as leather and missing facts stay unknown', () => {
  for (const value of ['Cuir synthétique', 'PU', 'Simili cuir']) assert.equal(materialOf({ specs: { Matières: value } }), 'Synthétique');
  assert.equal(materialOf({ specs: { Matières: 'Cuir · Nylon' } }), 'Cuir');
  assert.equal(materialOf({ name: 'Gants en cuir', specs: {} }), null);
  assert.equal(materialSpec({ specs: { Matières: ' ', Matière: 'PU' } }), 'PU');
});
