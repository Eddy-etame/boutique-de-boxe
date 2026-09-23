'use client';
import { useCallback, useEffect, useState } from 'react';

/**
 * La lettre d'ouverture, dans l'administration : l'état des envois (comptes, quota du jour,
 * inscrits), le brouillon (objet, texte, aperçu), l'essai à soi-même, puis l'envoi à tous par
 * lots, avec reprise. Rien ne part sans essai préalable ni sans le mot de confirmation.
 */
type Progress = { total: number; sent: number; failed: number; pending: number };
type Campaign = { id: string; subject: string; body: string; created_at: string; updated_at: string; test_sent_at: string | null; started_at: string | null; finished_at: string | null; progress: Progress };
type Status = { configured: boolean; quota: { account: string; sent: number; left: number }[]; subscribers: number; campaigns: Campaign[] };

const DEFAULT_SUBJECT = 'Les ventes sont ouvertes';
const DEFAULT_BODY = `Bonjour,

Vous nous aviez demandé de vous prévenir : c’est le jour. La boutique est ouverte, avec les tailles réelles de chaque modèle et les prix annoncés.

Le matériel part de France, à domicile ou en point relais. Si vous aviez repéré un modèle, sa fiche vous attend.

À bientôt,
Boutique de Boxe`;

async function call<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error(data.error || 'La demande a échoué.');
  return data;
}

