import { categories, shop } from '@/lib/catalog';
import { globalCopy as g } from '@/lib/next/copy/global';
import { BagLink } from './bag-link';

const mainFamilies = categories.filter((c) =>
  ['gants-de-boxe', 'gants-mma', 'protections-boxe', 'textile-boxe', 'sacs-de-frappe'].includes(c.slug),
);

export function NextHeader() {
  return (
    <header className="ne ne-header">
      <a className="ne-brand" href="/">
        {shop.name}
        <small>{g.tagline}</small>
      </a>
      <nav className="ne-nav" aria-label={g.a11y.mainMenu}>
        {mainFamilies.map((c) => (
          <a key={c.slug} href={`/${c.slug}/`}>
            {c.name}
          </a>
        ))}
        <a href="/guides/">{g.nav.guides}</a>
        <a href="/contact/">{g.nav.contact}</a>
      </nav>
      <BagLink label={g.nav.bag} />
    </header>
  );
}

export function NextFooter() {
  return (
    <footer className="ne ne-footer">
      <div>
        <p className="ne-label">{g.footer.about}</p>
        <p className="ne-muted">{shop.name}</p>
      </div>
      <div>
        <p className="ne-label">{g.nav.catalogue}</p>
        {categories.map((c) => (
          <a key={c.slug} href={`/${c.slug}/`}>
            {c.name}
          </a>
        ))}
      </div>
      <div>
        <p className="ne-label">{g.footer.legalLinks}</p>
        <a href="/livraison/">Livraison</a>
        <a href="/retours/">Retours</a>
        <a href="/mentions-legales/">Mentions légales</a>
        <a href="/conditions-generales-de-vente/">Conditions générales de vente</a>
        <a href="/confidentialite/">Confidentialité</a>
      </div>
      <div>
        <p className="ne-label">{g.footer.contact}</p>
        <a href="/contact/">{g.nav.contact}</a>
        <p className="ne-muted">{g.footer.sales}</p>
      </div>
    </footer>
  );
}
