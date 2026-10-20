// Notes des produits (20/10/2026) : tests hors ligne, sans base, sans réseau, sans serveur.
// Validation, filtre des robots, une note par appareil (mise à jour), moyenne, retrait et JSON-LD.
// Lancé par `npm test` (node --test scripts/test-notes.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

globalThis.fetch = async () => {
  throw new Error('AUCUN APPEL RÉSEAU DANS CES TESTS');
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requireNode = createRequire(resolve(root, 'package.json'));
const ts = requireNode('typescript');

/** Un chargeur minimal : les modules TypeScript de lib/ transpilés en CommonJS, les JSON lus tels quels. */
const modules = new Map();
function charger(chemin) {
  const fichier = [chemin, chemin + '.ts', chemin + '.json'].find((f) => {
    try {
      return statSync(f).isFile();
    } catch {
      return false;
    }
  });
  if (!fichier) throw new Error('module introuvable : ' + chemin);
  if (modules.has(fichier)) return modules.get(fichier).exports;
  const module = { exports: {} };
  modules.set(fichier, module);
  if (fichier.endsWith('.json')) {
    module.exports = JSON.parse(readFileSync(fichier, 'utf8'));
    return module.exports;
  }
  const code = ts.transpileModule(readFileSync(fichier, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true },
  }).outputText;
  const requireLocal = (id) => {
    if (id.startsWith('@/')) return charger(resolve(root, id.slice(2)));
    if (id.startsWith('.')) return charger(resolve(dirname(fichier), id));
    return requireNode(id);
  };
  new Function('exports', 'require', 'module', code)(module.exports, requireLocal, module);
  return module.exports;
}

const notes = charger(resolve(root, 'lib/notes'));
const sql = charger(resolve(root, 'lib/notes-sql'));

/**
 * Une base simulée qui comprend exactement les requêtes de lib/notes-sql.ts, avec la sémantique de
 * Postgres pour chacune (ON CONFLICT … DO UPDATE sans toucher au statut, RETURNING, agrégats).
 */
function baseSimulee() {
  const lignes = [];
  const vues = [];
  const db = {
    lignes,
    vues,
    prepare(texte) {
      const s = texte.replace(/\s+/g, ' ').trim();
      let params = [];
      const executer = () => {
        vues.push(s);
        if (s.startsWith('SELECT id FROM product_ratings WHERE product_id=? AND device_hash=?')) {
          const r = lignes.find((l) => l.product_id === params[0] && l.device_hash === params[1]);
          return r ? [{ id: r.id }] : [];
        }
        if (s.startsWith('SELECT count(*) AS n FROM product_ratings WHERE product_id=? AND ip_hash=? AND created_at > ?'))
          return [{ n: lignes.filter((l) => l.product_id === params[0] && l.ip_hash === params[1] && l.created_at > params[2]).length }];
        if (s.startsWith('INSERT INTO product_ratings')) {
          const [id, product_id, stars, created_at, updated_at, ip_hash, device_hash] = params;
          const deja = lignes.find((l) => l.product_id === product_id && l.device_hash === device_hash);
          const conflit = /ON CONFLICT \(product_id,device_hash\) DO UPDATE SET (.*) RETURNING status$/.exec(s);
          assert.ok(conflit, 'la note se met à jour sur le couple modèle + appareil');
          if (deja) {
            for (const set of conflit[1].split(',').map((x) => x.trim())) {
              const [col, val] = set.split('=').map((x) => x.trim());
              deja[col] = { 'excluded.stars': stars, 'excluded.updated_at': updated_at, 'excluded.ip_hash': ip_hash }[val];
            }
            return [{ status: deja.status }];
          }
          lignes.push({ id, product_id, stars, created_at, updated_at, ip_hash, device_hash, status: 'visible', removed_reason: null, removed_detail: null, removed_at: null, removed_by: null });
          return [{ status: 'visible' }];
        }
        if (s.startsWith('SELECT count(*) AS total, COALESCE(sum(stars),0) AS somme FROM product_ratings WHERE product_id=? AND status=\'visible\'')) {
          const v = lignes.filter((l) => l.product_id === params[0] && l.status === 'visible');
          return [{ total: v.length, somme: v.reduce((a, l) => a + l.stars, 0) }];
        }
        if (s.startsWith('SELECT product_id, count(*) AS total, sum(stars) AS somme FROM product_ratings WHERE status=\'visible\' GROUP BY product_id')) {
          const groupes = new Map();
          for (const l of lignes.filter((x) => x.status === 'visible')) {
            const g = groupes.get(l.product_id) || { product_id: l.product_id, total: 0, somme: 0 };
            g.total += 1;
            g.somme += l.stars;
            groupes.set(l.product_id, g);
          }
          return [...groupes.values()];
        }
        if (s.startsWith("UPDATE product_ratings SET status='retiree'")) {
          const [motif, precision, quand, par, id] = params;
          const l = lignes.find((x) => x.id === id && x.status === 'visible');
          if (!l) return [];
          Object.assign(l, { status: 'retiree', removed_reason: motif, removed_detail: precision, removed_at: quand, removed_by: par });
          return [{ product_id: l.product_id }];
        }
        if (s.startsWith("UPDATE product_ratings SET status='visible'")) {
          const l = lignes.find((x) => x.id === params[0] && x.status === 'retiree');
          if (!l) return [];
          Object.assign(l, { status: 'visible', removed_reason: null, removed_detail: null, removed_at: null, removed_by: null });
          return [{ product_id: l.product_id }];
        }
        if (s.startsWith('SELECT r.id,r.product_id')) {
          return [...lignes]
            .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
            .map((r) => ({ ...r, meme_connexion: lignes.filter((x) => x.product_id === r.product_id && x.ip_hash === r.ip_hash).length }));
        }
        if (s.startsWith('SELECT status, count(*) AS n FROM product_ratings GROUP BY status')) {
          const n = (st) => lignes.filter((l) => l.status === st).length;
          return ['visible', 'retiree'].filter((st) => n(st)).map((st) => ({ status: st, n: n(st) }));
        }
        throw new Error('requête inattendue : ' + s.slice(0, 90));
      };
      const instruction = {
        bind(...valeurs) {
          params = valeurs;
          return instruction;
        },
        async first(col) {
          const r = executer()[0];
          if (!r) return null;
          return col === undefined ? r : (r[col] ?? null);
        },
        async all() {
          return { results: executer(), success: true, meta: { changes: 0 } };
        },
        async run() {
          return { results: executer(), success: true, meta: { changes: 0 } };
        },
      };
      return instruction;
    },
    async batch() {
      throw new Error('pas de lot ici');
    },
  };
  return db;
}

