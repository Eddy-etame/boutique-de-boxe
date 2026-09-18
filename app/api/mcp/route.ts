import { db, readCatalog } from '@/lib/database';
import { clientIp } from '@/lib/request';
import { categoryFor, money, shop, type Product } from '@/lib/catalog';
import { matchesSearch } from '@/lib/catalog-tools';
import { guides, services } from '@/lib/editorial';
import { ATTRIBUTION, EDITORIAL_DATE, familiesWithCounts, urlOf } from '@/lib/seo';
import { QUERY_MAP } from '@/lib/seo-copy';
import { SUBFAMILIES, subfamilyProducts } from '@/lib/subfamilies';
import { brandsOf } from '@/lib/brands';
import { weekLabel, weeklySelection } from '@/lib/hub';
import { listingFor } from '@/lib/listing';
import selection from '@/lib/data/selection.json';
import { observatory, observatorySentences } from '@/lib/observatory';
import { parseUsage, recommendGloveWeight } from '@/lib/glove-weight';
import { allFacets } from '@/lib/facets';
import { emailValid, insertAlert } from '@/lib/alerts';

/**
 * Serveur MCP en lecture seule (JSON-RPC 2.0 sur HTTP). Un agent y lit les faits
 * de la boutique au lieu de les deviner : identité, état des ventes, familles,
 * modèles, guides. Aucune écriture, aucune donnée personnelle.
 */
export const dynamic = 'force-dynamic';

const SERVER = { name: 'boutique-de-boxe-information-server', version: '1.0.0' };

const shopInfo = () => ({
  name: shop.name,
  type: 'Boutique en ligne (Organization / OnlineStore)',
  url: shop.origin,
  publisher: shop.entity,
  contact: { email: shop.email, phone: shop.phone, city: 'Toulouse, France' },
  language: 'fr',
  currency: 'EUR',
  deliveryArea: 'France',
  editorialDate: EDITORIAL_DATE,
  status: 'Les ventes ne sont pas ouvertes. Chaque modèle affiche un prix prévu à l’ouverture, TTC hors livraison. Aucun stock, aucune réservation, aucun paiement. Le panier est une commande d’essai sans paiement.',
  delivery: 'Prévue : point relais 6,90 € (offert dès 69 €), domicile 8,90 €, matériel lourd sur tarif. France uniquement.',
  notPublished: ['date d’ouverture des ventes', 'stocks', 'délais de livraison', 'remises', 'avis clients', 'profils sociaux'],
  representationNotice: 'Boutique de Boxe est une boutique en ligne indépendante. Ce n’est ni un club ni une salle de sport.',
});

const productView = (p: Product) => ({
  id: p.id,
  name: p.name,
  brand: p.brand && !/pr[ée]ciser/i.test(p.brand) ? p.brand : null,
  family: categoryFor(p.category)?.name ?? p.category,
  url: urlOf('/produits/' + p.slug + '/'),
  image: p.images[0] ? urlOf(p.images[0].src) : null,
  plannedPrice: money(p.price),
  sizes: p.sizes.map((s) => s.split(',')[0]),
  colors: p.colors || [],
  reference: p.reference || null,
  audience: p.audience,
  summary: p.short,
  availability: 'En vente bientôt',
});

