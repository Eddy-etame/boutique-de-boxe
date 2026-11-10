// Un modèle, une page : contrôles hors ligne du regroupement des fiches par modèle (lib/modeles.ts).
// Aucun réseau, aucune base, aucun compte.
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

globalThis.fetch = async () => { throw new Error('Network is forbidden in model checks'); };
const { modeles, modeleDe, estTete, fichesDeTete, cleDuModele, libelleDeFiche, compteDuModele } = load(resolve(root, 'lib/modeles'));
const { titreDeModele, productGraph, TITRE_MAX } = load(resolve(root, 'lib/seo'));
const tetes = load(resolve(root, 'lib/data/modeles-tetes'));
const all = ['products', 'imported-products'].flatMap((file) => JSON.parse(readFileSync(resolve(root, 'lib/data', file + '.json'), 'utf8')));
const bySlug = (slug) => {
  const p = all.find((x) => x.slug === slug);
  assert.ok(p, 'Catalogue fixture: ' + slug);
  return p;
};
const { liste, parFiche } = modeles(all);
const plusieurs = liste.filter((m) => m.fiches.length > 1);

test('every product page belongs to exactly one model, and every model has one head page', () => {
  assert.equal(all.length, 1042);
  assert.equal(parFiche.size, all.length);
  assert.equal(liste.reduce((n, m) => n + m.fiches.length, 0), all.length);
  assert.equal(new Set(liste.map((m) => m.cle)).size, liste.length, 'model keys are unique');
  for (const m of liste) {
    assert.equal(m.fiches[0].id, m.tete.id, 'head page first: ' + m.cle);
    assert.equal(new Set(m.fiches.map((p) => p.id)).size, m.fiches.length);
    for (const p of m.fiches) assert.equal(cleDuModele(p), m.cle);
  }
  assert.equal(fichesDeTete(all).length, liste.length);
  assert.equal(liste.length, 646);
  assert.equal(plusieurs.length, 183);
});

test('pages of one model share family and brand, and never mix two materials', () => {
  const MATIERE = /\b(cuir|coton|mesh|gel|pu|mousse|néoprène|synthétique|plastique)\b/gi;
  for (const m of plusieurs) {
    assert.equal(new Set(m.fiches.map((p) => p.category)).size, 1, m.cle);
    assert.equal(new Set(m.fiches.map((p) => p.brand)).size, 1, m.cle);
    const tails = m.fiches.map((p) => {
      const at = p.name.lastIndexOf(', ');
      return (at > 0 ? p.name.slice(at + 2) : '').toLowerCase().match(MATIERE)?.sort().join('+') || '';
    });
    assert.equal(new Set(tails).size, 1, 'one material per model: ' + m.cle + ' → ' + tails.join(' | '));
  }
});

test('the written head pages exist, belong to their model and cover every multi-page model', () => {
  assert.deepEqual(Object.keys(tetes).sort(), plusieurs.map((m) => m.cle).sort());
  for (const [cle, slug] of Object.entries(tetes)) {
    const p = bySlug(slug);
    assert.equal(cleDuModele(p), cle, slug);
    assert.ok(estTete(p, all), 'written head is the head: ' + slug);
  }
});

test('known models group the right pages', () => {
  const bgvl3 = modeleDe(bySlug('gants-de-boxe-dentrainement-twins-bgvl3-rouge'), all);
  assert.equal(bgvl3.fiches.length, 10);
  assert.equal(bgvl3.nom, 'Gants de boxe d’entraînement Twins BGVL3');
  assert.equal(bgvl3.coloris, true);
  assert.equal(compteDuModele(bgvl3), '10 coloris');
  assert.equal(libelleDeFiche(bySlug('gants-de-boxe-dentrainement-twins-bgvl3-light-blue')), 'bleu clair');

  // 19 fiches pour une même bande de boxe : un seul modèle.
  assert.equal(modeleDe(bySlug('bandes-de-boxe-elion-45m-rose'), all).fiches.length, 19);

  // Deux produits qui ne partagent que le nom : l'un en cuir, l'autre en coton, huit fois moins cher.
  const cuir = modeleDe(bySlug('protege-tibias-cuir-or'), all);
  const coton = modeleDe(bySlug('proteges-tibias-elion'), all);
  assert.notEqual(cuir.cle, coton.cle);
  assert.equal(cuir.fiches.length, 2);
  assert.equal(coton.fiches.length, 1);
  assert.equal(cuir.nom, 'Protège-tibias et pieds Elion, cuir');

  // Les bandes Fairtex en mesh ne sont pas les bandes Fairtex en coton.
  assert.notEqual(modeleDe(bySlug('bandes-de-boxe-fairtex-mesh-rose-fxhw4'), all).cle, modeleDe(bySlug('bandes-de-boxe-fairtex-rose'), all).cle);

  // Une édition sous licence est une version, pas un coloris.
  const naruto = modeleDe(bySlug('lelegant-de-boxe-naruto-shippuden-x-elion-paris-edition-limitee-itachi'), all);
  assert.equal(naruto.fiches.length, 4);
  assert.equal(naruto.coloris, false);
  assert.equal(compteDuModele(naruto), '4 versions');
  assert.equal(libelleDeFiche(naruto.fiches[0]).length > 0, true);

  // Une fiche seule est son propre modèle et garde son nom.
  const seul = liste.find((m) => m.fiches.length === 1);
  assert.equal(seul.nom, seul.tete.name);
});