const existe = (id) => ['mat-blade-gold', 'bs-9068'].includes(id);

test('validation : un modèle du catalogue et un entier de 1 à 5, rien d’autre', () => {
  assert.deepEqual(notes.lireDemandeNote({ produit: 'mat-blade-gold', etoiles: 4 }, existe), { produit: 'mat-blade-gold', etoiles: 4 });
  for (const etoiles of [1, 5]) assert.equal(notes.lireDemandeNote({ produit: 'bs-9068', etoiles }, existe).etoiles, etoiles);
  for (const etoiles of [0, 6, -1, 2.5, '4', null, undefined, NaN, Infinity, true, [4], { n: 4 }])
    assert.equal(notes.lireDemandeNote({ produit: 'mat-blade-gold', etoiles }, existe).statut, 400, 'refusé : ' + String(etoiles));
  for (const produit of ['inconnu', '', '../admin', 'a'.repeat(121), 42, null, undefined, '<script>'])
    assert.equal(notes.lireDemandeNote({ produit, etoiles: 3 }, existe).statut, 404, 'modèle refusé : ' + String(produit));
  for (const corps of [null, undefined, 'texte', 4, [1, 2], []]) assert.equal(notes.lireDemandeNote(corps, existe).statut, 400);
});

test('robots : champ piège rempli ou agent déclaré écartés, les navigateurs passent', () => {
  assert.equal(notes.champPiegeRempli({ produit: 'x', etoiles: 4, website: 'https://spam.example' }), true);
  assert.equal(notes.champPiegeRempli({ produit: 'x', etoiles: 4, website: '' }), false);
  assert.equal(notes.champPiegeRempli({ produit: 'x', etoiles: 4 }), false);
  const robots = [
    '',
    null,
    'curl/8.4.0',
    'python-requests/2.31.0',
    'Go-http-client/2.0',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36',
    'facebookexternalhit/1.1',
    'Scrapy/2.11',
    'axios/1.7.2',
    'node-fetch',
    'undici',
  ];
  for (const ua of robots) assert.equal(notes.estRobot(ua), true, 'robot : ' + ua);
  const humains = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:131.0) Gecko/20100101 Firefox/131.0',
    'Mozilla/5.0 (Linux; Android 13; CUBOT X70) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  ];
  for (const ua of humains) assert.equal(notes.estRobot(ua), false, 'visiteur : ' + ua);
});

