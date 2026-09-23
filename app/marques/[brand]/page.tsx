import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readCatalog } from '@/lib/database';
import { listItem, money } from '@/lib/catalog';
import { brandCopy, brandFor, brandsOf, priceTable } from '@/lib/brands';
import { brandFamilyFacet } from '@/lib/facets';
import { collectionGraph } from '@/lib/seo';
import { ogImage } from '@/lib/og';
import { Breadcrumb } from '@/components/shop-shell';
import { Catalog } from '@/components/shop-interactions';
import { SeoBody } from '@/components/seo-body';
import { catalogPage, PAGE_SIZE } from '@/lib/pagination';

export const revalidate = 60;
type Props = {
  params: Promise<{ brand: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { brand } = await params;
  const b = brandFor(brand, await readCatalog());
  if (!b) return { title: 'Page introuvable', robots: { index: false } };
  const page = catalogPage((await searchParams).page, b.products.length);
  if (page === null) notFound();
  const copy = brandCopy(b);
  const canonical = '/marques/' + b.slug + '/' + (page > 1 ? '?page=' + page : '');
  const title = copy.title + (page > 1 ? ` — Page ${page}` : '');
  const description =
    page > 1
      ? `Page ${page} sur ${Math.ceil(b.products.length / PAGE_SIZE)}. ${copy.description}`.slice(0, 158)
      : copy.description;
  return {
    title: { absolute: title },
    description,
    keywords: [b.name, ...b.families.slice(0, 4).map((f) => `${f.name.toLowerCase()} ${b.name}`), `${b.name} France`, `boutique ${b.name}`],
    alternates: { canonical, languages: { 'fr-FR': canonical, 'x-default': canonical } },
    openGraph: { title, description, url: canonical, type: 'website', images: ogImage('x', 'marques/' + b.slug, b.name) },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { brand } = await params;
  const products = await readCatalog();
  const b = brandFor(brand, products);
  if (!b) notFound();
  const currentPage = catalogPage((await searchParams).page, b.products.length);
  if (currentPage === null) notFound();
  const pageItems = b.products.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const copy = brandCopy(b);
  const path = '/marques/' + b.slug + '/';
  const prices = priceTable(b.products);
  const others = brandsOf(products).filter((x) => x.slug !== b.slug).slice(0, 12);
  // Les familles de la marque qui ont leur propre page (six modèles et plus) : « gants de boxe Fairtex ».
  const familyPages = new Map(b.families.map((f) => [f.slug, brandFamilyFacet(b, f.slug)] as const));
  return (
    <main id="contenu" className="page-wrap">
      <Breadcrumb items={[{ label: 'Marques', href: '/marques/' }, { label: b.name }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: collectionGraph({ path, name: b.name, description: copy.description, items: pageItems, total: b.products.length, page: currentPage, perPage: PAGE_SIZE, faq: copy.faq }),
        }}
      />
      <section className="page-heading">
        <div>
          <span className="eyebrow">LES MARQUES / {b.products.length} MODÈLES</span>
          <h1>{b.name}</h1>
        </div>
        <div>
          <div className="label">
            {b.families.slice(0, 3).map((f) => f.name).join(', ')}.
          </div>
          <p>{copy.intro}</p>
        </div>
      </section>
      {[...familyPages.values()].some(Boolean) && (
        <nav className="subfamily-links" aria-label={'Les équipements ' + b.name}>
          {b.families.map((f) => {
            const page = familyPages.get(f.slug);
            return page ? (
              <a key={f.slug} href={page.path}>
                {f.name} {b.name} · {f.count}
              </a>
            ) : null;
          })}
        </nav>
      )}
      <Catalog items={pageItems.map(listItem)} total={b.products.length} scope={'marque-' + b.slug} initialPage={currentPage} showFamilies={b.families.length > 1} />
      {currentPage === 1 && prices.length >= 2 && (
        <section className="keyword-hub">
          <div className="hub-prices">
            <table>
              <caption>{b.name} : les prix prévus, par équipement</caption>
              <thead>
                <tr>
                  <th scope="col">Équipement</th>
                  <th scope="col">Modèles</th>
                  <th scope="col">Dès</th>
                  <th scope="col">Prix médian</th>
                  <th scope="col">Jusqu’à</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((r) => (
                  <tr key={r.slug}>
                    <th scope="row">{familyPages.get(r.slug) ? <a href={familyPages.get(r.slug)!.path}>{r.name}</a> : r.name}</th>
                    <td>{r.count}</td>
                    <td>{money(r.min)}</td>
                    <td>{money(r.median)}</td>
                    <td>{money(r.max)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hub-prices-note">Chiffres tirés du catalogue, mis à jour avec lui.</p>
          </div>
        </section>
      )}
      {currentPage === 1 && <SeoBody sections={[]} faq={copy.faq} heading={`Questions sur ${b.name}`} />}
      {currentPage === 1 && (
        <nav className="subfamily-links" aria-label="Autres marques">
          <a href="/marques/">Toutes les marques</a>
          {others.map((x) => (
            <a key={x.slug} href={'/marques/' + x.slug + '/'}>
              {x.name}
            </a>
          ))}
        </nav>
      )}
    </main>
  );
}
