import type { MetadataRoute } from 'next';
import { readCatalog } from '@/lib/database';
import { categories, categoryFor, getCategoryProducts, shop } from '@/lib/catalog';
import { guides, services } from '@/lib/editorial';
import { EDITORIAL_DATE, urlOf } from '@/lib/seo';
import { SUBFAMILIES, subfamilyProducts } from '@/lib/subfamilies';
import { brandsOf } from '@/lib/brands';
import { allFacets } from '@/lib/facets';
const SUBFAMILY_PATHS = new Set(SUBFAMILIES.map((s) => '/' + s.slug + '/'));
const TOOL_PATHS = new Set(['/observatoire-des-prix/', '/outils/poids-de-gants/']);
export const revalidate = 60;

const productDate = (product: { updatedAt?: string; dateAdded: string }) =>
  product.updatedAt || product.dateAdded;

/**
 * Dates de collections : le texte éditorial et les chiffres de catalogue sont tous deux visibles.
 * On publie donc la plus récente de ces deux sources, jamais la date du build ou du crawl.
 */
const collectionDate = (
  products: { updatedAt?: string; dateAdded: string }[],
) =>
  [EDITORIAL_DATE, ...products.map(productDate).filter(Boolean)].sort().at(-1) ??
  EDITORIAL_DATE;

/**
 * Google demande que l'hôte de chaque image d'un sitemap soit vérifié dans Search Console.
 * Les vues fournisseur restent visibles sur les fiches, mais le sitemap ne revendique que les
 * photos servies par le domaine de la boutique. Cela évite aussi qu'un nom de fichier tiers mal
 * échappé rende tout le XML illisible.
 */
const ownedImages = (sources: string[]) =>
  sources
    .map(urlOf)
    .filter((source) => new URL(source).origin === shop.origin)
    .slice(0, 4);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await readCatalog();
  const brands = brandsOf(products);
  const facets = allFacets(products);
  const dates = new Map(
    products.map((p) => [
      '/produits/' + p.slug + '/',
      collectionDate([p]),
    ]),
  );

  const allProductsDate = collectionDate(products);
  for (const path of ['/', '/marques/', '/observatoire-des-prix/', '/nouveautes/'])
    dates.set(path, allProductsDate);
  for (const c of categories) {
    dates.set('/' + c.slug + '/', collectionDate(getCategoryProducts(c, products)));
  }
  for (const sub of SUBFAMILIES)
    dates.set('/' + sub.slug + '/', collectionDate(subfamilyProducts(sub, products)));
  for (const brand of brands)
    dates.set('/marques/' + brand.slug + '/', collectionDate(brand.products));
  for (const facet of facets)
    dates.set(facet.path, collectionDate(facet.products));

  return [
    '/',
    ...categories.map((c) => '/' + c.slug + '/'),
    ...SUBFAMILIES.map((s) => '/' + s.slug + '/'),
    '/marques/',
    ...brands.map((b) => '/marques/' + b.slug + '/'),
    ...facets.map((f) => f.path),
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
    const kind = path === '/' ? 'home' : product ? 'product' : SUBFAMILY_PATHS.has(path) || path.startsWith('/marques/') || /^\/gants-de-boxe-[a-z0-9-]+\/$/.test(path) ? 'subfamily' : TOOL_PATHS.has(path) ? 'index' : path.startsWith('/guides/') ? 'guide' : categoryFor(path.replace(/^\/|\/$/g, '')) ? 'category' : path === '/nouveautes/' || path === '/guides/' ? 'index' : 'service';
    return {
      url: shop.origin + path,
      ...(dates.has(path) ? { lastModified: dates.get(path) } : kind === 'guide' || kind === 'home' || kind === 'index' || kind === 'subfamily' ? { lastModified: EDITORIAL_DATE } : {}),
      changeFrequency: ({ home: 'daily', category: 'daily', index: 'daily', subfamily: 'weekly', product: 'weekly', guide: 'monthly', service: 'yearly' } as const)[kind],
      priority: { home: 1, category: 0.9, index: 0.8, subfamily: 0.8, guide: 0.8, product: 0.7, service: 0.4 }[kind],
      // Plan d’images : uniquement les photos sur l’hôte canonique, pour Google Images.
      ...(product
        ? { images: ownedImages(product.images.map((image) => image.src)) }
        : {}),
    };
  });
}