test('connexion : IPv4 entière, IPv6 ramenée à son /64', () => {
  assert.equal(notes.reseauDe('203.0.113.9'), '203.0.113.9');
  assert.equal(notes.reseauDe('::ffff:203.0.113.9'), '203.0.113.9');
  assert.equal(notes.reseauDe('2a01:e0a:1b2:c3d0:1111:2222:3333:4444'), '2a01:e0a:1b2:c3d0::/64');
  assert.equal(notes.reseauDe('2a01:e0a:1b2:c3d0::9'), '2a01:e0a:1b2:c3d0::/64', 'deux adresses du même abonné, une seule connexion');
  assert.equal(notes.reseauDe('2001:db8::1'), '2001:db8:0:0::/64');
  assert.equal(notes.reseauDe('[2001:DB8::1]'), '2001:db8:0:0::/64');
  assert.equal(notes.reseauDe('local'), 'local');
});

test('une note par appareil et par modèle : le même appareil met sa note à jour', async () => {
  const db = baseSimulee();
  const t0 = new Date('2026-10-20T10:00:00Z');
  const a = await sql.noter(db, { produit: 'mat-blade-gold', etoiles: 2, ip: 'ip-1', appareil: 'app-1' }, t0);
  assert.equal(a.statut, 'nouvelle');
  assert.deepEqual(a.moyenne, { valeur: 2, total: 1 });
  const b = await sql.noter(db, { produit: 'mat-blade-gold', etoiles: 5, ip: 'ip-1', appareil: 'app-1' }, new Date('2026-10-20T10:05:00Z'));
  assert.equal(b.statut, 'modifiee');
  assert.equal(db.lignes.length, 1, 'mise à jour, pas d’ajout');
  assert.equal(db.lignes[0].stars, 5);
  assert.equal(db.lignes[0].created_at, t0.toISOString(), 'la date de la première note reste');
  assert.equal(db.lignes[0].updated_at, '2026-10-20T10:05:00.000Z');
  assert.deepEqual(b.moyenne, { valeur: 5, total: 1 });
  // Un autre appareil ajoute sa note ; un autre modèle a la sienne.
  await sql.noter(db, { produit: 'mat-blade-gold', etoiles: 4, ip: 'ip-2', appareil: 'app-2' }, t0);
  await sql.noter(db, { produit: 'bs-9068', etoiles: 1, ip: 'ip-1', appareil: 'app-1' }, t0);
  assert.equal(db.lignes.length, 3);
  assert.deepEqual(await sql.moyenneEnBase(db, 'mat-blade-gold'), { valeur: 4.5, total: 2 });
  assert.deepEqual(Object.fromEntries(await sql.moyennesEnBase(db)), { 'mat-blade-gold': { valeur: 4.5, total: 2 }, 'bs-9068': { valeur: 1, total: 1 } });
});

test('plafond par connexion : trois appareils au plus par modèle, la mise à jour reste permise', async () => {
  const db = baseSimulee();
  const t = new Date('2026-10-20T12:00:00Z');
  for (const appareil of ['a', 'b', 'c']) assert.equal((await sql.noter(db, { produit: 'bs-9068', etoiles: 5, ip: 'meme-ip', appareil }, t)).statut, 'nouvelle');
  const refus = await sql.noter(db, { produit: 'bs-9068', etoiles: 5, ip: 'meme-ip', appareil: 'd' }, t);
  assert.equal(refus.refus, sql.REFUS_CONNEXION);
  assert.equal(db.lignes.length, 3, 'rien d’enregistré au-delà du plafond');
  assert.equal((await sql.noter(db, { produit: 'bs-9068', etoiles: 3, ip: 'meme-ip', appareil: 'a' }, t)).statut, 'modifiee', 'un appareil déjà compté change sa note');
  assert.equal((await sql.noter(db, { produit: 'mat-blade-gold', etoiles: 3, ip: 'meme-ip', appareil: 'd' }, t)).statut, 'nouvelle', 'autre modèle, autre compte');
  // Trente jours plus tard, la connexion peut de nouveau accueillir un appareil.
  assert.equal((await sql.noter(db, { produit: 'bs-9068', etoiles: 4, ip: 'meme-ip', appareil: 'e' }, new Date('2026-11-20T12:00:01Z'))).statut, 'nouvelle');
});

