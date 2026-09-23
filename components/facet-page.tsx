import type { Metadata } from 'next';
import { listItem, money, type Product } from '@/lib/catalog';
import { facetSiblings, type Facet } from '@/lib/facets';
import { collectionGraph } from '@/lib/seo';
import { ogImage } from '@/lib/og';
import { Breadcrumb, ArrowLink } from './shop-shell';
import { Catalog } from './shop-interactions';
import { KeywordHub } from './keyword-hub';
import { SeoBody } from './seo-body';
import { PAGE_SIZE } from '@/lib/pagination';

/**
 * Une page de longue traîne (poids de gants, marque dans une famille) : le titre, la liste en
 * fenêtre, la page-pilier (sélection de la semaine, prix réels, maillage), les questions, le guide.
 * La même page pour les deux routes ; seul le fil d’Ariane change.
 */
export function facetMetadata(f: Facet, page = 1): Metadata {
  const canonical = f.path + (page > 1 ? '?page=' + page : '');
  const title = f.title + (page > 1 ? ` — Page ${page}` : '');
  const description =
    page > 1
      ? `Page ${page} sur ${Math.ceil(f.products.length / PAGE_SIZE)}. ${f.description}`.slice(0, 158)
      : f.description;
  return {
    title: { absolute: title },
    description,
    // le premier mot-clé est le H1 de la page, donc toujours visible ; l’audit le vérifie
    keywords: [f.name.toLowerCase(), ...f.keywords],
    alternates: { canonical, languages: { 'fr-FR': canonical, 'x-default': canonical } },
    openGraph: { title, description, url: canonical, type: 'website', images: ogImage('x', f.path.replace(/^\/|\/$/g, ''), f.name) },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export function FacetPage({ facet: f, all, page = 1 }: { facet: Facet; all: Product[]; page?: number }) {
  const siblings = facetSiblings(f, all);
  const prices = f.products.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b);
  const pageItems = f.products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const crumbs =
    f.kind === 'oz' || f.kind === 'couleur'
      ? [{ label: f.parent.name, href: f.parent.path }, { label: f.name }]
      : [{ label: 'Marques', href: '/marques/' }, { label: f.parent.name, href: f.parent.path }, { label: f.name }];
  return (
    <main id="contenu" className="page-wrap">
      <Breadcrumb items={crumbs} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: collectionGraph({ path: f.path, name: f.name, description: f.description, items: pageItems, total: f.products.length, page, perPage: PAGE_SIZE, faq: f.faq, keywords: [f.name.toLowerCase(), ...f.keywords] }),
        }}
      />
      <section className="page-heading">
        <div>
          <span className="eyebrow">{f.eyebrow}</span>
          <h1>{f.name}</h1>
        </div>
        <div>
          <div className="label">
            {f.products.length} modèles, de {money(prices[0])} à {money(prices.at(-1)!)}.
          </div>
          <p>{f.intro}</p>
        </div>
      </section>
      <nav className="subfamily-links" aria-label="Pages voisines">
        <a href={f.parent.path}>{f.kind === 'oz' ? 'Tous les poids : ' : f.kind === 'couleur' ? 'Toutes les couleurs : ' : 'Toute la marque : '}{f.parent.name}</a>
        {siblings.slice(0, 12).map((x) => (
          <a key={x.path} href={x.path}>{x.name}</a>
        ))}
      </nav>
      <Catalog items={pageItems.map(listItem)} total={f.products.length} scope={f.scope} initialPage={page} showFamilies={false} />
      {page === 1 && <KeywordHub scope={f.scope} name={f.name} items={f.products} all={all} path={f.path} />}
      {page === 1 && <SeoBody sections={[]} faq={f.faq} />}
      {page === 1 && (
        <section className="spec-section">
          <div>
            <h2>Pour choisir sans se tromper.</h2>
            <ArrowLink href={f.guide === 'guide-des-tailles' ? '/guide-des-tailles/' : '/guides/' + f.guide + '/'}>Lire le guide d’achat</ArrowLink>
            {f.kind === 'oz' && <ArrowLink href="/outils/poids-de-gants/">Calculer mon poids de gants</ArrowLink>}
          </div>
        </section>
      )}
    </main>
  );
}
