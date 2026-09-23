import { db } from './database';
import { shop } from './catalog';
import { QuotaExhausted, mailerConfigured, quotaToday, sendMail } from './mailer';

/**
 * La lettre d'ouverture : ce que reçoivent, le jour J, toutes les personnes inscrites à l'alerte.
 *
 *   Un brouillon (objet, texte) se prépare dans l'administration, s'envoie d'abord à l'administrateur
 *   pour contrôle, puis à tous les inscrits par lots — chaque envoi est journalisé par adresse, donc
 *   un envoi interrompu reprend sans doublon. Chaque message porte son lien de désinscription
 *   (page et en-tête « une seule action »), et le texte garde la voix de la boutique.
 */
export type Campaign = { id: string; subject: string; body: string; created_at: string; updated_at: string; test_sent_at: string | null; started_at: string | null; finished_at: string | null };
export type Subscriber = { email: string; token: string; first_seen: string };
export type Progress = { total: number; sent: number; failed: number; pending: number };

let ready = false;
async function ensure() {
  if (ready) return;
  const database = await db();
  await database.prepare('CREATE TABLE IF NOT EXISTS campaigns (id text PRIMARY KEY, subject text NOT NULL, body text NOT NULL, created_at text NOT NULL, updated_at text NOT NULL, test_sent_at text, started_at text, finished_at text)').run();
  await database.prepare('CREATE TABLE IF NOT EXISTS campaign_sends (campaign_id text NOT NULL, email text NOT NULL, status text NOT NULL, account text, error text, sent_at text NOT NULL, PRIMARY KEY (campaign_id, email))').run();
  ready = true;
}

/** Une adresse, une fois : la première inscription donne le jeton de désinscription. */
export async function subscribers(): Promise<Subscriber[]> {
  const rows = (
    await (await db()).prepare('SELECT lower(email) AS email, unsubscribe_token AS token, created_at FROM alerts ORDER BY created_at ASC').all<{ email: string; token: string; created_at: string }>()
  ).results;
  const seen = new Map<string, Subscriber>();
  for (const r of rows) if (!seen.has(r.email)) seen.set(r.email, { email: r.email, token: r.token, first_seen: r.created_at });
  return [...seen.values()];
}

export async function campaigns(): Promise<Campaign[]> {
  await ensure();
  return (await (await db()).prepare('SELECT * FROM campaigns ORDER BY updated_at DESC LIMIT 20').all<Campaign>()).results;
}

export async function campaign(id: string): Promise<Campaign | null> {
  await ensure();
  return (await (await db()).prepare('SELECT * FROM campaigns WHERE id=?').bind(id).first<Campaign>()) ?? null;
}

const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.replace(/\r\n/g, '\n').trim().slice(0, max) : '');

/** Enregistre ou met à jour le brouillon. Un envoi commencé ne se modifie plus. */
export async function saveCampaign(input: { id?: string; subject: unknown; body: unknown }): Promise<Campaign> {
  await ensure();
  const subject = clean(input.subject, 120);
  const body = clean(input.body, 6000);
  if (subject.length < 4 || body.length < 40) throw new Error('Un objet (4 signes au moins) et un texte (40 signes au moins) sont attendus.');
  const database = await db();
  const now = new Date().toISOString();
  if (input.id) {
    const current = await campaign(input.id);
    if (!current) throw new Error('Brouillon introuvable.');
    if (current.started_at) throw new Error('Cette lettre est partie : elle ne se modifie plus. Créez-en une autre.');
    await database.prepare('UPDATE campaigns SET subject=?, body=?, updated_at=? WHERE id=?').bind(subject, body, now, input.id).run();
    return (await campaign(input.id))!;
  }
  const id = crypto.randomUUID();
  await database.prepare('INSERT INTO campaigns (id, subject, body, created_at, updated_at) VALUES (?,?,?,?,?)').bind(id, subject, body, now, now).run();
  return (await campaign(id))!;
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Le message rendu : texte brut et HTML sobre, aux couleurs de la boutique, avec le lien de désinscription. */
export function render(c: Pick<Campaign, 'subject' | 'body'>, unsubscribeUrl: string) {
  const paragraphs = c.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const text = [c.body, '', '—', shop.name + ' · ' + shop.origin, 'Se désinscrire : ' + unsubscribeUrl].join('\n');
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(c.subject)}</title></head><body style="margin:0;background:#f1f0e9;color:#20241f;font:16px/1.6 Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f0e9"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff"><tr><td style="padding:28px 32px 8px;font:800 22px/1 Arial Black,Arial,sans-serif;letter-spacing:-0.01em">BOUTIQUE<br>DE BOXE.</td></tr><tr><td style="padding:8px 32px 0"><div style="height:4px;width:46px;background:#dded76"></div></td></tr><tr><td style="padding:20px 32px 8px;font:800 30px/1.05 Arial Black,Arial,sans-serif">${escape(c.subject)}</td></tr>${paragraphs.map((p) => `<tr><td style="padding:8px 32px;font:16px/1.6 Arial,Helvetica,sans-serif">${escape(p).replace(/\n/g, '<br>')}</td></tr>`).join('')}<tr><td style="padding:24px 32px 8px"><a href="${escape(shop.origin)}/" style="display:inline-block;background:#20241f;color:#f1f0e9;text-decoration:none;font-weight:700;padding:14px 22px">Voir la boutique</a></td></tr><tr><td style="padding:24px 32px 28px;font:12px/1.6 Arial,Helvetica,sans-serif;color:#64685f;border-top:1px solid #e3e4dc">${escape(shop.name)} · ${escape(shop.origin.replace(/^https?:\/\//, ''))}<br>Vous recevez ce message parce que vous avez demandé à être prévenu de l’ouverture des ventes. <a href="${escape(unsubscribeUrl)}" style="color:#455c29">Se désinscrire</a></td></tr></table></td></tr></table></body></html>`;
  return { text, html };
}

