import type { ReactNode } from 'react';
import { guides, guidesAvecLiens, LIEN_GUIDE, guidePublished, dateEnLettres, guidesEnLettres, type Guide, type Service } from '@/lib/editorial';
import { articleGraph } from '@/lib/seo';
import { categories, categoryFor, getCategoryProducts } from '@/lib/catalog';
import { subfamilyFor, subfamilyProducts } from '@/lib/subfamilies';
import { readCatalog } from '@/lib/database';
import selection from '@/lib/data/selection.json';
import { Breadcrumb, ArrowLink } from './shop-shell';
import { SeoBody } from './seo-body';
/** Le mot de couverture de chaque guide, par adresse : l’ordre des guides peut changer sans décaler les couvertures. */
const covers: Record<string, string> = {
  'choisir-gants-boxe': 'LE GANT.',
  'taille-poids-gants-boxe': 'LE POIDS.',
  'choisir-gants-mma': 'LES SAISIES.',
  'debuter-boxe': 'PREMIER ROUND.',
  'debuter-mma': 'LE MMA.',
  'choisir-protections': 'LES PROTECTIONS.',
  'difference-gants-boxe-mma': 'DEUX GANTS.',
  'equipement-enfant': 'LA RELÈVE.',
  'equipement-femme': 'VOTRE COUPE.',
  'boxe-anglaise-materiel-indispensable': 'LA LISTE.',
  'mma-equipement-obligatoire-debuter': 'LE MINIMUM.',
  'quelle-taille-gants-de-boxe': 'LA TAILLE.',
  'gants-de-boxe-cuir-ou-synthetique': 'LE CUIR.',
  'sac-de-frappe-suspendu-ou-sur-pied': 'LE SAC.',
  'bandes-de-boxe-ou-sous-gants': 'SOUS LE GANT.',
};
/** Une page du site citée par un guide : une famille du catalogue ou une sous-famille (rayon, discipline). */
const rayon = (slug: string) => {
  const c = categories.find((x) => x.slug === slug);
  if (c) return { slug, name: c.name };
  const s = subfamilyFor(slug);
  return s ? { slug, name: s.name } : null;
};
/**
 * Le texte d’un guide, avec ses liens « [texte](/adresse/) » rendus en vrais liens, côté serveur : le
 * HTML arrive complet, React échappe le texte et l’adresse, et seule une adresse interne est reconnue.
 */
