import type { Metadata } from 'next';
import { categories, categoryFor, getCategoryProducts, listItem, money, shop, type Product } from '@/lib/catalog';
import { SUBFAMILIES, subfamilyProducts } from '@/lib/subfamilies';
import { graph, urlOf, webPageNode, faqNode } from '@/lib/seo';
import { ogImage } from '@/lib/og';
import { dansLeRayon, ENFANT } from '@/lib/rayons';
import type { SeoFaq, SeoSection } from '@/lib/seo-copy';
import { spaced } from '@/lib/spaced';
import { Breadcrumb, ArrowLink } from './shop-shell';
import { ProductCard } from './shop-interactions';
import { SeoBody } from './seo-body';

/**
 * « Vente matériel de boxe » (03/10) : la page de la requête d'achat.
 *
 * Elle répond à ce que demande quelqu'un qui veut acheter : qui vend, quoi, à quel prix, comment
 * c'est livré, comment ça se retourne. Les chiffres viennent du catalogue du jour ; les conditions,
 * des pages Livraison, Retours et Mentions légales, redites ici en une phrase chacune. Tant que
 * shop.ventesOuvertes est faux, la page le dit en tête : aucune vente n'y est promise aujourd'hui.
 */

export const VENTE = 'vente-materiel-de-boxe';
const PATH = '/' + VENTE + '/';
export const VENTE_TITRE = 'Vente matériel de boxe en ligne : gants, sacs, protections';
export const VENTE_DESCRIPTION = shop.ventesOuvertes
  ? 'Vente matériel de boxe en ligne : plus de 1 000 modèles en dix rayons, livrés en France en point relais ou à domicile, 14 jours pour changer d’avis.'
  : 'Vente matériel de boxe en ligne : plus de 1 000 modèles en dix rayons, prix prévus affichés, livraison en France. Ouverture des ventes bientôt.';
const KEYWORDS = ['vente matériel de boxe', 'vente matériel boxe', 'acheter matériel de boxe', 'vente de matériel de boxe en ligne', 'magasin matériel de boxe', 'prix matériel de boxe', 'vente gants de boxe', 'vente sac de frappe'];

export const venteMetadata = (): Metadata => ({
  title: { absolute: VENTE_TITRE },
  description: VENTE_DESCRIPTION,
  keywords: KEYWORDS,
  alternates: { canonical: PATH, languages: { 'fr-FR': PATH, 'x-default': PATH } },
  openGraph: { title: VENTE_TITRE, description: VENTE_DESCRIPTION, url: PATH, type: 'website', locale: 'fr_FR', siteName: shop.name, images: ogImage('x', VENTE, VENTE_TITRE) },
  twitter: { card: 'summary_large_image', title: VENTE_TITRE, description: VENTE_DESCRIPTION },
});

const fr = (n: number) => n.toLocaleString('fr-FR');

/* Le premier prix de douze rayons : ce qu'il faut que le nom de l'article dise pour compter
   (une chaîne n'est pas un sac de frappe, une gourde n'est pas un sac de sport). */
const PREMIERS: [string, RegExp][] = [
  ['bandes-de-boxe', /^bandes/i],
  ['gants-de-boxe', /^gants/i],
  ['protege-dents', /^prot[èe]ge-dents/i],
  ['cordes-a-sauter', /^corde à sauter/i],
  ['gants-mma', /^gants/i],
  ['protege-tibias', /^prot[èe]ge-tibias/i],
  ['casques-de-boxe', /^casque/i],
  ['shorts-de-boxe', /^short/i],
  ['chaussures-boxe', /^chaussures(?!.*(kung|lutte|savate))/i],
  ['pattes-d-ours', /^pattes/i],
  ['sacs-de-frappe', /^sac de frappe/i],
  ['sacs-de-sport', /^sac/i],
];

