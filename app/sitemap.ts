import type { MetadataRoute } from 'next';
import { readCatalog } from '@/lib/database';
import { categories, getCategoryProducts, shop } from '@/lib/catalog';
import { guides, services } from '@/lib/editorial';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await readCatalog();
  const dates = new Map(
    products.map((p) => [
      '/produits/' + p.slug + '/',
      p.updatedAt || p.dateAdded,
    ]),
  );
  for (const c of categories) {
    const newest = getCategoryProducts(c, products)
      .map((p) => p.updatedAt || p.dateAdded)
      .filter(Boolean)
      .sort()
      .at(-1);
    if (newest) dates.set('/' + c.slug + '/', newest);
  }
  return [
    '/',
    ...categories.map((c) => '/' + c.slug + '/'),
    ...products.map((p) => '/produits/' + p.slug + '/'),
    '/nouveautes/',
    '/guides/',
    ...guides.map((g) => '/guides/' + g.slug + '/'),
    ...Object.keys(services).map((s) => '/' + s + '/'),
    '/contact/',
  ].map((path) => ({
    url: shop.origin + path,
    ...(dates.has(path) ? {lastModified:dates.get(path)} : path.startsWith('/guides') || path==='/' ? {lastModified:'2026-09-10'} : {}),
  }));
}
