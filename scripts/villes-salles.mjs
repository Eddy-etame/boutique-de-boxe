#!/usr/bin/env node
/**
 * Les salles de sports de combat des grandes villes, pour les pages
 * « Boutique de boxe <ville> » (29/09).
 *
 * Source unique : le Recensement des équipements sportifs (Data ES) du
 * ministère des Sports, Licence Ouverte 2.0, cité sur chaque page avec sa date
 * de mise à jour. Rien n'est inventé ni complété à la main : une adresse
 * absente reste absente, une discipline non déclarée n'est pas devinée.
 *
 * Pourquoi pas OpenStreetMap (première version, abandonnée le jour même) :
 * 11 à 20 lieux à Toulouse, quand le recensement officiel compte 65 salles de
 * combat avec leurs adresses et leurs disciplines. Une page qui dirait
 * « Toulouse compte 15 salles » tromperait son lecteur, même en citant sa source.
 *
 * Pourquoi ces pages tiennent, alors que des pages-villes « où seul le nom
 * change » sont une faute (doorway, règle de Google) : chacune porte des faits
 * qui n'existent que pour sa ville — ses lieux, leurs salles, leurs
 * disciplines, leurs adresses, leurs nombres. Une ville qui n'a pas assez de
 * matière n'est pas publiée (seuil MIN_LIEUX).
 *
 * Ce qui est retenu : les équipements de la famille « Salle de combat » (dojos /
 * salles d'arts martiaux, salles de boxe), regroupés par lieu (installation).
 * Ce qui est écarté, et compté : les salles réservées aux scolaires (ni club ni
 * particulier parmi leurs utilisateurs) et les installations hors service.
 *
 * Usage : node scripts/villes-salles.mjs      → lib/data/villes.json
 */
import { writeFileSync } from 'node:fs';

const BASE = 'https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/data-es';
const PAGE = 'https://equipements.sports.gouv.fr/explore/dataset/data-es/';
const MIN_LIEUX = 8;
const PAUSE = 1500;

/* Code INSEE : une ville se désigne par son code, jamais par son nom.
   Paris, Marseille et Lyon sont recensés par arrondissement. */
const VILLES = [
  ['toulouse', 'Toulouse', 'new_code="31555"', 'Haute-Garonne', 'Occitanie'],
  ['paris', 'Paris', 'dep_code="75"', 'Paris', 'Île-de-France'],
  ['marseille', 'Marseille', 'startswith(new_code,"132")', 'Bouches-du-Rhône', 'Provence-Alpes-Côte d’Azur'],
  ['lyon', 'Lyon', 'startswith(new_code,"6938")', 'Rhône', 'Auvergne-Rhône-Alpes'],
  ['nice', 'Nice', 'new_code="06088"', 'Alpes-Maritimes', 'Provence-Alpes-Côte d’Azur'],
  ['nantes', 'Nantes', 'new_code="44109"', 'Loire-Atlantique', 'Pays de la Loire'],
  ['montpellier', 'Montpellier', 'new_code="34172"', 'Hérault', 'Occitanie'],
  ['strasbourg', 'Strasbourg', 'new_code="67482"', 'Bas-Rhin', 'Grand Est'],
  ['bordeaux', 'Bordeaux', 'new_code="33063"', 'Gironde', 'Nouvelle-Aquitaine'],
  ['lille', 'Lille', 'new_code="59350"', 'Nord', 'Hauts-de-France'],
  ['rennes', 'Rennes', 'new_code="35238"', 'Ille-et-Vilaine', 'Bretagne'],
  ['toulon', 'Toulon', 'new_code="83137"', 'Var', 'Provence-Alpes-Côte d’Azur'],
  ['reims', 'Reims', 'new_code="51454"', 'Marne', 'Grand Est'],
  ['saint-etienne', 'Saint-Étienne', 'new_code="42218"', 'Loire', 'Auvergne-Rhône-Alpes'],
  ['le-havre', 'Le Havre', 'new_code="76351"', 'Seine-Maritime', 'Normandie'],
  ['grenoble', 'Grenoble', 'new_code="38185"', 'Isère', 'Auvergne-Rhône-Alpes'],
  ['dijon', 'Dijon', 'new_code="21231"', 'Côte-d’Or', 'Bourgogne-Franche-Comté'],
  ['angers', 'Angers', 'new_code="49007"', 'Maine-et-Loire', 'Pays de la Loire'],
  ['nimes', 'Nîmes', 'new_code="30189"', 'Gard', 'Occitanie'],
  ['clermont-ferrand', 'Clermont-Ferrand', 'new_code="63113"', 'Puy-de-Dôme', 'Auvergne-Rhône-Alpes'],
  ['aix-en-provence', 'Aix-en-Provence', 'new_code="13001"', 'Bouches-du-Rhône', 'Provence-Alpes-Côte d’Azur'],
  ['brest', 'Brest', 'new_code="29019"', 'Finistère', 'Bretagne'],
  ['tours', 'Tours', 'new_code="37261"', 'Indre-et-Loire', 'Centre-Val de Loire'],
  ['limoges', 'Limoges', 'new_code="87085"', 'Haute-Vienne', 'Nouvelle-Aquitaine'],
  ['perpignan', 'Perpignan', 'new_code="66136"', 'Pyrénées-Orientales', 'Occitanie'],
  ['metz', 'Metz', 'new_code="57463"', 'Moselle', 'Grand Est'],
  ['besancon', 'Besançon', 'new_code="25056"', 'Doubs', 'Bourgogne-Franche-Comté'],
  ['orleans', 'Orléans', 'new_code="45234"', 'Loiret', 'Centre-Val de Loire'],
  ['rouen', 'Rouen', 'new_code="76540"', 'Seine-Maritime', 'Normandie'],
  ['caen', 'Caen', 'new_code="14118"', 'Calvados', 'Normandie'],
  ['amiens', 'Amiens', 'new_code="80021"', 'Somme', 'Hauts-de-France'],
  ['nancy', 'Nancy', 'new_code="54395"', 'Meurthe-et-Moselle', 'Grand Est'],
  ['mulhouse', 'Mulhouse', 'new_code="68224"', 'Haut-Rhin', 'Grand Est'],
];

