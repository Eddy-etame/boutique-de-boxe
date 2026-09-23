import type { Metadata } from 'next';
import { readCatalog } from '@/lib/database';
import { money, shop } from '@/lib/catalog';
import { observatory, observatorySentences, type PriceRow } from '@/lib/observatory';
import { graph, urlOf, webPageNode, breadcrumbNode, faqNode } from '@/lib/seo';
import { ogImage } from '@/lib/og';
import { Breadcrumb, ArrowLink } from '@/components/shop-shell';
import type { SeoFaq } from '@/lib/seo-copy';
import { SeoBody } from '@/components/seo-body';

export const revalidate = 60;
const PATH = '/observatoire-des-prix/';
const TITLE = 'Observatoire des prix du matériel de boxe : gants, casques, sacs';
const DESCRIPTION =
  'Combien coûtent des gants de boxe, un casque, un sac de frappe ? Prix minimum, médian et maximum par équipement, par marque et par poids de gant, relevés sur le catalogue. Données ouvertes, à citer.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['observatoire des prix', 'prix gants de boxe', 'combien coûtent des gants de boxe', 'prix casque de boxe', 'prix sac de frappe', 'prix matériel de boxe', 'prix moyen gants de boxe'],
  alternates: { canonical: PATH, languages: { 'fr-FR': PATH, 'x-default': PATH } },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'website', images: ogImage('x', 'observatoire-des-prix', 'Observatoire des prix') },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

