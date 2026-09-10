import type { Product } from '@/lib/catalog';
import { categories, getCategoryProducts } from '@/lib/catalog';
import { guides } from '@/lib/editorial';
import { homeCopy as h } from '@/lib/next/copy/home';
import { HeroA } from './hero-a';
import { HeroB } from './hero-b';
import { HeroSwitch } from './hero-switch';
import { AlertForm } from '@/components/shop-interactions';
import { commerceCopy as c } from '@/lib/next/copy/commerce';

const familySlugs = [
  'gants-de-boxe',
  'gants-mma',
  'protections-boxe',
  'textile-boxe',
  'accessoires-boxe',
  'sacs-de-frappe',
  'chaussures-boxe',
  'equipement-entrainement',
  'sacs-de-sport',
];

export function NextHome({ items }: { items: Product[] }) {
  const blade = items.find((p) => p.id === 'mat-blade-gold') ?? items[0];
  const families = familySlugs
    .map((slug) => categories.find((c) => c.slug === slug))
    .filter((c): c is (typeof categories)[number] => Boolean(c))
    .map((c) => ({ c, products: getCategoryProducts(c, items) }));

  return (
    <main id="contenu">
      <HeroSwitch a={<HeroA product={blade} />} b={<HeroB items={items} />} />

      <section className="ne ne-section" aria-labelledby="families-title">
        <div className="ne-section-head">
          <h2 id="families-title">{h.families.title}</h2>
        </div>
        <div className="ne-families">
          {families.map(({ c, products }) => (
            <a key={c.slug} className="ne-family" href={`/${c.slug}/`}>
              <span className="ne-family-name">
                <strong>{c.name}</strong>
                <span>
                  {products.length} {h.families.countSuffix}
                </span>
              </span>
              <span className="ne-strip" aria-hidden="true">
                {products.slice(0, 7).map((p) => (
                  <img key={p.id} src={p.images[0].small} alt="" width={72} height={72} loading="lazy" />
                ))}
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="ne ne-section" aria-labelledby="notebook-title">
        <div className="ne-section-head">
          <h2 id="notebook-title">{h.notebook.title}</h2>
          <p className="ne-lead">{h.notebook.sentence}</p>
        </div>
        <div className="ne-cards">
          {guides.slice(0, 3).map((g) => (
            <a key={g.slug} className="ne-card" href={`/guides/${g.slug}/`}>
              <span className="ne-label">{g.readMinutes} min</span>
              <h3>{g.title}</h3>
              <p className="ne-muted">{g.description}</p>
            </a>
          ))}
        </div>
        <p style={{ marginTop: 24 }}>
          <a className="ne-btn is-secondary" href="/guides/">
            {h.notebook.action.label}
          </a>
        </p>
      </section>

      <section className="ne ne-section" aria-labelledby="sales-title">
        <div className="ne-sales">
          <div>
            <h2 id="sales-title">{h.sales.title}</h2>
            <p className="ne-lead" style={{ marginTop: 16 }}>
              {h.sales.sentence}
            </p>
          </div>
          <div>
            <p className="ne-label" style={{ color: 'inherit', opacity: 0.8, marginBottom: 12 }}>
              {h.sales.alert.label}
            </p>
            <AlertForm labels={{ field: c.alerts.email, consent: c.alerts.consent, submit: c.alerts.submit }} />
          </div>
        </div>
      </section>
    </main>
  );
}