/* Île-de-France hors Paris (Paris a sa page) : un groupe par département,
   résumé commune par commune (la liste salle par salle y dépasserait mille lignes). */
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
   frappe : on y met des gants. Les autres activités d'une salle (danse,
   gymnastique…) ne sont pas affichées. */
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
  'new_name', 'equip_prop_type', 'equip_ouv_public_bool', 'equip_utilisateur', 'equip_url', 'aps_name',
  'inst_hs_bool', 'equip_maj_date',
].join(',');

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function releve(filtre) {
  const url = `${BASE}/exports/json?` + new URLSearchParams({ select: CHAMPS, where: `equip_type_famille="Salle de combat" and ${filtre}` });
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
  throw new Error('Recensement indisponible pour ' + filtre);
}

/* Présentation seulement : un nom tout en capitales passe en casse de titre.
   Les mots ne changent pas. */
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
  for (const r of records) {
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
  return { liste, scolaires, horsService };
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

const meta = await (await fetch(BASE)).json();
const majSource = String(meta.metas?.default?.modified || meta.metas?.default?.data_processed || new Date().toISOString()).slice(0, 10);

const villes = [];
const ecartees = [];
for (const [slug, nom, filtre, departement, region] of VILLES) {
  const brut = await releve(filtre);
  const { liste, scolaires, horsService } = lieux(brut);
  console.log(`${nom.padEnd(18)} ${String(brut.length).padStart(4)} salles de combat → ${String(liste.length).padStart(3)} lieux (${scolaires} scolaires, ${horsService} hors service écartés)`);
  const v = { slug, nom, departement, region, ...resume(liste), scolaires, lieux: liste, parDiscipline: compte(liste) };
  if (liste.length >= MIN_LIEUX) villes.push(v);
  else ecartees.push({ nom, lieux: liste.length });
  await pause(PAUSE);
}

const regions = [];
for (const r of REGIONS) {
  const groupes = [];
  for (const [code, nom] of r.departements) {
    const brut = await releve(`dep_code="${code}"`);
    const { liste, scolaires } = lieux(brut);
    const communes = {};
    for (const l of liste) {
      const c = (communes[l.commune] ||= { nom: l.commune, lieux: 0, salles: 0, boxe: 0, frappe: 0, disciplines: {} });
      c.lieux++;
      c.salles += l.salles.length;
      c.boxe += l.salles.filter((s) => s.boxe).length;
      c.frappe += Number(l.frappe);
      for (const d of l.disciplines) c.disciplines[d] = (c.disciplines[d] || 0) + 1;
    }
    const listeCommunes = Object.values(communes)
      .map((c) => ({ ...c, disciplines: Object.entries(c.disciplines).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d) }))
      .sort((a, b) => b.lieux - a.lieux || a.nom.localeCompare(b.nom, 'fr'));
    console.log(`${(r.nom + ' · ' + nom).padEnd(34)} ${String(brut.length).padStart(4)} salles → ${String(liste.length).padStart(4)} lieux, ${listeCommunes.length} communes`);
    groupes.push({ code, nom, lieux: liste.length, ...resume(liste), scolaires, communes: listeCommunes, parDiscipline: compte(liste) });
    await pause(PAUSE);
  }
  regions.push({ slug: r.slug, nom: r.nom, groupes });
}

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
      },
      villes,
      regions,
      ecartees,
    },
    null,
    1,
  ) + '\n',
);
console.log(`\n${villes.length} villes publiables, ${ecartees.length} écartées (moins de ${MIN_LIEUX} lieux) : ${ecartees.map((e) => e.nom + ' ' + e.lieux).join(', ') || 'aucune'}`);
