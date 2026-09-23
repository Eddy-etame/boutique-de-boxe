'use client';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { relayContact } from '@/lib/inlett';
import { ArrowUpRight } from 'lucide-react';

type ContactResponse = {
  error?: string;
  id: string;
  relayToken: string;
  relayStatus: string;
};

async function contactRequest(url: string, body: unknown, signal: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  const timer = setTimeout(
    () => controller.abort(new Error('Délai dépassé')),
    15000,
  );
  if (signal.aborted) abort();
  else signal.addEventListener('abort', abort, { once: true });
  try {
    controller.signal.throwIfAborted();
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      signal: controller.signal,
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as ContactResponse;
    controller.signal.throwIfAborted();
    if (!response.ok)
      throw new Error(result.error || 'Enregistrement impossible.');
    return result;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

export function ContactForm() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const active = useRef<AbortController | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.abort();
    };
  }, []);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const fields = Object.fromEntries(
      [...data.entries()].filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
    const fingerprint = JSON.stringify(fields);
    if (attempt.current?.fingerprint !== fingerprint)
      attempt.current = { fingerprint, key: crypto.randomUUID() };
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setStatus('');
    let saved = false;
    try {
      const result = await contactRequest(
        '/api/contact',
        { ...fields, requestKey: attempt.current.key },
        controller.signal,
      );
      saved = true;
      if (!mounted.current || controller.signal.aborted) return;
      setStatus(
        'Votre demande est enregistrée. Transmission au service de contact…',
      );
      const relay =
        result.relayStatus === 'pending'
          ? await relayContact(
              {
                name: fields.name,
                email: fields.email,
                message: fields.message,
                submission_reference: result.id,
              },
              controller.signal,
            )
          : result.relayStatus;
      if (!mounted.current || controller.signal.aborted) return;
      if (result.relayStatus === 'pending') {
        await contactRequest(
          '/api/contact-relay',
          { id: result.id, token: result.relayToken, state: relay },
          controller.signal,
        ).catch(() => undefined);
      }
      if (!mounted.current || controller.signal.aborted) return;
      setStatus(
        relay === 'accepted_client'
          ? 'Votre demande est enregistrée et transmise au service de contact. Boutique de Boxe vous répond à l’adresse indiquée.'
          : 'Votre demande est bien enregistrée par Boutique de Boxe. L’accusé de réception par e-mail n’a pas pu être confirmé ; inutile de renvoyer votre message.',
      );
      attempt.current = null;
      form.reset();
    } catch (error) {
      if (!mounted.current) return;
      setStatus(
        saved
          ? 'Votre demande est bien enregistrée. L’accusé de réception par e-mail n’a pas pu être confirmé ; inutile de renvoyer votre message.'
          : error instanceof Error && error.name !== 'AbortError'
            ? error.message
            : 'La réponse n’a pas pu être confirmée. Vos informations sont conservées ; réessayez sans modifier le message pour reprendre la même demande.',
      );
    } finally {
      if (active.current === controller) active.current = null;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <form
      className="contact-form"
      method="post"
      action="/api/contact"
      onSubmit={submit}
    >
      <label>
        Votre nom
        <input
          name="name"
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
          disabled={busy}
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
          disabled={busy}
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
          disabled={busy}
          placeholder="Le modèle, votre pratique, les précisions utiles…"
        />
      </label>
      <label className="honeypot" aria-hidden="true">
        Laisser vide
        <input
          name="website"
          tabIndex={-1}
          autoComplete="off"
          disabled={busy}
        />
      </label>
      <p className="form-privacy">
        Vos informations servent à traiter votre demande.{' '}
        <a href="/confidentialite/">Lire la politique de confidentialité.</a>
      </p>
      <button className="button button-blue" disabled={busy}>
        {busy ? 'Transmission en cours…' : 'Envoyer ma demande'}
        <ArrowUpRight size={20} aria-hidden="true" />
      </button>
      {status && (
        <p role="status" className="form-status">
          {status}
        </p>
      )}
    </form>
  );
}

export function Unsubscribe({ token, all = false }: { token: string; all?: boolean }) {
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
            body: JSON.stringify({ token, all }),
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
