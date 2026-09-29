#!/usr/bin/env node
/**
 * Les salles de sports de combat des grandes villes, pour les pages
 * « Boutique de boxe <ville> » (29/09).
 *
 * Sources, citées sur chaque page avec leur date :
 *  - le Recensement des équipements sportifs (Data ES) du ministère des Sports,
 *    Licence Ouverte 2.0 — les lieux, leurs salles, leurs disciplines, leurs adresses ;
 *  - l'API Découpage administratif (geo.api.gouv.fr, populations légales de l'Insee)
 *    — quelles villes sont « grandes », leur population, leur centre.
 * Rien n'est inventé ni complété à la main : une adresse absente reste absente,
 * une discipline non déclarée n'est pas devinée.
 *
 * « Grande ville » a une définition, pas une liste tenue à la main : toute
 * commune de France métropolitaine de 100 000 habitants ou plus (40 au relevé
 * du 29/09). La page n'existe que si la ville a assez de matière : 8 lieux au
 * moins, dont 3 où l'on boxe (une « boutique de boxe <ville> » sans salle de
 * boxe à montrer serait une page vide de sens).
 *
 * Pourquoi pas OpenStreetMap (première version, abandonnée) : 11 à 20 lieux à
 * Toulouse, quand le recensement compte 65 salles de combat.
 *
 * Retenu : les équipements « Salle de combat » (dojos / salles d'arts martiaux,
 * salles de boxe), regroupés par lieu (installation). Écarté, et compté : les
 * salles réservées aux scolaires et les installations hors service. Écarté,
 * et nommé : les lieux dont on SAIT qu'ils ont fermé alors que le recensement
 * les porte encore (FERMES).
 *
 * Usage : node scripts/villes-salles.mjs      → lib/data/villes.json
 */
import { writeFileSync } from 'node:fs';

const BASE = 'https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/data-es';
const PAGE = 'https://equipements.sports.gouv.fr/explore/dataset/data-es/';
const GEO = 'https://geo.api.gouv.fr/communes?fields=nom,code,population,centre,departement,region&format=json';
const SEUIL_HABITANTS = 100000;
const MIN_LIEUX = 8;
const MIN_FRAPPE = 3;
const VOISINES = 5;
const PAUSE = 1500;

/* Fermés, le recensement ne le sait pas encore. Chaque ligne dit qui l'a dit et quand. */
const FERMES = {
  I315550359: 'Boxing Center Balma Gramont : vendu, plus de salle (Eddy, 29/09/2026)',
};

/* Paris, Marseille et Lyon sont recensés par arrondissement, pas par commune. */
const FILTRE_SPECIAL = {
  75056: 'dep_code="75"',
  13055: 'startswith(new_code,"132")',
  69123: 'startswith(new_code,"6938")',
};

/* Île-de-France hors Paris : un groupe par département, résumé commune par commune. */
const REGIONS = [
  {
    slug: 'ile-de-france',
    nom: 'Île-de-France',
    departements: [
      ['92', 'Hauts-de-Seine'],
      ['93', 'Seine-Saint-Denis'],
      ['94', 'Val-de-Marne'],
      ['78', 'Yvelines'],
      ['91', 'Essonne'],
      ['95', 'Val-d’Oise'],
      ['77', 'Seine-et-Marne'],
    ],
  },
];

/* Les activités du recensement (data-es-activites), ramenées à un nom court.
   frappe : on y met des gants. Le recensement n'a ni MMA ni jiu-jitsu brésilien. */
