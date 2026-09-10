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
    if (!isOwnerEmail(email) || !supabaseConfigured())
      return page('Lien demandé', generic);
    const origin = new URL(request.url).origin;
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: origin + '/api/auth/callback?next=/atelier/',
        shouldCreateUser: true,
      },
    });
    if (error) {
      console.error('Magic link failed', error.name);
      return page(
        'Envoi impossible',
        'Le service d’authentification n’a pas accepté la demande. Réessayez dans quelques minutes.',
        503,
      );
    }
    return page('Lien envoyé', generic);
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
