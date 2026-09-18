import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readCatalog } from '@/lib/database';
import { facetFor } from '@/lib/facets';
import { FacetPage, facetMetadata } from '@/components/facet-page';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ brand: string; family: string }> };

/** Une marque dans une famille : /marques/fairtex/gants-de-boxe/. La page n’existe qu’à partir de six modèles. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand, family } = await params;
  const f = facetFor(`marques/${brand}/${family}`, await readCatalog());
  return f ? facetMetadata(f) : { title: 'Page introuvable', robots: { index: false } };
}

export default async function BrandFamilyPage({ params }: Props) {
  const { brand, family } = await params;
  const products = await readCatalog();
  const f = facetFor(`marques/${brand}/${family}`, products);
  if (!f) notFound();
  return <FacetPage facet={f} all={products} />;
}
