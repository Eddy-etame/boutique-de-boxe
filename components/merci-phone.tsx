'use client';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * Le second temps de l'inscription, sur la page merci : le mobile, facultatif, pour un SMS le jour
 * de l'ouverture. La référence n'a été rendue qu'une fois, à l'auteur de l'inscription ; elle ne
 * sert qu'à cette écriture.
 */
export function MerciPhone({ email, reference }: { email: string; reference: string }) {
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'skipped' | 'error'>('idle');
  const [error, setError] = useState('');
  if (state === 'done')
    return (
      <p className="merci-phone-done" role="status">
        <strong>C’est noté.</strong> Un e-mail et un SMS le matin de l’ouverture. Rien d’autre.
      </p>
    );
  if (state === 'skipped') return null;
  return (
    <form
      className="alert-form alert-form-phone merci-phone"
      onSubmit={async (e) => {
        e.preventDefault();
        setState('busy');
        setError('');
        try {
          const r = await fetch('/api/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, ref: reference, phone, smsConsent: true, website: '' }),
          });
          const data = (await r.json()) as { error?: string };
          if (!r.ok) throw new Error(data.error || 'Le numéro n’a pas pu être enregistré.');
          setState('done');
        } catch (err) {
          setState('error');
          setError(err instanceof Error ? err.message : 'Un problème est survenu. Réessayez.');
        }
      }}
    >
      <p className="alert-done">
        <strong>Un SMS en plus, le matin de l’ouverture ?</strong> Facultatif : votre numéro ne sert qu’à ça.
      </p>
      <label htmlFor="merci-phone">Votre numéro de mobile</label>
      <div className="alert-input">
        <input id="merci-phone" name="phone" type="tel" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} placeholder="06 12 34 56 78" autoComplete="tel" />
        <button disabled={state === 'busy'} aria-label="Ajouter mon numéro">
          {state === 'busy' ? '…' : <ArrowRight size={20} />}
        </button>
      </div>
      <label className="consent">
        <input type="checkbox" name="smsConsent" required />
        J’accepte de recevoir un SMS le jour de l’ouverture. <a href="/confidentialite/">Confidentialité</a>
      </label>
      <button type="button" className="text-button" onClick={() => setState('skipped')}>
        Non merci, l’e-mail suffit
      </button>
      {error && (
        <p role="alert" className="form-status">
          {error}
        </p>
      )}
    </form>
  );
}
