import nodemailer from 'nodemailer';
import { db } from './database';

/**
 * L'envoi d'e-mails de la boutique par SMTP (Brevo) : un ou plusieurs comptes en rotation, chacun
 * limité à ~300 envois par jour sur l'offre gratuite. Le compteur du jour vit en base, pas en
 * mémoire : plusieurs instances du serveur voient le même quota.
 *
 *   SMTP_HOST / SMTP_PORT / SMTP_SECURE : le relais (Brevo : smtp-relay.brevo.com, 587, false)
 *   SMTP_USER / SMTP_PASS / SMTP_FROM   : le premier compte et l'expéditeur vérifié
 *   SMTP_2_USER / SMTP_2_PASS …         : les comptes suivants (même relais, même expéditeur)
 *
 * Sans compte, `mailerConfigured()` est faux : l'administration le dit et n'envoie rien.
 */
export type MailAccount = { label: string; host: string; port: number; secure: boolean; user: string; pass: string; from: string };
export const DAILY_QUOTA = Number(process.env.SMTP_DAILY_QUOTA || 280);

export function mailAccounts(env: NodeJS.ProcessEnv = process.env): MailAccount[] {
  const host = env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(env.SMTP_PORT || 587);
  const secure = env.SMTP_SECURE === 'true';
  const from = env.SMTP_FROM || '';
  const out: MailAccount[] = [];
  if (env.SMTP_USER && env.SMTP_PASS && from) out.push({ label: 'compte-1', host, port, secure, user: env.SMTP_USER, pass: env.SMTP_PASS, from });
  for (let n = 2; n <= 20; n++) {
    const user = env[`SMTP_${n}_USER`];
    const pass = env[`SMTP_${n}_PASS`];
    if (user && pass && from) out.push({ label: `compte-${n}`, host, port, secure, user, pass, from: env[`SMTP_${n}_FROM`] || from });
  }
  return out;
}

export const mailerConfigured = () => mailAccounts().length > 0;

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
    return { account: a.label, sent, left: Math.max(0, DAILY_QUOTA - sent) };
  });
}

export class QuotaExhausted extends Error {
  constructor() {
    super('Le quota d’envoi du jour est atteint sur tous les comptes. Reprenez demain.');
    this.name = 'QuotaExhausted';
  }
}

export type Mail = { to: string; subject: string; text: string; html: string; headers?: Record<string, string> };

/**
 * Envoie un message par le premier compte qui a encore du quota ; en cas d'erreur du relais, essaie
 * le suivant. Rend le compte utilisé. Lève `QuotaExhausted` quand plus aucun compte ne peut envoyer.
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
      .bind(account.label, day, DAILY_QUOTA)
      .first<number>('sent');
    if (claimed === null || claimed === undefined) continue;
    try {
      const transporter = nodemailer.createTransport({ host: account.host, port: account.port, secure: account.secure, auth: { user: account.user, pass: account.pass }, connectionTimeout: 15000, socketTimeout: 20000 });
      const info = await transporter.sendMail({ from: account.from, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html, headers: mail.headers });
      return { account: account.label, id: String(info.messageId || '') };
    } catch (error) {
      lastError = error as Error;
      console.error('smtp', account.label, (error as Error).message);
      // L'unité réservée n'a pas servi : on la rend.
      await database.prepare('UPDATE mail_quota SET sent = GREATEST(sent - 1, 0) WHERE account=? AND day=?').bind(account.label, day).run();
    }
  }
  if (lastError) throw lastError;
  throw new QuotaExhausted();
}
