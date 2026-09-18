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

/** Crée l’inscription ; rend sa référence, ou null si l’adresse était déjà inscrite pour ce modèle. */
export async function insertAlert(o: { email: string; productId: string; variant: string; source: string }) {
  await ensureAlertContact();
  return (await db())
    .prepare('INSERT INTO alerts (id,email,product_id,variant,created_at,consent_version,unsubscribe_token,source) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(email,product_id,variant) DO NOTHING RETURNING id')
    .bind(crypto.randomUUID(), o.email, o.productId, o.variant, new Date().toISOString(), CONSENT_VERSION, crypto.randomUUID(), o.source)
    .first<string>('id');
}
