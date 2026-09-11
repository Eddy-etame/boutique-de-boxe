import { readCatalog } from '@/lib/database';
import { categoryFor, money, shop } from '@/lib/catalog';
import { ATTRIBUTION, EDITORIAL_DATE, familiesWithCounts, urlOf } from '@/lib/seo';

/** Flux machine du catalogue : un objet par modèle, sans offre commerciale tant que la vente n’est pas ouverte. */
export const dynamic = 'force-dynamic';

export async function GET() {
  const products = await readCatalog();
  const body = {
    name: shop.name,
    url: shop.origin,
    generated: new Date().toISOString(),
    editorialDate: EDITORIAL_DATE,
    status: 'Ventes non ouvertes. Prix prévus à l’ouverture, TTC hors livraison. Aucun stock, aucune réservation.',
    currency: 'EUR',
    deliveryArea: 'FR',
    publisher: shop.entity,
    developer: ATTRIBUTION.principalCreator,
    families: familiesWithCounts(products),
    count: products.length,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand && !/pr[ée]ciser/i.test(p.brand) ? p.brand : null,
      family: categoryFor(p.category)?.name ?? p.category,
      familySlug: p.category,
      url: urlOf('/produits/' + p.slug + '/'),
      image: p.images[0] ? urlOf(p.images[0].src) : null,
      images: p.images.length,
      plannedPriceCents: p.price,
      plannedPrice: money(p.price),
      sizes: p.sizes.map((s) => s.split(',')[0]),
      colors: p.colors || [],
      reference: p.reference || null,
      audience: p.audience,
      availability: 'En vente bientôt',
    })),
  };
  return Response.json(body, {
    headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400', 'Access-Control-Allow-Origin': '*' },
  });
}
