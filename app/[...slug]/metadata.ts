import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { catalogPage, PAGE_SIZE } from '@/lib/pagination';
import { subfamilyKeywords, productKeywords, categoryKeywords, guideKeywords, pageKeywords, titreCourt } from '@/lib/seo';
import { SEO_COPY } from '@/lib/seo-copy';
import { subfamilyFor, subfamilyProducts } from '@/lib/subfamilies';
import { facetMetadata } from '@/components/facet-page';
import { facetFor } from '@/lib/facets';
import { categoryFor, getCategoryProducts, shop, money } from '@/lib/catalog';
import { readCatalog } from '@/lib/database';
import { guides, services, guidesEnLettres } from '@/lib/editorial';
import { ogImage } from '@/lib/og';
import { villeFor, regionFor, CARREFOUR } from '@/lib/villes';
import { villeMetadata, regionMetadata, carrefourMetadata } from '@/components/ville-page';
import { venteMetadata, VENTE } from '@/components/vente-page';
import { PLAN, PLAN_TITRE, PLAN_DESCRIPTION } from '@/components/plan-du-site';
import { disciplinesMetadata, DISCIPLINES_PAGES } from '@/components/disciplines-page';
import { guideRayon, faits } from '@/lib/guides-rayons';

/**
 * Page d’une liste au-delà de la première. L’adresse publique reste `/gants-de-boxe/?page=2` ; le
 * proxy peut la réécrire en `/gants-de-boxe/page-2/` (segment interne) pour que chaque page de la
 * liste soit, elle aussi, un HTML statique régénéré toutes les minutes, avec sa propre canonique.
 * Sans cette réécriture, la page 1 est servie et la liste passe à la bonne page dans le navigateur.
 */
const PAGE_SEGMENT = /^page-([1-9][0-9]{0,3})$/;
export function splitPage(slug: string[]): { path: string; slug: string[]; page: string | undefined } {
  const last = slug.at(-1) || '';
  const m = slug.length === 2 && slug[0] !== 'produits' && slug[0] !== 'guides' ? PAGE_SEGMENT.exec(last) : null;
  const rest = m ? slug.slice(0, -1) : slug;
  return { path: rest.join('/'), slug: rest, page: m ? m[1] : undefined };
}

/** Les métadonnées d’une adresse du catalogue, sans lire la requête : la page reste statique. */
export async function slugMetadata(rawSlug: string[], rawPage?: string): Promise<Metadata> {
  const { slug, path, page: pageParam } = splitPage(rawSlug);
  const requested = pageParam ?? rawPage;
  // Pages-villes et carrefour « Boutique sport de combat France » (29/09) : tout vient de lib/villes.ts.
  if (slug.length === 1 && requested === undefined) {
    const ville = villeFor(path);
    if (ville) return villeMetadata(ville);
    const region = regionFor(path);
    if (region) return regionMetadata(region);
    if (path === CARREFOUR) return carrefourMetadata();
    if (path === VENTE) return venteMetadata();
    if (DISCIPLINES_PAGES[path]) return disciplinesMetadata(DISCIPLINES_PAGES[path]);
  }
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
  const page = paginated ? catalogPage(requested, paginationCount) : requested === undefined ? 1 : null;
  if (page === null) notFound();
  if (facet) return facetMetadata(facet, page);
  // Les douze pages de tête (20/10) : titre et description tirés de leur guide, chiffres du jour.
  const tete = cat || sub ? guideRayon(path) : undefined;
  const teteItems = tete ? (sub ? subfamilyProducts(sub, products) : getCategoryProducts(cat!, products)) : [];
  const teteCtx = tete ? { f: faits(path, teteItems), items: teteItems, all: products } : null;
  const guide =
    slug[0] === 'guides' ? guides.find((g) => g.slug === slug[1]) : undefined;
  const service = services[path];
  const special: Record<string, [string, string]> = {
    guides: [
      'Guides d’achat boxe, MMA et sports de combat',
      guidesEnLettres().charAt(0).toUpperCase() + guidesEnLettres().slice(1) + ' guides pour choisir gants, protections et équipement de boxe ou MMA selon votre pratique. Les tailles, les onces et les critères utiles.',
    ],
    nouveautes: [
      'Nouveautés : les équipements du catalogue',
      'Découvrez les équipements intégrés au catalogue Boutique de Boxe : gants, protections, tenues et accessoires, les derniers arrivés en vente.',
    ],
    recherche: [
      'Rechercher un équipement',
      'Recherchez un modèle, une marque ou une famille d’équipement dans le catalogue Boutique de Boxe.',
    ],
    [PLAN]: [PLAN_TITRE, PLAN_DESCRIPTION],
    contact: [
      'Contact : une question sur le matériel ?',
      'Écrivez à Boutique de Boxe pour une question sur un modèle, une taille ou une fiche produit. Réponse par e-mail.',
    ],
    confirmation: [
      'Demande enregistrée',
      'Confirmation de votre demande auprès de Boutique de Boxe.',
    ],
    'paiement-retour': [
      'Votre commande',
      'Confirmation du paiement de votre commande Boutique de Boxe.',
    ],
    panier: [
      'Votre panier',
      'Remplissez votre panier et enregistrez vos choix, sans payer.',
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
    (product && titreCourt(product, products)) ||
    (tete && teteCtx && tete.titre(teteCtx)) ||
    (cat && (SEO_COPY[cat.slug]?.title || cat.name)) ||
    sub?.title ||
    (guide && titreCourt(guide.title)) ||
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
    parts.push('Prix TTC : ' + money(p.price) + '.');
    parts.push('Livraison dans toute la France.');
    return parts.join(' ');
  };
  const rawDescription =
    (product
      ? product.seoDescription && product.seoDescription.length >= 80
        ? product.seoDescription
        : describe(product)
      : undefined) ||
    (tete && teteCtx && tete.description(teteCtx)) ||
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
    keywords: product ? productKeywords(product) : tete ? [...new Set([tete.h1.toLowerCase(), tete.requete, ...(cat ? categoryKeywords(cat) : sub ? subfamilyKeywords(sub) : [])])] : cat ? categoryKeywords(cat) : sub ? subfamilyKeywords(sub) : guide ? guideKeywords(guide) : [(service?.title || special[path]?.[0] || '').toLowerCase(), ...(pageKeywords(path) || [])].filter(Boolean),
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