const unsubscribeUrl = (token: string) => `${shop.origin}/desinscription/?token=${token}&tout=1`;

export async function progress(id: string): Promise<Progress> {
  await ensure();
  const total = (await subscribers()).length;
  const rows = (await (await db()).prepare('SELECT status, count(*)::int AS n FROM campaign_sends WHERE campaign_id=? GROUP BY status').bind(id).all<{ status: string; n: number }>()).results;
  const sent = Number(rows.find((r) => r.status === 'sent')?.n || 0);
  const failed = Number(rows.find((r) => r.status === 'failed')?.n || 0);
  return { total, sent, failed, pending: Math.max(0, total - sent - failed) };
}

/** Le message d'essai, à l'administrateur seulement. */
export async function sendTest(id: string, to: string) {
  const c = await campaign(id);
  if (!c) throw new Error('Brouillon introuvable.');
  if (!mailerConfigured()) throw new Error('Aucun compte d’envoi configuré (SMTP_USER, SMTP_PASS, SMTP_FROM).');
  const { text, html } = render(c, unsubscribeUrl('00000000-0000-0000-0000-000000000000'));
  const r = await sendMail({ to, subject: '[Essai] ' + c.subject, text, html });
  await (await db()).prepare('UPDATE campaigns SET test_sent_at=? WHERE id=?').bind(new Date().toISOString(), id).run();
  return r;
}

/**
 * Un lot d'envois : les inscrits qui n'ont pas encore reçu cette lettre, dans la limite donnée.
 * S'arrête proprement quand le quota du jour est atteint ; l'administration reprend plus tard.
 */
export async function sendBatch(id: string, limit = 60): Promise<Progress & { quotaExhausted: boolean; batch: number }> {
  const c = await campaign(id);
  if (!c) throw new Error('Brouillon introuvable.');
  if (!mailerConfigured()) throw new Error('Aucun compte d’envoi configuré (SMTP_USER, SMTP_PASS, SMTP_FROM).');
  if (!c.test_sent_at) throw new Error('Envoyez-vous d’abord un essai : la lettre part telle quelle.');
  const database = await db();
  const now = new Date().toISOString();
  if (!c.started_at) await database.prepare('UPDATE campaigns SET started_at=? WHERE id=?').bind(now, id).run();
  const done = new Set((await database.prepare('SELECT email FROM campaign_sends WHERE campaign_id=? AND status=?').bind(id, 'sent').all<{ email: string }>()).results.map((r) => r.email));
  const attempts = new Map((await database.prepare('SELECT email, count(*)::int AS n FROM campaign_sends WHERE campaign_id=? GROUP BY email').bind(id).all<{ email: string; n: number }>()).results.map((r) => [r.email, Number(r.n)]));
  const targets = (await subscribers()).filter((s) => !done.has(s.email) && (attempts.get(s.email) || 0) < 3).slice(0, limit);
  let batch = 0;
  let quotaExhausted = false;
  for (const s of targets) {
    const { text, html } = render(c, unsubscribeUrl(s.token));
    try {
      const r = await sendMail({
        to: s.email,
        subject: c.subject,
        text,
        html,
        headers: { 'List-Unsubscribe': `<${shop.origin}/api/desabonnement?token=${s.token}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      });
      await database.prepare('INSERT INTO campaign_sends (campaign_id, email, status, account, error, sent_at) VALUES (?,?,?,?,?,?) ON CONFLICT (campaign_id, email) DO UPDATE SET status=excluded.status, account=excluded.account, error=NULL, sent_at=excluded.sent_at').bind(id, s.email, 'sent', r.account, null, new Date().toISOString()).run();
      batch++;
    } catch (error) {
      if (error instanceof QuotaExhausted) {
        quotaExhausted = true;
        break;
      }
      await database.prepare('INSERT INTO campaign_sends (campaign_id, email, status, account, error, sent_at) VALUES (?,?,?,?,?,?) ON CONFLICT (campaign_id, email) DO UPDATE SET status=excluded.status, error=excluded.error, sent_at=excluded.sent_at').bind(id, s.email, 'failed', null, String((error as Error).message).slice(0, 300), new Date().toISOString()).run();
    }
  }
  const p = await progress(id);
  if (p.pending === 0 && !c.finished_at) await database.prepare('UPDATE campaigns SET finished_at=? WHERE id=?').bind(new Date().toISOString(), id).run();
  return { ...p, quotaExhausted, batch };
}

/** L'état lu par l'administration : comptes, quota, inscrits, lettres et leur avancement. */
export async function newsletterStatus() {
  const subs = await subscribers();
  const list = await campaigns();
  const rows = await Promise.all(list.map(async (c) => ({ ...c, progress: await progress(c.id) })));
  return { configured: mailerConfigured(), quota: mailerConfigured() ? await quotaToday() : [], subscribers: subs.length, campaigns: rows };
}

/** Désinscrit une adresse entière à partir du jeton d'une de ses inscriptions. */
export async function unsubscribeAll(token: string) {
  const database = await db();
  const email = await database.prepare('SELECT email FROM alerts WHERE unsubscribe_token=?').bind(token).first<string>('email');
  if (!email) return false;
  await database.prepare('DELETE FROM alerts WHERE lower(email)=lower(?)').bind(email).run();
  return true;
}
