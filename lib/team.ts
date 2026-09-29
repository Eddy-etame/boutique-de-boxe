import { cookies } from 'next/headers';
import { d1Compat } from '@/db';

/**
 * Accès de l'équipe à l'administration (29/09).
 *
 * Le lien magique de Supabase reste possible, mais son service d'e-mail intégré n'envoie que
 * 2 messages par heure (documentation Supabase, non réglable sans SMTP personnalisé) et une
 * seule adresse y avait droit. Ici :
 *  - le propriétaire (ADMIN_EMAIL) ajoute ou retire des membres ;
 *  - l'administration fabrique un lien de connexion à copier (WhatsApp, SMS…), sans e-mail,
 *    autant de fois qu'il le faut : un lien = un appareil, valable 24 h, une seule fois ;
 *  - chaque appareil garde sa session 30 jours, prolongée tant qu'il s'en sert (180 jours au plus).
 *
 * Sécurité : jetons aléatoires de 256 bits ; la base ne garde que leur empreinte SHA-256 ; le lien
 * ouvre une page de confirmation et ne se consomme qu'au clic (POST) — l'aperçu de WhatsApp ou
 * d'iMessage, qui ouvre les liens, ne peut pas le brûler ; cookie HttpOnly, Secure, SameSite=Lax ;
 * retirer un membre ferme toutes ses sessions.
 */

const SESSION_JOURS = 30;
const SESSION_MAX_JOURS = 180;
const LIEN_HEURES = 24;
const JOUR = 86400000;
export const COOKIE_SECURE = '__Host-bdb-equipe';
export const COOKIE_LOCAL = 'bdb-equipe';

const base = () => d1Compat();
let ready = false;
async function ensure() {
  if (ready) return;
  const db = base();
  await db.prepare('CREATE TABLE IF NOT EXISTS admin_members (email text PRIMARY KEY, added_by text NOT NULL, created_at text NOT NULL)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS admin_links (token_hash text PRIMARY KEY, email text NOT NULL, created_by text NOT NULL, created_at text NOT NULL, expires_at bigint NOT NULL, used_at text)').run();
  await db.prepare("CREATE TABLE IF NOT EXISTS admin_sessions (token_hash text PRIMARY KEY, email text NOT NULL, created_at bigint NOT NULL, last_seen bigint NOT NULL, expires_at bigint NOT NULL, agent text NOT NULL DEFAULT '')").run();
  ready = true;
}

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
const empreinte = async (jeton: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(jeton)));
function nouveauJeton() {
  const octets = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...octets)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const jetonValide = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{43}$/.test(t);
const propre = (email: string) => email.trim().toLowerCase();

export const ownerEmail = () => propre(process.env.ADMIN_EMAIL || '');
export const estProprietaire = (email: string) => Boolean(ownerEmail()) && propre(email) === ownerEmail();

export async function membres(): Promise<{ email: string; added_by: string; created_at: string }[]> {
  await ensure();
  return (await base().prepare('SELECT email,added_by,created_at FROM admin_members ORDER BY created_at ASC').all<{ email: string; added_by: string; created_at: string }>()).results;
}

export async function estMembre(email: string) {
  if (!email) return false;
  if (estProprietaire(email)) return true;
  await ensure();
  return Boolean(await base().prepare('SELECT email FROM admin_members WHERE email=?').bind(propre(email)).first('email'));
}

export async function ajouterMembre(email: string, par: string) {
  await ensure();
  await base()
    .prepare('INSERT INTO admin_members (email,added_by,created_at) VALUES (?,?,?) ON CONFLICT(email) DO NOTHING')
    .bind(propre(email), propre(par), new Date().toISOString())
    .run();
}

/** Retirer un membre ferme aussi ses sessions et annule ses liens. */
export async function retirerMembre(email: string) {
  await ensure();
  const e = propre(email);
  const db = base();
  await db.prepare('DELETE FROM admin_members WHERE email=?').bind(e).run();
  await db.prepare('DELETE FROM admin_sessions WHERE email=?').bind(e).run();
  await db.prepare('DELETE FROM admin_links WHERE email=?').bind(e).run();
}

