import { catalogPage, PAGE_SIZE } from '@/lib/pagination';
import { productGraph, collectionGraph, subfamilyGraph, serviceGraph, subfamilyKeywords, productKeywords, categoryKeywords, guideKeywords, pageKeywords } from '@/lib/seo';
import { SEO_COPY } from '@/lib/seo-copy';
import { subfamilyFor, subfamiliesOf, subfamilyProducts } from '@/lib/subfamilies';
import { longDescription, practiceLevel, disciplinesOf, careAdvice, productFaq } from '@/lib/describe';
import { matchesSearch } from '@/lib/catalog-tools';
import { SeoBody } from '@/components/seo-body';
import { KeywordHub } from '@/components/keyword-hub';
import { FacetPage, facetMetadata } from '@/components/facet-page';
import { facetFor } from '@/lib/facets';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  categoryFor,
  getCategoryProducts,
  categories,
  shop,
  money,
  listItem,
} from '@/lib/catalog';
import { readCatalog } from '@/lib/database';
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
import { PayplugReturn } from '@/components/payplug-settings';
import { CartPage, ReceiptPage } from '@/components/commerce-ui';
import selection from '@/lib/data/selection.json';
import { ogImage } from '@/lib/og';
export const revalidate = 60;
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
  const sub = subfamilyFor(path);
  const facet = slug.length === 1 ? facetFor(path, products) : null;
  const paginationCount = facet
    ? facet.products.length
    : sub
      ? subfamilyProducts(sub, products).length
      : cat
        ? getCategoryProducts(cat, products).length
        : path === 'nouveautes'
          ? products.length
          : null;
  const paginated = paginationCount !== null;
  const page = paginated
    ? catalogPage((await searchParams).page, paginationCount)
    : 1;
  if (page === null) notFound();
  if (facet) return facetMetadata(facet, page);
  const guide =
    slug[0] === 'guides' ? guides.find((g) => g.slug === slug[1]) : undefined;
  const service = services[path];
  const special: Record<string, [string, string]> = {
    guides: [
      'Guides d’achat boxe, MMA et sports de combat',
      'Douze guides pour choisir gants, protections et équipement de boxe ou MMA selon votre pratique. Les tailles, les onces et les critères utiles.',
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
      'Écrivez à Boutique de Boxe pour une question sur un modèle, une taille ou une fiche produit. Réponse par e-mail.',
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
      'Votre panier',
      'Essayez la commande jusqu’au reçu, sans payer.',
    ],
    recu: [
      'Votre reçu de simulation',
      'Reçu privé de votre commande d’essai. Aucun paiement réel.',
    ],
    admin: ['Administration', 'Gestion privée du catalogue et des demandes.'],
    desinscription: [
      'Désinscription des alertes',
      'Gérer votre inscription à une alerte Boutique de Boxe.',
    ],
  };
  const title =
    product?.name ||
    (cat && (SEO_COPY[cat.slug]?.title || cat.name)) ||
    sub?.title ||
    guide?.title ||
    service?.title ||
    special[path]?.[0] ||
    'Page introuvable';
  const canonical =
    '/' + path + '/' + (paginated && page > 1 ? '?page=' + page : '');
  const pageTitle = title + (paginated && page > 1 ? ' — Page ' + page : '');
  const og = product
    ? ogImage('p', product.slug, product.name)
    : cat
      ? ogImage('c', cat.slug, cat.name)
      : sub
        ? ogImage('s', sub.slug, sub.name)
        : guide
          ? ogImage('g', guide.slug, guide.title)
          : service || special[path]
            ? ogImage('x', path, title)
            : undefined;
  const trimmed = (s: string, max: number) =>
    s.length <= max ? s : s.slice(0, max - 1).replace(/[\s,;:·—-]+\S*$/, '').trim() + '…';
  const describe = (p: NonNullable<typeof product>) => {
    const family = categoryFor(p.category)?.name.toLowerCase();
    const brand = p.brand && !/pr[ée]ciser/i.test(p.brand) && !p.name.toLowerCase().includes(p.brand.toLowerCase()) ? ' ' + p.brand : '';
    const parts = [p.name + brand + (family ? ', ' + family : '') + '.'];
    const sizes = p.sizes.filter((s) => s.length <= 14 && s.toLowerCase() !== p.name.toLowerCase());
    if (sizes.length > 1) parts.push('Tailles : ' + sizes.slice(0, 4).join(', ') + (sizes.length > 4 ? '…' : '') + '.');
    parts.push('Prix prévu à l’ouverture : ' + money(p.price) + '.');
    parts.push('Livraison dans toute la France.');
    return parts.join(' ');
  };
  const rawDescription =
    (product
      ? product.seoDescription && product.seoDescription.length >= 80
        ? product.seoDescription
        : describe(product)
      : undefined) ||
    (cat && (SEO_COPY[cat.slug]?.description || cat.description)) ||
    sub?.description ||
    guide?.description ||
    service?.description ||
    special[path]?.[1] ||
    'Cette page n’existe pas.';
  const description = trimmed(
    paginated && page > 1
      ? `Page ${page} sur ${Math.ceil(paginationCount / PAGE_SIZE)}. ${rawDescription}`
      : rawDescription,
    158,
  );
  const seoTitle = pageTitle.length > 41 ? { absolute: pageTitle } : pageTitle;
  return {
    title: seoTitle,
    description,
    // le premier mot-clé est toujours une phrase visible de la page (son titre) ; l’audit le vérifie
    keywords: product ? productKeywords(product) : cat ? categoryKeywords(cat) : sub ? subfamilyKeywords(sub) : guide ? guideKeywords(guide) : [(service?.title || special[path]?.[0] || '').toLowerCase(), ...(pageKeywords(path) || [])].filter(Boolean),
    alternates: { canonical, languages: { 'fr-FR': canonical, 'x-default': canonical } },
    openGraph: {
      title: pageTitle,
      description,
      url: canonical,
      siteName: shop.name,
      locale: 'fr_FR',
      type: guide ? 'article' : 'website',
      ...(og ? { images: og } : {}),
    },
    ...([
      'paiement-retour',
      'panier',
      'recu',
      'admin',
      'merci',
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
          <span className="eyebrow">CONTACT</span>
          <h1>Demande enregistrée.</h1>
          <p>
            Votre demande est enregistrée. Boutique de Boxe vous répond par
            e-mail.
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
    return (
      <>
        <ServicePage service={services[path]} slug={path} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serviceGraph(path, services[path]) }} />
      </>
    );
  if (path === 'contact')
    return (
      <main id="contenu" className="page-wrap">
        <Breadcrumb items={[{ label: 'Contact' }]} />
        <section className="page-heading">
          <div>
            <span className="eyebrow">CONTACT</span>
            <h1>
              Une question
              <br />
              sur un modèle ?
            </h1>
          </div>
          <p>
            Une taille, un poids, un délai : écrivez-nous, nous répondons par
            e-mail.
          </p>
        </section>
        <div className="contact-layout">
          <aside>
            <span className="eyebrow">NOUS ÉCRIRE</span>
            <a className="contact-email" href={'mailto:' + shop.email}>
              {shop.email} ↗
            </a>
            <p>
              Les ventes ouvrent bientôt.
              <br />
              Vous pouvez déjà essayer la commande, sans payer.
            </p>
            <div className="contact-mark" aria-hidden="true">
              BOUTIQUE
              <br />
              DE
              <br />
              <em>BOXE.</em>
            </div>
          </aside>
          <ContactForm />
        </div>
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
    const score = (x: (typeof products)[number]) =>
      (x.brand === p.brand ? 2 : 0) +
      ((x.disciplines || []).some((d) => (p.disciplines || []).includes(d)) ? 1 : 0);
    const related = products
      .filter(
        (x) =>
          x.id !== p.id &&
          x.category === p.category &&
          x.audience === p.audience,
      )
      .sort((a, b) => score(b) - score(a))
      .slice(0, 4);
    const contextKey = (await searchParams).seance;
    const session = selection.sessions.find((s) => s.key === contextKey);
    const reason = session?.products.find((r) => r.id === p.id);
    // Trois niveaux quand la sous-famille existe : famille → sous-famille → modèle.
    const sub = subfamiliesOf(p.category).find((x) => x.match(p));
    return (
      <main id="contenu" className="page-wrap">
        <Breadcrumb
          items={[
            { label: cat.name, href: '/' + cat.slug + '/' },
            ...(sub ? [{ label: sub.name, href: '/' + sub.slug + '/' }] : []),
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
            <span className="eyebrow">LE MODÈLE</span>
            <div className="product-facts">
              <div><span>Discipline</span>{disciplinesOf(p).join(', ')}</div>
              <div><span>Niveau conseillé</span>{practiceLevel(p)}</div>
              <div><span>Famille</span><a href={'/' + p.category + '/'}>{cat.name}</a></div>
              {p.reference && <div><span>{p.referenceLabel || 'Référence'}</span>{p.reference}</div>}
            </div>
            <h2>En détail.</h2>
            <p>{longDescription(p)}</p>
            {p.use && p.use.length > 40 && (
              <>
                <h2>À l’usage.</h2>
                <p>{p.use}</p>
              </>
            )}
            <h2>Entretien.</h2>
            <p>{careAdvice(p)}</p>
            {sub && <ArrowLink href={'/' + sub.slug + '/'}>Tous les modèles : {sub.name}</ArrowLink>}
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
                {p.colors && p.colors.length > 0 && (
                  <tr>
                    <th scope="row">Couleurs</th>
                    <td>{p.colors.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}</td>
                  </tr>
                )}
                <tr>
                  <th scope="row">Disponibilité</th>
                  <td>En vente bientôt</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <SeoBody sections={[]} faq={productFaq(p)} heading="Questions sur ce modèle" />
        {related.length > 0 && (
          <section className="related-section">
            <h2>Modèles proches.</h2>
            <div className="product-grid">
              {related.map((x, i) => (
                <ProductCard key={x.id} product={listItem(x)} index={i} />
              ))}
            </div>
          </section>
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productGraph(p, related, { description: longDescription(p), faq: productFaq(p) }) }} />
      </main>
    );
  }
  const facet = slug.length === 1 ? facetFor(path, products) : null;
  if (facet) {
    const currentPage = catalogPage((await searchParams).page, facet.products.length);
    if (currentPage === null) notFound();
    return <FacetPage facet={facet} all={products} page={currentPage} />;
  }
  const sub = subfamilyFor(path);
  if (sub) {
    const data = subfamilyProducts(sub, products);
    const currentPage = catalogPage((await searchParams).page, data.length);
    if (currentPage === null) notFound();
    const pageItems = data.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE,
    );
    const parent = categoryFor(sub.parent);
    const siblings = subfamiliesOf(sub.parent).filter((x) => x.slug !== sub.slug);
    return (
      <main id="contenu" className="page-wrap">
        <Breadcrumb items={[...(parent ? [{ label: parent.name, href: '/' + parent.slug + '/' }] : []), { label: sub.name }]} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: subfamilyGraph(sub, data, currentPage) }} />
        <section className="page-heading">
          <div>
            <span className="eyebrow">{sub.eyebrow}</span>
            <h1>{sub.name}</h1>
          </div>
          <div>
            <div className="label">{data.length} modèles, avec leurs tailles et leurs prix prévus.</div>
            <p>{sub.intro}</p>
          </div>
        </section>
        <nav className="subfamily-links" aria-label="Pages voisines">
          {parent && <a href={'/' + parent.slug + '/'}>Toute la famille : {parent.name}</a>}
          {siblings.map((x) => (
            <a key={x.slug} href={'/' + x.slug + '/'}>{x.name}</a>
          ))}
        </nav>
        <Catalog
          items={pageItems.map(listItem)}
          total={data.length}
          scope={sub.slug}
          initialPage={currentPage}
          showFamilies={false}
        />
        {currentPage === 1 && <KeywordHub scope={sub.slug} name={sub.name} items={data} all={products} />}
        {currentPage === 1 && <SeoBody sections={sub.sections} faq={sub.faq} />}
        {currentPage === 1 && (
          <section className="spec-section">
            <div>
              <h2>Pour choisir sans se tromper.</h2>
              <ArrowLink href={sub.guide === 'guide-des-tailles' ? '/guide-des-tailles/' : '/guides/' + sub.guide + '/'}>Lire le guide d’achat</ArrowLink>
            </div>
          </section>
        )}
      </main>
    );
  }
  const cat = categoryFor(path);
  if (cat || path === 'nouveautes' || path === 'recherche') {
    // La page de résultats arrive déjà filtrée par la saisie de l'entête (?q=), sans attendre le script.
    const query = path === 'recherche' ? ((await searchParams).q || '').slice(0, 80).trim() : '';
    const data = cat
      ? getCategoryProducts(cat, products)
      : path === 'nouveautes'
        ? [...products].reverse()
        : query
          ? products.filter((p) => matchesSearch(p, query))
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
        {path !== 'recherche' && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: collectionGraph({
                path: '/' + path + '/',
                name: cat?.name || 'Nouveautés',
                description: cat?.description || 'Les derniers modèles ajoutés au catalogue Boutique de Boxe.',
                items: data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
                total: data.length,
                page: currentPage,
                perPage: PAGE_SIZE,
                category: cat,
                faq: cat ? SEO_COPY[cat.slug]?.faq : undefined,
              }),
            }}
          />
        )}
        <section className="page-heading">
          <div>
            <span className="eyebrow">
              {(cat && SEO_COPY[cat.slug]?.eyebrow) || 'LE CATALOGUE / ' + (cat?.number || 'INDEX')}
            </span>
            <h1>
              {cat?.name ||
                (path === 'recherche'
                  ? query
                    ? `« ${query} »`
                    : 'Rechercher'
                  : 'Les nouveautés')}
            </h1>
          </div>
          <div>
            <div className="label">
              {cat?.label || 'Tous les modèles.'}
            </div>
            <p>
              {cat?.intro ||
                (query
                  ? `${data.length} ${data.length === 1 ? 'modèle répond' : 'modèles répondent'} à « ${query} ». Affinez avec les filtres, ou changez de mot.`
                  : 'Tous les modèles du catalogue, avec leurs tailles et leurs prix prévus à l’ouverture des ventes.')}
            </p>
          </div>
        </section>
        {cat && (() => {
          const subs = [...subfamiliesOf(cat.slug), ...cat.families.flatMap((f) => subfamiliesOf(f))].filter((x, i, a) => a.indexOf(x) === i);
          return subs.length ? (
            <nav className="subfamily-links" aria-label="Sous-familles">
              {subs.map((x) => (
                <a key={x.slug} href={'/' + x.slug + '/'}>{x.name}</a>
              ))}
            </nav>
          ) : null;
        })()}
        <Catalog
          items={data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(listItem)}
          total={data.length}
          scope={path}
          initialQuery={query}
          initialPage={currentPage}
          showFamilies={!cat || cat.families.length > 1}
        />
        {cat && currentPage === 1 && <KeywordHub scope={cat.slug} name={cat.name} items={data} all={products} />}
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
        {cat && SEO_COPY[cat.slug] && <SeoBody sections={SEO_COPY[cat.slug].sections} faq={SEO_COPY[cat.slug].faq} />}
      </main>
    );
  }
  notFound();
}
