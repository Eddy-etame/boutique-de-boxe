import { db } from '@/lib/database';
import { clientIp } from '@/lib/request';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  DEV_OWNER_COOKIE,
  safeRelativePath,
  supabaseConfigured,
  supabaseServer,
} from '@/lib/auth';
import { adminEmail } from '@/lib/database';
import {
  COOKIE_LOCAL,
  COOKIE_SECURE,
  ajouterMembre,
  cookieSession,
  creerLien,
  estMembre,
  estProprietaire,
  fermerSession,
  fermerSessionParId,
  membres,
  ownerEmail,
  retirerMembre,
  sessions,
  utiliserLien,
} from '@/lib/team';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ action: string }> };

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title} | Boutique de Boxe</title><style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1.5rem;color:#111;line-height:1.5}a{color:#111}</style></head><body><h1>${title}</h1><p>${body}</p><p><a href="/admin/">Retour à l’administration</a></p></body></html>`;
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
    if (!supabaseConfigured() || !(await estMembre(email))) {
      await new Promise((resolve) => setTimeout(resolve, 700 + Math.random() * 800));
      return page('Lien demandé', generic);
    }
    const origin = new URL(request.url).origin;
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: origin + '/api/auth/callback?next=/admin/',
        shouldCreateUser: true,
      },
    });
    // Un refus du fournisseur (souvent sa limite d’une minute par adresse) est journalisé,
    // jamais affiché : la page resterait sinon un oracle sur l’adresse du propriétaire.
    if (error) console.error('Magic link failed', error.name, error.message);
    return page('Lien demandé', generic);
  }
  // Le lien copié depuis l'administration : consommé au clic, jamais à l'ouverture de la page.
  if (action === 'entrer') {
    if (!sameOrigin(request))
      return page('Requête refusée', 'Origine non autorisée.', 403);
    const form = await request.formData().catch(() => null);
    const ouvert = await utiliserLien(form?.get('t'), request.headers.get('user-agent') || '');
    if (!ouvert)
      return page('Lien invalide', 'Ce lien de connexion a déjà servi ou a expiré (24 heures). Demandez-en un nouveau.', 400);
    const https = new URL(request.url).protocol === 'https:';
    const c = cookieSession(ouvert.session, https);
    const response = NextResponse.redirect(new URL('/admin/', request.url), 303);
    response.cookies.set(c.name, c.value, c.options);
    return response;
  }
  // Gestion de l'équipe : le propriétaire ajoute, retire, déconnecte ; chacun peut s'ouvrir un autre appareil.
  if (action === 'equipe') {
    if (!sameOrigin(request) || !request.headers.get('content-type')?.includes('application/json'))
      return Response.json({ error: 'Origine ou format invalide.' }, { status: 400 });
    const moi = await adminEmail();
    if (!moi) return Response.json({ error: 'Accès réservé.' }, { status: 403 });
    const data = (await request.json().catch(() => null)) as { op?: string; email?: string; id?: string } | null;
    const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
    const proprio = estProprietaire(moi);
    const valide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
    if (data?.op === 'lien') {
      // Le propriétaire fabrique un lien pour tout membre ; un membre, pour lui-même seulement.
      const cible = email || moi;
      if (!proprio && cible !== moi)
        return Response.json({ error: 'Un membre ne crée de lien que pour ses propres appareils.' }, { status: 403 });
      if (!(await estMembre(cible)))
        return Response.json({ error: 'Cette adresse n’a pas accès à l’administration.' }, { status: 403 });
      return Response.json(await creerLien(cible, moi, new URL(request.url).origin), { headers: { 'Cache-Control': 'no-store' } });
    }
    if (!proprio) return Response.json({ error: 'Réservé au propriétaire.' }, { status: 403 });
    if (data?.op === 'ajouter') {
      if (!valide) return Response.json({ error: 'Adresse e-mail invalide.' }, { status: 400 });
      await ajouterMembre(email, moi);
      return Response.json({ ok: true });
    }
    if (data?.op === 'retirer') {
      if (!valide || estProprietaire(email)) return Response.json({ error: 'Cette adresse ne peut pas être retirée.' }, { status: 400 });
      await retirerMembre(email);
      return Response.json({ ok: true });
    }
    if (data?.op === 'fermer' && typeof data.id === 'string') {
      await fermerSessionParId(data.id);
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'Opération inconnue.' }, { status: 400 });
  }
  if (action === 'signout') {
    if (!sameOrigin(request))
      return page('Requête refusée', 'Origine non autorisée.', 403);
    await fermerSession().catch(() => undefined);
    (await cookies()).delete(COOKIE_SECURE);
    (await cookies()).delete(COOKIE_LOCAL);
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
  // Page du lien copié : un bouton, rien d'autre. L'aperçu d'une messagerie ne consomme donc rien.
  if (action === 'entrer') {
    const t = url.searchParams.get('t') || '';
    if (!/^[A-Za-z0-9_-]{43}$/.test(t)) return page('Lien invalide', 'Ce lien de connexion est incomplet.', 400);
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><meta name="referrer" content="no-referrer"><title>Ouvrir l’administration | Boutique de Boxe</title><style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1.5rem;color:#111;line-height:1.5}button{font:inherit;font-weight:700;padding:.9rem 1.4rem;background:#20241f;color:#fff;border:0;cursor:pointer}</style></head><body><h1>Ouvrir l’administration</h1><p>Ce lien ouvre l’administration de Boutique de Boxe sur cet appareil, pour 30 jours. Il ne sert qu’une fois.</p><form method="post" action="/api/auth/entrer"><input type="hidden" name="t" value="${t}"><button type="submit">Ouvrir sur cet appareil</button></form></body></html>`;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' } });
  }
  if (action === 'equipe') {
    const moi = await adminEmail();
    if (!moi) return Response.json({ error: 'Accès réservé.' }, { status: 403 });
    const proprio = estProprietaire(moi);
    const toutes = await sessions();
    return Response.json(
      {
        moi,
        proprietaire: proprio,
        proprietaireEmail: ownerEmail(),
        membres: await membres(),
        sessions: proprio ? toutes : toutes.filter((s) => s.email === moi),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (action === 'dev-login' && process.env.NODE_ENV === 'development') {
    const response = NextResponse.redirect(new URL('/admin/', request.url), 303);
    response.cookies.set(DEV_OWNER_COOKIE, '1', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    return response;
  }
  return page('Introuvable', 'Action inconnue.', 404);
}