function Texte({ children: texte }: { children: string }) {
  const morceaux: ReactNode[] = [];
  let fin = 0;
  for (const m of texte.matchAll(LIEN_GUIDE)) {
    if (m.index > fin) morceaux.push(texte.slice(fin, m.index));
    morceaux.push(
      <a className="lien-texte" href={m[2]} key={m.index}>
        {m[1]}
      </a>,
    );
    fin = m.index + m[0].length;
  }
  if (fin < texte.length) morceaux.push(texte.slice(fin));
  return <>{morceaux}</>;
}
/** Le lien dans le texte d’un guide se voit sans la couleur : souligné du jaune du site, en gras. */
const LIEN_TEXTE_CSS =
  '.lien-texte{color:var(--ink);font-weight:650;text-decoration:underline;text-decoration-color:var(--tape);text-decoration-thickness:2px;text-underline-offset:4px;transition:text-decoration-color .2s}.lien-texte:hover{text-decoration-color:currentColor}';
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
          {guidesEnLettres().charAt(0).toUpperCase() + guidesEnLettres().slice(1)} guides pour choisir la bonne taille, le bon poids et le bon
          modèle avant d’acheter, puis pour bien vous en servir.
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
              <span>LE CARNET / {String(i + 1).padStart(2, '0')}</span>
              {(() => {
                const id = selection.guides.find(
                  (x) => x.slug === g.slug,
                )?.imageProductId;
                // Référence retirée du catalogue, ou guide sans photo choisie : la première photo de la première
                // page liée (famille ou sous-famille, la plus précise en tête), jamais une couverture vide.
                const p =
                  products.find((p) => p.id === id) ||
                  g.relatedCategories
                    .map((slug) => {
                      const family = categoryFor(slug);
                      const sub = family ? undefined : subfamilyFor(slug);
                      return (family ? getCategoryProducts(family, products) : sub ? subfamilyProducts(sub, products) : []).find((x) => x.images[0]);
                    })
                    .find(Boolean);
                return p ? (
                  <img
                    src={p.cut?.small ?? p.images[0].small}
                    data-cut={p.cut?.mode}
                    width={480}
                    height={480}
                    alt={p.images[0].alt}
                    loading={i < 3 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                ) : null;
              })()}
              <strong>{covers[g.slug] ?? g.eyebrow.split('·').pop()?.trim().toUpperCase() + '.'}</strong>
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
  // Le texte du guide avec ses liens : le guide reçu est la version sans liens, que lit le JSON-LD.
  const texte = guidesAvecLiens.find((x) => x.slug === g.slug) ?? g;
  return (
    <main id="contenu" className="page-wrap">
      <style href="bdb-lien-texte" precedence="medium">
        {LIEN_TEXTE_CSS}
      </style>
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
          {'published' in g ? `Boutique de Boxe · Repères documentaires · Publié le ${dateEnLettres(guidePublished(g))}` : 'Boutique de Boxe · Repères documentaires · Mis à jour le 11 septembre 2026'}
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
                  src={photo.cut?.large ?? photo.images[0].src}
                  width={photo.cut ? 960 : photo.images[0].width}
                  height={photo.cut ? 960 : photo.images[0].height}
                  alt={photo.images[0].alt}
                />
                <span>Le modèle illustré : {photo.name} ↗</span>
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
                <span>{String(i + 1).padStart(2, '0')}</span>
                {s.title}
              </a>
            ))}
          </nav>
          <a href="/guide-des-tailles/" className="inline-link">
            Le guide des tailles ↗
          </a>
        </aside>
        <article>
          {texte.sections.map((s, i) => (
            <section id={'repere-' + i} key={s.title}>
              <span className="section-number">{String(i + 1).padStart(2, '0')}</span>
              <h2>{s.title}</h2>
              {s.paragraphs.map((p) => (
                <p key={p}>
                  <Texte>{p}</Texte>
                </p>
              ))}
              {'bullets' in s && s.bullets && (
                <ul>
                  {s.bullets.map((b) => (
                    <li key={b}>
                      <Texte>{b}</Texte>
                    </li>
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
            {texte.faq.map((f) => (
              <details key={f.question}>
                <summary>
                  {f.question}
                  <span>+</span>
                </summary>
                <p>
                  <Texte>{f.answer}</Texte>
                </p>
              </details>
            ))}
          </section>
        </article>
      </div>
      <section className="guide-neighbours" aria-label="Guides voisins">
        <span className="eyebrow">À LIRE ENSUITE</span>
        <div className="category-crosslinks">
          {(() => {
            const i = guides.findIndex((x) => x.slug === g.slug);
            const around = [guides[(i + guides.length - 1) % guides.length], guides[(i + 1) % guides.length], guides[(i + 2) % guides.length]];
            return around.filter((x, k, arr) => x.slug !== g.slug && arr.findIndex((y) => y.slug === x.slug) === k).map((x) => (
              <a href={'/guides/' + x.slug + '/'} key={x.slug}>
                {x.title} ↗
              </a>
            ));
          })()}
        </div>
      </section>
      <section className="guide-related">
        <span className="eyebrow">PASSER DU CONSEIL AU MODÈLE</span>
        <h2>Les modèles à regarder.</h2>
        <div className="category-crosslinks">
          {g.relatedCategories.map((slug) => {
            const r = rayon(slug);
            return (
              r && (
                <a href={'/' + r.slug + '/'} key={r.slug}>
                  {r.name} ↗
                </a>
              )
            );
          })}
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleGraph(g) }} />
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
            <section key={section.title} id={section.id}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </section>
          ))}
          {s.faq?.length ? <SeoBody sections={[]} faq={s.faq} heading={slug === 'faq' ? 'Vos questions, nos réponses' : 'Questions fréquentes'} /> : null}
        </div>
      </div>
    </main>
  );
}
