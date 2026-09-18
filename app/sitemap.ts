import type { MetadataRoute } from 'next';
import { readCatalog } from '@/lib/database';
import { categories, categoryFor, getCategoryProducts, shop } from '@/lib/catalog';
import { guides, services } from '@/lib/editorial';
import { EDITORIAL_DATE, urlOf } from '@/lib/seo';
import { SUBFAMILIES } from '@/lib/subfamilies';
import { brandsOf } from '@/lib/brands';
import { allFacets } from '@/lib/facets';
const SUBFAMILY_PATHS = new Set(SUBFAMILIES.map((s) => '/' + s.slug + '/'));
const TOOL_PATHS = new Set(['/observatoire-des-prix/', '/outils/poids-de-gants/']);
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
    ...SUBFAMILIES.map((s) => '/' + s.slug + '/'),
    '/marques/',
    ...brandsOf(products).map((b) => '/marques/' + b.slug + '/'),
    ...allFacets(products).map((f) => f.path),
    '/observatoire-des-prix/',
    '/outils/poids-de-gants/',
    ...products.map((p) => '/produits/' + p.slug + '/'),
    '/nouveautes/',
    '/guides/',
    ...guides.map((g) => '/guides/' + g.slug + '/'),
    ...Object.keys(services).map((s) => '/' + s + '/'),
    '/contact/',
  ].map((path) => {
    const product = path.startsWith('/produits/') ? products.find((p) => '/produits/' + p.slug + '/' === path) : undefined;
    const kind = path === '/' ? 'home' : product ? 'product' : SUBFAMILY_PATHS.has(path) || path.startsWith('/marques/') || /^\/gants-de-boxe-\d+-oz\/$/.test(path) ? 'subfamily' : TOOL_PATHS.has(path) ? 'index' : path.startsWith('/guides/') ? 'guide' : categoryFor(path.replace(/^\/|\/$/g, '')) ? 'category' : path === '/nouveautes/' || path === '/guides/' ? 'index' : 'service';
    return {
      url: shop.origin + path,
      ...(dates.has(path) ? { lastModified: dates.get(path) } : kind === 'guide' || kind === 'home' || kind === 'index' || kind === 'subfamily' ? { lastModified: EDITORIAL_DATE } : {}),
      changeFrequency: ({ home: 'daily', category: 'daily', index: 'daily', subfamily: 'weekly', product: 'weekly', guide: 'monthly', service: 'yearly' } as const)[kind],
      priority: { home: 1, category: 0.9, index: 0.8, subfamily: 0.8, guide: 0.8, product: 0.7, service: 0.4 }[kind],
      // Plan d’images : les photos du modèle, pour Google Images.
      ...(product ? { images: product.images.slice(0, 4).map((i) => urlOf(i.src)) } : {}),
    };
  });
}
