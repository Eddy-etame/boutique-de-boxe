import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { catalogPage, PAGE_SIZE } from '@/lib/pagination';
import { subfamilyKeywords, productKeywords, categoryKeywords, guideKeywords, pageKeywords, titreCourt, titreDeModele } from '@/lib/seo';
import { modeleDe, compteDuModele, libelleDeFiche, texteDuModele } from '@/lib/modeles';
import { SEO_COPY } from '@/lib/seo-copy';
import { subfamilyFor, subfamilyProducts } from '@/lib/subfamilies';
import { facetMetadata } from '@/components/facet-page';
import { facetFor } from '@/lib/facets';
import { categoryFor, getCategoryProducts, shop, money } from '@/lib/catalog';
import { readCatalog } from '@/lib/database';
import { guides, services, guidesEnLettres } from '@/lib/editorial';
import { ogImage } from '@/lib/og';
import { villeFor, regionFor } from '@/lib/villes';
import { villeMetadata, regionMetadata } from '@/components/ville-page';
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
  // Pages-villes (29/09) : tout vient de lib/villes.ts. Leur carrefour a été fusionné dans l'accueil le 09/11.
  if (slug.length === 1 && requested === undefined) {
    const ville = villeFor(path);
    if (ville) return villeMetadata(ville);
    const region = regionFor(path);
    if (region) return regionMetadata(region);
    if (path === VENTE) return venteMetadata();
    if (DISCIPLINES_PAGES[path]) return disciplinesMetadata(DISCIPLINES_PAGES[path]);
  }
  const products = await readCatalog();
  const product =
    slug[0] === 'produits'
      ? products.find((p) => p.slug === slug[1])
      : undefined;
  // Un modèle en plusieurs coloris (lib/modeles.ts) : sa fiche de tête porte le titre et la description du
  // modèle ; les fiches des autres coloris la désignent comme canonique et gardent leur propre titre.
  const modele = product ? modeleDe(product, products) : null;
  const plusieurs = modele && modele.fiches.length > 1 ? modele : null;
  const tetePage = Boolean(plusieurs && product && plusieurs.tete.id === product.id);
  // Un nom écrit à la main vaut aussi pour un modèle d'une seule fiche (voir page.tsx).
  const nomEcrit = product && modele && !plusieurs && modele.nom !== product.name ? modele.nom : null;
  // La description rédigée d'un modèle d'une seule fiche : la page s'annonce par elle (voir describe).
  const redigeSeul = modele && !plusieurs ? texteDuModele(modele) : null;
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
    (product && tetePage && plusieurs && titreDeModele(plusieurs.nom, compteDuModele(plusieurs), titreCourt(product, products))) ||
    (nomEcrit && titreCourt(nomEcrit)) ||
    (product && titreCourt(product, products)) ||
    (tete && teteCtx && tete.titre(teteCtx)) ||
    (cat && (SEO_COPY[cat.slug]?.title || cat.name)) ||
    sub?.title ||
    (guide && titreCourt(guide.title)) ||
    service?.title ||
    special[path]?.[0] ||
    'Page introuvable';
  const canonical =
    product && plusieurs && !tetePage
      ? '/produits/' + plusieurs.tete.slug + '/'
      : '/' + path + '/' + (paginated && page > 1 ? '?page=' + page : '');
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
    const sizes = p.sizes.filter((s) => s.length <= 14 && s.toLowerCase() !== p.name.toLowerCase());
    // Une liste coupée finit par « … », jamais par « …. ».
    const tailles = sizes.length > 1 ? 'Tailles : ' + sizes.slice(0, 4).join(', ') + (sizes.length > 4 ? '…' : '.') : '';
    if (tetePage && plusieurs) {
      // La page d'un modèle dit le modèle, ses coloris, ses tailles et son premier prix. Chaque phrase entre
      // entière ou n'entre pas : la description ne se termine jamais au milieu d'une phrase.
      // Une fiche sans coloris dans son nom se désigne par sa référence : utile dans le sélecteur, pas dans une phrase.
      const libelles = plusieurs.fiches.map(libelleDeFiche).filter((l) => !/^réf\. /.test(l));
      const tete = (n: number) =>
        libelles.length
          ? `${plusieurs.nom}${brand} en ${compteDuModele(plusieurs)} : ${libelles.slice(0, n).join(', ')}${n < plusieurs.fiches.length ? '…' : '.'}`
          : `${plusieurs.nom}${brand} en ${compteDuModele(plusieurs)}.`;
      let n = Math.min(4, libelles.length);
      while (n > 1 && tete(n).length > 118) n--;
      const prix = plusieurs.fiches.map((x) => x.price).filter((x) => x > 0);
      const min = prix.length ? Math.min(...prix) : 0;
      const phrases = [min ? (prix.some((x) => x !== min) ? `Dès ${money(min)} TTC.` : `Prix TTC : ${money(min)}.`) : '', tailles, 'Livraison dans toute la France.'];
      let out = tete(n);
      for (const phrase of phrases) if (phrase && (out + ' ' + phrase).length <= 158) out += ' ' + phrase;
      return out;
    }
    if (redigeSeul) {
      // Les premières phrases du texte, entières, puis le prix s'il tient. Une initiale (« E. Colette ») ne finit pas une phrase.
      const phrases = redigeSeul.texte.join(' ').split(/(?<=(?<!\b[A-ZÀ-Ý])[.!?…])\s+(?=[A-ZÀ-ÝŒ«])/);
      let out = phrases[0];
      let i = 1;
      for (; i < phrases.length; i++) {
        if ((out + ' ' + phrases[i]).length > 158) break;
        out += ' ' + phrases[i];
      }
      // Trop court pour dire la page : la phrase suivante entre aussi, coupée proprement à la limite (trimmed, plus bas).
      if (out.length < 90 && i < phrases.length) return out + ' ' + phrases[i];
      const prix = p.price > 0 ? 'Prix TTC : ' + money(p.price) + '.' : '';
      return prix && (out + ' ' + prix).length <= 158 ? out + ' ' + prix : out;
    }
    const parts = [(nomEcrit ?? p.name) + brand + (family ? ', ' + family : '') + '.'];
    if (tailles) parts.push(tailles);
    parts.push('Prix TTC : ' + money(p.price) + '.');
    parts.push('Livraison dans toute la France.');
    return parts.join(' ');
  };
  const rawDescription =
    (product
      ? !tetePage && !nomEcrit && !redigeSeul && product.seoDescription && product.seoDescription.length >= 80
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
    // 06/11/2026 : les pages 2 et suivantes d'une liste répètent la page 1 (même texte, autres vignettes) ; Google les
    // tenait pour des pages à part (site: les sortait en tête) pendant qu'il refusait les pages de tête. Hors index, suivies.
    ...(paginated && page > 1 ? { robots: { index: false, follow: true } } : {}),
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
