import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Identité de l’administrateur.
 *
 * Production : session Supabase Auth (lien magique envoyé à ADMIN_EMAIL).
 * Développement : le cookie `__sites_local_auth=1` représente le propriétaire
 * local, comme dans l’ancien environnement Sites, pour les scripts de test.
 * Les en-têtes envoyés par le navigateur ne confèrent jamais d’identité.
 */

export type SessionUser = {
  userId: string;
  email: string;
  displayName: string;
};

export const DEV_OWNER_EMAIL = 'seedy@sites.test';
export const DEV_OWNER_COOKIE = '__sites_local_auth';

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll(list) {
          try {
            for (const { name, value, options } of list)
              store.set(name, value, options);
          } catch {
            // Un composant serveur ne peut pas écrire de cookie ; les routes
            // d’authentification s’en chargent.
          }
        },
      },
    },
  );
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (process.env.NODE_ENV === 'development') {
    const dev = (await cookies()).get(DEV_OWNER_COOKIE);
    if (dev?.value === '1')
      return {
        userId: 'local-owner',
        email: DEV_OWNER_EMAIL,
        displayName: 'Propriétaire local',
      };
  }
  if (!supabaseConfigured()) return null;
  try {
    const { data } = await (await supabaseServer()).auth.getUser();
    const user = data.user;
    if (!user?.email) return null;
    const fullName = user.user_metadata?.full_name;
    return {
      userId: user.id,
      email: user.email,
      displayName: typeof fullName === 'string' && fullName ? fullName : user.email,
    };
  } catch {
    return null;
  }
}

export function isOwnerEmail(email: string): boolean {
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const candidate = email.trim().toLowerCase();
  if (admin && candidate === admin) return true;
  return process.env.NODE_ENV === 'development' && candidate === DEV_OWNER_EMAIL;
}

export function safeRelativePath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/atelier/';
  try {
    const url = new URL(value, 'https://app.local');
    if (url.origin !== 'https://app.local') return '/atelier/';
    return `${url.pathname}${url.search}`;
  } catch {
    return '/atelier/';
  }
}
