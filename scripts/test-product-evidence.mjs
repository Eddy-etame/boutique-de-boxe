// Offline catalogue content checks. No network, database, account or payment action.
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
  const file = [path, path + '.ts', path + '.json'].find((p) => {
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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true },
  }).outputText;
  const requireLocal = (id) => id.startsWith('@/') ? load(resolve(root, id.slice(2))) : id.startsWith('.') ? load(resolve(dirname(file), id)) : requireNode(id);
  vm.compileFunction(code, ['exports', 'require', 'module'], { filename: file })(mod.exports, requireLocal, mod);
  return mod.exports;
}

globalThis.fetch = async () => { throw new Error('Network is forbidden in product evidence checks'); };
const { practiceLevel, placeDansLaFamille, careAdvice, productFaq, longDescription, PRODUCT_EVIDENCE_REVISION } = load(resolve(root, 'lib/describe'));
const { ENFANT } = load(resolve(root, 'lib/rayons'));
const { categories, categoryFor, getCategoryProducts, money } = load(resolve(root, 'lib/catalog'));
const { subfamilyFor, subfamilyProducts } = load(resolve(root, 'lib/subfamilies'));
const { GUIDES_RAYONS, guideRayon, faits, texte, choix } = load(resolve(root, 'lib/guides-rayons'));
const { ouncesOf, ozFacets } = load(resolve(root, 'lib/facets'));
const all = ['products', 'imported-products'].flatMap((file) => JSON.parse(readFileSync(resolve(root, 'lib/data', file + '.json'), 'utf8')));
const bySlug = (slug) => {
  const p = all.find((x) => x.slug === slug);
  assert.ok(p, 'Catalogue fixture: ' + slug);
  return p;
};
const blade = bySlug('gants-boxe-blade-metal-boxe-noir-blanc');
const contextFor = (slug) => {
  const category = categoryFor(slug);
  const sub = subfamilyFor(slug);
  assert.ok(category || sub, 'Existing guide category/subfamily: ' + slug);
  const items = category ? getCategoryProducts(category, all) : subfamilyProducts(sub, all);
  return { f: faits(slug, items), items, all };
};
const guideText = (g, context) => [g.intro, texte(g.guide.chapeau, context), ...g.guide.chapitres.flatMap((c) => [c.titre, ...c.texte.map((t) => texte(t, context))]), ...g.faq(context).flatMap((f) => [f.question, f.answer])].join(' ');

test('all catalogue product levels require an explicitly declared specification', () => {
  assert.equal(all.length, 1042);
  for (const p of all) {
    const declared = p.specs?.['Niveau conseillé'] || p.specs?.['Niveau de pratique'] || p.specs?.Niveau;
    assert.equal(practiceLevel(p), declared?.trim() || null, p.slug);
    const faq = productFaq(p, all);
    assert.ok(faq.every((f) => f.question && f.answer), p.slug + ' complete FAQ');
    if (!declared?.trim()) {
      assert.ok(!faq.some((f) => /niveau conseillé|niveau indiqué|niveau de pratique/i.test(f.answer)), p.slug + ' no invented level');
      assert.ok(!faq.some((f) => /quel niveau/i.test(f.question)), p.slug + ' no unsupported level question');
    }
  }
});

test('model marketing terms, children and negated approval never establish expertise or competition suitability', () => {
  const inferred = all.filter((p) => /compétition|competition|pro sparring|professional|élite|elite/i.test(p.name + ' ' + (p.use || '')));
  assert.equal(inferred.length, 30);
  for (const p of inferred) assert.equal(practiceLevel(p), null, p.slug);
  const kimono = bySlug('kimono-jjb-manto-miko-noir');
  assert.match(kimono.use, /n’établissent pas une homologation/);
  assert.equal(practiceLevel(kimono), null);
  assert.equal(practiceLevel({ ...blade, name: 'Gants Professional Elite débutant enfant compétition', audience: 'enfant', use: 'Aucune homologation de compétition' }), null);
});

test('explicit level evidence remains available and is distinguished from model-name inference', () => {
  for (const field of ['Niveau conseillé', 'Niveau de pratique', 'Niveau']) {
    const p = { ...blade, specs: { [field]: ' Pratique régulière ' } };
    assert.equal(practiceLevel(p), 'Pratique régulière');
    assert.ok(productFaq(p).some((f) => f.answer.includes('niveau indiqué sur la fiche : Pratique régulière')));
  }
  assert.equal(practiceLevel({ ...blade, specs: { Niveau: '   ' } }), null);
  assert.equal(practiceLevel({ ...blade, specs: { 'Niveau conseillé': '  ', Niveau: 'Pratique régulière' } }), 'Pratique régulière');
});

test('adult glove comparisons preserve actual model facts without universal ounce-to-use assignments', () => {
  const gloves = all.filter((p) => p.category === 'gants-de-boxe' && p.audience !== 'enfant' && !ENFANT.test(p.name));
  assert.equal(gloves.length, 178);
  for (const p of gloves) {
    const comparison = placeDansLaFamille(p, all).join(' ');
    assert.doesNotMatch(comparison, /poids couvrent|poids sert surtout pour|poids servent surtout pour/i, p.slug);
  }
  const bladeText = longDescription(blade);
  assert.ok(blade.sizes.every((size) => bladeText.includes(size)), 'Existing real offered weights remain');
  assert.ok(placeDansLaFamille(blade, all).some((p) => /prix|modèles/.test(p)), 'Factual catalogue comparisons remain');
  assert.ok(productFaq(blade).some((f) => blade.sizes.every((size) => f.answer.includes(size))), 'Size-selection FAQ remains factual');
});

