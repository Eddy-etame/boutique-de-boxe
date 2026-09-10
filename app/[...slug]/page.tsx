import { catalogPage } from '@/lib/pagination';
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
import { getEdition } from '@/lib/edition';
import { NextCategory } from '@/components/next/category';
import { NextProduct } from '@/components/next/product';
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
import { PayplugReturn } from '@/components/payplug-settings';
import { CartPage, ReceiptPage } from '@/components/commerce-ui';
import selection from '@/lib/data/selection.json';
import ogImages from '@/lib/data/og.json';
export const dynamic = 'force-dynamic';
type Props = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
};
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
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
    'paiement-retour': [
      'Retour du paiement de test',
      'Vérification privée du statut PayPlug.',
    ],
    panier: [
      'Votre panier d’essai',
      'Préparez votre équipement et testez le parcours de commande sans débit.',
    ],
    recu: [
      'Votre reçu de simulation',
      'Reçu privé de votre commande d’essai. Aucun paiement réel.',
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
  const paginated = Boolean(cat || path === 'nouveautes');
  const page = paginated
    ? catalogPage(
        (await searchParams).page,
        cat ? getCategoryProducts(cat, products).length : products.length,
      )
    : 1;
  if (page === null) notFound();
  const canonical =
    '/' + path + '/' + (paginated && page > 1 ? '?page=' + page : '');
  const pageTitle = title + (paginated && page > 1 ? ' — Page ' + page : '');
  const og = (
    ogImages as Record<
      string,
      { url: string; width: number; height: number; alt: string }
    >
  )['/' + path + '/'];
  const description =
    (product
      ? product.seoDescription ||
        (product.name + '. ' + product.short).slice(0, 295)
      : undefined) ||
    cat?.description ||
    guide?.description ||
    service?.description ||
    special[path]?.[1] ||
    'Cette page n’existe pas.';
  return {
    title: pageTitle,
    description,
    alternates: { canonical },
    openGraph: {
      title: pageTitle,
      description,
      url: canonical,
      siteName: shop.name,
      locale: 'fr_FR',
      type: guide ? 'article' : 'website',
      ...(og
        ? { images: [og] }
        : product
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
    ...([
      'paiement-retour',
      'panier',
      'recu',
      'atelier',
      'recherche',
      'desinscription',
      'confirmation',
    ].includes(path)
      ? { robots: { index: false, follow: path === 'recherche' } }
      : {}),
  };
}
export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const path = slug.join('/');
  if (path === 'paiement-retour')
    return (
      <main id="contenu" className="page-wrap">
        <PayplugReturn id={(await searchParams).id || ''} />
      </main>
    );
  if (path === 'panier')
    return (
      <main id="contenu" className="page-wrap">
        <CartPage />
      </main>
    );
  if (path === 'recu')
    return (
      <main id="contenu" className="page-wrap">
        <ReceiptPage id={(await searchParams).id || ''} />
      </main>
    );
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
            <a className="contact-email" href={'mailto:' + shop.email}>
              {shop.email} ↗
            </a>
            <p>
              Catalogue national en préparation.
              <br />
              Le panier et le paiement sont accessibles en simulation.
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
            <form method="post" action="/api/auth/magic-link" className="atelier-signin">
              <label htmlFor="owner-email">Adresse e-mail du propriétaire</label>
              <input id="owner-email" name="email" type="email" required autoComplete="email" />
              <button type="submit" className="button button-dark">Recevoir le lien de connexion</button>
            </form>
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
    const related = products
      .filter(
        (x) =>
          x.id !== p.id &&
          x.category === p.category &&
          x.audience === p.audience,
      )
      .slice(0, 4);
    if ((await getEdition()) === 'nouvelle')
      return <NextProduct product={p} related={related} />;
    const contextKey = (await searchParams).seance;
    const session = selection.sessions.find((s) => s.key === contextKey);
    const reason = session?.products.find((r) => r.id === p.id);
    return (
      <main id="contenu" className="page-wrap">
        <Breadcrumb
          items={[
            { label: cat.name, href: '/' + cat.slug + '/' },
            { label: p.name },
          ]}
        />
        {reason && (
          <aside className="product-context">
            <span className="eyebrow">DANS VOTRE SAC DE SÉANCE</span>
            <strong>{session!.name}</strong>
            <p>{reason.reason}</p>
            <a href="/#preparer">Revoir ma préparation ↗</a>
          </aside>
        )}
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
            {p.care ? (
              <>
                <h2>Après la séance.</h2>
                <p>{p.care}</p>
              </>
            ) : (
              <p className="care-note">
                Entretien : consultez la notice de cette référence.
              </p>
            )}
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
        {related.length > 0 && (
          <section className="related-section">
            <h2>Comparer dans la même famille.</h2>
            <div className="product-grid">
              {related.map((x, i) => (
                <ProductCard key={x.id} product={x} index={i} />
              ))}
            </div>
          </section>
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: p.name,
              description: p.short,
              image: p.images.map((i) => new URL(i.src, shop.origin).href),
              sku: p.sourceRef,
              ...(!['Sélection Boutique de Boxe', 'Marque à préciser'].includes(
                p.brand,
              )
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
  if (cat && (await getEdition()) === 'nouvelle')
    return (
      <NextCategory category={cat} products={getCategoryProducts(cat, products)} />
    );
  if (cat || path === 'nouveautes' || path === 'recherche') {
    const data = cat
      ? getCategoryProducts(cat, products)
      : path === 'nouveautes'
        ? [...products].reverse()
        : products;
    const currentPage = catalogPage((await searchParams).page, data.length);
    if (currentPage === null) notFound();
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
        <Catalog
          items={data.map((p) => ({
            ...p,
            description: p.description.slice(0, 180),
            use: undefined,
            care: undefined,
            specs: {},
            notes: [],
            images: p.images.slice(0, 1),
          }))}
          initialPage={currentPage}
          showFamilies={!cat || cat.families.length > 1}
        />
        {cat && (
          <section className="spec-section">
            <div>
              <h2>
                {selection.categories.find((c) => c.slug === cat.slug)
                  ?.choiceHeading || 'Les critères à examiner.'}
              </h2>
              <div className="choice-criteria">
                {selection.categories
                  .find((c) => c.slug === cat.slug)
                  ?.choiceCriteria.map((c) => (
                    <div key={c.label}>
                      <h3>{c.label}</h3>
                      <p>{c.explanation}</p>
                    </div>
                  ))}
              </div>
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
                    <a key={c.slug} href={'/' + c.slug + '/'}>
                      {c.name} ↗
                    </a>
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
