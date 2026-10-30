import type { Metadata } from 'next';
import { readCatalog } from '@/lib/database';
import { listItem, shop } from '@/lib/catalog';
import { GLOVE_WEIGHTS, ouncesOf } from '@/lib/facets';
import { weeklySelection } from '@/lib/hub';
import { parseNumber, parseUsage, recommendGloveWeight, USAGES, GLOVE_WEIGHT_FAQ, GLOVE_WEIGHT_REVISION } from '@/lib/glove-weight';
import { graph, urlOf, webPageNode, faqNode } from '@/lib/seo';
import { ogImage } from '@/lib/og';
import { Breadcrumb, ArrowLink } from '@/components/shop-shell';
import { GloveWeightTool, type WeightFacts } from '@/components/glove-weight-tool';
import { SeoBody } from '@/components/seo-body';
import type { SeoFaq } from '@/lib/seo-copy';

export const dynamic = 'force-dynamic';
const PATH = '/outils/poids-de-gants/';
const TITLE = 'Quel poids de gants de boxe choisir ? Calculateur en onces';
const DESCRIPTION =
  'Calculateur de poids de gants de boxe : un repère indicatif en onces selon la séance, le poids et l’âge. Comparez les modèles et vérifiez les indications du fabricant.';
type Props = { searchParams: Promise<Record<string, string | undefined>> };

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['quel poids de gants de boxe', 'calculateur poids gants de boxe', 'poids gants de boxe', 'combien d’oz gants de boxe', 'gants de boxe 10 oz ou 12 oz', 'gants de boxe 14 oz ou 16 oz', 'taille gants de boxe'],
  // Les réponses vivent dans l’adresse ; la page canonique reste l’outil vide.
  alternates: { canonical: PATH, languages: { 'fr-FR': PATH, 'x-default': PATH } },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, type: 'website', images: ogImage('x', 'outils/poids-de-gants', 'Quel poids de gants ?') },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const FAQ: SeoFaq[] = GLOVE_WEIGHT_FAQ;

export default async function GloveWeightPage({ searchParams }: Props) {
  const q = await searchParams;
  const initial = { usage: parseUsage(q.usage), kg: parseNumber(q.poids), age: parseNumber(q.age) };
  const products = await readCatalog();
  const gloves = products.filter((p) => p.category === 'gants-de-boxe' && p.price > 0);
  const facts: WeightFacts[] = GLOVE_WEIGHTS.map((oz) => {
    const list = gloves.filter((p) => ouncesOf(p).includes(oz));
    const s = list.map((p) => p.price).sort((a, b) => a - b);
    return { oz, count: list.length, median: s[Math.floor(s.length / 2)] ?? 0, min: s[0] ?? 0, path: list.length >= 6 ? `/gants-de-boxe-${oz}-oz/` : null, picks: list.length >= 4 ? weeklySelection(`gants-de-boxe-${oz}-oz`, list).map(listItem) : [] };
  });
  const advice = initial.usage ? recommendGloveWeight({ usage: initial.usage, kg: initial.kg, age: initial.age }) : null;
  const app = {
    '@type': 'WebApplication',
    '@id': urlOf(PATH) + '#outil',
    name: 'Calculateur de poids de gants de boxe',
    url: urlOf(PATH),
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Fonctionne sans script : le formulaire renvoie la réponse dans la page.',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    inLanguage: 'fr-FR',
    provider: { '@id': shop.origin + '/#organisation' },
    about: { '@type': 'Thing', name: 'Poids des gants de boxe en onces' },
    potentialAction: { '@type': 'Action', name: 'Calculer le poids de gants', target: urlOf(PATH) + '?usage={usage}&poids={kg}&age={age}' },
  };
  return (
    <main id="contenu" className="page-wrap">
      <Breadcrumb items={[{ label: 'Gants de boxe', href: '/gants-de-boxe/' }, { label: 'Quel poids de gants ?' }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: graph([
            webPageNode({ path: PATH, name: TITLE, description: DESCRIPTION, image: '/vignette/x/outils/poids-de-gants.png', mainEntity: app['@id'], dateModified: GLOVE_WEIGHT_REVISION, keywords: ['quel poids de gants de boxe', 'calculateur poids gants de boxe'] }),
            app,
            faqNode(PATH, FAQ),
          ]),
        }}
      />
      <section className="page-heading">
        <div>
          <span className="eyebrow">L’OUTIL / GANTS DE BOXE</span>
          <h1>
            Quel poids
            <br />
            de gants de boxe ?
          </h1>
        </div>
        <div>
          <div className="label">Trois questions, un repère à vérifier.</div>
          <p>
            Le calculateur de poids de gants de boxe utilise une grille indicative de la boutique pour explorer les modèles et leurs prix.
            Ses seuils de poids et d’âge sont des hypothèses de comparaison, pas un taillage fabricant ni un règlement de compétition.
            {advice && ` Repère affiché pour ${advice.who} : ${advice.ounces} oz, à faire valider.`}
          </p>
        </div>
      </section>
      <GloveWeightTool initial={initial} facts={facts} />
      <section className="glove-table" aria-label="Les hypothèses de comparaison de l’outil">
        <h2>Les hypothèses de l’outil.</h2>
        <div className="hub-prices">
          <table>
            <caption>Repères internes de comparaison pour un profil adulte : le modèle et les consignes du club restent à vérifier</caption>
            <thead>
              <tr>
                <th scope="col">Séance</th>
                <th scope="col">Moins de 55 kg</th>
                <th scope="col">55 à 75 kg</th>
                <th scope="col">75 à 90 kg</th>
                <th scope="col">Plus de 90 kg</th>
              </tr>
            </thead>
            <tbody>
              {USAGES.map((u) => (
                <tr key={u.key}>
                  <th scope="row">{u.label}</th>
                  {[50, 65, 82, 95].map((kg) => (
                    <td key={kg}>{recommendGloveWeight({ usage: u.key, kg }).ounces} oz</td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row">Enfant</th>
                <td colSpan={4}>L’âge seul ne détermine pas le bon poids : faites valider le modèle et le poids par l’encadrant. Les repères enfant affichés par l’outil servent à explorer le catalogue.</td>
              </tr>
            </tbody>
          </table>
          <p className="hub-prices-note">Ces seuils sont propres à l’outil et n’ont pas valeur de validation fabricant. Un modèle proposé en 16 oz n’est pas automatiquement un gant de sparring ; pour un enfant, l’âge seul ne suffit pas à choisir une paire.</p>
        </div>
      </section>
      <SeoBody sections={[]} faq={FAQ} heading="Les questions sur le poids des gants" />
      <section className="spec-section">
        <div>
          <h2>Pour aller plus loin.</h2>
          <ArrowLink href="/guides/quelle-taille-gants-de-boxe/">Le guide complet des tailles de gants</ArrowLink>
          <ArrowLink href="/guide-des-tailles/">Les repères des fabricants</ArrowLink>
          <ArrowLink href="https://www.fairtex.com/pages/faq">Comment Fairtex distingue les usages des gants</ArrowLink>
          <ArrowLink href="/gants-de-boxe/">Tous les gants de boxe</ArrowLink>
          <ArrowLink href="/observatoire-des-prix/">L’observatoire des prix</ArrowLink>
        </div>
      </section>
    </main>
  );
}
