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
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if ((request.method === 'GET' || request.method === 'HEAD') && pathname !== '/' && !pathname.endsWith('/')) {
    const canonical = new URL(request.url);
    canonical.pathname = pathname + '/';
    return NextResponse.redirect(canonical, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api(?:/|$)|_next(?:/|$)|.*\\.[^/]+$).*)'],
};
