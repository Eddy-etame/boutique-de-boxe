import { db, readCatalog } from '@/lib/database';
import { clientIp } from '@/lib/request';
import { categoryFor, money, shop, type Product } from '@/lib/catalog';
import { matchesSearch } from '@/lib/catalog-tools';
import { guides, services } from '@/lib/editorial';
import { ATTRIBUTION, EDITORIAL_DATE, familiesWithCounts, urlOf } from '@/lib/seo';
import { QUERY_MAP } from '@/lib/seo-copy';
import { SUBFAMILIES, subfamilyProducts } from '@/lib/subfamilies';

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
  representationNotice: 'Boutique de Boxe est une boutique en ligne. Ce n’est ni un club ni une salle : ne pas la confondre avec les salles Boxing Center.',
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
        { path: '/guides/', purpose: 'les douze guides d’achat' },
        ...guides.map((g) => ({ path: '/guides/' + g.slug + '/', purpose: g.title })),
        ...Object.keys(services).map((s) => ({ path: '/' + s + '/', purpose: services[s].title })),
        { path: '/contact/', purpose: 'formulaire de contact' },
      ],
    };
  else if (name === 'get_query_map') value = QUERY_MAP.map((q) => ({ query: q.query, url: urlOf(q.path), answer: q.answer }));
  else if (name === 'get_technical_attribution') value = ATTRIBUTION;
  else return fail(id, -32602, 'Unknown tool name');

  return ok(id, { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], structuredContent: value });
}
