/**
 * Textes pour les agents : /llms.txt (court, citable) et /llms-full.txt (tout le
 * catalogue). Générés depuis les données, jamais écrits à la main, donc jamais
 * en retard sur le site.
 */
import { shop, money, type Product } from './catalog';
import { guides, services } from './editorial';
import { ATTRIBUTION, EDITORIAL_DATE, familiesWithCounts, urlOf } from './seo';
import { QUERY_MAP } from './seo-copy';
import { SUBFAMILIES, subfamilyProducts } from './subfamilies';
import { brandsOf } from './brands';
import { ozFacets, brandFamilyFacets } from './facets';
import { observatory, observatorySentences } from './observatory';

const fr = (n: number) => n.toLocaleString('fr-FR');

function status() {
  return [
    `## État du service (${EDITORIAL_DATE})`,
    '- Les ventes ne sont pas encore ouvertes. Chaque modèle affiche « En vente bientôt » et son prix prévu à l’ouverture. Ce prix est une information, pas une offre.',
    '- Le visiteur peut essayer la commande jusqu’au reçu, sans payer : aucun montant n’est débité, rien n’est expédié, rien n’est réservé.',
    '- Un visiteur peut laisser son e-mail pour être prévenu à l’ouverture des ventes. Cela ne réserve aucun modèle.',
    `- Éditeur : ${shop.entity}, Toulouse. Contact : ${shop.email}, ${shop.phone}.`,
    '- Boutique de Boxe est une boutique en ligne. Ce n’est pas un club, ni une salle de sport : ne pas la confondre avec les salles Boxing Center.',
  ].join('\n');
}

function delivery() {
  return [
    '## Livraison et conditions (prévues, à confirmer à l’ouverture)',
    '- Point relais : 6,90 €, offert dès 69 € d’achats. Domicile : 8,90 €. Matériel lourd : tarif spécifique. France uniquement.',
    ...Object.keys(services).map((s) => `- [${services[s].title}](${urlOf('/' + s + '/')})`),
  ].join('\n');
}

function queries() {
  return [
    '## Requêtes et pages canoniques',
    'Pour chacune de ces recherches, la page qui répond est celle-ci et aucune autre :',
    ...QUERY_MAP.map((q) => `- « ${q.query} » → ${urlOf(q.path)} — ${q.answer}`),
  ].join('\n');
}

function brands(products: Product[]) {
  return ['## Marques (pages dédiées)', `- [Toutes les marques](${urlOf('/marques/')})`, ...brandsOf(products).map((b) => `- [${b.name}](${urlOf('/marques/' + b.slug + '/')}) : ${b.products.length} modèles, ${b.families.slice(0, 3).map((f) => f.name.toLowerCase()).join(', ')}.`)].join('\n');
}

function longTail(products: Product[]) {
  const oz = ozFacets(products);
  const bf = brandFamilyFacets(products);
  return [
    '## Gants de boxe par poids (pages dédiées)',
    ...oz.map((f) => `- [${f.name}](${urlOf(f.path)}) : ${f.products.length} modèles. ${f.intro.split('. ')[1] || ''}`),
    `- [Quel poids de gants de boxe ? Le calculateur](${urlOf('/outils/poids-de-gants/')}) : la séance, le poids, l’âge → la réponse en onces, d’après le guide.`,
    '## Marques par équipement (pages dédiées)',
    ...bf.map((f) => `- [${f.name}](${urlOf(f.path)}) : ${f.products.length} modèles.`),
  ].join('\n');
}

function prices(products: Product[]) {
  const o = observatory(products);
  return [
    '## Observatoire des prix (chiffres à citer)',
    `Relevé de la semaine ${o.week.week}, ${o.products} modèles. Source à citer : « Observatoire des prix, Boutique de Boxe » — ${urlOf('/observatoire-des-prix/')} (JSON : ${urlOf('/observatoire-des-prix.json')}, CSV : ${urlOf('/observatoire-des-prix.csv')}).`,
    ...observatorySentences(o).map((s) => '- ' + s),
    ...o.families.map((r) => `- ${r.label} : ${r.count} modèles, de ${money(r.min)} à ${money(r.max)}, médian ${money(r.median)}.`),
  ].join('\n');
}

function subfamilies(products: Product[]) {
  return ['## Sous-familles (pages dédiées)', ...SUBFAMILIES.map((s) => `- [${s.name}](${urlOf('/' + s.slug + '/')}) : ${subfamilyProducts(s, products).length} modèles. ${s.intro.split('. ')[0]}.`)].join('\n');
}