test('authored use and care, PU care and object-specific bottle care stay intact', () => {
  for (const p of all.filter((x) => x.care)) assert.equal(careAdvice(p), p.care, p.slug);
  assert.match(blade.use, /nombre d’onces ne remplace pas/);
  assert.doesNotMatch(careAdvice(blade), /baume|nourrir le cuir|laver à 30/);
  assert.match(careAdvice(blade), /chiffon humide/);
  const bottle = bySlug('bouteille-650ml-infinity-noir');
  assert.doesNotMatch(careAdvice(bottle), /laver à 30|filet|sécher à plat|nourrir le cuir/);
  assert.match(careAdvice(bottle), /notice du fabricant/);
  assert.equal(PRODUCT_EVIDENCE_REVISION, '2026-10-24');
});

test('glove guide metadata and weight table report actual catalogue facts without keyword repetition or use assignments', () => {
  const g = guideRayon('gants-de-boxe');
  const context = contextFor(g.slug);
  assert.equal((g.titre(context).toLowerCase().match(/gants de boxe/g) || []).length, 1);
  assert.match(g.titre(context), new RegExp(String(context.items.length) + ' modèles'));
  assert.match(g.description(context), /^Gants de boxe :/);
  assert.doesNotMatch(g.titre(context) + g.description(context), /vente gants de boxe|gants boxe,/i);
  const table = g.tableau(context);
  assert.equal(table.colonnes.length, 3);
  const known = new Set(ozFacets(all).map((f) => f.path));
  for (const row of table.lignes) {
    assert.equal(row.length, 3);
    const cell = typeof row[0] === 'string' ? row[0] : row[0].texte;
    const oz = Number(cell.match(/\d+/)[0]);
    const expected = context.items.filter((p) => p.price > 0 && ouncesOf(p).includes(oz));
    assert.equal(row[1], expected.length.toLocaleString('fr-FR').replace(/\u202f/g, '\u00a0'));
    assert.equal(row[2], money(Math.min(...expected.map((p) => p.price))));
    if (typeof row[0] !== 'string') assert.ok(known.has(row[0].href), 'Existing weight destination');
  }
  for (const selected of choix(g, context)) {
    assert.ok(context.items.some((p) => p.id === selected.produit.id));
    assert.doesNotMatch(selected.usage + ' ' + selected.critere, /gabarit moyen|gabarit lourd|poids de sparring|trois séances|matière qui dure le plus|compétition, poignet/i);
  }
});

test('commercial guides no longer prescribe universal ounce, lifespan, brand-cut or child-size mappings', () => {
  const scopes = ['gants-de-boxe', 'materiel-boxe', 'sacs-de-frappe', 'gants-mma', 'materiel-mma', 'equipement-boxe-anglaise', 'bandes-de-boxe', 'shorts-de-boxe-thai', 'textile-boxe'];
  for (const slug of scopes) {
    const g = guideRayon(slug);
    assert.equal(g.revision, '2026-10-24', slug);
    const visible = guideText(g, contextFor(slug));
    assert.doesNotMatch(visible, /10 oz au sac|10 oz suffisent|12 oz en technique|dix onces pour le sac|quatorze à seize dès|taillent compact|taillent plus petit|cuir devient le moins coûteux|PU s’use le plus vite|4 oz de 5 à 7 ans|6 oz de 7 à 10 ans|moitié de votre poids/i, slug);
  }
  const boxing = guideText(guideRayon('equipement-boxe-anglaise'), contextFor('equipement-boxe-anglaise'));
  assert.match(boxing, /FFBoxe_Saison-2026-2027_Code-Sportif-Boxe-Amateur_VF_Validation_CODIR_2026-07-09\.pdf/);
  assert.match(boxing, /10 onces \(284 g\) ou 12 onces \(341 g\)/, 'Existing explicitly attributed federation rule retained');
});

test('mouthguard guidance follows the actual model instructions instead of universal braces or age rules', () => {
  for (const slug of ['protege-dents', 'protections-boxe']) {
    const g = guideRayon(slug);
    const visible = guideText(g, contextFor(slug));
    assert.equal(g.revision, '2026-10-24');
    assert.doesNotMatch(visible, /ne se moulent pas|jusqu’à 11 ans|qui ne se moule pas|il se remoule si/i);
    assert.match(visible, /notice|instructions/);
    assert.match(visible, /orthodontiste/);
  }
});

test('every guide keeps its real destination, count, selection and structured table shape', () => {
  assert.ok(categories.length > 0);
  for (const g of GUIDES_RAYONS) {
    const context = contextFor(g.slug);
    assert.ok(context.items.length > 0, g.slug + ' real catalogue');
    assert.equal(context.f.n, context.items.length);
    assert.ok(g.titre(context) && g.description(context) && g.label(context));
    assert.ok(!/NaN|Infinity/.test(guideText(g, context)), g.slug + ' finite model facts');
    assert.doesNotMatch(guideText(g, context), /grille.*reprise sur (?:chaque|la|sa) fiche|tableau.*repris sur la fiche|coupe thaïlandaise taille souvent une lettre/i, g.slug + ' no absent chart or brand-fit promise');
    const table = g.tableau?.(context);
    if (table) for (const row of table.lignes) assert.equal(row.length, table.colonnes.length, g.slug + ' table shape');
    for (const selected of choix(g, context)) assert.ok(all.some((p) => p.id === selected.produit.id), g.slug + ' actual selected product');
  }
});
