import { catalogPage, PAGE_SIZE } from '@/lib/pagination';
import { productGraph, collectionGraph, subfamilyGraph, serviceGraph } from '@/lib/seo';
import { slugMetadata, splitPage } from './metadata';
import { SeanceContext } from '@/components/seance-context';
import { SEO_COPY } from '@/lib/seo-copy';
import { subfamilyFor, subfamiliesOf, subfamilyProducts } from '@/lib/subfamilies';
import { longDescription, practiceLevel, disciplinesOf, careAdvice, productFaq, placeDansLaFamille } from '@/lib/describe';
import { SUBFAMILIES } from '@/lib/subfamilies';
import { SeoBody } from '@/components/seo-body';
import { KeywordHub } from '@/components/keyword-hub';
import { FacetPage, BrandPagesOfSubfamily } from '@/components/facet-page';
import { facetFor, brandFamilyFacet, allFacets } from '@/lib/facets';
import { brandFor, brandSlug } from '@/lib/brands';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  categoryFor,
  getCategoryProducts,
  categories,
  shop,
  listItem,
  estLourd,
} from '@/lib/catalog';
import { readCatalog } from '@/lib/database';
import { moyenneDuModele } from '@/lib/notes-stockage';
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
import { ContactForm } from '@/components/contact-form';
import { payplugSettings } from '@/lib/payplug';
// Le panier, chargé à part : son code ne part plus avec les fiches, catégories, villes et guides.
import { CartPage } from './panier-client';
import selection from '@/lib/data/selection.json';
import { spaced } from '@/lib/spaced';
import { villeFor, regionFor, CARREFOUR, VILLES, REGIONS, villePath } from '@/lib/villes';
import { VillePage, RegionPage, CarrefourPage } from '@/components/ville-page';
import { MaterielParDiscipline, materielFaq } from '@/components/materiel-par-discipline';
import { entrelace } from '@/lib/rayons';
import { VentePage, VENTE } from '@/components/vente-page';
import { PlanDuSite, PLAN } from '@/components/plan-du-site';
import { DisciplinesPage, DISCIPLINES_PAGES } from '@/components/disciplines-page';
import { MaterielParNiveau, KitNiveau, KitDiscipline, budgetFaq } from '@/components/materiel-de-boxe';
import { guideRayon, faits } from '@/lib/guides-rayons';
import { GuideRayon } from '@/components/guide-rayon';
/**
 * Fiches, rayons, sous-familles, pages-villes, guides : un HTML statique régénéré toutes les minutes
 * (ISR), servi par le CDN. Rien ici ne lit la requête : `?seance=` se lit dans le navigateur, les
 * filtres, le tri et la recherche aussi. Les pages qui dépendent de la requête (retour de paiement,
 * reçu, désinscription, recherche) ont leur propre route, rendue à chaque visite.
 */
