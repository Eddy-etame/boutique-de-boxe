import type { Metadata } from 'next';
import { readCatalog } from '@/lib/database';
import { listItem, shop } from '@/lib/catalog';
import { GLOVE_WEIGHTS, ouncesOf } from '@/lib/facets';
import { weeklySelection } from '@/lib/hub';
import { parseNumber, parseUsage, recommendGloveWeight, USAGES } from '@/lib/glove-weight';
import { graph, urlOf, webPageNode, breadcrumbNode, faqNode } from '@/lib/seo';
import { ogImage } from '@/lib/og';
import { Breadcrumb, ArrowLink } from '@/components/shop-shell';
import { GloveWeightTool, type WeightFacts } from '@/components/glove-weight-tool';
import { SeoBody } from '@/components/seo-body';
import type { SeoFaq } from '@/lib/seo-copy';

export const dynamic = 'force-dynamic';
const PATH = '/outils/poids-de-gants/';
const TITLE = 'Quel poids de gants de boxe choisir ? Le calculateur en onces';
const DESCRIPTION =
  'Calculateur de poids de gants de boxe : la séance, votre poids, votre âge, et la réponse en onces (8, 10, 12, 14, 16 ou 18 oz) d’après notre guide, avec les modèles à ce poids et leurs prix.';
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

const FAQ: SeoFaq[] = [
  { question: 'Quel poids de gants de boxe pour débuter ?', answer: '12 oz pour un adulte qui commence en cours collectif : assez de mousse pour le sac, assez léger pour la vitesse. 10 oz si vous ne travaillez qu’au sac. Pour toucher un partenaire, 14 ou 16 oz selon votre gabarit et les règles de la salle.' },
  { question: '10 oz ou 12 oz ?', answer: '10 oz pour le sac et les pattes d’ours, 12 oz pour la technique et le cours collectif. En dessous de 55 kg, le guide donne 10 à 12 oz ; entre 55 et 75 kg, 12 à 14 oz.' },
  { question: '14 oz ou 16 oz pour le sparring ?', answer: '16 oz pour la plupart des adultes, 14 oz pour les gabarits légers, 18 oz au-dessus de 90 kg. Beaucoup de salles imposent le 16 oz en sparring : demandez avant d’acheter.' },
  { question: 'Quel poids de gants pour un enfant ?', answer: '4 oz de 5 à 7 ans, 6 oz de 7 à 10 ans, 8 oz de 10 à 13 ans, puis 10 oz pour les adolescents selon la corpulence. Un gant d’enfant se choisit à l’âge et à la main, jamais « pour grandir dedans ».' },
  { question: 'Les onces sont-elles une taille de main ?', answer: 'Non. L’once est le poids du rembourrage. Deux paires de 14 oz peuvent avoir une coupe très différente : Fairtex et Twins compactes, Cleto Reyes allongée, Elion, Adidas et Everlast plus larges. Essayez avec vos bandes.' },
];

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
            webPageNode({ path: PATH, name: TITLE, description: DESCRIPTION, image: '/vignette/x/outils/poids-de-gants.png', mainEntity: app['@id'], keywords: ['quel poids de gants de boxe', 'calculateur poids gants de boxe'] }),
            breadcrumbNode(PATH, [{ label: 'Gants de boxe', href: '/gants-de-boxe/' }, { label: 'Quel poids de gants ?' }]),
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
          <div className="label">Trois questions, une réponse en onces.</div>
          <p>
            Le calculateur de poids de gants de boxe applique les repères de notre guide : la séance d’abord, puis votre poids et votre âge.
            Il répond en onces, de 4 à 18 oz, et montre les modèles à ce poids avec leur prix.
            {advice && ` Aujourd’hui la réponse pour ${advice.who} : ${advice.ounces} oz.`}
          </p>
        </div>
      </section>
      <GloveWeightTool initial={initial} facts={facts} />
      <section className="glove-table" aria-label="Les repères du guide">
        <h2>Les repères, en un tableau.</h2>
        <div className="hub-prices">
          <table>
            <caption>Le poids selon la séance et le gabarit, d’après le guide « Quelle taille de gants de boxe choisir ? »</caption>
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
                <td colSpan={4}>4 oz de 5 à 7 ans · 6 oz de 7 à 10 ans · 8 oz de 10 à 13 ans · 10 oz pour les adolescents</td>
              </tr>
            </tbody>
          </table>
          <p className="hub-prices-note">Des repères, pas des règles : la salle a le dernier mot pour le sparring. Le poids ne remplace ni les bandes ni la technique.</p>
        </div>
      </section>
      <SeoBody sections={[]} faq={FAQ} heading="Les questions sur le poids des gants" />
      <section className="spec-section">
        <div>
          <h2>Pour aller plus loin.</h2>
          <ArrowLink href="/guides/quelle-taille-gants-de-boxe/">Le guide complet des tailles de gants</ArrowLink>
          <ArrowLink href="/gants-de-boxe/">Tous les gants de boxe</ArrowLink>
          <ArrowLink href="/observatoire-des-prix/">L’observatoire des prix</ArrowLink>
        </div>
      </section>
    </main>
  );
}