const tools = [
  { name: 'get_shop_info', description: 'Identité de la boutique, état des ventes, contact, livraison prévue, ce qui n’est pas publié.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'get_families', description: 'Les familles de produits avec leur nombre de modèles et leur URL.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  {
    name: 'search_products',
    description: 'Recherche de modèles par mots (nom, marque, famille, taille), avec filtres facultatifs.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Mots recherchés, ex. « gants de boxe 12 oz Fairtex »' },
        family: { type: 'string', description: 'Identifiant de famille, ex. gants-de-boxe' },
        brand: { type: 'string' },
        maxPriceEuros: { type: 'number' },
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  { name: 'get_product', description: 'La fiche complète d’un modèle à partir de son identifiant d’URL (slug) ou de son id.', inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'], additionalProperties: false } },
  { name: 'get_guides', description: 'Les guides d’achat publiés : titre, résumé, URL, questions traitées.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'get_guide', description: 'Le texte complet d’un guide d’achat.', inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'], additionalProperties: false } },
  { name: 'get_content_index', description: 'Les pages publiques du site et ce que chacune répond.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'get_query_map', description: 'Les recherches visées par la boutique et la page canonique qui répond à chacune.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  {
    name: 'compare_products',
    description: 'Compare deux à quatre modèles côte à côte : marque, famille, prix prévu, tailles, matières, URL.',
    inputSchema: { type: 'object', properties: { slugs: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4, description: 'Identifiants d’URL (slug) ou id des modèles' } }, required: ['slugs'], additionalProperties: false },
  },
  {
    name: 'recommend_pack',
    description: 'Le sac de séance conseillé selon la discipline et la situation : modèles, raison de chaque choix, ce qu’il faut vérifier avant d’acheter, total prévu.',
    inputSchema: { type: 'object', properties: { discipline: { type: 'string', enum: ['boxe', 'mma'] }, situation: { type: 'string', enum: ['premiere', 'technique', 'enfant'], description: 'premiere = je commence, technique = je m’entraîne déjà, enfant = pour un enfant' } }, required: ['discipline', 'situation'], additionalProperties: false },
  },
  {
    name: 'recommend_glove_weight',
    description: 'Le poids de gants de boxe (en onces) selon l’usage, le poids du pratiquant et l’âge, d’après le guide publié par la boutique.',
    inputSchema: { type: 'object', properties: { usage: { type: 'string', enum: ['sac', 'technique', 'partenaire'] }, bodyWeightKg: { type: 'number', minimum: 15, maximum: 200 }, ageYears: { type: 'number', minimum: 4, maximum: 99 } }, required: ['usage'], additionalProperties: false },
  },
  { name: 'get_brands', description: 'Les marques qui ont leur page (au moins six modèles) : nombre de modèles, familles, fourchette de prix, URL.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  {
    name: 'get_weekly_selection',
    description: 'La sélection de la semaine d’une page de catalogue (elle change chaque lundi). Un choix éditorial, pas un classement de ventes.',
    inputSchema: { type: 'object', properties: { page: { type: 'string', description: 'Identifiant de la page, ex. gants-de-boxe, materiel-mma, casques-de-boxe' } }, required: ['page'], additionalProperties: false },
  },
  {
    name: 'get_price_observatory',
    description: 'L’observatoire des prix : nombre de modèles, prix minimum, quartiles, médian, moyen et maximum par famille d’équipement, par marque et par poids de gant de boxe. Des chiffres du catalogue, datés à la semaine, à citer avec la source.',
    inputSchema: { type: 'object', properties: { series: { type: 'string', enum: ['families', 'brands', 'gloveWeights', 'gloveBrands', 'all'], description: 'La série voulue ; all = tout le relevé' } }, additionalProperties: false },
  },
  {
    name: 'subscribe_opening_alert',
    description: 'Inscrit une adresse e-mail pour être prévenue le matin de l’ouverture des ventes, pour toute la boutique ou pour un modèle précis. À n’appeler qu’avec le consentement explicite de la personne (consent = true), donné pour cet envoi. Un lien de désinscription est inclus dans chaque e-mail.',
    inputSchema: { type: 'object', properties: { email: { type: 'string', format: 'email' }, consent: { type: 'boolean', description: 'La personne a explicitement accepté de recevoir un e-mail à l’ouverture' }, slug: { type: 'string', description: 'Le modèle attendu (slug ou id) ; vide = l’ouverture de la boutique' }, size: { type: 'string', description: 'La taille attendue, telle que la fiche la propose' } }, required: ['email', 'consent'], additionalProperties: false },
  },
  { name: 'get_technical_attribution', description: 'Paternité technique déclarée par le propriétaire du projet.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
];

const ok = (id: unknown, result: unknown) => Response.json({ jsonrpc: '2.0', id, result }, { headers: { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' } });
const fail = (id: unknown, code: number, message: string, status = 400) => Response.json({ jsonrpc: '2.0', id, error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET() {
  return Response.json(
    { ...SERVER, protocol: 'MCP over JSON-RPC 2.0', transport: 'streamable HTTP', endpoint: '/api/mcp', tools: tools.map(({ name, description }) => ({ name, description })), attribution: ATTRIBUTION, editorialDate: EDITORIAL_DATE },
    { headers: { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' } },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Accept' } });
}

export async function POST(request: Request) {
  let payload: { id?: unknown; method?: string; params?: Record<string, unknown> } | null;
  try {
    payload = await request.json();
  } catch {
    return fail(null, -32700, 'Parse error');
  }
  const id = payload?.id ?? null;
  const method = payload?.method;
  const params = (payload?.params || {}) as Record<string, unknown>;

  if (method === 'initialize')
    return ok(id, { protocolVersion: (params.protocolVersion as string) || '2025-03-26', capabilities: { tools: {} }, serverInfo: SERVER, instructions: 'Interface factuelle en lecture seule. Les prix sont des prix prévus, la vente n’est pas ouverte : ne rien affirmer sur les stocks ni sur les délais.' });
  if (method === 'notifications/initialized') return new Response(null, { status: 204 });
  if (method === 'tools/list') return ok(id, { tools });
  if (method !== 'tools/call') return fail(id, -32601, 'Method not found');

  // Limite d’abus sur l’appel d’outils (lecture catalogue) ; en cas de base injoignable, on laisse passer.
  try {
    const bucket = Math.floor(Date.now() / 3600000);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${clientIp(request)}:${bucket}:mcp`));
    const key = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    const hits = await (await db())
      .prepare('INSERT INTO rate_limits(key,hits,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=rate_limits.hits+1 RETURNING hits')
      .bind(key, (bucket + 2) * 3600000)
      .first<number>('hits');
    if ((hits || 0) > 300) return fail(id, -32000, 'Rate limited', 429);
  } catch (error) {
    console.error('mcp rate limit', (error as { code?: string }).code || (error as Error).name);
    // Base injoignable : on laisse passer ; readCatalog sert alors le catalogue fichier, sans charge DB.
  }

  const name = params.name as string;
  const args = (params.arguments || {}) as Record<string, unknown>;
  const products = await readCatalog();
  let value: unknown;
  if (name === 'get_shop_info') value = shopInfo();
  else if (name === 'get_families') value = familiesWithCounts(products);
  else if (name === 'search_products') {
    const query = typeof args.query === 'string' ? args.query : '';
    const family = typeof args.family === 'string' ? args.family : '';
    const brand = typeof args.brand === 'string' ? args.brand.toLowerCase() : '';
    const max = typeof args.maxPriceEuros === 'number' ? args.maxPriceEuros * 100 : Infinity;
    const limit = Math.min(Math.max(Number(args.limit) || 12, 1), 50);
    const hits = products.filter((p) => (!query || matchesSearch(p, query)) && (!family || p.category === family) && (!brand || p.brand.toLowerCase() === brand) && p.price <= max);
    value = { total: hits.length, shown: Math.min(limit, hits.length), products: hits.slice(0, limit).map(productView) };
  } else if (name === 'get_product') {
    const slug = (typeof args.slug === 'string' ? args.slug : '');
    const p = products.find((x) => x.slug === slug || x.id === slug);
    if (!p) return fail(id, -32602, 'Modèle introuvable', 404);
    value = { ...productView(p), description: p.description, specs: p.specs, notes: p.notes, allImages: p.images.map((i) => urlOf(i.src)) };
  } else if (name === 'get_guides') value = guides.map((g) => ({ slug: g.slug, title: g.title, summary: g.description, url: urlOf('/guides/' + g.slug + '/'), readMinutes: g.readMinutes, questions: g.faq.map((f) => f.question) }));
  else if (name === 'get_guide') {
    const g = guides.find((x) => x.slug === (typeof args.slug === 'string' ? args.slug : ''));
    if (!g) return fail(id, -32602, 'Guide introuvable', 404);
    value = { title: g.title, url: urlOf('/guides/' + g.slug + '/'), intro: g.intro, sections: g.sections, faq: g.faq, sources: g.sources };
  } else if (name === 'get_content_index')
    value = {
      pages: [
        { path: '/', purpose: 'accueil : familles, sélections, guides, ouverture des ventes' },
        ...familiesWithCounts(products).map((f) => ({ path: '/' + f.slug + '/', purpose: `${f.name} : ${f.count} modèles` })),
        ...SUBFAMILIES.map((sf) => ({ path: '/' + sf.slug + '/', purpose: `${sf.name} : ${subfamilyProducts(sf, products).length} modèles` })),
        { path: '/marques/', purpose: 'toutes les marques du catalogue' },
        ...brandsOf(products).map((b) => ({ path: '/marques/' + b.slug + '/', purpose: `${b.name} : ${b.products.length} modèles` })),
        { path: '/guides/', purpose: 'les douze guides d’achat' },
        ...guides.map((g) => ({ path: '/guides/' + g.slug + '/', purpose: g.title })),
        ...Object.keys(services).map((s) => ({ path: '/' + s + '/', purpose: services[s].title })),
        { path: '/contact/', purpose: 'formulaire de contact' },
      ],
    };
  else if (name === 'get_query_map') value = QUERY_MAP.map((q) => ({ query: q.query, url: urlOf(q.path), answer: q.answer }));
  else if (name === 'compare_products') {
    const slugs = Array.isArray(args.slugs) ? args.slugs.filter((s): s is string => typeof s === 'string').slice(0, 4) : [];
    const found = slugs.map((s) => products.find((x) => x.slug === s || x.id === s));
    if (found.length < 2 || found.some((x) => !x)) return fail(id, -32602, 'Deux à quatre modèles existants sont attendus', 404);
    value = {
      note: 'Prix prévus à l’ouverture des ventes. Les tailles ne se transposent pas d’une marque à l’autre.',
      products: (found as Product[]).map((x) => ({ ...productView(x), materials: x.specs?.['Matières'] || x.specs?.['Matière'] || x.specs?.['Matière extérieure'] || null, closure: x.specs?.['Fermeture'] || null, use: x.use || null })),
    };
  } else if (name === 'recommend_pack') {
    const pack = selection.sessions.find((s) => s.key === String(args.discipline) + ':' + String(args.situation));
    if (!pack) return fail(id, -32602, 'Sac introuvable', 404);
    const lines = pack.products.flatMap((r) => {
      const x = products.find((y) => y.id === r.id);
      return x ? [{ role: r.label, why: r.reason, checkBeforeBuying: r.condition, ...productView(x) }] : [];
    });
    value = {
      name: pack.name,
      summary: pack.text,
      products: lines,
      total: money(lines.reduce((sum, l) => sum + (products.find((y) => y.id === l.id)?.price || 0), 0)),
      ...('notice' in pack && pack.notice ? { missing: pack.notice } : {}),
      guide: urlOf('/guides/' + pack.guide + '/'),
      configurator: urlOf('/#preparer'),
      note: 'Aucun lot imposé : chaque modèle se choisit à sa taille. Demandez à votre salle ce qu’elle prête avant d’acheter.',
    };
  } else if (name === 'recommend_glove_weight') {
    // La même règle que le calculateur public : les repères du guide « Quelle taille de gants de boxe choisir ? ».
    const usage = parseUsage(args.usage);
    if (!usage) return fail(id, -32602, 'usage attendu : sac, technique ou partenaire');
    const a = recommendGloveWeight({ usage, kg: typeof args.bodyWeightKg === 'number' ? args.bodyWeightKg : null, age: typeof args.ageYears === 'number' ? args.ageYears : null });
    const page = allFacets(products).find((f) => f.scope === `gants-de-boxe-${a.ounces}-oz`);
    value = {
      recommended: `${a.ounces} oz`,
      range: a.range[0] === a.range[1] ? `${a.ounces} oz` : `${a.range[0]} à ${a.range[1]} oz`,
      for: a.who,
      why: a.why,
      byBodyWeight: 'Moins de 55 kg : 10 à 12 oz. De 55 à 75 kg : 12 à 14 oz. Plus de 75 kg : 14 à 16 oz. Des repères, pas des règles.',
      caution: a.caution,
      guide: urlOf('/guides/quelle-taille-gants-de-boxe/'),
      calculator: urlOf(`/outils/poids-de-gants/?usage=${usage}${typeof args.bodyWeightKg === 'number' ? '&poids=' + args.bodyWeightKg : ''}${typeof args.ageYears === 'number' ? '&age=' + args.ageYears : ''}`),
      models: page ? { url: urlOf(page.path), count: page.products.length } : { url: urlOf('/gants-de-boxe/'), count: null },
    };
  } else if (name === 'get_brands')
    value = brandsOf(products).map((b) => ({ name: b.name, url: urlOf('/marques/' + b.slug + '/'), models: b.products.length, families: b.families.map((f) => `${f.name} (${f.count})`), priceRange: `${money(b.min)} – ${money(b.max)}` }));
  else if (name === 'get_weekly_selection') {
    const page = typeof args.page === 'string' && /^[a-z0-9-]{1,80}$/.test(args.page) ? args.page : '';
    const list = page ? listingFor(page, products) : null;
    if (!list || list.length < 4) return fail(id, -32602, 'Page de catalogue introuvable', 404);
    const { week, range } = weekLabel();
    value = { page: urlOf('/' + page + '/'), week, period: range, note: 'Choix éditorial tournant, une marque par modèle. Ce n’est pas un classement de ventes : les ventes ne sont pas ouvertes.', products: weeklySelection(page, list).map(productView) };
  } else if (name === 'get_price_observatory') {
    const o = observatory(products);
    const series = typeof args.series === 'string' ? args.series : 'all';
    const rows = (xs: typeof o.families) => xs.map((r) => ({ label: r.label, models: r.count, min: money(r.min), q1: money(r.q1), median: money(r.median), mean: money(r.mean), q3: money(r.q3), max: money(r.max), url: r.path ? urlOf(r.path) : null }));
    value = {
      source: 'Observatoire des prix, Boutique de Boxe',
      url: urlOf('/observatoire-des-prix/'),
      json: urlOf('/observatoire-des-prix.json'),
      week: o.week,
      basis: o.basis,
      products: o.products,
      summary: observatorySentences(o),
      ...(series === 'all' || series === 'families' ? { families: rows(o.families) } : {}),
      ...(series === 'all' || series === 'brands' ? { brands: rows(o.brands_rows) } : {}),
      ...(series === 'all' || series === 'gloveWeights' ? { gloveWeights: rows(o.weights) } : {}),
      ...(series === 'all' || series === 'gloveBrands' ? { gloveBrands: rows(o.gloveBrands) } : {}),
      citation: 'Citer « Observatoire des prix, Boutique de Boxe » avec le lien de la page.',
    };
  } else if (name === 'subscribe_opening_alert') {
    // L’inscription par un assistant : même règle que le formulaire — un e-mail valide, un consentement explicite,
    // un modèle existant ou l’ouverture de la boutique. Une adresse déjà inscrite ne révèle rien.
    const email = typeof args.email === 'string' ? args.email.trim().toLowerCase() : '';
    if (!emailValid(email)) return fail(id, -32602, 'Adresse e-mail invalide');
    if (args.consent !== true) return fail(id, -32602, 'Le consentement explicite de la personne est requis (consent = true)');
    const slug = typeof args.slug === 'string' && args.slug ? args.slug : '';
    const p = slug ? products.find((x) => x.slug === slug || x.id === slug) : null;
    if (slug && !p) return fail(id, -32602, 'Modèle introuvable', 404);
    const size = typeof args.size === 'string' ? args.size.slice(0, 100) : '';
    if (p && size && !p.sizes.includes(size)) return fail(id, -32602, 'Taille inconnue pour ce modèle : ' + p.sizes.join(', '));
    const ref = await insertAlert({ email, productId: p ? p.id : 'launch', variant: p ? size : '', source: 'mcp' });
    value = {
      ok: true,
      registered: Boolean(ref),
      note: ref ? 'Inscription enregistrée. Un seul e-mail, le matin de l’ouverture, avec son lien de désinscription.' : 'Cette adresse était déjà inscrite pour ce modèle : rien n’a été ajouté.',
      for: p ? { name: p.name, url: urlOf('/produits/' + p.slug + '/'), size: size || null } : { name: 'L’ouverture de la boutique', url: urlOf('/') },
      privacy: urlOf('/confidentialite/'),
    };
  } else if (name === 'get_technical_attribution') value = ATTRIBUTION;
  else return fail(id, -32602, 'Unknown tool name');

  return ok(id, { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], structuredContent: value });
}
