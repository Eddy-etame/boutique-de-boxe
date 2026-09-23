import type { Metadata } from 'next';
import Home from '@/components/home';
import { readCatalog } from '@/lib/database';
import { homeGraph, PAGE_KEYWORDS } from '@/lib/seo';
import { HOME_FAQ } from '@/lib/seo-copy';
export const revalidate = 60;
export const metadata: Metadata = { alternates: { canonical: '/', languages: { 'fr-FR': '/', 'x-default': '/' } }, keywords: PAGE_KEYWORDS[''] };
export default async function Page() {
  const items = await readCatalog();
  return (
    <>
      <Home items={items} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: homeGraph(items, HOME_FAQ) }} />
    </>
  );
}
