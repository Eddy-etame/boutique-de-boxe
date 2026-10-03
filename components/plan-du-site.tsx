import { categories, getCategoryProducts, type Product } from '@/lib/catalog';
import { SUBFAMILIES, subfamilyProducts } from '@/lib/subfamilies';
import { brandsOf } from '@/lib/brands';
import { allFacets } from '@/lib/facets';
import { guides, services } from '@/lib/editorial';
import { graph, urlOf, webPageNode, pageKeywords } from '@/lib/seo';
import { VILLES, REGIONS, CARREFOUR, villePath } from '@/lib/villes';
import { Breadcrumb } from './shop-shell';

/**
 * Le plan du site (03/10) : toutes les pages qui ne sont pas une fiche, sur une seule page.
 * Chaque liste est tirée des mêmes registres que le sitemap XML : une page ajoutée au catalogue
 * apparaît ici sans qu'on y pense. Les fiches produit se rejoignent par leur rayon.
 */

export const PLAN = 'plan-du-site';
export const PLAN_TITRE = 'Plan du site : toutes les pages de la boutique';
export const PLAN_DESCRIPTION = 'Toutes les pages de Boutique de Boxe sur une seule : rayons, équipements, boxes et niveaux, marques, guides d’achat, villes et conditions de vente.';

type Lien = { href: string; nom: string; n?: number };

function Groupe({ titre, liens }: { titre: string; liens: Lien[] }) {
  if (!liens.length) return null;
  return (
    <div>
      <h2>{titre}</h2>
      <ul>
        {liens.map((l) => (
          <li key={l.href}>
            <a href={l.href}>{l.nom}</a> {l.n !== undefined && <span>{l.n}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PlanDuSite({ all }: { all: Product[] }) {
  const sousFamille = (s: (typeof SUBFAMILIES)[number]) => ({ href: '/' + s.slug + '/', nom: s.name, n: subfamilyProducts(s, all).length });
  const facettes = allFacets(all);
  const entrees = ['materiel-boxe', 'boutique-boxe', 'materiel-mma', 'boutique-arts-martiaux', 'materiel-sport-de-combat'];
  const groupes: { titre: string; liens: Lien[] }[] = [
    {
      titre: 'Les entrées du catalogue',
      liens: [
        ...categories.filter((c) => entrees.includes(c.slug)).sort((a, b) => entrees.indexOf(a.slug) - entrees.indexOf(b.slug)).map((c) => ({ href: '/' + c.slug + '/', nom: c.name, n: getCategoryProducts(c, all).length })),
        { href: '/vente-materiel-de-boxe/', nom: 'Vente matériel de boxe' },
        { href: '/nouveautes/', nom: 'Les nouveautés' },
      ],
    },
    { titre: 'Les rayons', liens: categories.filter((c) => c.families.length === 1 && c.families[0] === c.slug).map((c) => ({ href: '/' + c.slug + '/', nom: c.name, n: getCategoryProducts(c, all).length })) },
    { titre: 'Par boxe et par niveau', liens: SUBFAMILIES.filter((s) => s.kind || s.parent === 'materiel-boxe').map(sousFamille) },
    { titre: 'Par équipement', liens: SUBFAMILIES.filter((s) => !s.kind && s.parent !== 'materiel-boxe').map(sousFamille) },
    { titre: 'Gants de boxe par poids', liens: facettes.filter((f) => f.kind === 'oz').map((f) => ({ href: f.path, nom: f.name, n: f.products.length })) },
    { titre: 'Gants de boxe par couleur', liens: facettes.filter((f) => f.kind === 'couleur').map((f) => ({ href: f.path, nom: f.name, n: f.products.length })) },
    { titre: 'Une marque dans un rayon', liens: facettes.filter((f) => f.kind === 'marque-famille').map((f) => ({ href: f.path, nom: f.name, n: f.products.length })) },
    { titre: 'Les marques', liens: [{ href: '/marques/', nom: 'Toutes les marques' }, ...brandsOf(all).map((b) => ({ href: '/marques/' + b.slug + '/', nom: b.name, n: b.products.length }))] },
    {
      titre: 'Guides et outils',
      liens: [
        { href: '/guides/', nom: 'Tous les guides d’achat' },
        ...guides.map((g) => ({ href: '/guides/' + g.slug + '/', nom: g.title })),
        { href: '/guide-des-tailles/', nom: 'Guide des tailles' },
        { href: '/outils/poids-de-gants/', nom: 'Quel poids de gants de boxe ?' },
        { href: '/observatoire-des-prix/', nom: 'L’observatoire des prix' },
      ],
    },
    {
      titre: 'Ville par ville',
      liens: [{ href: '/' + CARREFOUR + '/', nom: 'Boutique sport de combat France' }, ...[...VILLES, ...REGIONS].map((v) => ({ href: villePath(v.slug), nom: 'Boutique de boxe ' + v.nom }))],
    },
    {
      titre: 'La boutique',
      liens: [
        ...Object.entries(services)
          .filter(([slug]) => slug !== 'guide-des-tailles')
          .map(([slug, s]) => ({ href: '/' + slug + '/', nom: s.title })),
        { href: '/contact/', nom: 'Nous contacter' },
      ],
    },
  ];
  const pages = groupes.reduce((n, g) => n + g.liens.length, 0);
  return (
    <main id="contenu" className="page-wrap">
      <Breadcrumb items={[{ label: 'Plan du site' }]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: graph([webPageNode({ path: '/' + PLAN + '/', name: PLAN_TITRE, description: PLAN_DESCRIPTION, image: '/vignette/x/' + PLAN + '.png', keywords: pageKeywords(PLAN) })]) }} />
      <section className="page-heading">
        <div>
          <span className="eyebrow">PLAN DU SITE · TOUTES LES PAGES</span>
          <h1>Le plan du site.</h1>
        </div>
        <div>
          <div className="label">{`${pages} pages, et ${all.length.toLocaleString('fr-FR')} fiches derrière elles.`}</div>
          <p>
            Chaque page de la boutique qui n’est pas une fiche, rangée par usage : les rayons, les équipements, les boxes, les marques, les guides, les villes. Une fiche se rejoint par son rayon ; le plan lu par les moteurs est à{' '}
            <a href={urlOf('/sitemap.xml')}>sitemap.xml</a>.
          </p>
        </div>
      </section>
      <nav className="hub-links plan-du-site" aria-label="Plan du site">
        {groupes.map((g) => (
          <Groupe key={g.titre} titre={g.titre} liens={g.liens} />
        ))}
      </nav>
    </main>
  );
}
