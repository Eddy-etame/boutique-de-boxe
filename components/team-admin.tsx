'use client';
import { useEffect, useState } from 'react';

/**
 * Équipe et accès (29/09) : qui peut ouvrir l'administration, sur quels appareils, et les liens de
 * connexion à copier — sans e-mail, donc sans la limite de 2 envois par heure de Supabase.
 */
type Equipe = {
  moi: string;
  proprietaire: boolean;
  proprietaireEmail: string;
  membres: { email: string; added_by: string; created_at: string }[];
  sessions: { id: string; email: string; created_at: number; last_seen: number; expires_at: number; agent: string }[];
};

const appareil = (ua: string) => {
  const os = /iPhone|iPad/.test(ua) ? 'iPhone / iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Appareil';
  const nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return [os, nav].filter(Boolean).join(' · ');
};
const jour = (ms: number) => new Date(Number(ms)).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

async function poster(body: unknown) {
  const r = await fetch('/api/auth/equipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Action impossible.');
  return d;
}

export function TeamAdmin() {
  const [data, setData] = useState<Equipe>();
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [lien, setLien] = useState<{ email: string; url: string; expire: string } | null>(null);

  async function charger() {
    try {
      const r = await fetch('/api/auth/equipe', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Indisponible.');
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Indisponible.');
    }
  }
  useEffect(() => {
    void charger();
  }, []);

  async function creerLien(email: string) {
    setError('');
    try {
      const d = await poster({ op: 'lien', email });
      setLien({ email: email || data!.moi, url: d.url, expire: d.expire });
      await navigator.clipboard?.writeText(d.url).catch(() => undefined);
      setStatus('Lien copié. Envoyez-le par WhatsApp ou SMS : il ouvre un seul appareil, pendant 24 heures.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.');
    }
  }
  async function agir(body: unknown, message: string) {
    setError('');
    try {
      await poster(body);
      setStatus(message);
      await charger();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.');
    }
  }

  if (error && !data) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Chargement de l’équipe…</p>;
  const tous = [data.proprietaireEmail, ...data.membres.map((m) => m.email).filter((e) => e !== data.proprietaireEmail)].filter(Boolean);

  return (
    <div className="admin-inbox team-admin">
      <p>
        Qui peut ouvrir l’administration. Un lien de connexion se copie ici et s’envoie par WhatsApp ou SMS : il ouvre
        un appareil, une seule fois, dans les 24 heures, sans passer par l’e-mail. Chaque appareil reste connecté
        30 jours, prolongés tant qu’il sert. Le lien par e-mail de la page de connexion reste possible, limité à
        2 envois par heure par Supabase.
      </p>
      {error && <p role="alert" className="commerce-error">{error}</p>}
      {status && <p role="status">{status}</p>}
      {lien && (
        <div className="team-link">
          <strong>Lien pour {lien.email}</strong>
          <input readOnly value={lien.url} onFocus={(e) => e.currentTarget.select()} aria-label="Lien de connexion" />
          <small>Valable jusqu’au {new Date(lien.expire).toLocaleString('fr-FR')} · une seule utilisation</small>
        </div>
      )}

      <h2>L’équipe</h2>
      <div className="atelier-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Adresse</th>
              <th scope="col">Rôle</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tous.map((email) => (
              <tr key={email}>
                <td>{email}</td>
                <td>{email === data.proprietaireEmail ? 'Propriétaire' : 'Membre'}</td>
                <td className="atelier-actions">
                  {(data.proprietaire || email === data.moi) && (
                    <button className="text-button" type="button" onClick={() => void creerLien(email)}>
                      Copier un lien de connexion
                    </button>
                  )}
                  {data.proprietaire && email !== data.proprietaireEmail && (
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Retirer ${email} ? Ses appareils seront déconnectés.`)) void agir({ op: 'retirer', email }, `${email} retiré.`);
                      }}
                    >
                      Retirer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.proprietaire && (
        <form
          className="team-add"
          onSubmit={(e) => {
            e.preventDefault();
            void agir({ op: 'ajouter', email: nouveau }, `${nouveau} peut maintenant ouvrir l’administration.`).then(() => setNouveau(''));
          }}
        >
          <label htmlFor="team-new">Ajouter une adresse</label>
          <input id="team-new" type="email" required value={nouveau} onChange={(e) => setNouveau(e.target.value)} autoComplete="off" />
          <button className="button button-dark" type="submit">
            Ajouter à l’équipe
          </button>
        </form>
      )}

      <h2>{data.proprietaire ? 'Appareils connectés' : 'Vos appareils connectés'}</h2>
      {data.sessions.length === 0 ? (
        <p className="empty-state">Aucun appareil connecté par lien d’équipe.</p>
      ) : (
        <div className="atelier-table">
          <table>
            <thead>
              <tr>
                <th scope="col">Adresse</th>
                <th scope="col">Appareil</th>
                <th scope="col">Dernière activité</th>
                <th scope="col">Expire</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.email}</td>
                  <td>{appareil(s.agent)}</td>
                  <td>{jour(s.last_seen)}</td>
                  <td>{jour(s.expires_at)}</td>
                  <td className="atelier-actions">
                    {data.proprietaire && (
                      <button className="text-button" type="button" onClick={() => void agir({ op: 'fermer', id: s.id }, 'Appareil déconnecté.')}>
                        Déconnecter
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