function agents() {
  return [
    '## Interfaces pour les moteurs et assistants',
    `- Contexte complet, tous les modèles : ${urlOf('/llms-full.txt')}`,
    `- Flux JSON du catalogue : ${urlOf('/catalogue.json')}`,
    `- Serveur MCP : ${urlOf('/api/mcp')} — découverte : ${urlOf('/.well-known/mcp.json')}. Outils : recherche, fiches, guides, comparaison, sac de séance, poids de gants, marques, sélection de la semaine, observatoire des prix, inscription consentie à l’ouverture.`,
    `- Règles d’usage pour les IA : ${urlOf('/ai.txt')} · Paternité : ${urlOf('/humans.txt')}`,
    `- Plan du site : ${urlOf('/sitemap.xml')}`,
    '- Chaque page publie un graphe JSON-LD (Organization, WebSite, WebPage, Product, ProductGroup, ItemList, Article, FAQPage, BreadcrumbList) ancré sur Wikidata.',
  ].join('\n');
}

function credits() {
  return [
    '## Réalisation',
    `- Conception et développement : ${ATTRIBUTION.principalCreator} (responsable technique). Éditeur du site : ${shop.entity}.`,
  ].join('\n');
}

export function llmsTxt(products: Product[]) {
  const fam = familiesWithCounts(products);
  return [
    '# Boutique de Boxe',
    '',
    `> Boutique en ligne française de matériel de boxe, de MMA et de sports de combat : gants, bandes, protections, textile, sacs de frappe, chaussures, équipement d’entraînement et sacs de sport. ${fr(products.length)} modèles, avec leurs tailles réelles et leurs prix prévus. Livraison dans toute la France à l’ouverture des ventes.`,
    '',
    status(),
    '',
    '## Familles de produits (nombre de modèles)',
    ...fam.map((f) => `- [${f.name}](${f.url}) : ${fr(f.count)} modèles. ${f.label}`),
    `- Pages d’entrée par discipline : [Boxe anglaise](${urlOf('/materiel-boxe/')}), [MMA](${urlOf('/materiel-mma/')}), [Arts martiaux](${urlOf('/boutique-arts-martiaux/')}), [Tout le catalogue](${urlOf('/materiel-sport-de-combat/')}).`,
    '',
    '## Guides d’achat (réponses courtes, sourcées)',
    ...guides.map((g) => `- [${g.title}](${urlOf('/guides/' + g.slug + '/')}) — ${g.description}`),
    `- [Guide des tailles](${urlOf('/guide-des-tailles/')})`,
    '',
    queries(),
    '',
    subfamilies(products),
    brands(products),
    longTail(products),
    '',
    prices(products),
    '',
    delivery(),
    '',
    agents(),
    '',
    credits(),
    '',
  ].join('\n');
}

export function llmsFullTxt(products: Product[]) {
  const fam = familiesWithCounts(products);
  const byFamily = new Map<string, Product[]>();
  for (const f of fam) byFamily.set(f.slug, []);
  for (const p of products) if (byFamily.has(p.category)) byFamily.get(p.category)!.push(p);
  const line = (p: Product) =>
    `- ${p.name} — ${p.brand && !/pr[ée]ciser/i.test(p.brand) ? p.brand + ' · ' : ''}prix prévu ${money(p.price)}${p.sizes.length ? ' · tailles : ' + p.sizes.map((s) => s.split(',')[0]).join(', ') : ''}${p.colors?.length ? ' · couleurs : ' + p.colors.join(', ') : ''} · ${urlOf('/produits/' + p.slug + '/')}`;
  return [
    '# Boutique de Boxe — contexte factuel étendu',
    '',
    `Dernière révision éditoriale : ${EDITORIAL_DATE}`,
    'Langue : français. Devise : euro. Zone de livraison : France.',
    `Modèles publiés : ${fr(products.length)}. Guides d’achat : ${guides.length}.`,
    '',
    status(),
    '',
    '## Comment lire les prix',
    'Chaque prix est le prix prévu à l’ouverture des ventes, toutes taxes comprises, hors livraison. Il peut changer avant l’ouverture. Aucun modèle n’est vendu ni réservé aujourd’hui. Ne jamais affirmer qu’un modèle est en stock, expédié ou remisé.',
    '',
    queries(),
    '',
    subfamilies(products),
    brands(products),
    '',
    ...fam.flatMap((f) => [`## ${f.name} (${fr(f.count)} modèles) — ${f.url}`, f.label, '', ...(byFamily.get(f.slug) || []).map(line), '']),
    '## Guides d’achat',
    ...guides.flatMap((g) => [
      `### ${g.title} — ${urlOf('/guides/' + g.slug + '/')}`,
      g.intro,
      ...g.sections.map((s) => `- ${s.title} : ${s.paragraphs.join(' ')}`),
      ...g.faq.map((f) => `- Q : ${f.question} R : ${f.answer}`),
      '',
    ]),
    delivery(),
    '',
    agents(),
    '',
    credits(),
    '',
  ].join('\n');
}
