import { readCatalog } from '@/lib/database';
import { categoryFor, money, shop } from '@/lib/catalog';
import { ATTRIBUTION, EDITORIAL_DATE, familiesWithCounts, urlOf } from '@/lib/seo';

/** Flux machine du catalogue : un objet par modèle, sans offre commerciale tant que la vente n’est pas ouverte. */
export const dynamic = 'force-dynamic';

// Mémo de rendu : le corps n’est recomposé qu’une fois par 5 min, même si la
// requête varie par une chaîne de recherche (le cache CDN, lui, est contournable).
let memo: { at: number; body: string } | null = null;

export async function GET() {
  if (memo && Date.now() - memo.at < 300000)
    return new Response(memo.body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
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
  const serialized = JSON.stringify(body);
  memo = { at: Date.now(), body: serialized };
  return new Response(serialized, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
