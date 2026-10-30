// Offline regression checks: static catalogue + pure helpers + feed handler with local stubs only.
// No account, database, payment, email, inventory update or HTTP request is performed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modules = new Map();
const stubs = {
  '@/lib/database': {
    readCatalog: async () => catalogue,
    cacheCatalogue: (_catalogue, policy) => policy,
    catalogueDeSecours: () => false,
  },
  // Taxonomy and image transformation are independent of the item/variant contract tested here.
  '@/lib/subfamilies': { SUBFAMILIES: [] },
  '@/lib/categorie-google': { categorieGoogle: () => '499676' },
  '@/lib/seo': { urlOf: (path) => new URL(path, 'https://www.boutique-de-boxe.com').href },
  '@/lib/vignette': { photoSrc: (_slug, image) => image.src },
};

function load(relative) {
  const path = resolve(root, relative);
  if (modules.has(path)) return modules.get(path).exports;
  const loaded = { exports: {} };
  modules.set(path, loaded);
  const source = readFileSync(path, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const requireLocal = (name) => {
    if (name in stubs) return stubs[name];
    const target = name.startsWith('@/')
      ? name.slice(2)
      : resolve(dirname(path), name);
    return load(target.endsWith('.ts') ? target : target + '.ts');
  };
  new Script(`(function(require, module, exports) {\n${outputText}\n})`, { filename: path })
    .runInThisContext()(requireLocal, loaded, loaded.exports);
  return loaded.exports;
}

// Any accidental live network dependency fails this isolated test immediately.
globalThis.fetch = async () => { throw new Error('Network is forbidden in merchant unit tests'); };

const { estLourd, variantPrice, shop } = load('lib/catalog.ts');
const { withOurPrice } = load('lib/pricing.ts');
const { productVariantPath, initialProductSize, merchantVariants, merchantIdentifiers, validGtin } = load('lib/merchant-products.ts');
const catalogue = ['products.json', 'imported-products.json']
  .flatMap((name) => JSON.parse(readFileSync(resolve(root, 'lib/data', name), 'utf8')))
  .map(withOurPrice);
assert.equal(catalogue.length, 1042, 'The complete existing catalogue is covered');

const blade = catalogue.find((p) => p.id === 'mat-blade-gold');
assert.equal(initialProductSize(blade, ''), '');
assert.equal(initialProductSize(blade, '?taille=12+oz'), '12 oz');
assert.equal(initialProductSize(blade, '?taille=12%20oz'), '12 oz');
assert.equal(initialProductSize(blade, '?taille=99+oz'), '');
assert.equal(initialProductSize(blade, '?taille=12+oz&taille=14+oz'), '');
assert.equal(initialProductSize(blade, '?seance=boxe&taille=14+oz'), '14 oz');
assert.equal(initialProductSize({ sizes: ['M'] }, '?taille=unknown'), 'M');
assert.equal(initialProductSize({ sizes: [] }, '?taille=12+oz'), '');
assert.equal(productVariantPath(blade, 'invalid'), '/produits/' + blade.slug + '/');
assert.equal(productVariantPath(blade, null), '/produits/' + blade.slug + '/');
const punctuation = { slug: 'fixture-only', sizes: ['L / XL, 42', '4 / 7 ans'] };
for (const size of punctuation.sizes) {
  const url = new URL(productVariantPath(punctuation, size), shop.origin);
  assert.equal(url.searchParams.get('taille'), size);
  assert.equal(initialProductSize(punctuation, url.search), size);
}

assert.equal(validGtin('4006381333931'), true);
assert.equal(validGtin('4006381333932'), false);
assert.equal(validGtin('0000000000000'), false);
assert.equal(validGtin('not-a-gtin'), false);
assert.deepEqual(merchantIdentifiers({ brand: 'Metal Boxe', specs: { 'Référence': 'REV-123' }, reference: 'REV-123', sourceRef: 'SKU-123' }), {
  brand: 'Metal Boxe', gtin: undefined, mpn: undefined,
}, 'Supplier/internal references are not guessed to be manufacturer MPNs');
assert.deepEqual(merchantIdentifiers({ brand: 'Marque de test', specs: { EAN: '4006 3813 3393 1', MPN: 'TEST-MPN' } }), {
  brand: 'Marque de test', gtin: '4006381333931', mpn: 'TEST-MPN',
}, 'Only explicit valid identifier evidence is emitted (synthetic fixture)');
assert.equal(merchantIdentifiers({ brand: 'Sélection Boutique de Boxe', specs: {} }).brand, undefined);
assert.equal(merchantIdentifiers({ brand: 'À préciser', specs: { MPN: 'SKU-123' } }).mpn, undefined);
assert.equal(merchantIdentifiers({ brand: 'Marque de test', specs: { GTIN: '4006381333932', MPN: 'inconnu' } }).gtin, undefined);

const variable = { ...blade, price: 1000, sizes: ['S', 'L'], variants: [{ label: 'S', price: 1000 }, { label: 'L', price: 1500 }] };
assert.deepEqual(merchantVariants(variable), [{ id: blade.id, size: null, price: 1000, path: '/produits/' + blade.slug + '/' }], 'Variable-price publication remains unchanged until all variants have matched landing states');

const eligible = catalogue.filter((p) => p.images[0] && p.price > 0 && !estLourd(p));
const expected = eligible.flatMap((p) => merchantVariants(p).map((variant) => ({ p, ...variant })));
const legacy = eligible.flatMap((p) => {
  const sizes = p.sizes.filter((size) => size.length <= 40 && size.toLowerCase() !== p.name.toLowerCase());
  return sizes.length > 1 && sizes.every((size) => variantPrice(p, size) === p.price)
    ? sizes.map((size) => `${p.id}-${size.replace(/[^A-Za-z0-9]+/g, '-')}`)
    : [p.id];
});
assert.deepEqual(expected.map((item) => item.id), legacy, 'Existing Merchant Center item IDs and ordering are preserved');
assert.equal(expected.length, 3502, 'No existing published variant is lost or spuriously expanded');
assert.equal(new Set(expected.map((item) => item.id)).size, expected.length, 'Every item ID remains unique');

const response = await load('app/flux-marchand.xml/route.ts').GET();
assert.equal(response.status, 200);
assert.equal(response.headers.get('content-type'), 'application/rss+xml; charset=utf-8');
const xml = await response.text();
const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
assert.equal(items.length, expected.length);
const decode = (value) => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const tag = (item, name) => decode(item.match(new RegExp(`<g:${name}>([\\s\\S]*?)<\\/g:${name}>`))?.[1] || '');
let sized = 0;
for (let i = 0; i < expected.length; i++) {
  const { p, id, size, price } = expected[i];
  const item = items[i];
  assert.equal(tag(item, 'id'), id);
  assert.equal(tag(item, 'price'), (price / 100).toFixed(2) + ' EUR');
  assert.equal(tag(item, 'availability'), shop.disponibiliteOffre === 'InStock' ? 'in_stock' : 'backorder');
  assert.ok(tag(item, 'google_product_category'), 'Existing Google category survives');
  assert.equal(tag(item, 'identifier_exists'), '', 'Unknown identifiers are not falsely declared absent');
  assert.equal(tag(item, 'mpn'), '', 'Current unverified reference fields do not become invented MPNs');
  assert.equal(tag(item, 'gtin'), '', 'Current catalogue has no verified GTIN field');
  const url = new URL(tag(item, 'link'));
  assert.equal(url.origin, shop.origin);
  assert.equal(url.pathname, '/produits/' + p.slug + '/');
  assert.equal(url.hash, '');
  if (size) {
    sized++;
    assert.equal(url.searchParams.get('taille'), size);
    assert.equal(initialProductSize(p, url.search), size, 'Advertised size is the initial landing selection');
    assert.equal(tag(item, 'size'), size);
    assert.equal(tag(item, 'item_group_id'), p.id);
  } else {
    assert.equal(url.search, '');
  }
}

const client = readFileSync(resolve(root, 'components/shop-interactions.tsx'), 'utf8');
assert.match(client, /useSyncExternalStore\(subscribeProductLocation, productLocation, emptyProductLocation\)/);
assert.match(client, /initialProductSize\(p, search\)/);
assert.match(client, /choice\?\.productId === p\.id && choice\.search === search/);
assert.match(client, /window\.addEventListener\('popstate', callback\)/);
assert.match(client, /window\.removeEventListener\('popstate', callback\)/);
const route = readFileSync(resolve(root, 'app/[...slug]/page.tsx'), 'utf8');
assert.doesNotMatch(route, /await searchParams/, 'Merchant landing state must not force all product routes dynamic');

console.log(`PASS: ${catalogue.length} products, ${items.length} stable unique feed IDs, ${sized} exact-size landing links, identifier evidence/GTIN checks, price/availability preservation, static-route/client integration contracts. Offline only.`);
