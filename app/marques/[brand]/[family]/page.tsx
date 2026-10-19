import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readCatalog } from '@/lib/database';
import { allFacets, facetFor } from '@/lib/facets';
import { FacetPage, facetMetadata } from '@/components/facet-page';

/** HTML statique régénéré toutes les minutes ; `?page=N` se lit dans le navigateur (components/shop-interactions.tsx). */
export const revalidate = 60;
type Props = {
  params: Promise<{ brand: string; family: string }>;
};

export async function generateStaticParams() {
  return allFacets(await readCatalog())
    .map((f) => f.path.split('/').filter(Boolean))
    .filter((s) => s.length === 3 && s[0] === 'marques')
    .map(([, brand, family]) => ({ brand, family }));
}

/** Une marque dans une famille : /marques/fairtex/gants-de-boxe/. La page n’existe qu’à partir de six modèles. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand, family } = await params;
  const f = facetFor(`marques/${brand}/${family}`, await readCatalog());
  if (!f) return { title: 'Page introuvable', robots: { index: false } };
  return facetMetadata(f, 1);
}

export default async function BrandFamilyPage({ params }: Props) {
  const { brand, family } = await params;
  const products = await readCatalog();
  const f = facetFor(`marques/${brand}/${family}`, products);
  if (!f) notFound();
  return <FacetPage facet={f} all={products} page={1} />;
}
