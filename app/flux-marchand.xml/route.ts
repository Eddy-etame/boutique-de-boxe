import { readCatalog, cacheCatalogue, catalogueDeSecours } from '@/lib/database';
import { categoryFor, estLourd, shop, type Product, fraisDeLivraison } from '@/lib/catalog';
import { merchantIdentifiers, merchantVariants } from '@/lib/merchant-products';
import { SUBFAMILIES } from '@/lib/subfamilies';
import { categorieGoogle } from '@/lib/categorie-google';
import { urlOf } from '@/lib/seo';
import { photoSrc } from '@/lib/vignette';

/**
 * Flux marchand (13/10/2026) : le catalogue au format RSS 2.0 de Google Merchant Center, que Bing
 * Merchant Center lit aussi. Un article par déclinaison (taille), regroupé par modèle ; prix TTC,
 * disponibilité confirmée dans shop, livraison en France au tarif réel. Le matériel lourd (sur devis)
 * et les modèles sans photo ou sans prix n'y entrent pas. Soumis par le propriétaire dans son
 * compte Merchant : https://www.boutique-de-boxe.com/flux-marchand.xml
 */
export const dynamic = 'force-dynamic';

const esc = (v: string) =>
  v.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
const texte = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 4990);
const prix = (cents: number) => (cents / 100).toFixed(2) + ' EUR';
const abs = (src: string) => (/^https?:\/\//.test(src) ? src : urlOf(src));

let memo: { at: number; body: string } | null = null;

/** Jours ouvrés du délai d'expédition annoncé (« 7 jours ouvrés »). */
const JOURS_OUVRES = Number(/\d+/.exec(shop.delais.expedition)?.[0] || 7);
/** Date de disponibilité d'un article sur commande : aujourd'hui + le délai, week-ends sautés (ISO 8601). */
function dateDisponibilite(from = new Date()): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 12));
  let restants = JOURS_OUVRES;
  while (restants > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const jour = d.getUTCDay();
    if (jour !== 0 && jour !== 6) restants--;
  }
  return d.toISOString().slice(0, 16) + '+0000';
}

function item(p: Product, variant: ReturnType<typeof merchantVariants>[number], type: string, disponible: string) {
  const { id, size: taille, price: montant, path } = variant;
  const identifiers = merchantIdentifiers(p);
  const lignes = [
    `<g:id>${esc(id)}</g:id>`,
    `<g:title>${esc(texte(taille ? `${p.name} — ${taille}` : p.name).slice(0, 150))}</g:title>`,
    `<g:description>${esc(texte(p.description || p.short))}</g:description>`,
    `<g:link>${esc(urlOf(path))}</g:link>`,
    // Photos sur le domaine : celles du fournisseur passent par /vignette/1200/… (WebP), jamais par son hôte.
    `<g:image_link>${esc(abs(photoSrc(p.slug, p.images[0], 1200)))}</g:image_link>`,
    ...p.images.slice(1, 6).map((i) => `<g:additional_image_link>${esc(abs(photoSrc(p.slug, i, 1200)))}</g:additional_image_link>`),
    `<g:availability>${shop.disponibiliteOffre === 'InStock' ? 'in_stock' : 'backorder'}</g:availability>`,
    ...(shop.disponibiliteOffre === 'InStock' ? [] : [`<g:availability_date>${disponible}</g:availability_date>`]),
    `<g:price>${prix(montant)}</g:price>`,
    `<g:condition>new</g:condition>`,
    ...(identifiers.brand ? [`<g:brand>${esc(identifiers.brand)}</g:brand>`] : []),
    ...(identifiers.gtin ? [`<g:gtin>${esc(identifiers.gtin)}</g:gtin>`] : []),
    ...(identifiers.mpn ? [`<g:mpn>${esc(identifiers.mpn)}</g:mpn>`] : []),
    ...(identifiers.gtin || identifiers.mpn ? ['<g:identifier_exists>yes</g:identifier_exists>'] : []),
    `<g:product_type>${esc(type)}</g:product_type>`,
    // La catégorie de la taxonomie Google (lib/categorie-google.ts) : Merchant Center classe mieux et refuse moins.
    `<g:google_product_category>${categorieGoogle(p)}</g:google_product_category>`,
    ...(taille ? [`<g:item_group_id>${esc(p.id)}</g:item_group_id>`, `<g:size>${esc(taille)}</g:size>`] : []),
    ...(p.colors?.length ? [`<g:color>${esc(p.colors.slice(0, 3).join('/'))}</g:color>`] : []),
    ...(p.audience === 'enfant' ? [`<g:age_group>kids</g:age_group>`] : []),
    // Livraison réelle, lue dans la source unique (shop.livraison) : point relais, offert au-delà du franco.
    `<g:shipping><g:country>FR</g:country><g:service>Point relais</g:service><g:price>${(fraisDeLivraison('relay', montant) / 100).toFixed(2)} EUR</g:price></g:shipping>`,
    `<g:shipping><g:country>FR</g:country><g:service>Domicile</g:service><g:price>${(shop.livraison.domicile / 100).toFixed(2)} EUR</g:price></g:shipping>`,
  ];
  return `<item>${lignes.join('')}</item>`;
}

export async function GET() {
  if (memo && Date.now() - memo.at < 300000)
    return new Response(memo.body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } });
  // Sans la base (catalogue de secours) : ni mémo, ni cache CDN d'une heure (D30).
  const catalog = await readCatalog();
  const products = catalog.filter((p) => p.images[0] && p.price > 0 && !estLourd(p));
  const items: string[] = [];
  const disponible = dateDisponibilite();
  for (const p of products) {
    const famille = categoryFor(p.category)?.name || p.category;
    const sous = SUBFAMILIES.find((s) => !s.kind && s.match(p))?.name;
    const type = sous ? `${famille} > ${sous}` : famille;
    for (const variant of merchantVariants(p)) items.push(item(p, variant, type, disponible));
  }
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>` +
    `<title>${esc(shop.name)}</title><link>${esc(shop.origin)}/</link><description>${esc('Matériel de boxe, de MMA et de sports de combat : gants, protections, textile, sacs de frappe, chaussures. Prix TTC, livraison en France.')}</description>` +
    items.join('\n') +
    `</channel></rss>`;
  if (!catalogueDeSecours(catalog)) memo = { at: Date.now(), body };
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': cacheCatalogue(catalog, 'public, max-age=3600, s-maxage=3600') } });
}
