import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'package.json')),
  ts = require('typescript');
function moduleAt(file, dependencies = {}) {
  const exports = {};
  const compiled = ts.transpileModule(
    readFileSync(resolve(root, file), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      assert.ok(dependencies[name], name);
      return dependencies[name];
    },
    URL,
    Intl,
    Date,
    process: { env: {} },
  });
  return exports;
}
const catalog = moduleAt('lib/catalog.ts');
const { validateProduct } = moduleAt('lib/product-input.ts', {
  './catalog': catalog,
});
const all = ['products', 'imported-products'].flatMap((name) =>
  JSON.parse(readFileSync(resolve(root, 'lib/data/' + name + '.json'), 'utf8')),
);
const errors = [],
  ids = new Set(),
  slugs = new Set(),
  names = new Set();
let variantCount = 0;
for (const p of all) {
  try {
    validateProduct(p);
    assert.ok(!ids.has(p.id), 'duplicate id');
    assert.ok(!slugs.has(p.slug), 'duplicate slug');
    assert.ok(!names.has(p.name), 'duplicate name');
    assert.ok(p.images[0].src.startsWith('/'), 'main photo must be local');
    assert.ok(
      existsSync(resolve(root, 'public' + p.images[0].src)),
      'missing primary photo',
    );
    if (p.variants?.length) {
      assert.equal(Math.min(...p.variants.map((v) => v.price)), p.price);
      assert.equal(p.variants.length, p.sizes.length);
      for (const variant of p.variants)
        assert.equal(catalog.variantPrice(p, variant.label), variant.price);
      variantCount += p.variants.length;
    }
    ids.add(p.id);
    slugs.add(p.slug);
    names.add(p.name);
  } catch (e) {
    errors.push({ id: p.id, error: e.message });
  }
}
console.log(
  JSON.stringify(
    { products: all.length, variants: variantCount, errors },
    null,
    2,
  ),
);
assert.equal(
  errors.length,
  0,
  'Every public product must satisfy the admin and cart contract.',
);