/** Un lien de connexion à copier : le jeton en clair n'existe que dans la réponse. */
export async function creerLien(email: string, par: string, origine: string) {
  await ensure();
  const jeton = nouveauJeton();
  await base()
    .prepare('INSERT INTO admin_links (token_hash,email,created_by,created_at,expires_at) VALUES (?,?,?,?,?)')
    .bind(await empreinte(jeton), propre(email), propre(par), new Date().toISOString(), Date.now() + LIEN_HEURES * 3600000)
    .run();
  return { url: `${origine}/api/auth/entrer?t=${jeton}`, expire: new Date(Date.now() + LIEN_HEURES * 3600000).toISOString() };
}

/** Consomme un lien (une seule fois, avant expiration) et ouvre une session ; rend le jeton de session. */
export async function utiliserLien(jeton: unknown, agent: string) {
  if (!jetonValide(jeton)) return null;
  await ensure();
  const db = base();
  const email = await db
    .prepare('UPDATE admin_links SET used_at=? WHERE token_hash=? AND used_at IS NULL AND expires_at > ? RETURNING email')
    .bind(new Date().toISOString(), await empreinte(jeton), Date.now())
    .first<string>('email');
  // Le membre a pu être retiré entre-temps : le lien ne vaut plus rien.
  if (!email || !(await estMembre(email))) return null;
  const session = nouveauJeton();
  const now = Date.now();
  await db
    .prepare('INSERT INTO admin_sessions (token_hash,email,created_at,last_seen,expires_at,agent) VALUES (?,?,?,?,?,?)')
    .bind(await empreinte(session), email, now, now, now + SESSION_JOURS * JOUR, agent.slice(0, 200))
    .run();
  return { session, email };
}

async function lireCookie() {
  const store = await cookies();
  return store.get(COOKIE_SECURE)?.value || store.get(COOKIE_LOCAL)?.value || '';
}

/** L'adresse de la session d'équipe de cette requête, ou null. Prolonge la session en usage. */
export async function emailSession(): Promise<string | null> {
  const jeton = await lireCookie();
  if (!jetonValide(jeton)) return null;
  try {
    await ensure();
    const db = base();
    const h = await empreinte(jeton);
    const row = await db
      .prepare('SELECT email,created_at,last_seen FROM admin_sessions WHERE token_hash=? AND expires_at > ?')
      .bind(h, Date.now())
      .first<{ email: string; created_at: number; last_seen: number }>();
    if (!row || !(await estMembre(row.email))) return null;
    const now = Date.now();
    // Prolongée au plus une fois par heure, jamais au-delà de 180 jours après l'ouverture.
    if (now - Number(row.last_seen) > 3600000)
      await db
        .prepare('UPDATE admin_sessions SET last_seen=?, expires_at=? WHERE token_hash=?')
        .bind(now, Math.min(now + SESSION_JOURS * JOUR, Number(row.created_at) + SESSION_MAX_JOURS * JOUR), h)
        .run();
    return row.email;
  } catch {
    return null;
  }
}

export async function fermerSession() {
  const jeton = await lireCookie();
  if (!jetonValide(jeton)) return;
  await ensure();
  await base().prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await empreinte(jeton)).run();
}

export async function sessions() {
  await ensure();
  return (
    await base()
      .prepare('SELECT substr(token_hash,1,12) AS id,email,created_at,last_seen,expires_at,agent FROM admin_sessions WHERE expires_at > ? ORDER BY last_seen DESC')
      .bind(Date.now())
      .all<{ id: string; email: string; created_at: number; last_seen: number; expires_at: number; agent: string }>()
  ).results;
}

export async function fermerSessionParId(id: string) {
  if (!/^[0-9a-f]{12}$/.test(id)) return;
  await ensure();
  await base().prepare('DELETE FROM admin_sessions WHERE substr(token_hash,1,12)=?').bind(id).run();
}

/** Le cookie de session : nom préfixé __Host- en HTTPS (lié à l'hôte exact), simple en local. */
export function cookieSession(jeton: string, https: boolean) {
  return {
    name: https ? COOKIE_SECURE : COOKIE_LOCAL,
    value: jeton,
    options: { httpOnly: true, secure: https, sameSite: 'lax' as const, path: '/', maxAge: SESSION_JOURS * 86400 },
  };
}

/** Rafraîchit le cookie en usage (appelé par les routes de l'administration) : 30 jours de plus côté navigateur. */
export async function renouvelerCookie(https: boolean) {
  const jeton = await lireCookie();
  if (!jetonValide(jeton)) return;
  const c = cookieSession(jeton, https);
  try {
    (await cookies()).set(c.name, c.value, c.options);
  } catch {
    // Un composant serveur ne peut pas écrire de cookie : seules les routes le renouvellent.
  }
}