const DISCIPLINES = [
  [/^boxe anglaise/i, 'Boxe anglaise', true],
  [/^boxe fran|^savate/i, 'Savate boxe française', true],
  [/muay|tha[iï]landaise/i, 'Muay-thaï', true],
  [/^kick/i, 'Kick-boxing', true],
  [/^full contact|^boxe am[ée]ricaine/i, 'Full contact', true],
  [/^canne|^b[âa]ton/i, 'Canne et bâton', false],
  [/^judo/i, 'Judo, jujitsu', false],
  [/^karat/i, 'Karaté', false],
  [/^a[iï]kido/i, 'Aïkido', false],
  [/^taekwondo/i, 'Taekwondo', false],
  [/^lutte/i, 'Lutte', false],
  [/^sambo/i, 'Sambo', false],
  [/^kendo/i, 'Kendo', false],
  [/^sumo/i, 'Sumo', false],
  [/wushu|arts martiaux chinois/i, 'Kung-fu, wushu', false],
  [/^tai chi/i, 'Tai-chi, qi gong', false],
];
const discipline = (aps) => DISCIPLINES.find(([re]) => re.test(aps));

const CHAMPS = [
  'equip_numero', 'inst_numero', 'inst_nom', 'equip_nom', 'equip_type_name', 'inst_adresse', 'inst_cp',
  'new_name', 'dep_code', 'equip_prop_type', 'equip_ouv_public_bool', 'equip_utilisateur', 'equip_url', 'aps_name',
  'inst_hs_bool', 'equip_maj_date',
].join(',');

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const slugDe = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function json(url) {
  for (let essai = 1; essai <= 4; essai++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'boutique-de-boxe/1.0 (pages villes ; boxingcenter31@gmail.com)' } });
      if (r.ok) return await r.json();
      console.warn(`  ${r.status}, nouvel essai dans ${essai * 10} s`);
    } catch (e) {
      console.warn(`  injoignable (${e.cause?.code || e.message}), nouvel essai`);
    }
    await pause(essai * 10000);
  }
  throw new Error('Source indisponible : ' + url);
}
const releve = (filtre) => json(`${BASE}/exports/json?` + new URLSearchParams({ select: CHAMPS, where: `equip_type_famille="Salle de combat" and ${filtre}` }));

