import { NextResponse } from 'next/server';
import { EDITION_COOKIE, parseEdition } from '@/lib/edition';

export const dynamic = 'force-dynamic';

function backTo(request: Request): string {
  const url = new URL(request.url);
  const explicit = url.searchParams.get('next');
  const candidate = explicit || request.headers.get('referer') || '/';
  try {
    const target = new URL(candidate, url.origin);
    if (target.origin !== url.origin) return '/';
    if (target.pathname.startsWith('/api/')) return '/';
    return target.pathname + target.search;
  } catch {
    return '/';
  }
}

/** Bascule d’édition : pose le cookie puis renvoie vers la page d’origine. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const edition = parseEdition(url.searchParams.get('to'));
  const response = NextResponse.redirect(new URL(backTo(request), request.url), 303);
  response.cookies.set(EDITION_COOKIE, edition, {
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