export const revalidate = 60;
type Props = {
  params: Promise<{ slug: string[] }>;
};
/** Les pages les plus lourdes à rendre sont prêtes dès le déploiement ; les fiches se rendent à la première visite. */
export async function generateStaticParams() {
  const products = await readCatalog();
  const paths = [
    ...categories.map((c) => c.slug),
    ...SUBFAMILIES.map((s) => s.slug),
    ...allFacets(products).map((f) => f.path.replace(/^\/|\/$/g, '')),
    ...[...VILLES, ...REGIONS].map((v) => villePath(v.slug).replace(/^\/|\/$/g, '')),
    CARREFOUR,
    VENTE,
    PLAN,
    ...Object.keys(DISCIPLINES_PAGES),
    'nouveautes',
    'guides',
    ...guides.map((g) => 'guides/' + g.slug),
    ...Object.keys(services),
    'contact',
    'panier',
  ];
  return [...new Set(paths)].filter((p) => p && (!p.includes('/') || p.startsWith('guides/'))).map((p) => ({ slug: p.split('/') }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return slugMetadata((await params).slug);
}
/** PayPlug peut-il encaisser ? Live avec sa clé, ou test hors production (13/10/2026). Jamais une clé lue ailleurs. */
function paiementPret() {
  const s = payplugSettings(process.env as unknown as Parameters<typeof payplugSettings>[0]);
  return s.liveEnabled || (s.hostedTestEnabled && process.env.NODE_ENV !== 'production');
}
export default async function Page({ params }: Props) {
  const { slug, path, page: pageParam } = splitPage((await params).slug);
  // Le segment interne de page ne vaut que pour une liste ; ailleurs, l’adresse n’existe pas.
  const listPage = (count: number) => catalogPage(pageParam, count);
  if (pageParam !== undefined && !(categoryFor(path) || subfamilyFor(path) || path === 'nouveautes' || facetFor(path, await readCatalog()))) notFound();
  if (path === 'panier')
    return (
      <main id="contenu" className="page-wrap">
        <CartPage paiementPret={paiementPret()} />
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
            <a className="contact-email" href="#formulaire">
              {shop.email}
            </a>
            <p>
              {shop.ventesOuvertes ? 'Une question sur une commande : rappelez son numéro (BDB-…).' : `Les ventes ouvrent le ${shop.ouverture.long}.`}
              <br />
              {shop.ventesOuvertes ? 'La réponse arrive par e-mail, en général sous un jour ouvré.' : 'Vous pouvez déjà enregistrer vos choix depuis le panier.'}
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
  const products = await readCatalog();
  if (slug.length === 1 && pageParam === undefined) {
    const ville = villeFor(path);
    if (ville) return <VillePage ville={ville} all={products} />;
    const region = regionFor(path);
    if (region) return <RegionPage region={region} all={products} />;
    if (path === CARREFOUR) return <CarrefourPage all={products} />;
    if (path === VENTE) return <VentePage all={products} />;
    if (path === PLAN) return <PlanDuSite all={products} />;
    if (DISCIPLINES_PAGES[path]) return <DisciplinesPage config={DISCIPLINES_PAGES[path]} />;
  }
  if (slug[0] === 'produits' && slug.length === 2) {
    const p = products.find((p) => p.slug === slug[1]);
    if (!p) notFound();
    const cat =
      categoryFor(p.category) || categoryFor('boutique-arts-martiaux')!;
    const score = (x: (typeof products)[number]) =>
      (x.brand === p.brand ? 2 : 0) +
      ((x.disciplines || []).some((d) => (p.disciplines || []).includes(d)) ? 1 : 0);
    const family = products.filter((x) => x.category === p.category);
    // Quatre modèles proches par affinité (marque, discipline), et quatre voisins de rang dans la
    // famille (les deux avant, les deux après, par nom) : chaque fiche reçoit ainsi des liens de
    // ses voisines, jamais seulement des mêmes modèles très liés.
    const byName = [...family].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    const at = byName.findIndex((x) => x.id === p.id);
    const neighbours = byName.length > 1 ? [-2, -1, 1, 2].map((d) => byName[(at + d + byName.length) % byName.length]).filter((x, i, arr) => x.id !== p.id && arr.findIndex((y) => y.id === x.id) === i) : [];
    const related = [
      ...family
        .filter((x) => x.id !== p.id && x.audience === p.audience && !neighbours.some((n) => n.id === x.id))
        .sort((a, b) => score(b) - score(a))
        .slice(0, 4),
      ...neighbours,
    ];
    const brand = !p.brand || /pr[ée]ciser|^Sélection /i.test(p.brand) ? null : brandFor(brandSlug(p.brand), products);
    const brandFamily = brand ? brandFamilyFacet(brand, p.category) : null;
    // « Dans votre sac de séance » : la séance vient de `?seance=`, lue dans le navigateur.
    const seances = selection.sessions.flatMap((s) => {
      const r = s.products.find((x) => x.id === p.id);
      return r ? [{ key: s.key, name: s.name, reason: r.reason }] : [];
    });
    // Trois niveaux quand la sous-famille existe : famille → sous-famille → modèle.
    const sub = subfamiliesOf(p.category).find((x) => x.match(p));
    // Les notes des visiteurs (20/10/2026) : la moyenne visible, lue au rendu (ISR), jamais inventée.
    const note = await moyenneDuModele(p.id);
    return (
      <main id="contenu" className="page-wrap">
        <Breadcrumb
          items={[
            { label: cat.name, href: '/' + cat.slug + '/' },
            ...(sub ? [{ label: sub.name, href: '/' + sub.slug + '/' }] : []),
            { label: p.name },
          ]}
        />
        {seances.length > 0 && <SeanceContext seances={seances} />}
        <ProductDetails product={p} note={note} />
        <section className="spec-section">
          <div>
            <span className="eyebrow">LE MODÈLE</span>
            <div className="product-facts">
              <div><span>Discipline</span>{' '}{disciplinesOf(p).join(', ')}</div>
              <div><span>Niveau conseillé</span>{' '}{practiceLevel(p)}</div>
              <div><span>Famille</span>{' '}<a href={'/' + p.category + '/'}>{cat.name}</a></div>
              {brand && (
                <div>
                  <span>Marque</span>{' '}
                  <a href={brandFamily ? brandFamily.path : '/marques/' + brand.slug + '/'}>{brandFamily ? brandFamily.name : 'Tout ' + brand.name}</a>
                </div>
              )}
              {p.reference && <div><span>{p.referenceLabel || 'Référence'}</span>{' '}{p.reference}</div>}
            </div>
            <h2>En détail.</h2>
            <p>{longDescription(p)}</p>
            {(() => {
              // 03/10 : le texte que seule cette fiche peut porter, et les pages par boxe et par niveau qui la listent.
              const place = placeDansLaFamille(p, products);
              const entrees = SUBFAMILIES.filter((s) => s.kind && s.match(p));
              return place.length || entrees.length ? (
                <>
                  <h2>Face aux autres modèles.</h2>
                  {place.length > 0 && <p>{place.join(' ')}</p>}
                  {entrees.length > 0 && (
                    <p>
                      {'Ce modèle figure aussi sur '}
                      {entrees.map((s, i) => (
                        <span key={s.slug}>
                          {i > 0 ? (i === entrees.length - 1 ? ' et ' : ', ') : ''}
                          <a href={'/' + s.slug + '/'}>{'la page « ' + s.name + ' »'}</a>
                        </span>
                      ))}
                      .
                    </p>
                  )}
                </>
              ) : null;
            })()}
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
                Caractéristiques techniques du modèle
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
                  <td>
                    {shop.ventesOuvertes
                      ? estLourd(p)
                        ? 'En vente, livraison sur devis'
                        : `En vente, expédition sous ${shop.delais.expedition}`
                      : 'En vente le ' + shop.ouverture.long}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <SeoBody sections={[]} faq={productFaq(p, products)} heading="Questions sur ce modèle" />
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productGraph(p, related, { description: longDescription(p), faq: productFaq(p, products), note }) }} />
      </main>
    );
  }
  const facet = slug.length === 1 ? facetFor(path, products) : null;
  if (facet) {
    const currentPage = listPage(facet.products.length);
    if (currentPage === null) notFound();
    return <FacetPage facet={facet} all={products} page={currentPage} />;
  }
  const sub = subfamilyFor(path);
  if (sub) {
    const data = subfamilyProducts(sub, products);
    const currentPage = listPage(data.length);
    if (currentPage === null) notFound();
    const pageItems = data.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE,
    );
    const parent = categoryFor(sub.parent);
    const siblings = subfamiliesOf(sub.parent).filter((x) => x.slug !== sub.slug);
    // Page de tête (20/10) : H1, titre et texte du guide du rayon ; le guide passe sous la grille.
    const tete = guideRayon(sub.slug);
    const ctx = tete ? { f: faits(sub.slug, data), items: data, all: products } : null;
    const faqTete = tete && ctx ? tete.faq(ctx) : null;
    return (
      <main id="contenu" className={'page-wrap' + (tete ? ' rayon-tete' : '')}>
        <Breadcrumb items={[...(parent ? [{ label: parent.name, href: '/' + parent.slug + '/' }] : []), { label: sub.name }]} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: subfamilyGraph(sub, data, currentPage, tete && ctx ? { faq: faqTete!, description: tete.description(ctx), name: tete.h1, requete: tete.requete, revision: tete.revision } : undefined) }} />
        <section className="page-heading" {...(tete ? { 'data-rayon-texte': '' } : {})}>
          <div>
            <span className="eyebrow">{tete ? tete.eyebrow : sub.eyebrow}</span>
            <h1>{tete ? tete.h1 : sub.name}</h1>
          </div>
          <div>
            <div className="label">{tete && ctx ? tete.label(ctx) : `${data.length} modèles, avec leurs tailles et leurs prix TTC.`}</div>
            <p>{tete ? tete.intro : sub.intro}</p>
            {tete && currentPage === 1 && (
              <a className="rayon-ancre" href="#guide-rayon">
                Le guide d’achat, sous la liste
              </a>
            )}
          </div>
        </section>
        <nav className="subfamily-links" aria-label="Pages voisines">
          {parent && <><a href={'/' + parent.slug + '/'}>Toute la famille : {parent.name}</a>{' '}</>}
          {spaced(siblings.map((x) => (
            <a key={x.slug} href={'/' + x.slug + '/'}>{x.name}</a>
          )))}
        </nav>
        {currentPage === 1 && <BrandPagesOfSubfamily sub={sub} all={products} />}
        {currentPage === 1 && sub.discipline && <KitDiscipline discipline={sub.discipline} nom={sub.name} all={products} />}
        {currentPage === 1 && sub.niveau && <KitNiveau niveau={sub.niveau} all={products} />}
        <Catalog
          items={pageItems.map(listItem)}
          total={data.length}
          scope={sub.slug}
          initialPage={currentPage}
          showFamilies={false}
        />
        {currentPage === 1 && tete && faqTete && <GuideRayon g={tete} items={data} all={products} faq={faqTete} />}
        {currentPage === 1 && <KeywordHub scope={sub.slug} name={sub.name} items={data} all={products} prix={!tete} />}
        {currentPage === 1 && !tete && <SeoBody sections={sub.sections} faq={sub.faq} />}
        {currentPage === 1 && !tete && (
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
  if (cat || path === 'nouveautes') {
    // La recherche (?q=) a sa propre route, app/recherche/page.tsx.
    const data = cat
      ? cat.slug === 'materiel-sport-de-combat'
        ? entrelace(getCategoryProducts(cat, products))
        : getCategoryProducts(cat, products)
      : [...products].reverse();
    const currentPage = listPage(data.length);
    if (currentPage === null) notFound();
    // « Matériel sport de combat » (29/09) : le tableau par discipline et ses questions, tirés du recensement du ministère.
    const materiel = cat?.slug === 'materiel-sport-de-combat';
    // « Matériel de boxe » (03/10) : les trois sacs chiffrés sur le catalogue, et la question du budget.
    const boxe = cat?.slug === 'materiel-boxe';
    // Page de tête (20/10) : H1, titre, texte et questions du guide du rayon (lib/guides-rayons.ts).
    const tete = cat ? guideRayon(cat.slug) : undefined;
    const ctx = tete && cat ? { f: faits(cat.slug, data), items: data, all: products } : null;
    const enPlus = [...(materiel ? materielFaq() : []), ...(boxe ? budgetFaq(products) : [])];
    const faq = tete && ctx ? [...tete.faq(ctx), ...enPlus] : cat && SEO_COPY[cat.slug] ? [...SEO_COPY[cat.slug].faq, ...enPlus] : undefined;
    return (
      <main id="contenu" className={'page-wrap' + (tete ? ' rayon-tete' : '')}>
        <Breadcrumb
          items={[
            {
              label:
                cat?.name || 'Nouveautés',
            },
          ]}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: collectionGraph({
              path: '/' + path + '/',
              name: tete ? tete.h1 : cat?.name || 'Nouveautés',
              description: tete && ctx ? tete.description(ctx) : cat?.description || 'Les derniers modèles ajoutés au catalogue Boutique de Boxe.',
              requete: tete?.requete,
              revision: tete?.revision,
              items: data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
              total: data.length,
              page: currentPage,
              perPage: PAGE_SIZE,
              category: cat,
              faq,
            }),
          }}
        />
        <section className="page-heading" {...(tete ? { 'data-rayon-texte': '' } : {})}>
          <div>
            <span className="eyebrow">
              {tete ? tete.eyebrow : (cat && SEO_COPY[cat.slug]?.eyebrow) || 'LE CATALOGUE / ' + (cat?.number || 'INDEX')}
            </span>
            <h1>
              {tete ? tete.h1 : cat?.name || 'Les nouveautés'}
            </h1>
          </div>
          <div>
            <div className="label">
              {tete && ctx ? tete.label(ctx) : cat?.label || 'Tous les modèles.'}
            </div>
            <p>
              {tete ? tete.intro : cat?.intro || 'Tous les modèles du catalogue, avec leurs tailles et leurs prix de vente TTC.'}
            </p>
            {tete && currentPage === 1 && (
              <a className="rayon-ancre" href="#guide-rayon">
                Le guide d’achat, sous la liste
              </a>
            )}
          </div>
        </section>
        {cat && (() => {
          const subs = [...subfamiliesOf(cat.slug), ...cat.families.flatMap((f) => subfamiliesOf(f))].filter((x, i, a) => a.indexOf(x) === i);
          return subs.length ? (
            <nav className="subfamily-links" aria-label="Sous-familles">
              {spaced(subs.map((x) => (
                <a key={x.slug} href={'/' + x.slug + '/'}>{x.name}</a>
              )))}
            </nav>
          ) : null;
        })()}
        {/* les modèles d’abord ; sur une page de tête, la réponse du rayon passe sous la grille */}
        {!tete && materiel && currentPage === 1 && <MaterielParDiscipline all={products} />}
        {!tete && boxe && currentPage === 1 && <MaterielParNiveau all={products} />}
        <Catalog
          items={data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(listItem)}
          total={data.length}
          scope={path}
          initialPage={currentPage}
          showFamilies={!cat || cat.families.length > 1}
        />
        {tete && faq && currentPage === 1 && (
          <GuideRayon g={tete} items={data} all={products} faq={faq} apresChapitres={materiel ? <MaterielParDiscipline all={products} /> : boxe ? <MaterielParNiveau all={products} /> : undefined} />
        )}
        {cat && currentPage === 1 && <KeywordHub scope={cat.slug} name={cat.name} items={data} all={products} prix={!tete} />}
        {cat && !tete && (
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
        {cat && !tete && SEO_COPY[cat.slug] && <SeoBody sections={SEO_COPY[cat.slug].sections} faq={faq} />}
      </main>
    );
  }
  notFound();
}
