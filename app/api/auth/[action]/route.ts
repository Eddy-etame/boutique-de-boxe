import { db } from '@/lib/database';
import { clientIp } from '@/lib/request';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  DEV_OWNER_COOKIE,
  isOwnerEmail,
  safeRelativePath,
  supabaseConfigured,
  supabaseServer,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ action: string }> };

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title} | Boutique de Boxe</title><style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1.5rem;color:#111;line-height:1.5}a{color:#111}</style></head><body><h1>${title}</h1><p>${body}</p><p><a href="/atelier/">Retour à l’atelier</a></p></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}

async function readEmail(request: Request): Promise<string> {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    const data = (await request.json().catch(() => null)) as { email?: unknown } | null;
    return typeof data?.email === 'string' ? data.email : '';
  }
  const form = await request.formData().catch(() => null);
  const value = form?.get('email');
  return typeof value === 'string' ? value : '';
}

export async function POST(request: Request, { params }: Params) {
  const { action } = await params;
  if (action === 'magic-link') {
    if (!sameOrigin(request))
      return page('Requête refusée', 'Origine non autorisée.', 403);
    const email = (await readEmail(request)).trim();
    const generic =
      'Si cette adresse est celle du propriétaire, un lien de connexion vient de lui être envoyé. Il expire rapidement et ne sert qu’une fois.';
    if (!email || email.length > 254 || !email.includes('@'))
      return page('Adresse invalide', 'Indiquez une adresse e-mail complète.', 400);
    // Même réponse, même titre et durée comparable pour toute adresse : la page ne
    // révèle pas quelle adresse est celle du propriétaire.
    try {
      const bucket = Math.floor(Date.now() / 3600000);
      const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(`${clientIp(request)}:${bucket}:auth:magic-link`),
      );
      const key = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
      const hits = await (await db())
        .prepare(
          'INSERT INTO rate_limits(key,hits,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=rate_limits.hits+1 RETURNING hits',
        )
        .bind(key, (bucket + 2) * 3600000)
        .first<number>('hits');
      if ((hits || 0) > 10) return page('Trop de demandes', 'Réessayez dans une heure.', 429);
    } catch (error) {
      console.error('auth rate limit', (error as { code?: string }).code || (error as Error).name);
      return page('Service indisponible', 'Réessayez dans quelques minutes.', 503);
    }
    if (!isOwnerEmail(email) || !supabaseConfigured()) {
      await new Promise((resolve) => setTimeout(resolve, 700 + Math.random() * 800));
      return page('Lien demandé', generic);
    }
    const origin = new URL(request.url).origin;
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: origin + '/api/auth/callback?next=/atelier/',
        shouldCreateUser: true,
      },
    });
    // Un refus du fournisseur (souvent sa limite d’une minute par adresse) est journalisé,
    // jamais affiché : la page resterait sinon un oracle sur l’adresse du propriétaire.
    if (error) console.error('Magic link failed', error.name, error.message);
    return page('Lien demandé', generic);
  }
  if (action === 'signout') {
    if (!sameOrigin(request))
      return page('Requête refusée', 'Origine non autorisée.', 403);
    if (supabaseConfigured()) await (await supabaseServer()).auth.signOut();
    if (process.env.NODE_ENV === 'development')
      (await cookies()).delete(DEV_OWNER_COOKIE);
    return NextResponse.redirect(new URL('/', request.url), 303);
  }
  return page('Introuvable', 'Action inconnue.', 404);
}

export async function GET(request: Request, { params }: Params) {
  const { action } = await params;
  const url = new URL(request.url);
  if (action === 'callback') {
    const code = url.searchParams.get('code');
    const next = safeRelativePath(url.searchParams.get('next'));
    if (!code || !supabaseConfigured())
      return page('Lien invalide', 'Ce lien de connexion est incomplet ou expiré.', 400);
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error)
      return page('Lien invalide', 'Ce lien de connexion est expiré ou a déjà servi. Demandez-en un nouveau.', 400);
    return NextResponse.redirect(new URL(next, request.url), 303);
  }
  if (action === 'dev-login' && process.env.NODE_ENV === 'development') {
    const response = NextResponse.redirect(new URL('/atelier/', request.url), 303);
    response.cookies.set(DEV_OWNER_COOKIE, '1', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    return response;
  }
  return page('Introuvable', 'Action inconnue.', 404);
}