export function NewsletterAdmin() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [id, setId] = useState<string | null>(null);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [confirm, setConfirm] = useState('');
  const [preview, setPreview] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await call<Status>('/api/commerce/admin-newsletter');
      setStatus(s);
      return s;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lecture impossible.');
      return null;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    // La lecture part au tour suivant : l'effet ne pose aucun état lui-même.
    const timer = setTimeout(() => {
      void load().then((s) => {
        if (!alive || !s) return;
        // Le dernier brouillon non parti revient dans l'éditeur.
        const draft = s.campaigns.find((c) => !c.started_at);
        if (draft) {
          setId(draft.id);
          setSubject(draft.subject);
          setBody(draft.body);
        }
      });
    }, 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [load]);

  const run = async (label: string, fn: () => Promise<string>) => {
    setBusy(label);
    setError('');
    setNotice('');
    try {
      setNotice(await fn());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Un problème est survenu.');
    } finally {
      setBusy('');
    }
  };

  const save = () =>
    run('save', async () => {
      const c = await call<Campaign>('/api/commerce/admin-newsletter-save', { id, subject, body });
      setId(c.id);
      return 'Brouillon enregistré.';
    });
  const test = () =>
    run('test', async () => {
      const c = id ? { id } : await call<Campaign>('/api/commerce/admin-newsletter-save', { id, subject, body });
      if (!id) setId(c.id);
      const r = await call<{ to: string; account: string }>('/api/commerce/admin-newsletter-test', { id: c.id });
      return `Essai envoyé à ${r.to} par le ${r.account}. Relisez-le avant l’envoi à tous.`;
    });
  const send = () =>
    run('send', async () => {
      if (!id) throw new Error('Enregistrez et testez la lettre d’abord.');
      const r = await call<Progress & { quotaExhausted: boolean; batch: number }>('/api/commerce/admin-newsletter-send', { id, confirm });
      setConfirm('');
      return r.quotaExhausted
        ? `Quota du jour atteint : ${r.sent} envoyés, ${r.pending} restent. Reprenez demain, l’envoi continue là où il s’est arrêté.`
        : r.pending > 0
          ? `${r.batch} envoyés dans ce lot, ${r.sent} au total, ${r.pending} restent : cliquez « Continuer l’envoi ».`
          : `Terminé : ${r.sent} envoyés, ${r.failed} en échec.`;
    });

  const current = status?.campaigns.find((c) => c.id === id) || null;
  const started = Boolean(current?.started_at);
  const quotaLeft = status?.quota.reduce((n, q) => n + q.left, 0) ?? 0;

  return (
    <div className="admin-inbox newsletter">
      <p>
        La lettre que reçoivent tous les inscrits le jour de l’ouverture. Elle s’écrit ici, s’envoie d’abord à vous pour relecture, puis à tous
        par lots de soixante, en respectant le quota quotidien des comptes d’envoi. Chaque message porte son lien de désinscription.
      </p>
      {status && (
        <div className="admin-stats newsletter-stats">
          <div>
            <strong>{status.subscribers}</strong>
            <span>adresses inscrites (une fois chacune)</span>
          </div>
          <div>
            <strong>{status.configured ? status.quota.length : 0}</strong>
            <span>{status.configured ? 'compte' + (status.quota.length > 1 ? 's' : '') + ' d’envoi (Brevo)' : 'compte d’envoi : à configurer dans Vercel (SMTP_USER, SMTP_PASS, SMTP_FROM)'}</span>
          </div>
          <div>
            <strong>{quotaLeft}</strong>
            <span>envois encore possibles aujourd’hui</span>
          </div>
          <div>
            <strong>{Math.ceil(status.subscribers / Math.max(1, quotaLeft || 1))}</strong>
            <span>jour{Math.ceil(status.subscribers / Math.max(1, quotaLeft || 1)) > 1 ? 's' : ''} pour tout envoyer au rythme actuel</span>
          </div>
        </div>
      )}

      <div className="newsletter-editor">
        <label>
          Objet
          <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} disabled={started} />
        </label>
        <label>
          Texte (un paragraphe par ligne vide)
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} maxLength={6000} disabled={started} />
        </label>
        <div className="newsletter-actions">
          <button type="button" className="button button-dark" onClick={save} disabled={Boolean(busy) || started}>
            {busy === 'save' ? '…' : 'Enregistrer le brouillon'}
          </button>
          <button type="button" className="button" onClick={() => setPreview(!preview)}>
            {preview ? 'Masquer l’aperçu' : 'Voir l’aperçu'}
          </button>
          <button type="button" className="button" onClick={test} disabled={Boolean(busy) || !status?.configured}>
            {busy === 'test' ? '…' : 'M’envoyer un essai'}
          </button>
        </div>
        {preview && (
          <div className="newsletter-preview">
            <div className="newsletter-preview-subject">{subject}</div>
            {body
              .split(/\n{2,}/)
              .filter((p) => p.trim())
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            <p className="atelier-muted">Boutique de Boxe · www.boutique-de-boxe.com · Se désinscrire</p>
          </div>
        )}
      </div>

      <div className="newsletter-send">
        <h3>Envoyer à tous les inscrits</h3>
        {current?.test_sent_at ? (
          <p>
            Essai envoyé le {new Date(current.test_sent_at).toLocaleString('fr-FR')}.{' '}
            {current.progress.sent > 0 && `${current.progress.sent} envoyés, ${current.progress.failed} en échec, ${current.progress.pending} restent.`}
          </p>
        ) : (
          <p className="atelier-muted">Envoyez-vous d’abord un essai : la lettre part telle quelle.</p>
        )}
        <label>
          Tapez ENVOYER pour confirmer
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="ENVOYER" autoComplete="off" />
        </label>
        <button type="button" className="button button-dark" onClick={send} disabled={Boolean(busy) || !current?.test_sent_at || confirm !== 'ENVOYER' || (current?.progress.pending ?? 1) === 0}>
          {busy === 'send' ? 'Envoi en cours…' : current?.started_at ? 'Continuer l’envoi' : `Envoyer à ${status?.subscribers ?? 0} inscrits`}
        </button>
      </div>

      {status && status.campaigns.length > 0 && (
        <div className="atelier-table">
          <table>
            <thead>
              <tr>
                <th scope="col">Lettre</th>
                <th scope="col">Essai</th>
                <th scope="col">Envoyés</th>
                <th scope="col">Échecs</th>
                <th scope="col">Restent</th>
                <th scope="col">État</th>
              </tr>
            </thead>
            <tbody>
              {status.campaigns.map((c) => (
                <tr key={c.id}>
                  <td>
                    <button type="button" className="text-button" onClick={() => { setId(c.id); setSubject(c.subject); setBody(c.body); }}>
                      {c.subject}
                    </button>
                  </td>
                  <td>{c.test_sent_at ? 'oui' : '—'}</td>
                  <td>{c.progress.sent}</td>
                  <td>{c.progress.failed}</td>
                  <td>{c.progress.pending}</td>
                  <td>{c.finished_at ? 'terminée' : c.started_at ? 'en cours' : 'brouillon'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p role="alert" className="form-status">
          {error}
        </p>
      )}
    </div>
  );
}
