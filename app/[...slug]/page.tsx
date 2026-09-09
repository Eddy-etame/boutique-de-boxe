import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  categoryFor,
  getCategoryProducts,
  categories,
  shop,
  jsonLd,
} from '@/lib/catalog';
import { readCatalog, isAdmin } from '@/lib/database';
import { guides, services } from '@/lib/editorial';
import { Breadcrumb, ArrowLink } from '@/components/shop-shell';
import {
  Catalog,
  ProductDetails,
  ProductCard,
} from '@/components/shop-interactions';
import {
  GuidesIndex,
  GuidePage,
  ServicePage,
} from '@/components/editorial-pages';
import { ContactForm, Unsubscribe } from '@/components/contact-form';
import { Admin } from '@/components/admin';
import { chatGPTSignInPath } from '@/app/chatgpt-auth';
export const dynamic = 'force-dynamic';
type Props = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const path = slug.join('/');
  const products = await readCatalog();
  const product =
    slug[0] === 'produits'
      ? products.find((p) => p.slug === slug[1])
      : undefined;
  const cat = categoryFor(path);
  const guide =
    slug[0] === 'guides' ? guides.find((g) => g.slug === slug[1]) : undefined;
  const service = services[path];
  const special: Record<string, [string, string]> = {
    guides: [
      'Guides d’achat boxe, MMA et sports de combat',
      'Neuf guides pour choisir gants, protections et équipement de boxe ou MMA selon votre pratique. Les tailles, les onces et les critères utiles.',
    ],
    nouveautes: [
      'Nouveautés : les équipements du catalogue',
      'Découvrez les équipements intégrés au catalogue Boutique de Boxe : gants, protections, tenues et accessoires, tous en préparation avant la vente.',
    ],
    recherche: [
      'Rechercher un équipement',
      'Recherchez un modèle, une marque ou une famille d’équipement dans le catalogue Boutique de Boxe.',
    ],
    contact: [
      'Contact : une question sur le matériel ?',
      'Contactez Boxing Center pour une question sur les équipements présentés, une fiche produit ou la préparation de Boutique de Boxe.',
    ],
    confirmation: [
      'Demande enregistrée',
      'Confirmation de votre demande auprès de Boutique de Boxe.',
    ],
    atelier: ['Administration', 'Gestion privée du catalogue et des demandes.'],
    desinscription: [
      'Désinscription des alertes',
      'Gérer votre inscription à une alerte Boutique de Boxe.',
    ],
  };
  const title =
    product?.name ||
    cat?.name ||
    guide?.title ||
    service?.title ||
    special[path]?.[0] ||
    'Page introuvable';
  const description =
    product?.short ||
    cat?.description ||
    guide?.description ||
    service?.description ||
    special[path]?.[1] ||
    'Cette page n’existe pas.';
  return {
    title,
    description,
    alternates: { canonical: '/' + path + '/' },
    openGraph: {
      title,
      description,
      url: '/' + path + '/',
      siteName: shop.name,
      locale: 'fr_FR',
      type: guide ? 'article' : 'website',
      ...(product
        ? {
            images: [
              {
                url: product.images[0].src,
                width: 960,
                height: 960,
                alt: product.name,
              },
            ],
          }
        : {}),
    },
    ...(['atelier', 'recherche', 'desinscription', 'confirmation'].includes(
      path,
    )
      ? { robots: { index: false, follow: path === 'recherche' } }
      : {}),
  };
}
export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const path = slug.join('/');
  if (path === 'confirmation')
    return (
      <main id="contenu" className="page-wrap">
        <section className="not-found">
          <span className="eyebrow">DANS VOTRE COIN</span>
          <h1>Demande enregistrée.</h1>
          <p>
            Votre demande a été enregistrée pour être traitée par l’équipe
            Boxing Center.
          </p>
          <ArrowLink href="/">Revenir à la boutique</ArrowLink>
        </section>
      </main>
    );
  if (path === 'guides') return <GuidesIndex />;
  if (slug[0] === 'guides' && slug.length === 2) {
    const g = guides.find((g) => g.slug === slug[1]);
    if (!g) notFound();
    return <GuidePage guide={g} />;
  }
  if (services[path])
    return <ServicePage service={services[path]} slug={path} />;
  if (path === 'contact')
    return (
      <main id="contenu" className="page-wrap">
        <Breadcrumb items={[{ label: 'Contact' }]} />
        <section className="page-heading">
          <div>
            <span className="eyebrow">DANS VOTRE COIN / CONTACT</span>
            <h1>
              Parlons
              <br />
              équipement.
            </h1>
          </div>
          <p>
            Un doute sur un modèle, une taille à éclaircir, une question sur la
            boutique. Donnez-nous les détails utiles.
          </p>
        </section>
        <div className="contact-layout">
          <aside>
            <span className="eyebrow">L’ÉQUIPE BOXING CENTER</span>
            <Link className="contact-email" href={'mailto:' + shop.email}>
              {shop.email} ↗
            </Link>
            <p>
              Catalogue national en préparation.
              <br />
              Aucune commande n’est encore ouverte.
            </p>
            <div className="contact-mark" aria-hidden="true">
              ON EST
              <br />
              DANS
              <br />
              <em>VOTRE COIN.</em>
            </div>
          </aside>
          <ContactForm />
        </div>
      </main>
    );
  if (path === 'atelier')
    return (
      <main id="contenu" className="page-wrap admin-page">
        <Breadcrumb items={[{ label: 'Administration' }]} />
        <header className="article-heading">
          <span className="eyebrow">L’ATELIER / ACCÈS PRIVÉ</span>
          <h1>Préparer la suite.</h1>
        </header>
        {(await isAdmin()) ? (
          <Admin />
        ) : (
          <div className="empty-state">
            <h2>Accès réservé.</h2>
            <p>
              Connectez-vous avec le compte administrateur autorisé de cette
              boutique.
            </p>
            <a
              target="_top"
              href={chatGPTSignInPath('/atelier/')}
              className="button button-dark"
            >
              Se connecter avec ChatGPT ↗
            </a>
          </div>
        )}
      </main>
    );
  if (path === 'desinscription')
    return (
      <main id="contenu" className="page-wrap">
        <Unsubscribe token={(await searchParams).token || ''} />
      </main>
    );
  const products = await readCatalog();
  if (slug[0] === 'produits' && slug.length === 2) {
    const p = products.find((p) => p.slug === slug[1]);
    if (!p) notFound();
    const cat =
      categoryFor(p.category) || categoryFor('boutique-arts-martiaux')!;
    const related = [
      ...products.filter((x) => x.id !== p.id && x.category === p.category),
      ...products.filter(
        (x) =>
          x.id !== p.id &&
          x.category !== p.category &&
          x.audience === p.audience,
      ),
    ].slice(0, 4);
    return (
      <main id="contenu" className="page-wrap">
        <Breadcrumb
          items={[
            { label: cat.name, href: '/' + cat.slug + '/' },
            { label: p.name },
          ]}
        />
        <ProductDetails product={p} />
        <section className="spec-section">
          <div>
            <span className="eyebrow">LE MODÈLE DANS LE DÉTAIL</span>
            <h2>Comprendre la pièce.</h2>
            <p>{p.description}</p>
            {p.use && (
              <>
                <h2>Dans votre séance.</h2>
                <p>{p.use}</p>
              </>
            )}
            <h2>Après la séance.</h2>
            <p>
              {p.care ||
                'Suivez les indications d’entretien du fabricant. Vérifiez l’état et l’ajustement du modèle avant chaque utilisation.'}
            </p>
            <ArrowLink
              href={
                cat.guide === 'guide-des-tailles'
                  ? '/guide-des-tailles/'
                  : '/guides/' + cat.guide + '/'
              }
            >
              Les repères pour choisir
            </ArrowLink>
          </div>
          <div>
            <span className="eyebrow">LES CARACTÉRISTIQUES</span>
            <table className="spec-table">
              <caption className="sr-only">
                Caractéristiques de {p.name}
              </caption>
              <tbody>
                {Object.entries(p.specs).map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">
                      {key
                        .replace('source', '')
                        .replace('Déclinaisons', 'Déclinaisons présentées')}
                    </th>
                    <td>{value}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">Disponibilité</th>
                  <td>Bientôt disponible</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section className="related-section">
          <h2>À regarder aussi.</h2>
          <div className="product-grid">
            {related.map((x, i) => (
              <ProductCard key={x.id} product={x} index={i} />
            ))}
          </div>
        </section>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: p.name,
              description: p.short,
              image: p.images.map((i) => shop.origin + i.src),
              sku: p.sourceRef,
              ...(p.brand !== 'Sélection Boutique de Boxe'
                ? { brand: { '@type': 'Brand', name: p.brand } }
                : {}),
              url: shop.origin + '/produits/' + p.slug + '/',
            }),
          }}
        />
      </main>
    );
  }
  const cat = categoryFor(path);
  if (cat || path === 'nouveautes' || path === 'recherche') {
    const data = cat
      ? getCategoryProducts(cat, products)
      : path === 'nouveautes'
        ? [...products].reverse()
        : products;
    return (
      <main id="contenu" className="page-wrap">
        <Breadcrumb
          items={[
            {
              label:
                cat?.name ||
                (path === 'recherche' ? 'Recherche' : 'Nouveautés'),
            },
          ]}
        />
        <section className="page-heading">
          <div>
            <span className="eyebrow">
              LE CATALOGUE / {cat?.number || 'INDEX'}
            </span>
            <h1>
              {cat?.name ||
                (path === 'recherche'
                  ? 'Trouvez votre équipement.'
                  : 'Les nouveautés.')}
            </h1>
          </div>
          <div>
            <div className="label">
              {cat?.label || 'Les références dans le détail.'}
            </div>
            <p>
              {cat?.intro ||
                'Explorez les modèles présentés dans notre catalogue. Les prix sont indicatifs et toutes les références sont en préparation avant ouverture des ventes.'}
            </p>
          </div>
        </section>
        <Catalog items={data} showFamilies={!cat || cat.families.length > 1} />
        {cat && (
          <section className="spec-section">
            <div>
              <h2>Comment choisir ?</h2>
              <p>{cat.intro}</p>
              <ArrowLink
                href={
                  cat.guide === 'guide-des-tailles'
                    ? '/guide-des-tailles/'
                    : '/guides/' + cat.guide + '/'
                }
              >
                Consulter le guide d’achat
              </ArrowLink>
            </div>
            <div>
              <h2>Compléter votre équipement.</h2>
              <div className="category-crosslinks">
                {categories
                  .slice(0, 6)
                  .filter((c) => c.slug !== cat.slug)
                  .map((c) => (
                    <Link key={c.slug} href={'/' + c.slug + '/'}>
                      {c.name} ↗
                    </Link>
                  ))}
              </div>
            </div>
          </section>
        )}
      </main>
    );
  }
  notFound();
}
