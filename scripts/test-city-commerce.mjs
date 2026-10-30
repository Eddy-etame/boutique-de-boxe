// City/region buying-first regression tests: actual data and server components, no network or database.
// Client-side shell/cards are replaced by semantic SSR fixtures; production browser QA is separate.
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
const h = React.createElement;
const origin = 'https://www.boutique-de-boxe.com';

globalThis.fetch = async () => { throw new Error('Network is forbidden in city commerce tests'); };

const fixtures = {
  '@/lib/seo': {
    urlOf: (path) => origin + path,
    graph: (nodes) => JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }),
    webPageNode: ({ path, type, mainEntity, ...rest }) => ({ '@type': type, '@id': origin + path, mainEntity: { '@id': mainEntity }, ...rest }),
    faqNode: (path, faq) => ({ '@type': 'FAQPage', '@id': origin + path + '#faq', mainEntity: faq }),
  },
  '@/lib/og': { ogImage: () => [] },
  './shop-shell': {
    Breadcrumb: () => h('nav', { 'aria-label': 'Fil d’Ariane' }),
    ArrowLink: ({ href, children }) => h('a', { href }, children),
  },
  './shop-interactions': {
    ProductCard: ({ product }) => h('article', { 'data-test-product': product.id },
      h('a', { href: '/produits/' + product.slug + '/' }, product.name),
      h('span', null, product.sizes.join(', '))),
  },
  './seo-body': {
    SeoBody: ({ sections = [], faq = [], heading }) => h(React.Fragment, null,
      ...sections.map((s) => h('section', { key: s.h2 }, h('h2', null, s.h2), ...s.paragraphs.map((p) => h('p', { key: p }, p)))),
      faq.length ? h('section', null, h('h2', null, heading), ...faq.map((f) => h('details', { key: f.question }, h('summary', null, f.question), h('p', null, f.answer)))) : null),
  },
};

const modules = new Map();
function load(path) {
  const file = [path, path + '.ts', path + '.tsx', path + '.json'].find((f) => {
    try { return statSync(f).isFile(); } catch { return false; }
  });
  if (!file) throw new Error('Module not found: ' + path);
  if (modules.has(file)) return modules.get(file).exports;
  const mod = { exports: {} };
  modules.set(file, mod);
  if (file.endsWith('.json')) {
    mod.exports = JSON.parse(readFileSync(file, 'utf8'));
    return mod.exports;
  }
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, resolveJsonModule: true },
  }).outputText;
  const requireLocal = (id) => {
    if (fixtures[id]) return fixtures[id];
    if (id.startsWith('@/')) return load(resolve(root, id.slice(2)));
    if (id.startsWith('.')) return load(resolve(dirname(file), id));
    return requireNode(id);
  };
  vm.compileFunction(code, ['exports', 'require', 'module'], { filename: file })(mod.exports, requireLocal, mod);
  return mod.exports;
}

const villes = load(resolve(root, 'lib/villes'));
const catalog = load(resolve(root, 'lib/catalog'));
const pages = load(resolve(root, 'components/ville-page'));
const all = [...load(resolve(root, 'lib/data/products.json')), ...load(resolve(root, 'lib/data/imported-products.json'))];
const graphOf = (html) => JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1])['@graph'];
const strip = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');

