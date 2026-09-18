import { categories } from '@/lib/catalog';
import { NotFoundHelp } from '@/components/not-found-help';

/**
 * La page 404 aide à naviguer : elle devine la page voulue (une lettre près), tend la recherche,
 * et pose les familles. Sans script, la recherche et les familles restent.
 */
export default function NotFound() {
  const families = categories.filter((c) => c.families.length === 1);
  return (
    <main id="contenu" className="page-wrap">
      <section className="not-found">
        <span className="eyebrow">404 / HORS DU RING</span>
        <h1>
          Cette page
          <br />a changé de coin.
        </h1>
        <p>L’adresse ne mène nulle part. Le catalogue, lui, est bien là : voici par où reprendre.</p>
        <NotFoundHelp />
        <nav className="not-found-families" aria-label="Les familles du catalogue">
          <h2>Par équipement</h2>
          <ul>
            {families.map((c) => (
              <li key={c.slug}>
                <a href={'/' + c.slug + '/'}>{c.name}</a>
              </li>
            ))}
            <li>
              <a href="/marques/">Les marques</a>
            </li>
            <li>
              <a href="/guides/">Les guides d’achat</a>
            </li>
          </ul>
        </nav>
        <a className="inline-link" href="/">
          Revenir à l’accueil ↗
        </a>
      </section>
    </main>
  );
}
