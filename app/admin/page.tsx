import type { Metadata } from 'next';
import { Admin } from '@/components/admin';
import { Breadcrumb } from '@/components/shop-shell';
import { isAdmin } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Administration',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  return (
    <main id="contenu" className="page-wrap admin-page">
      <Breadcrumb items={[{ label: 'Administration' }]} />
      <header className="article-heading">
        <span className="eyebrow">L’ATELIER / ACCÈS PRIVÉ</span>
        <h1>Préparer la suite.</h1>
      </header>
      {(await isAdmin()) ? (
        <Admin />
      ) : (
        <div className="empty-state">
          <h2>Accès réservé.</h2>
          <p>
            Connectez-vous avec le compte administrateur autorisé de cette
            boutique.
          </p>
          <form
            method="post"
            action="/api/auth/magic-link"
            className="atelier-signin"
          >
            <label htmlFor="owner-email">Adresse e-mail du propriétaire</label>
            <input
              id="owner-email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
            <button type="submit" className="button button-dark">
              Recevoir le lien de connexion
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
