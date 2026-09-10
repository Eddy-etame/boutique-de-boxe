import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hors ligne',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main id="contenu" className="page-wrap">
      <section className="not-found">
        <span className="eyebrow">HORS LIGNE</span>
        <h1>Pas de connexion.</h1>
        <p>
          Les pages déjà ouvertes restent disponibles. Reconnectez-vous pour voir les
          autres modèles et votre panier.
        </p>
        <a className="button button-dark" href="/">
          Revenir à l’accueil
        </a>
      </section>
    </main>
  );
}