function Table({ caption, head, rows, id }: { caption: string; head: string; rows: PriceRow[]; id: string }) {
  return (
    <div className="hub-prices observatory-table" id={id}>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{head}</th>
            <th scope="col">Modèles</th>
            <th scope="col">Dès</th>
            <th scope="col">Quart bas</th>
            <th scope="col">Prix médian</th>
            <th scope="col">Prix moyen</th>
            <th scope="col">Quart haut</th>
            <th scope="col">Jusqu’à</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.path ? <a href={r.path}>{r.label}</a> : r.label}</th>
              <td>{r.count}</td>
              <td>{money(r.min)}</td>
              <td>{money(r.q1)}</td>
              <td>
                <strong>{money(r.median)}</strong>
              </td>
              <td>{money(r.mean)}</td>
              <td>{money(r.q3)}</td>
              <td>{money(r.max)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ObservatoryPage() {
  const products = await readCatalog();
  const o = observatory(products);
  const sentences = observatorySentences(o);
  const dated = new Date(o.generated).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const faq: SeoFaq[] = [
    { question: 'D’où viennent ces prix ?', answer: `Du catalogue de la boutique : ${o.products} modèles avec un prix prévu à l’ouverture des ventes, TTC, hors livraison. Chaque ligne compte les modèles, puis donne le prix le plus bas, les quartiles, la médiane, la moyenne et le prix le plus haut. Rien n’est estimé ni pondéré.` },
    { question: 'Pourquoi le prix médian plutôt que le prix moyen ?', answer: 'La médiane partage les modèles en deux moitiés égales : la moitié coûte moins, l’autre plus. Elle ne bouge pas quand un modèle très cher entre au catalogue, alors que la moyenne monte. Les deux sont publiés.' },
    { question: 'À quelle fréquence le relevé change-t-il ?', answer: 'Il est recalculé à chaque consultation à partir du catalogue et daté à la semaine. Quand un prix ou un modèle change, le relevé change avec lui. Le JSON porte la date exacte de génération.' },
    { question: 'Puis-je reprendre ces chiffres ?', answer: `Oui, en citant la source : « Observatoire des prix, ${shop.name}, ${dated} », avec un lien vers cette page. Le JSON et le CSV sont libres d’accès pour un usage éditorial, comparatif ou de recherche.` },
    { question: 'Ces prix sont-ils ceux des autres boutiques ?', answer: 'Non. Ce sont les prix prévus de ce catalogue à l’ouverture des ventes. Ils ne décrivent pas le marché entier, seulement les modèles proposés ici, ce qui reste le relevé le plus large publié en France pour ce matériel.' },
  ];
  const dataset = {
    '@type': 'Dataset',
    '@id': urlOf(PATH) + '#dataset',
    name: 'Observatoire des prix du matériel de boxe et de MMA',
    description: DESCRIPTION,
    url: urlOf(PATH),
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    creator: { '@id': shop.origin + '/#organisation' },
    dateModified: o.generated.slice(0, 10),
    temporalCoverage: o.week.monday + '/..',
    spatialCoverage: 'France',
    keywords: 'prix gants de boxe, prix casque de boxe, prix sac de frappe, matériel de boxe, MMA',
    variableMeasured: ['nombre de modèles', 'prix minimum', 'premier quartile', 'prix médian', 'prix moyen', 'troisième quartile', 'prix maximum'],
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: urlOf('/observatoire-des-prix.json') },
      { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: urlOf('/observatoire-des-prix.csv') },
    ],
  };
  return (
    <main id="contenu" className="page-wrap">
      <Breadcrumb items={[{ label: 'Observatoire des prix' }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: graph([
            webPageNode({ path: PATH, name: TITLE, description: DESCRIPTION, image: '/vignette/x/observatoire-des-prix.png', mainEntity: dataset['@id'], dateModified: o.generated.slice(0, 10), keywords: ['observatoire des prix', 'prix gants de boxe'] }),
            breadcrumbNode(PATH, [{ label: 'Observatoire des prix' }]),
            dataset,
            faqNode(PATH, faq),
          ]),
        }}
      />
      <section className="page-heading">
        <div>
          <span className="eyebrow">LES CHIFFRES / SEMAINE {o.week.week} · {o.products} MODÈLES</span>
          <h1>
            L’observatoire
            <br />
            des prix.
          </h1>
        </div>
        <div>
          <div className="label">Combien coûtent des gants de boxe, un casque, un sac de frappe.</div>
          <p>
            Le relevé des prix prévus du catalogue, au {dated} : {o.products} modèles, {o.brands} marques, par équipement, par marque et par
            poids de gant. Le prix le plus bas, la médiane, la moyenne, le plus haut. Des chiffres à citer, ouverts en JSON et en CSV.
          </p>
        </div>
      </section>

      <section className="observatory-lead" aria-label="Ce qu’il faut retenir">
        <div className="observatory-figures">
          <div>
            <strong>{money(o.all.median)}</strong>
            <span>prix médian, tout le catalogue</span>
          </div>
          <div>
            <strong>{money(o.all.min)}</strong>
            <span>le modèle le moins cher</span>
          </div>
          <div>
            <strong>{money(o.all.max)}</strong>
            <span>le modèle le plus cher</span>
          </div>
          <div>
            <strong>{o.bands.find((b) => b.label === 'de 20 à 50 €')?.count ?? 0}</strong>
            <span>modèles entre 20 et 50 €</span>
          </div>
        </div>
        <ul className="observatory-sentences">
          {sentences.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="observatory-cite">
          À citer : « Observatoire des prix, {shop.name}, {dated} » · <a href="/observatoire-des-prix.json">JSON</a> · <a href="/observatoire-des-prix.csv">CSV</a> · licence CC BY 4.0
        </p>
      </section>

      <section className="observatory-bands" aria-label="Répartition par tranche de prix">
        <h2>Où se concentre le catalogue.</h2>
        <ol>
          {o.bands.map((b) => (
            <li key={b.label} style={{ '--share': o.products ? b.count / o.products : 0 } as React.CSSProperties}>
              <span>{b.label}</span>
              <i aria-hidden="true" />
              <strong>{b.count}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="keyword-hub observatory">
        <h2>Par équipement.</h2>
        <Table id="par-equipement" caption="Prix prévus par famille d’équipement" head="Équipement" rows={o.families} />
        <h2>Gants de boxe, par poids.</h2>
        <Table id="par-poids" caption="Prix prévus des gants de boxe selon le poids en onces" head="Poids" rows={o.weights} />
        <p className="hub-prices-note">
          Un modèle proposé en plusieurs poids compte dans chaque poids. Quel poids pour vous ? <a href="/outils/poids-de-gants/">Le calculateur répond en trois questions.</a>
        </p>
        <h2>Gants de boxe, par marque.</h2>
        <Table id="gants-par-marque" caption="Prix prévus des gants de boxe par marque, du prix médian le plus bas au plus haut" head="Marque" rows={o.gloveBrands} />
        <h2>Toutes les marques.</h2>
        <Table id="par-marque" caption="Prix prévus par marque, tout équipement confondu" head="Marque" rows={o.brands_rows} />
        <p className="hub-prices-note">
          Base : {o.basis} Les quartiles partagent les modèles en quatre groupes égaux ; la médiane est le milieu.
        </p>
      </section>

      <SeoBody sections={[]} faq={faq} heading="Questions sur ce relevé" />
      <section className="spec-section">
        <div>
          <h2>Pour aller du chiffre au modèle.</h2>
          <ArrowLink href="/gants-de-boxe/">Tous les gants de boxe</ArrowLink>
          <ArrowLink href="/marques/">Toutes les marques</ArrowLink>
          <ArrowLink href="/guides/quelle-taille-gants-de-boxe/">Quelle taille de gants choisir ?</ArrowLink>
        </div>
      </section>
    </main>
  );
}
