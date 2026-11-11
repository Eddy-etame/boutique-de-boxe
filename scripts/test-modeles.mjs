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
const { modeles, modeleDe, estTete, fichesDeTete, cleDuModele, libelleDeFiche, compteDuModele, texteDuModele } = load(resolve(root, 'lib/modeles'));
const textes = load(resolve(root, 'lib/data/modeles-textes'));
const { titreDeModele, productGraph, TITRE_MAX } = load(resolve(root, 'lib/seo'));
const tetes = load(resolve(root, 'lib/data/modeles-tetes'));
const rattaches = load(resolve(root, 'lib/data/modeles-rattaches'));
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
  assert.equal(liste.length, 570);
  assert.equal(plusieurs.length, 202);
});

test('pages of one model share family and brand, and never mix two materials', () => {
  const MATIERE = /\b(cuir|coton|mesh|gel|pu|mousse|néoprène|synthétique|plastique)\b/gi;
  for (const m of plusieurs) {
    assert.equal(new Set(m.fiches.map((p) => p.category)).size, 1, m.cle);
    assert.equal(new Set(m.fiches.map((p) => p.brand)).size, 1, m.cle);
    // Une fiche rattachée à la main (la même paire de gants reprise d'une seconde source, par exemple) échappe à la règle du nom.
    const tails = m.fiches.filter((p) => !rattaches[p.slug]).map((p) => {
      const at = p.name.lastIndexOf(', ');
      return (at > 0 ? p.name.slice(at + 2) : '').toLowerCase().match(MATIERE)?.sort().join('+') || '';
    });
    assert.ok(new Set(tails).size <= 1, 'one material per model: ' + m.cle + ' → ' + tails.join(' | '));
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
  // Dix coloris et une édition, Citrus Lime, rattachée à la main : onze versions.
  assert.equal(bgvl3.fiches.length, 11);
  assert.equal(bgvl3.nom, 'Gants de boxe d’entraînement Twins BGVL3');
  assert.equal(bgvl3.coloris, false);
  assert.equal(compteDuModele(bgvl3), '11 versions');
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
  assert.equal(naruto.fiches.length, 6);
  assert.equal(naruto.coloris, false);
  assert.equal(compteDuModele(naruto), '6 versions');
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
  assert.equal(refs.length, 10);
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

test('written model descriptions belong to a model, are original to it and stay sober', () => {
  const cles = new Set(liste.map((m) => m.cle));
  // Ce qu'une description rédigée ne dit jamais : un prix (il change), un stock, une promesse, un superlatif.
  const INTERDIT = /€|euros?|en stock|promo|soldes?|livraison gratuite|Boxing Center|du groupe|id[ée]al(?:e|es|ement)?|parfait(?:e|es|s|ement)?|incontournable|exceptionnel|r[ée]volutionnaire|ultime|meilleure?s?|haut de gamme|n° ?1|num[ée]ro un|in[ée]gal[ée]|imbattable/i;
  const phrasesVues = new Map();
  for (const [cle, t] of Object.entries(textes)) {
    assert.ok(cles.has(cle), 'description for an existing model: ' + cle);
    assert.match(t.ecrit, /^20\d\d-\d\d-\d\d$/, 'date: ' + cle);
    assert.ok(Array.isArray(t.texte) && t.texte.length >= 1 && t.texte.length <= 3, 'one to three paragraphs: ' + cle);
    const tout = t.texte.join(' ');
    assert.ok(tout.length >= 200 && tout.length <= 1100, `length ${tout.length}: ${cle}`);
    assert.ok(!INTERDIT.test(tout), 'sober wording: ' + cle + ' → ' + (tout.match(INTERDIT) || [''])[0]);
    assert.ok(!/\s{2,}|\s[,.]|[a-zà-ÿ]\.[A-ZÀ-Ý]/.test(tout), 'clean typography: ' + cle);
    for (const para of t.texte) assert.match(para, /[.!?…]$/, 'paragraph ends a sentence: ' + cle);
    // Aucune phrase d'au moins 60 caractères ne sert à deux modèles.
    for (const phrase of tout.split(/(?<=[.!?…])\s+/)) {
      if (phrase.length < 60) continue;
      const k = phrase.toLowerCase();
      assert.ok(!phrasesVues.has(k), `sentence shared by ${phrasesVues.get(k)} and ${cle}: ${phrase}`);
      phrasesVues.set(k, cle);
    }
  }
  for (const m of liste) {
    const t = texteDuModele(m);
    if (t) assert.equal(t, textes[m.cle]);
  }
  // Depuis le 11/11/2026, chaque modèle a sa description : un modèle ajouté sans texte fait échouer le test.
  assert.deepEqual(liste.filter((m) => !textes[m.cle]).map((m) => m.cle), [], 'every model has its written description');
});

test('pages attached by hand join a model that other pages carry by name', () => {
  for (const [slug, r] of Object.entries(rattaches)) {
    const p = bySlug(slug);
    const m = modeleDe(p, all);
    assert.equal(m.cle, r.modele, slug);
    assert.equal(libelleDeFiche(p), r.libelle);
    assert.ok(m.fiches.some((x) => !rattaches[x.slug]) || r.nom, 'the model exists without its attached pages, or its name is written: ' + r.modele);
    if (r.nom) assert.equal(m.nom, r.nom);
    assert.equal(m.fiches.every((x) => x.category === p.category && x.brand === p.brand), true, slug);
    assert.ok(!m.nom.includes(r.libelle) || r.libelle.length < 5, 'the model name is not an edition name: ' + m.nom);
  }
  // Les huit versions du Cleto Reyes Pro Redesign : quatre teintes et quatre éditions, un seul modèle.
  const reyes = modeleDe(bySlug('gants-de-boxe-dentrainement-reyes-pro-citrus-green-redesign'), all);
  assert.equal(reyes.fiches.length, 8);
  assert.equal(reyes.nom, 'Gants de boxe d’entraînement Cleto Reyes Pro Redesign');
  assert.equal(compteDuModele(reyes), '8 versions');
});

test('an aisle list shows one card per model, the head page when it is listed', () => {
  const { unParModele } = load(resolve(root, 'lib/un-par-modele'));
  const { marqueDeModele } = load(resolve(root, 'lib/modeles'));
  const marque = (p) => marqueDeModele(p, all);
  // Toute la liste : une fiche par modèle, et c'est la fiche de tête.
  const reduit = unParModele(all, marque);
  assert.equal(reduit.length, liste.length);
  for (const p of reduit) assert.ok(estTete(p, all), 'head page represents its model: ' + p.slug);
  // L'ordre est celui de la première fiche de chaque modèle.
  const ordre = [];
  for (const p of all) if (!ordre.includes(cleDuModele(p))) ordre.push(cleDuModele(p));
  assert.deepEqual(reduit.map(cleDuModele), ordre);
  // Une liste filtrée où la tête manque montre la première fiche du modèle qui reste.
  const hyperko = modeleDe(bySlug('chaussures-nike-hyperko-2-rouge-606'), all);
  assert.equal(hyperko.fiches.length, 11);
  const sansTete = hyperko.fiches.filter((p) => p.id !== hyperko.tete.id);
  assert.deepEqual(unParModele(sansTete, marque).map((p) => p.id), [sansTete[0].id]);
  // La marque de la fiche de tête porte le nom du modèle ; celle d'un autre coloris, non.
  assert.equal(marque(hyperko.tete).nom, 'Chaussures Nike HyperKO 2');
  assert.equal(marque(hyperko.tete).n, 11);
  assert.equal(marque(sansTete[0]).nom, undefined);
  // Une fiche sans marque (pages par couleur, par marque, recherche) passe telle quelle.
  assert.equal(unParModele(all.slice(0, 50), () => undefined).length, 50);
});

test('a card shows the entry price of the pages its list holds', () => {
  const { cartesParModele } = load(resolve(root, 'lib/un-par-modele'));
  const { cartesDe, fichesDePage, avecModele } = load(resolve(root, 'lib/listing'));
  const { listItem } = load(resolve(root, 'lib/catalog'));
  const sac = modeleDe(bySlug('sac-de-frappe-fairtex-hb12'), all);
  assert.deepEqual(sac.fiches.map((p) => p.price).sort((a, b) => a - b), [12900, 47000]);
  // Dans le rayon, la carte est la fiche de tête, et « Dès » est le prix de sa version la moins chère.
  const rayon = cartesDe(fichesDePage('sacs-de-frappe', all), all);
  const carte = rayon.find((p) => p.modele.cle === sac.cle);
  assert.equal(carte.id, sac.tete.id);
  assert.equal(carte.price, 47000);
  assert.equal(carte.modele.min, 12900);
  assert.equal(carte.modele.n, 2);
  // Une liste qui ne contient que la fiche de tête n'annonce aucun « Dès » : le premier prix se lit sur la liste.
  assert.equal(cartesDe([sac.tete], all)[0].modele.min, undefined);
  // Toute liste : une carte par modèle, une fiche réelle de la liste, au premier prix de ses fiches listées.
  for (const slug of ['gants-de-boxe', 'chaussures-boxe', 'protections-boxe', 'textile-boxe', 'nouveautes']) {
    const fiches = fichesDePage(slug, all);
    const cartes = cartesDe(fiches, all);
    assert.equal(cartes.length, new Set(fiches.map(cleDuModele)).size, slug);
    for (const c of cartes) {
      const prix = fiches.filter((p) => cleDuModele(p) === c.modele.cle).map((p) => p.price).filter((x) => x > 0);
      if (prix.length) assert.equal(c.modele.min || c.price, Math.min(...prix), slug + ' / ' + c.slug);
    }
    // Le navigateur reçoit toutes les fiches, allégées, et arrive aux mêmes cartes que la page.
    const navigateur = cartesParModele(fiches.map((p) => listItem(avecModele(p, all))));
    assert.deepEqual(navigateur.map((p) => [p.id, p.modele.min || 0]), cartes.map((p) => [p.id, p.modele.min || 0]), slug);
  }
  // Les cartes que la page a déjà réduites gardent leur « Dès » quand le navigateur les relit seules.
  assert.equal(cartesParModele(rayon.map(listItem)).find((p) => p.modele.cle === sac.cle).modele.min, 12900);
});

test('texts count models: one view per model, at its entry price, with every size and colour of its pages', () => {
  const { vuesDesModeles, nombreDeModeles } = load(resolve(root, 'lib/modeles'));
  const vues = vuesDesModeles(all, all);
  assert.equal(vues.length, liste.length);
  assert.equal(nombreDeModeles(all, all), liste.length);
  for (const v of vues) {
    const m = parFiche.get(v.id);
    assert.equal(v.id, m.tete.id, 'the view of a whole model is its head page: ' + m.cle);
    assert.equal(v.modele.nom, m.nom);
    const prix = m.fiches.map((p) => p.price).filter((x) => x > 0);
    if (prix.length) {
      assert.equal(v.price, Math.min(...prix), m.cle);
      assert.equal(v.modele.max ?? v.price, Math.max(...prix), m.cle);
    }
    for (const p of m.fiches) {
      assert.ok(p.sizes.every((t) => v.sizes.includes(t)), 'sizes of every page: ' + m.cle);
      assert.ok((p.colors || []).every((t) => v.colors.includes(t)), 'colours of every page: ' + m.cle);
    }
  }
  // Une vue ne modifie jamais la fiche dont elle part.
  const sac = modeleDe(bySlug('sac-de-frappe-fairtex-hb12'), all);
  assert.equal(sac.tete.price, 47000);
  assert.equal(sac.tete.modele, undefined);
});

test('pages by weight, colour and brand list real pages and count models', () => {
  const { allFacets, facetFor, ficheQuiRemplace, MIN_FACET_PRODUCTS, MIN_FACET_MODELES } = load(resolve(root, 'lib/facets'));
  const { brandsOf, MIN_BRAND_PRODUCTS, brandCopy } = load(resolve(root, 'lib/brands'));
  const { listingFor } = load(resolve(root, 'lib/listing'));
  const { nombreDeModeles } = load(resolve(root, 'lib/modeles'));
  const facettes = allFacets(all);
  // 95 pages avant la réduction : une seule ne montrerait plus qu'un modèle (six coloris d'un short), et son adresse
  // renvoie à la fiche de ce modèle.
  assert.equal(facettes.length, 94);
  const seule = 'marques/everlast/shorts-de-boxe-thai';
  assert.equal(facetFor(seule, all), null);
  assert.equal(facetFor(seule, all, true).fiches.length, 6);
  const fiche = ficheQuiRemplace(seule, all);
  assert.ok(fiche && estTete(fiche, all) && modeleDe(fiche, all).fiches.length === 6, 'the address of a one-model page leads to that model');
  assert.equal(ficheQuiRemplace('marques/everlast/shorts-de-boxe', all), null, 'a page that exists is replaced by nothing');
  assert.equal(ficheQuiRemplace('marques/inconnue/shorts-de-boxe', all), null);
  for (const f of facettes) {
    assert.ok(f.fiches.length >= MIN_FACET_PRODUCTS, f.scope);
    assert.ok(f.products.length >= MIN_FACET_MODELES, f.scope);
    assert.equal(f.products.length, nombreDeModeles(f.fiches, all), f.scope);
    assert.ok(f.products.every((p) => f.fiches.some((x) => x.id === p.id)), 'cards are pages of the list: ' + f.scope);
    const prix = f.fiches.map((p) => p.price).filter((x) => x > 0);
    assert.deepEqual([f.min, f.max], [Math.min(...prix), Math.max(...prix)], f.scope);
    assert.ok(f.title.includes(`${f.products.length} modèles`) || !/\d+ modèles/.test(f.title), 'the title counts the cards: ' + f.scope);
    assert.equal(listingFor(f.scope, all).length, f.fiches.length, 'the browser filters every page of the list: ' + f.scope);
    // Jamais coupé au milieu d'un mot : un titre finit sur un mot ou un prix, une description sur son point.
    assert.ok(f.title.length <= 60 && /[\p{L}\d€]$/u.test(f.title), f.scope + ' : ' + f.title);
    assert.ok(f.description.length <= 158 && f.description.endsWith('.'), f.scope + ' : ' + f.description);
  }
  assert.equal(new Set(facettes.map((f) => f.title)).size, facettes.length, 'one title per long-tail page');
  assert.equal(new Set(facettes.map((f) => f.description)).size, facettes.length, 'one description per long-tail page');
  const marques = brandsOf(all);
  assert.equal(marques.length, 21);
  for (const b of marques) {
    assert.ok(b.fiches.length >= MIN_BRAND_PRODUCTS, b.slug);
    assert.equal(b.products.length, nombreDeModeles(b.fiches, all), b.slug);
    assert.equal(b.vues.length, b.products.length, b.slug);
    assert.equal(b.families.reduce((n, f) => n + f.count, 0), b.products.length, b.slug);
    const copie = brandCopy(b);
    assert.ok(copie.title.includes(`${b.products.length} modèles`), b.slug);
    assert.ok(copie.title.length <= 60 && /[\p{L}\d€]$/u.test(copie.title), b.slug + ' : ' + copie.title);
    assert.ok(copie.description.length <= 158 && copie.description.endsWith('.'), b.slug + ' : ' + copie.description);
  }
});

test('a head-page guide counts the models its grid shows, from the cheapest page to the dearest', () => {
  const { contexteDeRayon, fichesDePage, cartesDe } = load(resolve(root, 'lib/listing'));
  const { GUIDES_RAYONS } = load(resolve(root, 'lib/guides-rayons'));
  const { dansLeRayon } = load(resolve(root, 'lib/rayons'));
  for (const g of GUIDES_RAYONS) {
    const fiches = fichesDePage(g.slug, all);
    const c = contexteDeRayon(g.slug, fiches, all);
    assert.equal(c.f.n, cartesDe(fiches, all).length, g.slug);
    const prix = fiches.filter((p) => p.price > 0 && dansLeRayon(p.category, p) && dansLeRayon(g.slug, p)).map((p) => p.price);
    assert.deepEqual([c.f.min, c.f.max], [Math.min(...prix), Math.max(...prix)], g.slug);
    assert.ok(g.titre(c).length <= 60, g.slug + ' : ' + g.titre(c));
    assert.ok(g.description(c).length <= 158, g.slug + ' : ' + g.description(c).length);
    assert.equal(c.catalogue, all);
  }
});

test('a small count never breaks a sentence: every computed text agrees in number', () => {
  const { contexteDeRayon, fichesDePage } = load(resolve(root, 'lib/listing'));
  const { GUIDES_RAYONS, guideEnTexte } = load(resolve(root, 'lib/guides-rayons'));
  const { allFacets } = load(resolve(root, 'lib/facets'));
  const { brandsOf, brandCopy } = load(resolve(root, 'lib/brands'));
  const textes = [];
  const ajoute = (ou, ...ts) => { for (const t of ts.flat()) if (typeof t === 'string' && t) textes.push([ou, t]); };
  for (const g of GUIDES_RAYONS) {
    const c = contexteDeRayon(g.slug, fichesDePage(g.slug, all), all);
    const t = guideEnTexte(g, c);
    ajoute(g.slug, g.titre(c), g.description(c), g.label(c), t.chapitres, t.faq.flatMap((q) => [q.question, q.answer]), t.choix.map((x) => x.critere));
  }
  for (const f of allFacets(all)) ajoute(f.scope, f.eyebrow, f.title, f.description, f.intro, f.faq.flatMap((q) => [q.question, q.answer]));
  for (const b of brandsOf(all)) { const c = brandCopy(b); ajoute(b.slug, c.title, c.description, c.intro, c.faq.flatMap((q) => [q.question, q.answer])); }
  assert.ok(textes.length > 2000);
  // « 1 modèles », « les 1 paires », « 0 modèle » : ce qu'un compte passé de fiches à modèles fait apparaître.
  const faux = /(?:^|[^\d,.])1 (?:modèles|paires|pièces|kimonos|sacs|marques|teintes|tailles|fiches|gants|casques|protections|références|versions|rayons|familles)|(?:les|des|ces) 1 |(?:^|[^\d,.])0 (?:modèle|paire|pièce)/i;
  assert.deepEqual(textes.filter(([, t]) => faux.test(t)).map(([ou, t]) => ou + ' : ' + t.slice(0, 140)), []);
});

test('search finds a plural, and the belts aisle lists belts of rank only', () => {
  const { matchesSearch } = load(resolve(root, 'lib/catalog-tools'));
  const { subfamilyFor, subfamilyProducts } = load(resolve(root, 'lib/subfamilies'));
  // « gants rouges » ne trouvait rien : les fiches disent « rouge ».
  const singulier = all.filter((p) => matchesSearch(p, 'gants rouge'));
  const pluriel = all.filter((p) => matchesSearch(p, 'gants rouges'));
  assert.ok(singulier.length > 10);
  assert.deepEqual(pluriel.map((p) => p.id), singulier.map((p) => p.id));
  assert.equal(all.filter((p) => matchesSearch(p, 'chaussures de boxes')).length, all.filter((p) => matchesSearch(p, 'chaussures de boxe')).length);
  assert.equal(all.filter((p) => matchesSearch(p, 'zzzs')).length, 0);
  // Une ceinture de grade est dans la famille des arts martiaux : la ceinture lombaire de sudation n'en est pas une.
  const ceintures = subfamilyProducts(subfamilyFor('ceintures'), all);
  assert.ok(ceintures.length >= 6);
  assert.ok(ceintures.every((p) => p.category === 'arts-martiaux'), ceintures.map((p) => p.name).join(' | '));
});
