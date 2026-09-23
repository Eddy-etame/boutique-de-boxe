import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readCatalog } from '@/lib/database';
import { facetFor } from '@/lib/facets';
import { FacetPage, facetMetadata } from '@/components/facet-page';
import { catalogPage } from '@/lib/pagination';

export const revalidate = 60;
type Props = {
  params: Promise<{ brand: string; family: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

/** Une marque dans une famille : /marques/fairtex/gants-de-boxe/. La page n’existe qu’à partir de six modèles. */
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { brand, family } = await params;
  const f = facetFor(`marques/${brand}/${family}`, await readCatalog());
  if (!f) return { title: 'Page introuvable', robots: { index: false } };
  const page = catalogPage((await searchParams).page, f.products.length);
  if (page === null) notFound();
  return facetMetadata(f, page);
}

export default async function BrandFamilyPage({ params, searchParams }: Props) {
  const { brand, family } = await params;
  const products = await readCatalog();
  const f = facetFor(`marques/${brand}/${family}`, products);
  if (!f) notFound();
  const page = catalogPage((await searchParams).page, f.products.length);
  if (page === null) notFound();
  return <FacetPage facet={f} all={products} page={page} />;
}
