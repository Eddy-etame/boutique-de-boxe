import { NextResponse, type NextRequest } from 'next/server';

/**
 * Une seule URL publique par page : les pages HTML se terminent par une barre oblique.
 *
 * `skipTrailingSlashRedirect` reste activé pour que Next ne transforme jamais un POST d'API en
 * redirection. Le proxy ne vise donc que les routes de pages (les API, fichiers et assets sont
 * exclus par le matcher) et conserve la requête, par exemple `?page=2`.
 *
 * La cible est construite sur une URL ordinaire, pas sur `nextUrl` : avec `trailingSlash`, Next
 * renormalise le chemin d'un `NextURL` au moment d'écrire l'en-tête et perdait la barre ajoutée,
 * ce qui renvoyait l'adresse sur elle-même en boucle.
 */
/*
 * Pagination lisible par les robots. Les listes sont statiques (ISR) et ne lisent pas la requête :
 * sans aide, `/gants-de-boxe/?page=3` servirait le HTML de la page 1 et la liste ne basculerait
 * qu'une fois le JavaScript chargé. On réécrit donc en interne `?page=N` (N ≥ 2) vers
 * `/<liste>/page-N/`, que `splitPage()` (app/[...slug]/metadata.ts) rend en statique avec sa
 * canonique `?page=N`. L'adresse publique reste `?page=N` : un accès direct à `/<liste>/page-N/`
 * est renvoyé en 308 vers elle. Une réécriture ne repasse pas par le proxy : pas de boucle.
 */
const LISTE = /^\/([a-z0-9-]+)\/$/;
const PAGE_DIRECTE = /^\/([a-z0-9-]+)\/page-([1-9][0-9]{0,3})\/$/;
const PAS_UNE_LISTE = new Set(['produits', 'guides', 'marques', 'atelier', 'admin', 'outils', 'labo', 'merci', 'hors-ligne']);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const lecture = request.method === 'GET' || request.method === 'HEAD';
  if (lecture && pathname !== '/' && !pathname.endsWith('/')) {
    const canonical = new URL(request.url);
    canonical.pathname = pathname + '/';
    return NextResponse.redirect(canonical, 308);
  }
  if (lecture) {
    const directe = PAGE_DIRECTE.exec(pathname);
    if (directe && !PAS_UNE_LISTE.has(directe[1])) {
      const publique = new URL(request.url);
      publique.pathname = `/${directe[1]}/`;
      publique.searchParams.set('page', directe[2]);
      return NextResponse.redirect(publique, 308);
    }
    const liste = LISTE.exec(pathname);
    const page = request.nextUrl.searchParams.get('page');
    if (liste && !PAS_UNE_LISTE.has(liste[1]) && page !== null) {
      // `?page=1` est la liste elle-même : une seule adresse par contenu.
      if (page === '1') {
        const base = new URL(request.url);
        base.searchParams.delete('page');
        return NextResponse.redirect(base, 308);
      }
      const interne = new URL(request.url);
      // Une valeur qui n’est pas un numéro de page (0, -1, 1.5, Infinity, vide…) n’a pas de page : on la
      // conduit vers `page-0`, que la route refuse (404), au lieu de servir la première page sous une
      // adresse de plus. La page statique ignore la requête : c’est ici que cela se décide.
      interne.pathname = `/${liste[1]}/page-${/^[1-9][0-9]{0,3}$/.test(page) ? page : '0'}/`;
      return NextResponse.rewrite(interne);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api(?:/|$)|_next(?:/|$)|.*\\.[^/]+$).*)'],
};