test('retrait : motif conservé, moyenne recalculée, une note retirée le reste quand l’appareil la change', async () => {
  const db = baseSimulee();
  const t = new Date('2026-10-20T09:00:00Z');
  await sql.noter(db, { produit: 'mat-blade-gold', etoiles: 5, ip: 'i1', appareil: 'robot' }, t);
  await sql.noter(db, { produit: 'mat-blade-gold', etoiles: 2, ip: 'i2', appareil: 'humain' }, t);
  const id = db.lignes.find((l) => l.device_hash === 'robot').id;
  assert.equal(await sql.retirer(db, { id, motif: 'robot', precision: '', par: 'atelier@example.invalid' }, new Date('2026-10-20T09:30:00Z')), 'mat-blade-gold');
  const l = db.lignes.find((x) => x.id === id);
  assert.deepEqual([l.status, l.removed_reason, l.removed_detail, l.removed_at, l.removed_by], ['retiree', 'robot', null, '2026-10-20T09:30:00.000Z', 'atelier@example.invalid']);
  assert.deepEqual(await sql.moyenneEnBase(db, 'mat-blade-gold'), { valeur: 2, total: 1 });
  assert.equal(await sql.retirer(db, { id, motif: 'doublon', precision: '', par: 'x' }), null, 'déjà retirée');
  const r = await sql.noter(db, { produit: 'mat-blade-gold', etoiles: 5, ip: 'i1', appareil: 'robot' }, t);
  assert.equal(r.visible, false, 'le retrait ne se contourne pas en notant de nouveau');
  assert.equal(l.status, 'retiree');
  const miseAJour = /DO UPDATE SET (.*) RETURNING/.exec(db.vues.find((s) => s.startsWith('INSERT INTO product_ratings')))[1];
  assert.ok(!/status/.test(miseAJour), 'la mise à jour ne touche jamais au statut : ' + miseAJour);
  const atelier = await sql.notesAtelier(db);
  assert.equal(atelier.visibles, 1);
  assert.equal(atelier.retirees, 1);
  assert.equal(await sql.retablir(db, id), 'mat-blade-gold');
  assert.equal(l.status, 'visible');
  assert.equal(l.removed_reason, null);
  assert.deepEqual(await sql.moyenneEnBase(db, 'mat-blade-gold'), { valeur: 3.5, total: 2 });
  assert.equal(await sql.retablir(db, id), null, 'déjà visible');
});

test('demande de l’atelier : motif obligatoire pris dans la liste, précision pour « autre »', () => {
  const id = '0f8c7a2e-4b1d-4c3a-9e2f-1a2b3c4d5e6f';
  assert.deepEqual(notes.lireDemandeRetrait({ id, action: 'retirer', motif: 'doublon' }), { id, action: 'retirer', motif: 'doublon', precision: '' });
  assert.deepEqual(notes.lireDemandeRetrait({ id, action: 'retablir' }), { id, action: 'retablir' });
  assert.equal(notes.lireDemandeRetrait({ id, action: 'retirer' }).statut, 400, 'sans motif');
  assert.equal(notes.lireDemandeRetrait({ id, action: 'retirer', motif: 'note basse' }).statut, 400, 'hors liste');
  assert.equal(notes.lireDemandeRetrait({ id, action: 'retirer', motif: 'autre', precision: ' ' }).statut, 400, '« autre » sans précision');
  assert.equal(notes.lireDemandeRetrait({ id, action: 'retirer', motif: 'autre', precision: 'Insulte dans le pseudo du robot' }).precision, 'Insulte dans le pseudo du robot');
  assert.equal(notes.lireDemandeRetrait({ id, action: 'retirer', motif: 'abus', precision: 'x'.repeat(201) }).statut, 400);
  assert.equal(notes.lireDemandeRetrait({ id: '1; DROP TABLE', action: 'retablir' }).statut, 404);
  assert.equal(notes.lireDemandeRetrait({ id, action: 'supprimer' }).statut, 400);
  assert.deepEqual([...notes.MOTIFS_RETRAIT], ['robot', 'doublon', 'abus', 'autre']);
});

test('moyenne : simple, arrondie au dixième, et libellés français', () => {
  assert.deepEqual(notes.moyenneDe([5, 4, 5, 4, 5]), { valeur: 4.6, total: 5 });
  assert.deepEqual(notes.moyenneDe([1, 2]), { valeur: 1.5, total: 2 });
  assert.deepEqual(notes.moyenneDe([4, 4, 5]), { valeur: 4.3, total: 3 });
  assert.deepEqual(notes.moyenneDe([5, 5, 4]), { valeur: 4.7, total: 3 });
  assert.equal(notes.moyenneDe([]), null);
  assert.equal(notes.moyenneDe([0, 6, 2.5]), null, 'aucune note valide');
  assert.deepEqual(notes.moyenneDeSomme(55, 12), { valeur: 4.6, total: 12 });
  assert.equal(notes.moyenneDeSomme(0, 0), null);
  assert.equal(notes.moyenneDeSomme(70, 12), null, 'une somme impossible ne s’affiche pas');
  assert.equal(notes.libelleMoyenne({ valeur: 4.6, total: 12 }), '★ 4,6 · 12 notes');
  assert.equal(notes.libelleMoyenne({ valeur: 5, total: 1 }), '★ 5,0 · 1 note');
  assert.equal(notes.lectureMoyenne({ valeur: 3.5, total: 2 }), 'Note moyenne 3,5 sur 5, 2 notes');
  assert.deepEqual([1, 2, 5].map(notes.nomEtoiles), ['1 étoile', '2 étoiles', '5 étoiles']);
});

