import nodemailer from 'nodemailer';
import { db } from './database';
import { shop } from './catalog';

/**
 * L'envoi d'e-mails de la boutique.
 *
 * D'abord Resend (1er/10) : c'est la voie qui marche sur l'autre boutique du groupe (box-plus), où le
 * compte Brevo a été banni — les deux comptes SMTP d'ici répondent « 535 Authentication failed ».
 *   RESEND_API_KEY  : la clé du compte Resend (domaine boxingcenter.fr vérifié)
 *   MAIL_FROM       : l'expéditeur ; à défaut « Boutique de Boxe <no-reply@boxingcenter.fr> »
 *   MAIL_REPLY_TO   : l'adresse de réponse ; à défaut celle de la boutique
 *   RESEND_DAILY_QUOTA : envois par jour pour la lettre (80 par défaut : l'offre gratuite de Resend
 *                        s'arrête à 100 par jour, et box-plus envoie par le même compte)
 *
 * Ensuite, en repli, le SMTP d'origine (Brevo) : un ou plusieurs comptes en rotation.
 *   SMTP_HOST / SMTP_PORT / SMTP_SECURE, SMTP_USER / SMTP_PASS / SMTP_FROM, SMTP_2_USER / SMTP_2_PASS …
 *
 * Le compteur du jour vit en base, pas en mémoire : plusieurs instances du serveur voient le même
 * quota. Sans aucun compte, `mailerConfigured()` est faux : l'administration le dit et n'envoie rien.
 */
type Smtp = { kind: 'smtp'; label: string; quota: number; host: string; port: number; secure: boolean; user: string; pass: string; from: string };
type Resend = { kind: 'resend'; label: string; quota: number; key: string; from: string; replyTo: string; api: string };
export type MailAccount = Smtp | Resend;
export const DAILY_QUOTA = Number(process.env.SMTP_DAILY_QUOTA || 280);
const RESEND_SENDER = `${shop.name} <no-reply@boxingcenter.fr>`;