test('a page without a colour in its name is told apart by its reference', () => {
  const p = bySlug('coudieres-elion-renforcees');
  assert.equal(libelleDeFiche(p), 'réf. EL52012');
  for (const m of plusieurs) {
    const labels = m.fiches.map(libelleDeFiche);
    for (const l of labels) assert.ok(l && l.trim() === l, 'label: ' + m.cle);
    assert.equal(new Set(labels).size, labels.length, 'distinct labels in ' + m.cle + ' → ' + labels.join(' | '));
  }
});

test('model titles fit, and fall back to the page title rather than collide', () => {
  const titres = new Map();
  for (const m of plusieurs) {
    const t = titreDeModele(m.nom, compteDuModele(m), m.tete.name);
    assert.ok(t === m.tete.name || t.length <= TITRE_MAX, t);
    assert.ok(!titres.has(t.toLowerCase()), 'duplicate model title: ' + t);
    titres.set(t.toLowerCase(), m.cle);
  }
  // Un titre de modèle n'est jamais le nom d'une autre fiche du catalogue.
  const noms = new Map(all.map((p) => [p.name.toLowerCase(), p.id]));
  for (const m of plusieurs) {
    const t = titreDeModele(m.nom, compteDuModele(m), m.tete.name).toLowerCase();
    assert.ok(!noms.has(t) || noms.get(t) === m.tete.id, 'model title equals another page name: ' + t);
  }
  assert.equal(titreDeModele('Gants de boxe d’entraînement Twins BGVL3', '10 coloris', 'x'), 'Gants de boxe d’entraînement Twins BGVL3, en 10 coloris');
});

test('structured data ties the colours of a model together', () => {
  const rouge = bySlug('gants-de-boxe-dentrainement-twins-bgvl3-rouge');
  const m = modeleDe(rouge, all);
  const modele = { id: m.tete.sourceRef || m.tete.id, nom: m.nom, autres: m.fiches.filter((x) => x.id !== rouge.id) };
  const graph = JSON.parse(productGraph(rouge, [], { modele }))['@graph'];
  const group = graph.find((n) => n['@type'] === 'ProductGroup');
  assert.ok(group, 'sizes at one price publish a ProductGroup');
  assert.equal(group.productGroupID, modele.id);
  assert.equal(group.name, m.nom);
  assert.deepEqual(group.variesBy, ['https://schema.org/size', 'https://schema.org/color']);
  const full = group.hasVariant.filter((v) => v['@type'] === 'Product');
  const refs = group.hasVariant.filter((v) => !v['@type']);
  assert.equal(full.length, rouge.sizes.length);
  assert.equal(refs.length, 9);
  for (const v of full) assert.ok(v.offers && v.name.startsWith(rouge.name));
  for (const r of refs) assert.match(r.url, /^https:\/\/www\.boutique-de-boxe\.com\/produits\/[a-z0-9-]+\/$/);
  assert.ok(!refs.some((r) => r.url.includes(rouge.slug + '/')), 'a page does not cite itself as another colour');

  // Un modèle sans tailles publiables garde son Product, avec l'identifiant du groupe.
  const sansTaille = plusieurs.flatMap((x) => x.fiches).find((p) => p.sizes.length === 0 && p.price > 0);
  const ms = modeleDe(sansTaille, all);
  const g2 = JSON.parse(productGraph(sansTaille, [], { modele: { id: ms.tete.sourceRef || ms.tete.id, nom: ms.nom, autres: ms.fiches.filter((x) => x.id !== sansTaille.id) } }))['@graph'];
  const product = g2.find((n) => n['@type'] === 'Product');
  assert.equal(product.inProductGroupWithID, ms.tete.sourceRef || ms.tete.id);
  assert.ok(product.offers);

  // Une fiche seule ne change pas.
  const seul = liste.find((x) => x.fiches.length === 1).tete;
  const g3 = JSON.parse(productGraph(seul, [], {}))['@graph'];
  assert.ok(!JSON.stringify(g3).includes('inProductGroupWithID'));
});
