export default function NotFound() {
  return (
    <main id="contenu" className="page-wrap">
      <section className="not-found">
        <span className="eyebrow">404 / HORS DU RING</span>
        <h1>
          Cette page
          <br />a changé de coin.
        </h1>
        <p>
          Reprenez votre recherche parmi les équipements et les guides du
          catalogue.
        </p>
        <a className="button button-dark" href="/materiel-sport-de-combat/">
          Retrouver le catalogue ↗
        </a>
      </section>
    </main>
  );
}
