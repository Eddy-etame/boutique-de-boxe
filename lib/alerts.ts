import { db } from './database';

/**
 * Les inscriptions à l’ouverture : la même écriture pour le formulaire du site et pour un
 * assistant (MCP) qui inscrit un visiteur consentant. Une adresse déjà inscrite ne révèle rien :
 * la référence n’est rendue qu’à la création.
 */
export const emailValid = (value: unknown): value is string => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** Numéro ramené au format international : « 06 12 34 56 78 » devient « +33612345678 ». Vide si invalide. */
export function normalisePhone(value: unknown): string {
  if (typeof value !== 'string' || value.length > 30) return '';
  const digits = value.replace(/[\s().-]/g, '');
  if (/^0[1-9]\d{8}$/.test(digits)) return '+33' + digits.slice(1);
  if (/^00[1-9]\d{7,13}$/.test(digits)) return '+' + digits.slice(2);
  return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : '';
}

// Colonnes de contact des alertes, ajoutées sans étape de migration manuelle (même principe que
// la table des événements) : téléphone facultatif, accord SMS, et l’endroit où l’inscription s’est faite.
let alertContactReady = false;
export async function ensureAlertContact() {
  if (alertContactReady) return;
  const database = await db();
  await database.prepare("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT ''").run();
  await database.prepare('ALTER TABLE alerts ADD COLUMN IF NOT EXISTS sms_consent integer NOT NULL DEFAULT 0').run();
  await database.prepare("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT ''").run();
  alertContactReady = true;
}

export const CONSENT_VERSION = '2026-09-17';

/* Paniers enregistrés comme choix (Eddy, 29/09) : tant que les ventes sont fermées, le panier se termine
   par « Enregistrer mes choix » ; la table naît au premier usage, comme les autres. */
let choicesReady = false;
export async function ensureChoices() {
  if (choicesReady) return;
  await (await db())
    .prepare("CREATE TABLE IF NOT EXISTS choices (id text PRIMARY KEY, email text NOT NULL, first_name text NOT NULL, phone text NOT NULL DEFAULT '', sms_consent integer NOT NULL DEFAULT 0, postcode text NOT NULL DEFAULT '', items text NOT NULL, subtotal integer NOT NULL, created_at text NOT NULL, cart_id text NOT NULL, consent_version text NOT NULL)")
    .run();
  choicesReady = true;
}

/**
 * Inscription de robot (29/09) : une adresse Gmail truffée de points, avec des lettres isolées
 * (« va.k.a.bosap38.1@gmail.com »). Gmail ignore les points : un robot en sème au hasard pour
 * faire passer une même boîte pour des dizaines d'inscrits. Un humain n'écrit pas ainsi ;
 * « jean.pierre.dupont.75 » ou « j.p.martin » ne sont PAS repérés. Rien n'est effacé : l'inscription
 * est marquée « suspecte », écartée de la lettre d'ouverture, et l'administration propose de la supprimer.
 */
export function suspicion(email: string): string | null {
  const [local, domaine] = email.toLowerCase().split('@');
  if (!local || !domaine || !['gmail.com', 'googlemail.com'].includes(domaine)) return null;
  const morceaux = local.split('+')[0].split('.');
  const points = morceaux.length - 1;
  const isoles = morceaux.filter((m) => m.length === 1).length;
  return points >= 4 && isoles >= 2 ? 'adresse Gmail semée de points et de lettres isolées : forme typique des robots' : null;
}

/** Crée l’inscription ; rend sa référence, ou null si l’adresse était déjà inscrite pour ce modèle. */
export async function insertAlert(o: { email: string; productId: string; variant: string; source: string }) {
  await ensureAlertContact();
  return (await db())
    .prepare('INSERT INTO alerts (id,email,product_id,variant,created_at,consent_version,unsubscribe_token,source) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(email,product_id,variant) DO NOTHING RETURNING id')
    .bind(crypto.randomUUID(), o.email, o.productId, o.variant, new Date().toISOString(), CONSENT_VERSION, crypto.randomUUID(), o.source)
    .first<string>('id');
}