test('every existing city has one buying brief and one equipment selection before its retained directory', () => {
  assert.equal(villes.VILLES.length, 31);
  for (const ville of villes.VILLES) {
    const html = renderToStaticMarkup(h(pages.VillePage, { ville, all }));
    const where = villes.villePath(ville.slug);
    assert.equal((html.match(/data-city-commerce="true"/g) || []).length, 1, where);
    assert.equal((html.match(/id="commander"/g) || []).length, 1, where);
    assert.equal((html.match(/id="equipement"/g) || []).length, 1, where);
    assert.equal((html.match(/<h1>/g) || []).length, 1, where);
    assert.ok(html.indexOf('data-city-commerce') < html.indexOf('id="equipement"'), where);
    assert.ok(html.indexOf('id="equipement"') < html.indexOf('id="lieux"'), where);
    if (ville.slug === 'toulouse') assert.ok(html.indexOf('id="equipement"') < html.indexOf('class="ville-clubs"'));
    const graph = graphOf(html);
    const selection = graph.find((node) => node['@id'] === origin + where + '#equipement');
    const places = graph.find((node) => node['@id'] === origin + where + '#lieux');
    assert.equal(places.numberOfItems, ville.lieux.length, where);
    assert.deepEqual(places.itemListElement.map((entry) => entry.item.identifier.value), ville.lieux.map((lieu) => lieu.id), where);
    assert.ok(selection.numberOfItems > 0 && selection.numberOfItems <= 8, where);
    assert.equal(selection.numberOfItems, (html.match(/data-test-product=/g) || []).length, where);
    for (const product of selection.itemListElement) assert.ok(html.includes('href="' + product.url.slice(origin.length) + '"'), where);
    assert.equal(graph[0].mainEntity['@id'], origin + where + '#equipement', where);
    const metadata = pages.villeMetadata(ville);
    assert.equal(metadata.title.absolute, `Boutique de boxe ${ville.nom} : gants, sacs, ${ville.lieux.length} lieux`);
    assert.equal(metadata.alternates.canonical, where);
    assert.ok(metadata.description.length <= 158, where + ': ' + metadata.description.length);
    const text = strip(html);
    assert.ok(text.includes(ville.nom) && text.includes('prix TTC'), where);
    assert.ok(text.includes(catalog.shop.delais.expedition), where);
    assert.ok(html.includes('/livraison/') && html.includes('/retours/') && html.includes('/contact/'), where);
    assert.ok(!/magasin au|retrait en salle|retrait dans la salle/i.test(text), where);
    assert.ok(villes.villeFaq(ville)[0].question.match(/acheter|trouver|commander|livre|où l’acheter/i), where);
  }
});

test('region retains all departments and the source directory after its purchasing answer', () => {
  for (const region of villes.REGIONS) {
    const html = renderToStaticMarkup(h(pages.RegionPage, { region, all }));
    assert.equal((html.match(/data-region-commerce="true"/g) || []).length, 1);
    assert.equal((html.match(/id="equipement"/g) || []).length, 1);
    assert.ok(html.indexOf('data-region-commerce') < html.indexOf('id="equipement"'));
    assert.ok(html.indexOf('id="equipement"') < html.indexOf('id="communes"'));
    const graph = graphOf(html);
    const departments = graph.find((node) => node['@id'].endsWith('#departements'));
    assert.equal(departments.numberOfItems, region.groupes.length);
    assert.equal(pages.regionMetadata(region).alternates.canonical, villes.villePath(region.slug));
    assert.ok(pages.regionMetadata(region).description.length <= 158);
    for (const group of region.groupes) assert.ok(html.includes(group.code), group.nom);
  }
});

test('closed sales state cannot promise current payment or dispatch in the buying brief', () => {
  const opened = catalog.shop.ventesOuvertes;
  try {
    catalog.shop.ventesOuvertes = false;
    const html = renderToStaticMarkup(h(pages.VillePage, { ville: villes.VILLES.find((v) => v.slug === 'toulouse'), all }));
    const brief = html.slice(html.indexOf('id="commander"'), html.indexOf('id="equipement"'));
    assert.ok(brief.includes('aucun paiement avant cette ouverture'));
    assert.ok(brief.includes('délai d’expédition prévu'));
    assert.ok(!brief.includes('paiement par carte sur PayPlug'));
    assert.ok(villes.villeAchatChapeau(villes.VILLES[0]).includes('dès l’ouverture des ventes'));
  } finally { catalog.shop.ventesOuvertes = opened; }
});

test('empty catalogue remains renderable without fictional products', () => {
  const ville = villes.VILLES.find((v) => v.slug === 'toulouse');
  const html = renderToStaticMarkup(h(pages.VillePage, { ville, all: [] }));
  const selection = graphOf(html).find((node) => node['@id'].endsWith('#equipement'));
  assert.equal(selection.numberOfItems, 0);
  assert.equal((html.match(/data-test-product=/g) || []).length, 0);
  assert.ok(html.includes('id="lieux"'));
});

test('dates represent actual editorial changes and do not refresh the unchanged national hub', () => {
  assert.equal(pages.VILLES_DATE, '2026-10-24');
  assert.equal(pages.CARREFOUR_DATE, '2026-10-23');
});
