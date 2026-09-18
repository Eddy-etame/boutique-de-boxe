import type { Metadata } from 'next';
import { readCatalog } from '@/lib/database';
import { money } from '@/lib/catalog';
import { brandsOf } from '@/lib/brands';
import { graph, urlOf, webPageNode, breadcrumbNode } from '@/lib/seo';
import { ogImage } from '@/lib/og';
import { Breadcrumb } from '@/components/shop-shell';

export const dynamic = 'force-dynamic';
const TITLE = 'Marques de boxe et de MMA : Elion, Fairtex, Cleto Reyes, Venum';
const DESCRIPTION =
  'Toutes les marques de la Boutique de Boxe : Elion, Fairtex, Cleto Reyes, Everlast, Adidas, Venum, Twins, Metal Boxe. Modèles, équipements et prix prévus par marque.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['marques de boxe', 'marques de MMA', 'gants de boxe Fairtex', 'Cleto Reyes', 'Elion', 'Venum', 'Twins', 'Everlast'],
  alternates: { canonical: '/marques/', languages: { 'fr-FR': '/marques/', 'x-default': '/marques/' } },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/marques/', type: 'website', images: ogImage('x', 'marques', 'Les marques') },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export default async function BrandsIndex() {
  const brands = brandsOf(await readCatalog());
  const list = {
    '@type': 'ItemList',
    '@id': urlOf('/marques/') + '#list',
    name: 'Les marques de la Boutique de Boxe',
    numberOfItems: brands.length,
    itemListElement: brands.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, url: urlOf('/marques/' + b.slug + '/') })),
  };
  return (
    <main id="contenu" className="page-wrap">
      <Breadcrumb items={[{ label: 'Marques' }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: graph([
            webPageNode({ path: '/marques/', name: TITLE, description: DESCRIPTION, type: 'CollectionPage', image: '/vignette/x/marques.png', mainEntity: urlOf('/marques/') + '#list' }),
            breadcrumbNode('/marques/', [{ label: 'Marques' }]),
            list,
          ]),
        }}
      />
      <section className="page-heading">
        <div>
          <span className="eyebrow">LE CATALOGUE / {brands.length} MARQUES</span>
          <h1>
            Les marques
            <br />
            de la boutique.
          </h1>
        </div>
        <p>
          Les marques de boxe et les marques de MMA du catalogue. Chacune a sa page : ses modèles, ses
          équipements, ses tailles et ses prix prévus. Une marque n’y figure que si le catalogue en
          porte au moins six modèles.
        </p>
      </section>
      <div className="brand-grid">
        {brands.map((b) => {
          // Trois modèles détourés, la famille la plus fournie de la marque d’abord : une tuile Cleto Reyes montre des gants, pas une boîte.
          const order = new Map(b.families.map((f, i) => [f.slug, i]));
          const heroes = b.products
            .filter((p) => p.cut?.mode === 'pose')
            .sort((x, y) => (order.get(x.category) ?? 99) - (order.get(y.category) ?? 99))
            .slice(0, 3);
          return (
            <a key={b.slug} className="brand-tile" href={'/marques/' + b.slug + '/'}>
              <div className="brand-tile-stage" aria-hidden="true">
                {heroes.map((p) => (
                  <img key={p.id} src={p.cut!.small} alt="" width={480} height={480} loading="lazy" decoding="async" />
                ))}
              </div>
              <h2>{b.name}</h2>
              <p>
                {b.products.length} modèles · {b.families.slice(0, 2).map((f) => f.name.toLowerCase()).join(', ')}
              </p>
              <span>
                de {money(b.min)} à {money(b.max)}
              </span>
            </a>
          );
        })}
      </div>
    </main>
  );
}
