import Link from 'next/link';
import { guides, type Guide, type Service } from '@/lib/editorial';
import { categories, shop, jsonLd } from '@/lib/catalog';
import { Breadcrumb, ArrowLink } from './shop-shell';
import { AlertForm } from './shop-interactions';
const covers = [
  'LE GANT.',
  'LE POIDS.',
  'LES SAISIES.',
  'PREMIER ROUND.',
  'LE MMA.',
  'LES PROTECTIONS.',
  'DEUX GANTS.',
  'LA RELÈVE.',
  'VOTRE COUPE.',
];
export function GuidesIndex() {
  return (
    <main id="contenu" className="page-wrap">
      <Breadcrumb items={[{ label: 'Guides d’achat' }]} />
      <section className="page-heading">
        <div>
          <span className="eyebrow">LE CARNET / CONSEILS MATÉRIEL</span>
          <h1>
            Bien choisir.
            <br />
            Mieux pratiquer.
          </h1>
        </div>
        <p>
          Les questions concrètes à poser avant de s’équiper. Neuf guides pour
          comprendre les modèles, leur usage et les détails qui comptent.
        </p>
      </section>
      <div className="guides-grid">
        {guides.map((g, i) => (
          <Link
            className="guide-card"
            href={'/guides/' + g.slug + '/'}
            key={g.slug}
          >
            <div className={'guide-cover cover-' + (i % 3)}>
              <span>LE CARNET / 0{i + 1}</span>
              <strong>{covers[i]}</strong>
              <span>{g.readMinutes} MIN DE LECTURE ↗</span>
            </div>
            <h2>{g.title}</h2>
            <p>{g.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
export function GuidePage({ guide: g }: { guide: Guide }) {
  return (
    <main id="contenu" className="page-wrap">
      <Breadcrumb
        items={[{ label: 'Guides', href: '/guides/' }, { label: g.title }]}
      />
      <header className="article-heading">
        <span className="eyebrow">
          {g.eyebrow} / {g.readMinutes} MIN
        </span>
        <h1>{g.title}</h1>
        <p>{g.intro}</p>
        <span className="article-byline">
          La rédaction Boutique de Boxe · 9 septembre 2026
        </span>
      </header>
      <div className="article-layout">
        <aside>
          <span className="eyebrow">DANS CE GUIDE</span>
          <nav aria-label="Sommaire">
            {g.sections.map((s, i) => (
              <Link href={'#repere-' + i} key={s.title}>
                <span>0{i + 1}</span>
                {s.title}
              </Link>
            ))}
          </nav>
          <Link href="/guide-des-tailles/" className="inline-link">
            Le guide des tailles ↗
          </Link>
        </aside>
        <article>
          {g.sections.map((s, i) => (
            <section id={'repere-' + i} key={s.title}>
              <span className="section-number">0{i + 1}</span>
              <h2>{s.title}</h2>
              {s.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {'bullets' in s && s.bullets && (
                <ul>
                  {s.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <section className="guide-faq">
            <h2>Les questions qui reviennent.</h2>
            {g.faq.map((f) => (
              <details key={f.question}>
                <summary>
                  {f.question}
                  <span>+</span>
                </summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </section>
        </article>
      </div>
      <section className="guide-related">
        <span className="eyebrow">PASSER DU CONSEIL AU MODÈLE</span>
        <h2>Les pièces à regarder.</h2>
        <div className="category-crosslinks">
          {g.relatedCategories.map((slug) => {
            const c = categories.find((x) => x.slug === slug);
            return (
              c && (
                <Link href={'/' + slug + '/'} key={slug}>
                  {c.name} ↗
                </Link>
              )
            );
          })}
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: g.title,
            description: g.description,
            author: {
              '@type': 'Organization',
              name: 'Boutique de Boxe',
              url: shop.origin,
            },
            publisher: { '@type': 'Organization', name: 'Boutique de Boxe' },
            datePublished: '2026-09-09',
            dateModified: '2026-09-09',
            mainEntityOfPage: shop.origin + '/guides/' + g.slug + '/',
          }),
        }}
      />
    </main>
  );
}
export function ServicePage({
  service: s,
  slug,
}: {
  service: Service;
  slug: string;
}) {
  return (
    <main id="contenu" className="page-wrap">
      <Breadcrumb items={[{ label: s.title }]} />
      <header className="article-heading">
        <span className="eyebrow">{s.eyebrow}</span>
        <h1>{s.title}</h1>
      </header>
      <div className="service-layout">
        <aside>
          <span className="eyebrow">UN POINT À ÉCLAIRCIR ?</span>
          <p>Une question sur le catalogue ou son fonctionnement.</p>
          <ArrowLink href="/contact/">Nous contacter</ArrowLink>
        </aside>
        <div>
          {s.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </section>
          ))}
          {slug === 'offres-de-lancement' && <AlertForm />}
        </div>
      </div>
    </main>
  );
}