const nu = (v: string | undefined) => String(v || '').trim().replace(/^["']|["']$/g, '');

export function mailAccounts(env: NodeJS.ProcessEnv = process.env): MailAccount[] {
  const out: MailAccount[] = [];
  const key = nu(env.RESEND_API_KEY);
  if (key)
    out.push({
      kind: 'resend',
      label: 'resend',
      quota: Number(env.RESEND_DAILY_QUOTA || 80),
      key,
      from: nu(env.MAIL_FROM) || RESEND_SENDER,
      replyTo: nu(env.MAIL_REPLY_TO) || shop.email,
      api: nu(env.RESEND_API_URL) || 'https://api.resend.com/emails',
    });
  const host = env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(env.SMTP_PORT || 587);
  const secure = env.SMTP_SECURE === 'true';
  const from = env.SMTP_FROM || '';
  if (env.SMTP_USER && env.SMTP_PASS && from) out.push({ kind: 'smtp', label: 'compte-1', quota: DAILY_QUOTA, host, port, secure, user: env.SMTP_USER, pass: env.SMTP_PASS, from });
  for (let n = 2; n <= 20; n++) {
    const user = env[`SMTP_${n}_USER`];
    const pass = env[`SMTP_${n}_PASS`];
    if (user && pass && from) out.push({ kind: 'smtp', label: `compte-${n}`, quota: DAILY_QUOTA, host, port, secure, user, pass, from: env[`SMTP_${n}_FROM`] || from });
  }
  return out;
}

export const mailerConfigured = () => mailAccounts().length > 0;
/** La voie d'envoi en service, pour l'affichage de l'administration. */
export const mailerRoute = () => (mailAccounts()[0]?.kind === 'resend' ? 'Resend' : mailAccounts().length ? 'SMTP' : null);

const today = () => new Date().toISOString().slice(0, 10);

let quotaReady = false;
async function ensureQuota() {
  if (quotaReady) return;
  await (await db()).prepare('CREATE TABLE IF NOT EXISTS mail_quota (account text NOT NULL, day text NOT NULL, sent integer NOT NULL DEFAULT 0, PRIMARY KEY (account, day))').run();
  quotaReady = true;
}

/** Les envois du jour par compte, et ce qu'il reste. */
export async function quotaToday(): Promise<{ account: string; sent: number; left: number }[]> {
  await ensureQuota();
  const rows = (await (await db()).prepare('SELECT account, sent FROM mail_quota WHERE day=?').bind(today()).all<{ account: string; sent: number }>()).results;
  return mailAccounts().map((a) => {
    const sent = Number(rows.find((r) => r.account === a.label)?.sent || 0);
    return { account: a.label, sent, left: Math.max(0, a.quota - sent) };
  });
}

export class QuotaExhausted extends Error {
  constructor() {
    super('Le quota d’envoi du jour est atteint sur tous les comptes. Reprenez demain.');
    this.name = 'QuotaExhausted';
  }
}

/** `key` : un envoi identifié (lettre + destinataire) que Resend ne délivre qu'une fois, même rejoué. */
export type Mail = { to: string; subject: string; text: string; html: string; headers?: Record<string, string>; key?: string };

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Resend accepte deux requêtes par seconde : on espace les envois d'une même instance.
let dernierEnvoiResend = 0;

async function parResend(a: Resend, mail: Mail): Promise<string> {
  for (let essai = 0; essai < 2; essai++) {
    const attente = dernierEnvoiResend + 550 - Date.now();
    if (attente > 0) await pause(attente);
    dernierEnvoiResend = Date.now();
    const r = await fetch(a.api, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${a.key}`, 'Content-Type': 'application/json', ...(mail.key ? { 'Idempotency-Key': mail.key.slice(0, 256) } : {}) },
      body: JSON.stringify({ from: a.from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html, reply_to: a.replyTo, ...(mail.headers ? { headers: mail.headers } : {}) }),
    });
    const data = (await r.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (r.ok) return String(data.id || '');
    // Trop vite : une seconde, puis un seul nouvel essai.
    if (r.status === 429 && essai === 0) {
      await pause(1100);
      continue;
    }
    throw new Error(`Resend ${r.status} : ${data.message || data.name || 'refus'}`);
  }
  throw new Error('Resend : trop de requêtes.');
}

async function parSmtp(a: Smtp, mail: Mail): Promise<string> {
  const transporter = nodemailer.createTransport({ host: a.host, port: a.port, secure: a.secure, auth: { user: a.user, pass: a.pass }, connectionTimeout: 15000, socketTimeout: 20000 });
  const info = await transporter.sendMail({ from: a.from, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html, headers: mail.headers });
  return String(info.messageId || '');
}

/**
 * Envoie un message par le premier compte qui a encore du quota ; en cas d'erreur, essaie le
 * suivant. Rend le compte utilisé. Lève `QuotaExhausted` quand plus aucun compte ne peut envoyer.
 */
export async function sendMail(mail: Mail): Promise<{ account: string; id: string }> {
  await ensureQuota();
  const database = await db();
  const day = today();
  let lastError: Error | null = null;
  for (const account of mailAccounts()) {
    // Réserve une unité de quota avant l'envoi : deux instances ne dépassent jamais la limite ensemble.
    const claimed = await database
      .prepare(
        'INSERT INTO mail_quota (account, day, sent) VALUES (?, ?, 1) ON CONFLICT (account, day) DO UPDATE SET sent = mail_quota.sent + 1 WHERE mail_quota.sent < ? RETURNING sent',
      )
      .bind(account.label, day, account.quota)
      .first<number>('sent');
    if (claimed === null || claimed === undefined) continue;
    try {
      const id = account.kind === 'resend' ? await parResend(account, mail) : await parSmtp(account, mail);
      return { account: account.label, id };
    } catch (error) {
      lastError = error as Error;
      console.error('mail', account.label, (error as Error).message);
      // L'unité réservée n'a pas servi : on la rend.
      await database.prepare('UPDATE mail_quota SET sent = GREATEST(sent - 1, 0) WHERE account=? AND day=?').bind(account.label, day).run();
    }
  }
  if (lastError) throw lastError;
  throw new QuotaExhausted();
}