/** Les dix rayons : leurs modèles et leurs prix, sans les accessoires du rayon (lib/rayons.ts). */
function lesRayons(all: Product[]) {
  return categories
    .filter((c) => c.families.length === 1 && c.families[0] === c.slug)
    .map((c) => {
      const prix = all
        .filter((p) => p.category === c.slug && p.price > 0 && dansLeRayon(c.slug, p))
        .map((p) => p.price)
        .sort((a, b) => a - b);
      return { slug: c.slug, name: c.name, count: prix.length, min: prix[0], median: prix[Math.floor(prix.length / 2)], max: prix[prix.length - 1] };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
}

function premiersPrix(all: Product[]) {
  const pris = new Set<string>();
  return PREMIERS.flatMap(([slug, doit]) => {
    const sub = SUBFAMILIES.find((s) => s.slug === slug);
    const cat = sub ? undefined : categoryFor(slug);
    const p = (sub ? subfamilyProducts(sub, all) : cat ? getCategoryProducts(cat, all) : [])
      .filter((x) => x.price > 0 && x.images[0] && doit.test(x.name) && dansLeRayon(slug, x) && x.audience !== 'enfant' && !ENFANT.test(x.name) && !pris.has(x.id))
      .sort((a, b) => a.price - b.price)[0];
    if (!p) return [];
    pris.add(p.id);
    return [p];
  });
}

export function venteFaq(): SeoFaq[] {
  const ouvert = shop.ventesOuvertes;
  return [
    {
      question: 'Peut-on acheter du matériel de boxe en ligne dès aujourd’hui ?',
      answer: ouvert
        ? 'Oui : le panier se règle par carte, sur la page sécurisée de PayPlug, et la commande part en point relais ou à domicile.'
        : 'Pas encore : les ventes ouvrent bientôt. D’ici là, le panier sert de liste : vous y gardez vos modèles et vos tailles, sans carte bancaire, et un message vous avertit quand la commande devient possible.',
    },
    { question: 'Qui est le vendeur ?', answer: `La ${shop.entity}, société immatriculée au RCS de Toulouse sous le numéro ${shop.siren}, dont le siège est au ${shop.address}. Elle édite Boutique de Boxe et répond par e-mail à ${shop.email}.` },
    { question: 'Les prix affichés comprennent-ils la TVA ?', answer: 'Oui : chaque prix est donné toutes taxes comprises, hors frais de livraison. Les frais de livraison s’ajoutent au panier avant la validation, jamais après.' },
    { question: 'Comment paie-t-on ?', answer: `${ouvert ? 'Par carte bancaire' : 'À l’ouverture des ventes, par carte bancaire'}, sur la page de paiement de PayPlug, prestataire français agréé. Le numéro de carte ne passe pas par la boutique, qui n’en conserve aucun.` },
    { question: 'Vendez-vous aux clubs et aux associations ?', answer: 'Oui. Pour équiper une salle ou grouper une commande, écrivez depuis la page contact avec les quantités et les tailles : vous recevez une proposition par e-mail.' },
    { question: 'Vente matériel boxe : livrez-vous hors de France ?', answer: 'Pas à l’ouverture. La boutique livre la France métropolitaine, en point relais ou à domicile ; pour la Corse, l’outre-mer et l’étranger, rien n’est encore arrêté.' },
  ];
}

function sections(): SeoSection[] {
  const ouvert = shop.ventesOuvertes;
  return [
    {
      h2: 'Comment se passe la vente',
      paragraphs: [
        ouvert
          ? 'Vous choisissez un modèle, sa taille dans la grille du fabricant et sa couleur, puis vous validez le panier. Le paiement se fait par carte sur la page sécurisée de PayPlug ; la boutique ne voit aucun numéro de carte.'
          : 'Aujourd’hui, vous choisissez : chaque fiche donne les tailles du fabricant, les couleurs et le prix prévu. Le panier garde vos choix avec votre prénom et votre e-mail ; aucun paiement n’est demandé, aucun article n’est mis de côté, et un seul message vous prévient le jour de l’ouverture.',
        ouvert ? 'Un e-mail confirme la commande, un second annonce l’expédition.' : 'Le jour de l’ouverture, la commande se réglera par carte sur la page sécurisée de PayPlug, prestataire de paiement français : la boutique ne verra aucun numéro de carte.',
      ],
    },
    {
      h2: 'Ce que le prix comprend',
      paragraphs: [
        'Un prix affiché est un prix toutes taxes comprises, pour un article neuf, hors livraison. « Dès » devant un prix signale un modèle dont les tailles ou les couleurs n’ont pas toutes le même tarif : le montant exact apparaît quand la déclinaison est choisie.',
        ouvert ? 'Les frais de livraison s’ajoutent dans le panier, avant le paiement.' : 'Tant que les ventes ne sont pas ouvertes, ce prix est un prix prévu : il peut bouger à la marge d’ici l’ouverture, et le prix payé sera celui du jour de la commande.',
      ],
    },
    {
      h2: 'Livraison : point relais ou domicile',
      paragraphs: [
        'La boutique expédie en France métropolitaine. En point relais, 6,90 €, et rien à partir de 69 € d’achats. À domicile, 8,90 €. Un sac de frappe ou une base lestée part à domicile seulement, à un tarif indiqué avant la validation du panier.',
      ],
    },
    {
      h2: 'Changer d’avis, échanger une taille',
      paragraphs: [
        'Vous avez quatorze jours après la réception pour renvoyer un article non porté, dans son emballage : c’est le délai légal de rétractation. Pour une taille, un e-mail avec la référence de la commande suffit ; l’échange s’organise par retour de message.',
      ],
    },
    {
      h2: 'Qui vend ce matériel de boxe',
      paragraphs: [
        `Boutique de Boxe est éditée par la ${shop.entity}, ${shop.address}, immatriculée au RCS de Toulouse sous le numéro ${shop.siren}. La société exploite aussi des salles de boxe à Toulouse ; la boutique en est distincte et vend dans toute la France.`,
        'Chaque modèle garde la référence et les tailles de son fabricant. Rien n’est converti d’une marque à l’autre, et un prix affiché est toujours un prix toutes taxes comprises.',
      ],
    },
    {
      h2: 'Clubs, coachs, commandes groupées',
      paragraphs: ['Une salle à équiper, vingt paires de gants pour une section, des tenues pour un gala : la demande passe par la page contact, avec les quantités et les tailles. La réponse arrive par e-mail, avec une proposition.'],
    },
  ];
}

export function VentePage({ all }: { all: Product[] }) {
  const ouvert = shop.ventesOuvertes;
  const rayons = lesRayons(all);
  // Toutes les marques du catalogue, pas seulement celles qui ont leur page.
  const marques = new Set(all.map((p) => p.brand).filter((b) => b && !/pr[ée]ciser|^Sélection /i.test(b))).size;
  const premiers = premiersPrix(all);
  // Jamais une carte seule sur sa rangée : la grille a 4, 3 ou 2 colonnes, on garde un multiple de 12 ou de 4.
  const cartes = premiers.slice(0, premiers.length >= 12 ? 12 : premiers.length - (premiers.length % 4));
  const faq = venteFaq();
  return (
    <main id="contenu" className="page-wrap ville-page">
      <Breadcrumb items={[{ label: 'Vente matériel de boxe' }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: graph([
            webPageNode({ path: PATH, name: VENTE_TITRE, description: VENTE_DESCRIPTION, type: 'CollectionPage', image: '/vignette/x/' + VENTE + '.png', keywords: KEYWORDS, mainEntity: urlOf(PATH) + '#rayons' }),
            {
              '@type': 'ItemList',
              '@id': urlOf(PATH) + '#rayons',
              name: 'Vente matériel de boxe : les rayons',
              numberOfItems: rayons.length,
              itemListElement: rayons.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: `${r.name} : ${r.count} modèles, dès ${money(r.min)}`, url: urlOf('/' + r.slug + '/') })),
            },
            {
              '@type': 'ItemList',
              '@id': urlOf(PATH) + '#premiers-prix',
              name: 'Le premier prix de chaque rayon',
              numberOfItems: cartes.length,
              itemListElement: cartes.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, url: urlOf('/produits/' + p.slug + '/') })),
            },
            faqNode(PATH, faq),
          ]),
        }}
      />
      <section className="page-heading">
        <div>
          <span className="eyebrow">VENTE MATÉRIEL DE BOXE · EN LIGNE, LIVRÉ EN FRANCE</span>
          <h1>Vente de matériel de boxe en ligne.</h1>
        </div>
        <div>
          <div className="label">Vente matériel de boxe : un vendeur, dix rayons, des prix affichés.</div>
          <p>
            {`Boutique de Boxe ${ouvert ? 'vend en ligne' : 'prépare la vente en ligne de'} ${fr(all.length)} modèles de matériel de boxe et de sports de combat, de ${marques} marques, livrés en France métropolitaine en point relais ou à domicile. `}
            {ouvert ? 'Chaque prix est donné toutes taxes comprises, et vous avez quatorze jours pour changer d’avis.' : 'Les ventes ouvrent bientôt : les prix affichés sont ceux prévus à l’ouverture, et le panier enregistre déjà vos choix, sans paiement.'}
          </p>
        </div>
      </section>

      <section className="observatory-lead vente-chiffres" aria-label="La vente en chiffres">
        <div className="observatory-figures">
          {(
            [
              [fr(all.length), ouvert ? 'modèles en vente' : 'modèles au catalogue'],
              [fr(marques), 'marques'],
              ['6,90 €', 'en point relais, offerts dès 69 € d’achats'],
              ['14 jours', 'pour changer d’avis'],
            ] as const
          ).map(([n, l]) => (
            <div key={l}>
              <strong>{n}</strong> <span>{l}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="ville-tableau">
        <section className="keyword-hub observatory">
          <h2>{ouvert ? 'Vente matériel de boxe : les prix, rayon par rayon.' : 'Vente matériel de boxe : les prix prévus, rayon par rayon.'}</h2>
          <div className="hub-prices vente-rayons" id="rayons">
            <table>
              <caption>Les dix rayons de la boutique, leurs modèles et leurs prix</caption>
              <thead>
                <tr>
                  <th scope="col">Rayon</th>
                  <th scope="col">Modèles</th>
                  <th scope="col">Dès</th>
                  <th scope="col">Prix médian</th>
                  <th scope="col">Jusqu’à</th>
                </tr>
              </thead>
              <tbody>
                {rayons.map((r) => (
                  <tr key={r.slug}>
                    <th scope="row">
                      <a href={'/' + r.slug + '/'}>{r.name}</a>
                    </th>
                    <td>{r.count}</td>
                    <td>{money(r.min)}</td>
                    <td>{money(r.median)}</td>
                    <td>{money(r.max)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hub-prices-note">
              Chiffres calculés sur le catalogue du jour. Le prix médian partage les modèles d’un rayon en deux moitiés égales ; le détail par marque est dans <a href="/observatoire-des-prix/">l’observatoire des prix</a>.
            </p>
          </div>
        </section>
      </div>

      {cartes.length >= 4 && (
        <section className="related-section">
          <h2>Le premier prix de chaque rayon.</h2>
          <div className="product-grid">
            {cartes.map((p, i) => (
              <ProductCard key={p.id} product={listItem(p)} index={i} />
            ))}
          </div>
        </section>
      )}

      <SeoBody sections={sections()} faq={faq} heading="Questions sur la vente" />

      <section className="spec-section">
        <div>
          <h2>Entrer dans le catalogue.</h2>
          {spaced([
            <ArrowLink key="m" href="/materiel-boxe/">Matériel de boxe</ArrowLink>,
            <ArrowLink key="b" href="/boutique-boxe/">Boutique boxe</ArrowLink>,
            <ArrowLink key="mma" href="/materiel-mma/">Matériel MMA</ArrowLink>,
            <ArrowLink key="sc" href="/materiel-sport-de-combat/">Matériel sport de combat</ArrowLink>,
          ])}
        </div>
        <div>
          <h2>Les conditions, en entier.</h2>
          {spaced([
            <ArrowLink key="l" href="/livraison/">Livraison en France</ArrowLink>,
            <ArrowLink key="r" href="/retours/">Retours et échanges</ArrowLink>,
            <ArrowLink key="f" href="/faq/">Questions fréquentes</ArrowLink>,
            <ArrowLink key="a" href="/a-propos/">À propos de la boutique</ArrowLink>,
            <ArrowLink key="p" href="/plan-du-site/">Le plan du site</ArrowLink>,
          ])}
        </div>
      </section>
    </main>
  );
}
