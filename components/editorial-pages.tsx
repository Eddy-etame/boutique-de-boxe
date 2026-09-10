import { guides, type Guide, type Service } from '@/lib/editorial';
import { categories, shop, jsonLd } from '@/lib/catalog';
import { readCatalog } from '@/lib/database';
import selection from '@/lib/data/selection.json';
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
export async function GuidesIndex() {
  const products = await readCatalog();
  return (
    <main id="contenu" className="page-wrap">
      <Breadcrumb items={[{ label: 'Guides d’achat' }]} />
      <section className="page-heading">
        <div>
          <span className="eyebrow">LE CARNET / CONSEILS MATÉRIEL</span>
          <h1>
            Les guides
            <br />
            d’achat.
          </h1>
        </div>
        <p>
          Neuf guides pour choisir la bonne taille, le bon poids et le bon
          modèle avant d’acheter.
        </p>
      </section>
      <div className="guides-grid">
        {guides.map((g, i) => (
          <a
            className="guide-card"
            href={'/guides/' + g.slug + '/'}
            key={g.slug}
          >
            <div className={'guide-cover cover-' + (i % 3)}>
              <span>LE CARNET / 0{i + 1}</span>
              {(() => {
                const id = selection.guides.find(
                  (x) => x.slug === g.slug,
                )?.imageProductId;
                const p = products.find((p) => p.id === id);
                return p ? (
                  <img
                    src={p.images[0].small}
                    width={480}
                    height={480}
                    alt={p.images[0].alt}
                    loading="lazy"
                  />
                ) : null;
              })()}
              <strong>{covers[i]}</strong>
              <span>{g.readMinutes} MIN DE LECTURE ↗</span>
            </div>
            <h2>{g.title}</h2>
            <p>{g.description}</p>
          </a>
        ))}
      </div>
    </main>
  );
}
export async function GuidePage({ guide: g }: { guide: Guide }) {
  const summary = selection.guides.find((x) => x.slug === g.slug);
  const photo = (await readCatalog()).find(
    (p) => p.id === summary?.imageProductId,
  );
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
          Boutique de Boxe · Repères documentaires · Mis à jour le 10 septembre
          2026
        </span>
      </header>
      {summary && (
        <section
          className={'guide-decisions pattern-' + summary.visualPattern}
          aria-label="Les décisions avant le choix"
        >
          <div className="guide-answer">
            <span className="eyebrow">LE POINT DE DÉPART</span>
            <h2>Avant de choisir.</h2>
            <p>{summary.briefAnswer}</p>
            {photo && (
              <a href={'/produits/' + photo.slug + '/'}>
                <img
                  src={photo.images[0].src}
                  width={photo.images[0].width}
                  height={photo.images[0].height}
                  alt={photo.images[0].alt}
                />
                <span>La pièce illustrée : {photo.name} ↗</span>
              </a>
            )}
          </div>
          <ol>
            {summary.decisionPoints.map((point, i) => (
              <li key={point.label}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{point.label}</h3>
                  <p>{point.explanation}</p>
                  <a
                    href={
                      '#repere-' +
                      Math.max(
                        0,
                        g.sections.findIndex(
                          (s) => s.title === point.sourceSection,
                        ),
                      )
                    }
                  >
                    Lire ce repère ↗
                  </a>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
      <div className="article-layout">
        <aside>
          <span className="eyebrow">DANS CE GUIDE</span>
          <nav aria-label="Sommaire">
            {g.sections.map((s, i) => (
              <a href={'#repere-' + i} key={s.title}>
                <span>0{i + 1}</span>
                {s.title}
              </a>
            ))}
          </nav>
          <a href="/guide-des-tailles/" className="inline-link">
            Le guide des tailles ↗
          </a>
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
          <section className="guide-sources">
            <span className="eyebrow">COMMENT CE GUIDE EST PRÉPARÉ</span>
            <h2>Les sources.</h2>
            <p>
              Ces repères viennent des documents ci-dessous et des fiches du
              catalogue. Ils ne remplacent pas l’avis de votre entraîneur ni la
              notice du modèle.
            </p>
            <ul>
              {g.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {source.title} ↗
                  </a>
                </li>
              ))}
            </ul>
          </section>
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
                <a href={'/' + slug + '/'} key={slug}>
                  {c.name} ↗
                </a>
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
            dateModified: '2026-09-10',
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
