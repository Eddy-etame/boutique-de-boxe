import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readCatalog } from '@/lib/database';
import { listItem, money } from '@/lib/catalog';
import { brandCopy, brandFor, brandsOf, priceTable } from '@/lib/brands';
import { collectionGraph } from '@/lib/seo';
import { ogImage } from '@/lib/og';
import { Breadcrumb } from '@/components/shop-shell';
import { Catalog } from '@/components/shop-interactions';
import { SeoBody } from '@/components/seo-body';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ brand: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand } = await params;
  const b = brandFor(brand, await readCatalog());
  if (!b) return { title: 'Page introuvable', robots: { index: false } };
  const copy = brandCopy(b);
  const canonical = '/marques/' + b.slug + '/';
  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: [b.name, ...b.families.slice(0, 4).map((f) => `${f.name.toLowerCase()} ${b.name}`), `${b.name} France`, `boutique ${b.name}`],
    alternates: { canonical, languages: { 'fr-FR': canonical, 'x-default': canonical } },
    openGraph: { title: copy.title, description: copy.description, url: canonical, type: 'website', images: ogImage('x', 'marques/' + b.slug, b.name) },
    twitter: { card: 'summary_large_image', title: copy.title, description: copy.description },
  };
}

export default async function BrandPage({ params }: Props) {
  const { brand } = await params;
  const products = await readCatalog();
  const b = brandFor(brand, products);
  if (!b) notFound();
  const copy = brandCopy(b);
  const path = '/marques/' + b.slug + '/';
  const prices = priceTable(b.products);
  const others = brandsOf(products).filter((x) => x.slug !== b.slug).slice(0, 12);
  return (
    <main id="contenu" className="page-wrap">
      <Breadcrumb items={[{ label: 'Marques', href: '/marques/' }, { label: b.name }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: collectionGraph({ path, name: b.name, description: copy.description, items: b.products.slice(0, 36), total: b.products.length, page: 1, perPage: 36, faq: copy.faq }),
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
      <Catalog items={b.products.slice(0, 36).map(listItem)} total={b.products.length} scope={'marque-' + b.slug} showFamilies={b.families.length > 1} />
      {prices.length >= 2 && (
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
                    <th scope="row">{r.name}</th>
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
      <SeoBody sections={[]} faq={copy.faq} heading={`Questions sur ${b.name}`} />
      <nav className="subfamily-links" aria-label="Autres marques">
        <a href="/marques/">Toutes les marques</a>
        {others.map((x) => (
          <a key={x.slug} href={'/marques/' + x.slug + '/'}>
            {x.name}
          </a>
        ))}
      </nav>
    </main>
  );
}
