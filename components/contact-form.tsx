'use client';
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
export function ContactForm() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="contact-form"
      method="post"
      action="/api/contact"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        setBusy(true);
        setStatus('');
        try {
          const r = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.fromEntries(data)),
          });
          const result = (await r.json()) as { error?: string };
          if (!r.ok)
            throw new Error(result.error || 'Enregistrement impossible.');
          setStatus(
            'Votre demande est enregistrée. L’équipe Boxing Center pourra vous répondre à l’adresse indiquée.',
          );
          form.reset();
        } catch (error) {
          setStatus(
            error instanceof Error
              ? error.message
              : 'Réessayez dans un instant.',
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Votre nom
        <input
          name="name"
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
        />
      </label>
      <label>
        Votre adresse e-mail
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
        />
      </label>
      <label>
        Votre question
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          placeholder="Le modèle, votre pratique, les précisions utiles…"
        />
      </label>
      <label className="honeypot" aria-hidden="true">
        Laisser vide
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <p className="form-privacy">
        Vos informations servent à traiter votre demande.{' '}
        <a href="/confidentialite/">Lire la politique de confidentialité.</a>
      </p>
      <button className="button button-blue" disabled={busy}>
        {busy ? 'Enregistrement…' : 'Envoyer ma demande'}
        <ArrowUpRight size={20} />
      </button>
      {status && (
        <p role="status" className="form-status">
          {status}
        </p>
      )}
    </form>
  );
}
export function Unsubscribe({ token }: { token: string }) {
  const [status, setStatus] = useState('');
  return (
    <div className="unsubscribe-panel">
      <h1>Se désinscrire d’une alerte.</h1>
      <p>
        Confirmez la suppression de cette inscription. Vos autres alertes
        restent indépendantes.
      </p>
      <button
        className="button button-dark"
        disabled={!token || !!status}
        onClick={async () => {
          const r = await fetch('/api/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          setStatus(
            r.ok
              ? 'Cette inscription a été supprimée.'
              : 'Le lien est invalide ou le service est indisponible. Contactez boxingcenter31@gmail.com.',
          );
        }}
      >
        Supprimer cette inscription
      </button>
      <p role="status">
        {status ||
          (!token ? 'Ouvrez le lien complet reçu dans votre message.' : '')}
      </p>
    </div>
  );
}