/* Présentation seulement : un nom tout en capitales passe en casse de titre. Les mots ne changent pas. */
const PETITS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'd', 'l', 'à', 'au', 'aux', 'en', 'sur', 'sous']);
function casse(s) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (/[a-zà-ÿ]/.test(t)) return t;
  return t
    .toLowerCase()
    .split(/(\s+|-|’|')/)
    .map((m, i) => (i && PETITS.has(m) ? m : m.charAt(0).toUpperCase() + m.slice(1)))
    .join('');
}
const propre = (a) => casse(String(a || '').replace(/\s*[,(]?\s*(bo[iî]te postale?|bp\b|cedex).*$/i, '').trim()) || null;
const utilisateurs = (u) => {
  try {
    return Array.isArray(u) ? u : JSON.parse(u || '[]');
  } catch {
    return [];
  }
};

/** Les équipements d'une zone, regroupés par lieu. Rend aussi ce qui a été écarté. */
function lieux(records) {
  const par = new Map();
  let scolaires = 0;
  let horsService = 0;
  const fermes = [];
  for (const r of records) {
    if (FERMES[r.inst_numero]) {
      if (!fermes.includes(FERMES[r.inst_numero])) fermes.push(FERMES[r.inst_numero]);
      continue;
    }
    if (String(r.inst_hs_bool) === 'true') {
      horsService++;
      continue;
    }
    const u = utilisateurs(r.equip_utilisateur);
    const ouvert = String(r.equip_ouv_public_bool) === 'true' || u.some((x) => /clubs sportifs|individuel/i.test(x));
    if (!ouvert) {
      scolaires++;
      continue;
    }
    const aps = (Array.isArray(r.aps_name) ? r.aps_name : []).map(discipline).filter(Boolean);
    const lieu = par.get(r.inst_numero) || {
      id: r.inst_numero,
      nom: casse(r.inst_nom),
      adresse: propre(r.inst_adresse),
      codePostal: r.inst_cp || null,
      commune: r.new_name || null,
      proprietaire: r.equip_prop_type || null,
      site: null,
      salles: [],
      disciplines: [],
      frappe: false,
      maj: null,
    };
    lieu.salles.push({ nom: casse(r.equip_nom), boxe: /boxe/i.test(r.equip_type_name) });
    for (const [, d, f] of aps) {
      if (!lieu.disciplines.includes(d)) lieu.disciplines.push(d);
      lieu.frappe ||= f;
    }
    lieu.frappe ||= /boxe/i.test(r.equip_type_name);
    lieu.site ||= r.equip_url || null;
    if (!lieu.maj || (r.equip_maj_date && r.equip_maj_date > lieu.maj)) lieu.maj = r.equip_maj_date || lieu.maj;
    par.set(r.inst_numero, lieu);
  }
  const ordre = DISCIPLINES.map(([, d]) => d);
  const liste = [...par.values()]
    .map((l) => ({ ...l, disciplines: l.disciplines.sort((a, b) => ordre.indexOf(a) - ordre.indexOf(b)) }))
    .sort((a, b) => Number(b.frappe) - Number(a.frappe) || a.nom.localeCompare(b.nom, 'fr'));
  return { liste, scolaires, horsService, fermes };
}

/* Chaque discipline compte les LIEUX qui la déclarent. */
const compte = (liste) => {
  const o = {};
  for (const l of liste) for (const d of l.disciplines) o[d] = (o[d] || 0) + 1;
  return Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]));
};
const resume = (liste) => {
  const salles = liste.flatMap((l) => l.salles);
  return { salles: salles.length, boxe: salles.filter((s) => s.boxe).length, dojos: salles.filter((s) => !s.boxe).length, frappe: liste.filter((l) => l.frappe).length };
};
const km = ([lo1, la1], [lo2, la2]) => {
  const r = Math.PI / 180;
  const h = Math.sin(((la2 - la1) * r) / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(((lo2 - lo1) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

const meta = await json(BASE);
const majSource = String(meta.metas?.default?.modified || meta.metas?.default?.data_processed || new Date().toISOString()).slice(0, 10);

/* 1. Les grandes villes : définition Insee, pas une liste à la main. */
const communes = await json(GEO);
const grandes = communes
  .filter((c) => (c.population || 0) >= SEUIL_HABITANTS && !c.code.startsWith('97'))
  .sort((a, b) => b.population - a.population);
console.log(`${grandes.length} communes de ${SEUIL_HABITANTS.toLocaleString('fr-FR')} habitants ou plus en métropole\n`);

const villes = [];
const ecartees = [];
for (const c of grandes) {
  const brut = await releve(FILTRE_SPECIAL[c.code] || `new_code="${c.code}"`);
  const { liste, scolaires, horsService, fermes } = lieux(brut);
  const r = resume(liste);
  const raison = liste.length < MIN_LIEUX ? `${liste.length} lieux` : r.frappe < MIN_FRAPPE ? `${r.frappe} lieu(x) où l'on boxe` : null;
  console.log(`${c.nom.padEnd(22)} ${String(brut.length).padStart(4)} salles → ${String(liste.length).padStart(3)} lieux, ${String(r.frappe).padStart(2)} où l'on boxe${raison ? '  ✗ ' + raison : ''}${fermes.length ? '  (fermé écarté : ' + fermes.join(' ; ') + ')' : ''}`);
  const v = {
    slug: slugDe(c.nom),
    nom: c.nom,
    insee: c.code,
    population: c.population,
    centre: c.centre.coordinates,
    departement: c.departement.nom,
    codeDepartement: c.departement.code,
    region: c.region.nom,
    ...r,
    scolaires,
    horsService,
    fermes,
    lieux: liste,
    parDiscipline: compte(liste),
  };
  if (!raison) villes.push(v);
  else ecartees.push({ nom: c.nom, raison });
  await pause(PAUSE);
}

/* 2. Densité et rang : un lieu pour combien d'habitants, parmi les villes publiées. */
for (const v of villes) v.habitantsParLieu = Math.round(v.population / v.lieux.length);
[...villes].sort((a, b) => a.habitantsParLieu - b.habitantsParLieu).forEach((v, i) => (v.rangDensite = i + 1));

/* 3. Les voisines : les villes publiées les plus proches, à vol d'oiseau. */
for (const v of villes)
  v.voisines = villes
    .filter((x) => x !== v)
    .map((x) => ({ slug: x.slug, nom: x.nom, km: Math.round(km(v.centre, x.centre)) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, VOISINES);

/* 4. Île-de-France hors Paris. */
const regions = [];
for (const r of REGIONS) {
  const groupes = [];
  for (const [code, nom] of r.departements) {
    const brut = await releve(`dep_code="${code}"`);
    const { liste, scolaires } = lieux(brut);
    const parCommune = {};
    for (const l of liste) {
      const c = (parCommune[l.commune] ||= { nom: l.commune, lieux: 0, salles: 0, boxe: 0, frappe: 0, disciplines: {} });
      c.lieux++;
      c.salles += l.salles.length;
      c.boxe += l.salles.filter((s) => s.boxe).length;
      c.frappe += Number(l.frappe);
      for (const d of l.disciplines) c.disciplines[d] = (c.disciplines[d] || 0) + 1;
    }
    const listeCommunes = Object.values(parCommune)
      .map((c) => ({ ...c, disciplines: Object.entries(c.disciplines).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d), page: villes.find((v) => v.nom === c.nom)?.slug || null }))
      .sort((a, b) => b.lieux - a.lieux || a.nom.localeCompare(b.nom, 'fr'));
    console.log(`${(r.nom + ' · ' + nom).padEnd(34)} ${String(brut.length).padStart(4)} salles → ${String(liste.length).padStart(4)} lieux, ${listeCommunes.length} communes`);
    groupes.push({ code, nom, lieux: liste.length, ...resume(liste), scolaires, communes: listeCommunes, parDiscipline: compte(liste) });
    await pause(PAUSE);
  }
  regions.push({ slug: r.slug, nom: r.nom, groupes });
}

/* 5. La France métropolitaine entière : les chiffres du carrefour et de la page matériel. */
const toute = (await releve('dep_code!="971" and dep_code!="972" and dep_code!="973" and dep_code!="974" and dep_code!="976"')).filter((r) => !String(r.dep_code || '').startsWith('97'));
const f = lieux(toute);
const france = { ...resume(f.liste), lieux: f.liste.length, scolaires: f.scolaires, parDiscipline: compte(f.liste), departements: new Set(toute.map((r) => r.dep_code)).size };
console.log(`\nFrance métropolitaine : ${toute.length} salles de combat → ${france.lieux} lieux ouverts aux clubs ou au public, ${france.frappe} où l'on boxe`);

writeFileSync(
  new URL('../lib/data/villes.json', import.meta.url),
  JSON.stringify(
    {
      source: {
        nom: 'Recensement des équipements sportifs (Data ES)',
        editeur: 'ministère des Sports',
        licence: 'Licence Ouverte 2.0',
        licenceUrl: 'https://github.com/etalab/licence-ouverte/blob/master/LO.md',
        url: PAGE,
        maj: majSource,
        releve: new Date().toISOString().slice(0, 10),
        seuil: MIN_LIEUX,
        seuilFrappe: MIN_FRAPPE,
        seuilHabitants: SEUIL_HABITANTS,
        population: { nom: 'API Découpage administratif, populations légales de l’Insee', url: 'https://geo.api.gouv.fr/decoupage-administratif' },
      },
      france,
      villes,
      regions,
      ecartees,
    },
    null,
    1,
  ) + '\n',
);
console.log(`\n${villes.length} villes publiables, ${ecartees.length} écartées : ${ecartees.map((e) => e.nom + ' (' + e.raison + ')').join(', ') || 'aucune'}`);