test('JSON-LD : aggregateRating seulement avec une note visible, jamais inventé', () => {
  assert.deepEqual(notes.noteStructuree({ valeur: 4.6, total: 12 }), { '@type': 'AggregateRating', ratingValue: 4.6, ratingCount: 12, bestRating: 5, worstRating: 1 });
  for (const rien of [null, undefined, { valeur: 0, total: 0 }, { valeur: 4, total: 0 }, { valeur: 7, total: 3 }]) assert.equal(notes.noteStructuree(rien), null);

  const seo = charger(resolve(root, 'lib/seo'));
  const catalogue = [...charger(resolve(root, 'lib/data/products.json')), ...charger(resolve(root, 'lib/data/imported-products.json'))];
  const noeud = (graphe) => JSON.parse(graphe)['@graph'].find((n) => n['@type'] === 'Product' || n['@type'] === 'ProductGroup');
  for (const id of ['mat-blade-gold', 'bs-9068']) {
    const p = catalogue.find((x) => x.id === id);
    const sans = seo.productGraph(p, [], {});
    assert.ok(!sans.includes('aggregateRating'), id + ' : rien sans note');
    assert.ok(!seo.productGraph(p, [], { note: null }).includes('aggregateRating'));
    const avec = noeud(seo.productGraph(p, [], { note: { valeur: 4.6, total: 12 } }));
    assert.deepEqual(avec.aggregateRating, { '@type': 'AggregateRating', ratingValue: 4.6, ratingCount: 12, bestRating: 5, worstRating: 1 });
    assert.ok(Number.isInteger(avec.aggregateRating.ratingValue * 10), 'une décimale au plus');
  }
  // La fiche aux tailles publiables est un ProductGroup : la note est sur le groupe, pas sur chaque taille.
  const groupe = noeud(seo.productGraph(catalogue.find((x) => x.id === 'mat-blade-gold'), [], { note: { valeur: 3, total: 2 } }));
  if (groupe['@type'] === 'ProductGroup') for (const v of groupe.hasVariant) assert.equal(v.aggregateRating, undefined);
});

test('schéma : le service et drizzle/0007 décrivent la même table, avec la RLS et l’index unique', () => {
  const migration = readFileSync(resolve(root, 'drizzle/0007_notes_des_produits.sql'), 'utf8');
  const colonnes = (texte) => [...texte.matchAll(/"?([a-z_]+)"? (?:text|integer)\b/g)].map((m) => m[1]);
  assert.deepEqual(colonnes(migration), colonnes(sql.NOTES_SCHEMA[0]));
  assert.deepEqual(colonnes(migration), ['id', 'product_id', 'stars', 'created_at', 'updated_at', 'ip_hash', 'device_hash', 'status', 'removed_reason', 'removed_detail', 'removed_at', 'removed_by']);
  assert.ok(sql.NOTES_SCHEMA.some((s) => /UNIQUE INDEX IF NOT EXISTS product_ratings_appareil ON product_ratings \(product_id, device_hash\)/.test(s)));
  assert.ok(/CREATE UNIQUE INDEX IF NOT EXISTS "product_ratings_appareil" ON "product_ratings" USING btree \("product_id","device_hash"\)/.test(migration));
  assert.ok(sql.NOTES_SCHEMA.includes('ALTER TABLE product_ratings ENABLE ROW LEVEL SECURITY'));
  assert.ok(migration.includes('ALTER TABLE "product_ratings" ENABLE ROW LEVEL SECURITY'));
  const journal = JSON.parse(readFileSync(resolve(root, 'drizzle/meta/_journal.json'), 'utf8'));
  assert.equal(journal.entries.at(-1).tag, '0007_notes_des_produits');
  // Chaque élément posé par le service est vérifié par la requête « ce qui manque ».
  for (const nom of ['product_ratings', 'product_ratings_appareil', 'product_ratings_connexion', 'product_ratings_date']) assert.ok(sql.NOTES_MANQUE.includes(`to_regclass('${nom}')`), nom);
  assert.ok(sql.NOTES_MANQUE.includes('relrowsecurity'));
});
