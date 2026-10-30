import type { Metadata } from 'next';
import { categoryFor, getCategoryProducts, listItem, shop, money, livraison as frais, type Product } from '@/lib/catalog';
import { SUBFAMILIES, subfamilyFor, subfamilyProducts } from '@/lib/subfamilies';
import { graph, urlOf, webPageNode, faqNode } from '@/lib/seo';
import { ogImage } from '@/lib/og';
import { Breadcrumb, ArrowLink } from './shop-shell';
import { ProductCard } from './shop-interactions';
import { SeoBody } from './seo-body';
import { spaced } from '@/lib/spaced';
import { dansLeRayon, ENFANT } from '@/lib/rayons';
import { faits } from '@/lib/guides-rayons';
import { brandsOf, MIN_BRAND_PRODUCTS } from '@/lib/brands';
import { RAYONS_TYPE, GUIDES, nomDeRayon } from './liens-du-site';
import {
  SOURCE, FRANCE, VILLES, REGIONS, CARREFOUR, villePath, dateSource, regionTotal, regionDisciplines,
  CLUBS_BOXING_CENTER, NOBLE_ART, A_COTE, BALMA, RAYON, a, de, dansDepartement, siteDe, fine, estBoxingCenter,
  villeTitre, villeDescription, villeDensite, villeChapeau, villeAchatChapeau, villeSections, villeFaq, villeKit, parArrondissement, tour,
  regionTitre, regionDescription, regionChapeau, regionAchatChapeau, regionFaq, livraison, livraisonPartout, VILLES_COMMERCE_REVISION,
  SPORTS_BOUTIQUE, CARREFOUR_REVISION, carrefourTitre, carrefourDescription, carrefourChapeau, carrefourFaq, carrefourMarques, franceEnChiffres, type SportBoutique,
  type Ville, type Region, type Lieu, type Groupe,
} from '@/lib/villes';

/**
 * Les pages « Boutique de boxe <ville> », la page Île-de-France et le carrefour
 * « Boutique sport de combat France » (29/09). Le contenu propre à chaque ville
 * vient de lib/villes.ts et du Recensement des équipements sportifs ; ce fichier
 * ne fait que le poser dans la page et dans le graphe.
 */

const HUB_PATH = '/' + CARREFOUR + '/';
const HUB_CRUMB = { label: 'Boutique sport de combat', href: HUB_PATH };
const MATERIEL = '/materiel-sport-de-combat/';
const IDF = ['75', '92', '93', '94', '78', '91', '95', '77'];

const meta = (path: string, title: string, description: string, key: string, keywords: string[]): Metadata => ({
  title: { absolute: title },
  description,
  keywords,
  alternates: { canonical: path, languages: { 'fr-FR': path, 'x-default': path } },
  openGraph: { title, description, url: path, type: 'website', locale: 'fr_FR', siteName: 'Boutique de Boxe', images: ogImage('x', key, title) },
  twitter: { card: 'summary_large_image', title, description },
});

export const villeMetadata = (v: Ville) =>
  meta(villePath(v.slug), villeTitre(v), villeDescription(v), 'boutique-de-boxe-' + v.slug, [
    'boutique de boxe ' + v.nom.toLowerCase(),
    'salle de boxe ' + v.nom,
    'matériel de boxe ' + v.nom,
    'club de boxe ' + v.nom,
  ]);
export const regionMetadata = (r: Region) =>
  meta(villePath(r.slug), regionTitre(r), regionDescription(r), 'boutique-de-boxe-' + r.slug, [
    'boutique de boxe ' + r.nom.toLowerCase(),
    'salle de boxe ' + r.nom,
    'matériel de boxe ' + r.nom,
  ]);
/** Le carrefour compte ses modèles dans le titre et la description : il lui faut le catalogue du jour. */
export const carrefourMetadata = (all: Product[]) =>
  meta(HUB_PATH, carrefourTitre(all.length), carrefourDescription(all.length), CARREFOUR, ['boutique sport de combat france', 'boutique sport de combat', 'boutique de boxe en ligne', 'matériel sport de combat']);

/* ── Morceaux partagés ─────────────────────────────────────────────────── */

/** « 1 042 » : l’espace fine de fr-FR (U+202F) manque à la police du corps, qui l’avale ; l’insécable s’affiche. */
const fr = (n: number) => n.toLocaleString('fr-FR').replace(/ /g, ' ');
const lien = (url: string) => (/^https?:\/\//i.test(url) ? url : 'https://' + url);
const hote = (url: string) => {
  try {
    return new URL(lien(url)).host.replace(/^www\./, '');
  } catch {
    return null;
  }
};
/** Nos clubs sous leur nom du registre (accents compris), les autres sous celui du recensement. */
const clubDe = (l: Lieu) => CLUBS_BOXING_CENTER.find((c) => c.recensement === l.id);
const nomDe = (l: Lieu) => clubDe(l)?.nom || l.nom;
const plie = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/** Les salles d'un lieu, sans celle qui ne fait que répéter son nom. */
const sallesDe = (l: Lieu) => l.salles.map((s) => s.nom).filter((n) => plie(n) !== plie(l.nom) && plie(n) !== plie(nomDe(l)));
/* Nos clubs : l'adresse du registre (« 12 rue de Fenouillet », pas « 12 r de fenouillet »). */
const adresseDe = (l: Lieu) => clubDe(l)?.adresse || [l.adresse, [l.codePostal, l.commune].filter(Boolean).join(' ')].filter(Boolean).join(', ');
/* Le tableau garde les disciplines du recensement, pour tous : celles que nos clubs déclarent sont sur
   leur carte, plus haut — les répéter ici mettrait deux fois le même texte sur la page. */
const disciplinesDe = (l: Lieu) => l.disciplines.join(', ');
const VIDE = <span className="salle-vide">—</span>;

/** Un nombre stable par ville : chaque page montre d'autres modèles que sa voisine. */
const graine = (s: string) => Array.from(s).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/* Ce qu'un premier sac évite, et ce qu'il préfère quand le rayon en a, selon la boxe :
   pas de short thaï ni de chaussure de lutte pour la boxe anglaise ; la chaussure de savate pour la savate. */
const EVITER: Record<string, RegExp> = { 'Boxe anglaise': /tha[iï]|lutte/i };
const PREFERER: Record<string, RegExp> = { 'Savate boxe française': /savate|boxe fran/i, 'Muay-thaï': /tha[iï]|muay/i };

/** Le premier sac : des modèles d'entrée de gamme — le tiers le moins cher de chaque rayon, photo posée
    de préférence DANS ce tiers —, jamais d'article d'enfant, jamais deux fois le même modèle. */
function kitProducts(sources: string[], all: Product[], seed: number, discipline: string) {
  const pris = new Set<string>();
  const evite = EVITER[discipline];
  const prefere = PREFERER[discipline];
  return sources
    .map((slug, i) => {
      const sub = SUBFAMILIES.find((x) => x.slug === slug);
      const cat = sub ? null : categoryFor(slug);
      const rayon = (sub ? subfamilyProducts(sub, all) : cat ? getCategoryProducts(cat, all) : []).filter(
        (p) => p.images[0] && p.price > 0 && !pris.has(p.id) && dansLeRayon(slug, p) && !ENFANT.test(p.name) && !(evite && evite.test(p.name)),
      );
      const choix = prefere && rayon.some((p) => prefere.test(p.name)) ? rayon.filter((p) => prefere.test(p.name)) : rayon;
      const moitie = [...choix].sort((x, y) => x.price - y.price).slice(0, Math.max(3, Math.ceil(choix.length / 3)));
      const beaux = moitie.filter((p) => p.cut?.mode === 'pose');
      const pool = beaux.length >= 3 ? beaux : moitie;
      if (!pool.length) return null;
      const p = pool[(seed + i * 7) % pool.length];
      pris.add(p.id);
      return p;
    })
    .filter(Boolean) as Product[];
}

function Chiffres({ items }: { items: [string, string][] }) {
  return (
    <div className="observatory-figures">
      {items.map(([n, l]) => (
        <div key={l}>
          <strong>{n}</strong>{' '}
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
}

function Source({ population = false }: { population?: boolean }) {
  return (
    <p className="observatory-cite">
      Source : <a href={SOURCE.url}>{SOURCE.nom}</a>, {SOURCE.editeur}, <a href={SOURCE.licenceUrl}>{SOURCE.licence}</a>, mis à jour le {dateSource()}
      {population ? (
        <>
          {' '}· populations : <a href={SOURCE.population.url}>Insee, via l’API Découpage administratif</a>
        </>
      ) : null}
      .
    </p>
  );
}

function Disciplines({ titre, par, total }: { titre: string; par: Record<string, number>; total: number }) {
  return (
    <section className="observatory-bands ville-disciplines" aria-label={titre}>
      <h2>{titre}</h2>
      <ol>
        {Object.entries(par).map(([d, n]) => (
          <li key={d} style={{ '--share': total ? n / total : 0 } as React.CSSProperties}>
            <span>{RAYON[d] ? <a href={RAYON[d]}>{d}</a> : d}</span>{' '}
            <i aria-hidden="true" />{' '}
            <strong>{fr(n)}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Lieux({ lieux, caption, id }: { lieux: Lieu[]; caption: string; id?: string }) {
  return (
    <div className="hub-prices salles-table" id={id}>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Lieu</th>
            <th scope="col">Disciplines</th>
            <th scope="col">Adresse</th>
            <th scope="col">En ligne</th>
          </tr>
        </thead>
        <tbody>
          {lieux.map((l) => {
            const site = siteDe(l);
            return (
              <tr key={l.id} className={estBoxingCenter(l) ? 'ligne-bc' : undefined}>
                <th scope="row">
                  {clubDe(l) ? <a href={clubDe(l)!.site}>{nomDe(l)}</a> : l.nom}{' '}
                  {sallesDe(l).length ? <small>{sallesDe(l).join(' · ')}</small> : null}
                </th>
                <td data-label="Disciplines">{disciplinesDe(l) || VIDE}</td>
                <td data-label="Adresse">{adresseDe(l) || VIDE}</td>
                <td data-label="En ligne">
                  {site && hote(site) ? (
                    <a href={lien(site)} rel={CLUBS_BOXING_CENTER.some((c) => c.site === site) ? undefined : 'nofollow noopener'}>
                      {hote(site)}
                    </a>
                  ) : (
                    VIDE
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="hub-prices-note">
        {lieux.some(estBoxingCenter) ? '« — » : non renseigné au recensement. Les clubs Boxing Center en tête de liste enseignent plus que ce que le recensement déclare : leurs disciplines sont sur leur carte, plus haut.' : '« — » : non renseigné au recensement.'}
      </p>
    </div>
  );
}

function Arrondissements({ v }: { v: Ville }) {
  const rows = parArrondissement(v);
  if (rows.length < 4) return null;
  return (
    <section className="keyword-hub observatory">
      <h2>{`${v.nom}, arrondissement par arrondissement.`}</h2>
      <div className="hub-prices salles-table">
        <table>
          <caption>{`Lieux de boxe et d’arts martiaux par arrondissement ${de(v.nom)}`}</caption>
          <thead>
            <tr>
              <th scope="col">Arrondissement</th>
              <th scope="col">Lieux</th>
              <th scope="col">Où l’on boxe</th>
              <th scope="col">Salles de boxe</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.nom}>
                <th scope="row">{x.nom}</th>
                <td data-label="Lieux">{x.lieux}</td>
                <td data-label="Où l’on boxe">{x.frappe}</td>
                <td data-label="Salles de boxe">{x.boxe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const RAYON_DE: Record<string, [string, string]> = {
  'Boxe anglaise': ['/equipement-boxe-anglaise/', 'L’équipement de boxe anglaise'],
  'Savate boxe française': ['/chaussures-boxe/', 'Les chaussures de boxe'],
  'Muay-thaï': ['/protege-tibias/', 'Les protège-tibias'],
  'Kick-boxing': ['/protections-boxe/', 'Les protections de boxe'],
  'Full contact': ['/gants-de-boxe/', 'Les gants de boxe'],
};

/** Conditions de la commande, lues dans la même source que le panier ; pas une promesse d'arrivée. */
function Commande({ lieu, scope }: { lieu: string; scope: 'city' | 'region' }) {
  return (
    <section className="observatory-lead" id="commander" data-city-commerce={scope === 'city' || undefined} data-region-commerce={scope === 'region' || undefined} aria-label={`Commander du matériel, livraison ${lieu}`}>
      <Chiffres
        items={[
          [frais.relais, `point relais, offert dès ${frais.franco}`],
          [frais.domicile, 'livraison à domicile'],
          [shop.delais.expedition, shop.ventesOuvertes ? 'délai d’expédition annoncé' : 'délai d’expédition prévu à l’ouverture'],
          ['14 jours', 'pour exercer la rétractation après réception'],
        ]}
      />
      <p className="hub-prices-note">
        {shop.ventesOuvertes
          ? 'Commande en ligne, paiement par carte sur PayPlug. Le délai d’expédition ne comprend pas l’acheminement ; les frais des sacs de frappe et du matériel lourd se confirment sur devis.'
          : 'Les tarifs sont prévus à l’ouverture des ventes ; aucun paiement avant cette ouverture. Les sacs de frappe et le matériel lourd se livrent sur devis.'}
      </p>
      <nav className="subfamily-links" aria-label={`Choix et conditions de livraison ${lieu}`}>
        <a href="#equipement">Comparer les modèles ci-dessous</a>{' '}
        <a href="/livraison/">Frais, zones et délais de livraison</a>{' '}
        <a href="/retours/">Conditions de retour</a>{' '}
        <a href="/contact/">Un conseil avant de choisir</a>
      </nav>
    </section>
  );
}

const rangeeKit = (items: Product[]) => items.slice(0, items.length >= 4 ? items.length - (items.length % 4) : items.length - (items.length % 2));

/** Le graphe décrit la sélection effectivement affichée, pas un produit ou un magasin local inventé. */
function kitNode(path: string, lieu: string, compte: { frappe: number; parDiscipline: Record<string, number>; slug?: string }, all: Product[], seed: number) {
  const k = villeKit(lieu, compte);
  const items = rangeeKit(kitProducts(k.sources, all, seed, k.discipline));
  return {
    '@type': 'ItemList',
    '@id': urlOf(path) + '#equipement',
    name: k.h2,
    numberOfItems: items.length,
    itemListElement: items.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, url: urlOf('/produits/' + p.slug + '/') })),
  };
}

function Kit({ lieu, compte, all, seed }: { lieu: string; compte: { frappe: number; parDiscipline: Record<string, number>; slug?: string }; all: Product[]; seed: number }) {
  const k = villeKit(lieu, compte);
  const items = kitProducts(k.sources, all, seed, k.discipline);
  // jamais une carte seule sur sa rangée : quatre colonnes au bureau, deux au téléphone
  const rangee = rangeeKit(items);
  const [href, texte] = RAYON_DE[k.discipline] || RAYON_DE['Boxe anglaise'];
  return (
    <section className="ville-kit" id="equipement">
      <header className="ville-kit-head">
        <h2>{k.h2}</h2>
        <div>
          {k.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </header>
      <div className="product-grid">
        {rangee.map((p, i) => (
          <ProductCard key={p.id} product={listItem(p)} index={i} />
        ))}
      </div>
      <div className="ville-kit-links">
        <ArrowLink href={href}>{texte}</ArrowLink>{' '}
        <ArrowLink href={MATERIEL}>Matériel sport de combat</ArrowLink>{' '}
        <ArrowLink href="/outils/poids-de-gants/">Quel poids de gants ?</ArrowLink>
      </div>
      {/* « Gants de boxe, livraison à Lyon » : la requête produit + lieu mène au rayon, depuis la ville. */}
      <nav className="subfamily-links ville-rayons" aria-label={`Le matériel, livraison ${lieu}`}>
        {spaced(
          k.sources
            .map((slug) => {
              const s = SUBFAMILIES.find((x) => x.slug === slug);
              const nom = s?.name || categoryFor(slug)?.name;
              return nom ? (
                <a key={slug} href={'/' + slug + '/'}>
                  {`${nom}, livraison ${lieu}`}
                </a>
              ) : null;
            })
            .filter(Boolean),
        )}
      </nav>
    </section>
  );
}

/** Les grandes villes les plus proches, et les pages de la même région : pas la liste entière des villes sur chaque page. */
function Voisines({ v }: { v: Ville }) {
  const idf = IDF.includes(v.codeDepartement) ? REGIONS.find((r) => r.slug === 'ile-de-france') : undefined;
  return (
    <section className="ville-ailleurs">
      <h2>{fine([`Autour ${de(v.nom)} : les grandes villes voisines.`, `Les grandes villes les plus proches ${de(v.nom)}.`, `Depuis ${v.nom}, les autres grandes villes.`][tour(v.slug + 'v', 3)])}</h2>
      <nav className="subfamily-links" aria-label={`Les grandes villes voisines ${de(v.nom)}`}>
        {spaced(
          v.voisines.map((x) => (
            <a key={x.slug} href={villePath(x.slug)}>
              {`Boutique de boxe ${x.nom} · ${fr(x.km)} km`}
            </a>
          )),
        )}{' '}
        {idf ? (
          <>
            <a href={villePath(idf.slug)}>{`Boutique de boxe ${idf.nom}, hors Paris`}</a>{' '}
          </>
        ) : null}
        <a href={HUB_PATH}>{fine('Toutes les villes : la boutique sport de combat France')}</a>
      </nav>
    </section>
  );
}

function itemListNode(path: string, name: string, lieux: Lieu[]) {
  return {
    '@type': 'ItemList',
    '@id': urlOf(path) + '#lieux',
    name,
    numberOfItems: lieux.length,
    itemListElement: lieux.map((l, i) => {
      const site = siteDe(l);
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Place',
          name: nomDe(l),
          ...(clubDe(l)
            ? { address: adressePostale(clubDe(l)!.adresse) }
            : l.adresse || l.codePostal
              ? { address: { '@type': 'PostalAddress', ...(l.adresse ? { streetAddress: l.adresse } : {}), ...(l.codePostal ? { postalCode: l.codePostal } : {}), ...(l.commune ? { addressLocality: l.commune } : {}), addressCountry: 'FR' } }
              : {}),
          ...(site ? { url: lien(site) } : {}),
          identifier: { '@type': 'PropertyValue', propertyID: 'Recensement des équipements sportifs', value: l.id },
        },
      };
    }),
  };
}

/** Toulouse (Eddy, 29/09) : la page amène d'abord aux clubs Boxing Center, puis au Noble Art Portésien. */
function ClubsBoxingCenter() {
  const clubs = [...CLUBS_BOXING_CENTER, { ...NOBLE_ART, recensement: null }];
  return (
    <section className="ville-clubs">
      <h2>{fine('S’entraîner à Toulouse : les clubs Boxing Center.')}</h2>
      <p>
        {fine(
          'Avant le premier achat, le premier cours : les trois clubs de Toulouse proposent une séance d’essai à 10 €, deux autres attendent au sud de l’agglomération, et le Noble Art Portésien enseigne la boxe anglaise à Portet.',
        )}
      </p>
      <ul>
        {clubs.map((c) => (
          <li key={c.site}>
            <a className="ville-club-nom" href={c.site}>
              {c.nom}
            </a>{' '}
            <span>{c.lieu}</span>{' '}
            <p>{c.disciplines}</p>{' '}
            <ArrowLink href={c.cta.href}>{c.cta.texte}</ArrowLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

function clubsNode(path: string) {
  const clubs = [...CLUBS_BOXING_CENTER, NOBLE_ART];
  return {
    '@type': 'ItemList',
    '@id': urlOf(path) + '#clubs',
    name: 'Les clubs Boxing Center et le Noble Art Portésien, à Toulouse et à ses portes',
    numberOfItems: clubs.length,
    itemListElement: clubs.map((c, i) => {
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'SportsActivityLocation',
          name: c.nom,
          url: c.site,
          description: c.disciplines,
          address: adressePostale(c.adresse),
        },
      };
    }),
  };
}

/** « 12 rue de Fenouillet, 31200 Toulouse » → PostalAddress. */
function adressePostale(adresse: string) {
  const [rue, reste] = adresse.split(/,\s*/);
  const [, cp, ville] = /^(\d{5})\s+(.+)$/.exec(reste || '') || [];
  return { '@type': 'PostalAddress', streetAddress: rue, ...(cp ? { postalCode: cp, addressLocality: ville } : {}), addressCountry: 'FR' };
}

/** Date de révision des pages-villes : recensement, ouverture ou vrai changement éditorial.
 *  La même date dans le plan du site (app/sitemap.ts) et dans le graphe de la page. */
export const VILLES_DATE = [SOURCE.maj, ...(shop.ventesOuvertes ? [shop.ouverture.iso] : []), VILLES_COMMERCE_REVISION].sort().at(-1)!;
/** Le carrefour est daté par sa dernière refonte quand elle est plus récente que le recensement. */
export const CARREFOUR_DATE = [SOURCE.maj, ...(shop.ventesOuvertes ? [shop.ouverture.iso] : []), CARREFOUR_REVISION].sort().at(-1)!;
const sourceNode = () => ({ '@type': 'Dataset', name: SOURCE.nom, url: SOURCE.url, license: SOURCE.licenceUrl, creator: { '@type': 'GovernmentOrganization', name: 'Ministère des Sports' }, dateModified: SOURCE.maj });

/* ── Page d'une ville ──────────────────────────────────────────────────── */

export function VillePage({ ville: v, all }: { ville: Ville; all: Product[] }) {
  const path = villePath(v.slug);
  const titre = villeTitre(v);
  const toulouse = v.slug === 'toulouse';
  const faq = villeFaq(v);
  const nomListe = `Les lieux de boxe et d’arts martiaux ${de(v.nom)}`;
  return (
    <main id="contenu" className="page-wrap ville-page">
      <Breadcrumb items={[HUB_CRUMB, { label: 'Boutique de boxe ' + v.nom }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: graph([
            {
              ...webPageNode({ path, name: titre, description: villeDescription(v), type: 'CollectionPage', image: '/vignette/x/boutique-de-boxe-' + v.slug + '.png', dateModified: VILLES_DATE, keywords: ['boutique de boxe ' + v.nom.toLowerCase(), 'salle de boxe ' + v.nom], mainEntity: urlOf(path) + '#equipement' }),
              spatialCoverage: { '@type': 'City', name: v.nom, containedInPlace: { '@type': 'AdministrativeArea', name: v.departement } },
              isBasedOn: sourceNode(),
            },
            kitNode(path, a(v.nom), { frappe: v.frappe, parDiscipline: v.parDiscipline, slug: v.slug }, all, graine(v.slug)),
            itemListNode(path, nomListe, v.lieux),
            ...(toulouse ? [clubsNode(path)] : []),
            faqNode(path, faq),
          ]),
        }}
      />
      <section className="page-heading">
        <div>
          <span className="eyebrow">{`BOUTIQUE DE BOXE ${v.nom.toUpperCase()} · ${v.departement.toUpperCase()}`}</span>
          <h1>{`Boutique de boxe ${v.nom}.`}</h1>
        </div>
        <div>
          <div className="label">{shop.ventesOuvertes ? 'Commande en ligne · livraison en relais ou à domicile' : 'Le matériel à comparer avant l’ouverture des ventes'}</div>
          <p>{villeAchatChapeau(v)}</p>
        </div>
      </section>

      <Commande lieu={a(v.nom)} scope="city" />
      <Kit lieu={a(v.nom)} compte={{ frappe: v.frappe, parDiscipline: v.parDiscipline, slug: v.slug }} all={all} seed={graine(v.slug)} />

      {toulouse && <ClubsBoxingCenter />}
      {toulouse && (
        <section className="ville-a-cote">
          <h2>{fine('Êtes-vous à côté de Toulouse ?')}</h2>
          <nav className="subfamily-links" aria-label="Les communes voisines">
            {spaced(
              A_COTE.map((c) => (
                <a key={c.site} href={c.site}>
                  {c.ancre}
                </a>
              )),
            )}
          </nav>
          <p className="ville-balma">
            {BALMA.avant} <a href={BALMA.site}>{BALMA.lien}</a>
            {fine(BALMA.apres)}
          </p>
        </section>
      )}

      <section className="observatory-lead" aria-label={`${v.nom} en chiffres`}>
        <p className="hub-prices-note">{fine(villeDensite(v))}</p>
        <p>{villeChapeau(v)}</p>
        <Chiffres
          items={[
            [fr(v.lieux.length), `lieux recensés ${a(v.nom)}`],
            [fr(v.frappe), 'où l’on boxe'],
            [fr(v.boxe), 'salles de boxe dédiées'],
            [fr(v.dojos), 'dojos et salles d’arts martiaux'],
          ]}
        />
        <Source population />
      </section>

      <Disciplines titre={[`Les disciplines ${a(v.nom)}.`, `Ce qu’on pratique ${a(v.nom)}.`, `${v.nom}, discipline par discipline.`][tour(v.slug + 'd', 3)]} par={v.parDiscipline} total={v.lieux.length} />

      {/* Hors de « main > section » : l’apparition au défilement attend 8 % de la section à l’écran, ce qu’un
         tableau de plusieurs milliers de pixels n’atteint jamais (Paris au téléphone, Île-de-France) — il resterait invisible. */}
      <div className="ville-tableau">
        <Arrondissements v={v} />
        <section className="keyword-hub observatory">
          <h2>{[`Les ${fr(v.lieux.length)} lieux ${de(v.nom)}.`, `${v.nom} : ${fr(v.lieux.length)} lieux, un par un.`, `Où l’on boxe et où l’on pratique ${a(v.nom)} : ${fr(v.lieux.length)} lieux.`][tour(v.slug + 'l', 3)]}</h2>
          <Lieux lieux={v.lieux} caption={nomListe} id="lieux" />
        </section>
      </div>

      <SeoBody sections={villeSections(v)} faq={faq} heading={[`Questions sur la boxe ${a(v.nom)}`, `La boxe ${a(v.nom)}, en questions`, `Ce qu’on nous demande sur ${v.nom}`][tour(v.slug + 'f', 3)]} />
      <Voisines v={v} />
    </main>
  );
}

/* ── Page d'une région (Île-de-France hors Paris) ──────────────────────── */

function Communes({ g }: { g: Groupe }) {
  return (
    <div className="hub-prices salles-table">
      <table>
        <caption>{`Les lieux de boxe et d’arts martiaux ${dansDepartement(g)}, commune par commune`}</caption>
        <thead>
          <tr>
            <th scope="col">Commune</th>
            <th scope="col">Lieux</th>
            <th scope="col">Salles de boxe</th>
            <th scope="col">Où l’on boxe</th>
            <th scope="col">Disciplines principales</th>
          </tr>
        </thead>
        <tbody>
          {g.communes.map((c) => (
            <tr key={c.nom}>
              <th scope="row">{c.page ? <a href={villePath(c.page)}>{c.nom}</a> : c.nom}</th>
              <td data-label="Lieux">{c.lieux}</td>
              <td data-label="Salles de boxe">{c.boxe}</td>
              <td data-label="Où l’on boxe">{c.frappe}</td>
              <td data-label="Disciplines">{c.disciplines.join(', ') || VIDE}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RegionPage({ region: r, all }: { region: Region; all: Product[] }) {
  const path = villePath(r.slug);
  const titre = regionTitre(r);
  const t = regionTotal(r);
  const par = regionDisciplines(r);
  const groupes = [...r.groupes].sort((x, y) => y.lieux - x.lieux);
  const faq = regionFaq(r);
  const paris = VILLES.find((v) => v.slug === 'paris');
  const pages = VILLES.filter((v) => IDF.includes(v.codeDepartement) && v.slug !== 'paris');
  return (
    <main id="contenu" className="page-wrap ville-page">
      <Breadcrumb items={[HUB_CRUMB, { label: 'Boutique de boxe ' + r.nom }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: graph([
            {
              ...webPageNode({ path, name: titre, description: regionDescription(r), type: 'CollectionPage', image: '/vignette/x/boutique-de-boxe-' + r.slug + '.png', dateModified: VILLES_DATE, keywords: ['boutique de boxe ' + r.nom.toLowerCase()], mainEntity: urlOf(path) + '#equipement' }),
              spatialCoverage: { '@type': 'AdministrativeArea', name: r.nom },
              isBasedOn: sourceNode(),
            },
            kitNode(path, 'en ' + r.nom, { frappe: t.frappe, parDiscipline: par }, all, graine(r.slug)),
            {
              '@type': 'ItemList',
              '@id': urlOf(path) + '#departements',
              name: `Les lieux de boxe et d’arts martiaux d’${r.nom}, hors Paris, par département`,
              numberOfItems: groupes.length,
              itemListElement: groupes.map((g, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: { '@type': 'AdministrativeArea', name: `${g.nom} (${g.code})`, description: `${g.lieux} lieux et ${g.salles} salles de combat, dont ${g.boxe} salles de boxe, dans ${g.communes.length} communes.` },
              })),
            },
            faqNode(path, faq),
          ]),
        }}
      />
      <section className="page-heading">
        <div>
          <span className="eyebrow">{`BOUTIQUE DE BOXE ${r.nom.toUpperCase()} · HORS PARIS`}</span>
          <h1>{`Boutique de boxe ${r.nom}.`}</h1>
        </div>
        <div>
          <div className="label">{shop.ventesOuvertes ? 'Commande en ligne · livraison en relais ou à domicile' : 'Le matériel à comparer avant l’ouverture des ventes'}</div>
          <p>{regionAchatChapeau(r)}</p>
        </div>
      </section>

      <Commande lieu={'en ' + r.nom} scope="region" />
      <Kit lieu={'en ' + r.nom} compte={{ frappe: t.frappe, parDiscipline: par }} all={all} seed={graine(r.slug)} />

      <section className="observatory-lead" aria-label={`${r.nom} en chiffres`}>
        <p>{regionChapeau(r)}</p>
        <Chiffres
          items={[
            [fr(t.lieux), 'lieux recensés hors Paris'],
            [fr(t.frappe), 'où l’on boxe'],
            [fr(t.boxe), 'salles de boxe dédiées'],
            [paris ? fr(paris.lieux.length) : '—', 'lieux de plus à Paris, sur sa propre page'],
          ]}
        />
        <Source />
      </section>

      <nav className="subfamily-links" aria-label="Les grandes villes d’Île-de-France">
        {paris && <a href={villePath('paris')}>{fine(`Boutique de boxe Paris : les ${fr(paris.lieux.length)} lieux de la capitale`)}</a>}{' '}
        {spaced(
          pages.map((v) => (
            <a key={v.slug} href={villePath(v.slug)}>
              {`Boutique de boxe ${v.nom} · ${v.lieux.length} lieux`}
            </a>
          )),
        )}
      </nav>

      <Disciplines titre={`Les disciplines en ${r.nom}.`} par={par} total={t.lieux} />

      <div className="ville-tableau">
        <section className="keyword-hub observatory" id="communes">
          {groupes.map((g) => (
            <div key={g.code}>
              <h2>{fine(`${g.nom} (${g.code}) : ${fr(g.lieux)} lieux dans ${fr(g.communes.length)} communes.`)}</h2>
              <Communes g={g} />
            </div>
          ))}
        </section>
      </div>

      <SeoBody sections={[{ h2: `Livraison en ${r.nom}`, paragraphs: [livraison('toute l’' + r.nom)] }]} faq={faq} heading={`Questions sur la boxe en ${r.nom}`} />
      <section className="ville-ailleurs">
        <h2>La boutique de boxe, partout en France.</h2>
        <nav className="subfamily-links" aria-label="Toutes les villes">
          <a href={HUB_PATH}>{fine('Toutes les villes : la boutique sport de combat France')}</a>{' '}
          <a href={MATERIEL}>Matériel sport de combat</a>
        </nav>
      </section>
    </main>
  );
}

/* ── Carrefour « Boutique sport de combat France » ─────────────────────── */

/** Les grandes villes groupées par région (la page Île-de-France avec les siennes), les régions les plus dotées d'abord. */
function parRegion() {
  const o = new Map<string, { slug: string; nom: string; lieux: number }[]>();
  for (const v of VILLES) o.set(v.region, [...(o.get(v.region) || []), { slug: v.slug, nom: v.nom, lieux: v.lieux.length }]);
  for (const r of REGIONS) o.set(r.nom, [...(o.get(r.nom) || []), { slug: r.slug, nom: r.nom + ' (hors Paris)', lieux: regionTotal(r).lieux }]);
  return [...o.entries()].map(([region, villes]) => [region, villes.sort((x, y) => y.lieux - x.lieux)] as const).sort((x, y) => y[1].length - x[1].length || y[1][0].lieux - x[1][0].lieux);
}

/** Le matériel par sport et par rayon : modèles, premier prix, marques, et les familles qui pèsent le plus. */
function rayonsDuCarrefour(all: Product[]) {
  // « gants MMA », « équipement d’entraînement » : la première lettre seule passe en minuscule, le sigle reste.
  const nomFamille = (slug: string) => {
    const nom = nomDeRayon(slug, categoryFor(slug)?.name || slug);
    return nom.charAt(0).toLowerCase() + nom.slice(1);
  };
  const compte = (slug: string) => {
    const sub = subfamilyFor(slug);
    const cat = categoryFor(slug);
    const items = sub ? subfamilyProducts(sub, all) : cat ? getCategoryProducts(cat, all) : [];
    const f = faits(slug, items);
    const familles = new Map<string, number>();
    for (const p of items) familles.set(p.category, (familles.get(p.category) || 0) + 1);
    return { n: items.length, min: f.min, marques: f.marques.length, familles: [...familles.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => nomFamille(c)) };
  };
  const sports: SportBoutique[] = SPORTS_BOUTIQUE.map((s) => ({ ...s, ...compte(s.slug) })).filter((s) => s.n > 0);
  const types: SportBoutique[] = RAYONS_TYPE.map((r) => ({ nom: r.label, slug: r.href.slice(1, -1), ...compte(r.href.slice(1, -1)) })).filter((t) => t.n > 0);
  return { sports, types };
}

/** Un tableau du carrefour : une ligne par sport ou par rayon, la ligne « Toutes les disciplines » en dernier. */
function TableauRayons({ id, caption, lignes, detail, total, note }: { id: string; caption: string; lignes: SportBoutique[]; detail?: boolean; total?: { n: number; min: number; marques: number }; note: string }) {
  return (
    <div className="hub-prices salles-table" id={id}>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{detail ? 'Sport' : 'Rayon'}</th>
            <th scope="col">Modèles</th>
            <th scope="col">Dès</th>
            <th scope="col">Marques</th>
            {detail && <th scope="col">Ce qui pèse le plus</th>}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.slug}>
              <th scope="row">
                <a href={'/' + l.slug + '/'}>{l.nom}</a>
              </th>
              <td data-label="Modèles">{fr(l.n)}</td>
              <td data-label="Dès">{money(l.min)}</td>
              <td data-label="Marques">{fr(l.marques)}</td>
              {detail && <td data-label="Ce qui pèse le plus">{l.familles.join(', ')}</td>}
            </tr>
          ))}
          {total && (
            <tr>
              <th scope="row">
                <a href={MATERIEL}>Toutes les disciplines</a>
              </th>
              <td data-label="Modèles">{fr(total.n)}</td>
              <td data-label="Dès">{money(total.min)}</td>
              <td data-label="Marques">{fr(total.marques)}</td>
              {detail && <td data-label="Ce qui pèse le plus">tout le catalogue, les familles du combat d’abord</td>}
            </tr>
          )}
        </tbody>
      </table>
      <p className="hub-prices-note">{note}</p>
    </div>
  );
}

export function CarrefourPage({ all }: { all: Product[] }) {
  const { sports, types } = rayonsDuCarrefour(all);
  const total = faits('materiel-sport-de-combat', all);
  const marques = brandsOf(all);
  const tete = marques.slice(0, 12);
  const lignes = [
    ...VILLES.map((v) => ({ slug: v.slug, nom: v.nom, region: v.region, lieux: v.lieux.length, boxe: v.boxe, frappe: v.frappe, densite: v.habitantsParLieu as number | null })),
    ...REGIONS.map((r) => {
      const t = regionTotal(r);
      return { slug: r.slug, nom: r.nom + ' (hors Paris)', region: r.nom, lieux: t.lieux, boxe: t.boxe, frappe: t.frappe, densite: null as number | null };
    }),
  ].sort((x, y) => y.lieux - x.lieux);
  const lieux = lignes.reduce((n, l) => n + l.lieux, 0);
  const titre = carrefourTitre(all.length);
  const description = carrefourDescription(all.length);
  const faq = carrefourFaq({ modeles: all.length, marques: total.marques.length, sports });
  const [chiffres1, chiffres2] = franceEnChiffres();
  const guides = GUIDES.filter((g) => ['/guides/choisir-gants-boxe/', '/guides/debuter-boxe/', '/guides/debuter-mma/', '/guides/choisir-protections/'].includes(g.href));
  return (
    <main id="contenu" className="page-wrap ville-page">
      <Breadcrumb items={[{ label: 'Boutique sport de combat' }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: graph([
            {
              ...webPageNode({ path: HUB_PATH, name: titre, description, type: 'CollectionPage', image: '/vignette/x/' + CARREFOUR + '.png', dateModified: CARREFOUR_DATE, keywords: ['boutique sport de combat france', 'boutique sport de combat'], mainEntity: urlOf(HUB_PATH) + '#sports' }),
              isBasedOn: sourceNode(),
            },
            {
              '@type': 'ItemList',
              '@id': urlOf(HUB_PATH) + '#sports',
              name: 'Le matériel par sport de combat',
              numberOfItems: sports.length,
              itemListElement: sports.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.nom, url: urlOf('/' + s.slug + '/') })),
            },
            {
              '@type': 'ItemList',
              '@id': urlOf(HUB_PATH) + '#villes',
              name: 'Boutique de boxe, ville par ville',
              numberOfItems: lignes.length,
              itemListElement: lignes.map((l, i) => ({ '@type': 'ListItem', position: i + 1, name: 'Boutique de boxe ' + l.nom, url: urlOf(villePath(l.slug)) })),
            },
            faqNode(HUB_PATH, faq),
          ]),
        }}
      />
      <section className="page-heading">
        <div>
          <span className="eyebrow">{`BOUTIQUE SPORT DE COMBAT FRANCE · ${sports.length} SPORTS · ${fr(all.length)} MODÈLES`}</span>
          <h1>La boutique sport de combat qui livre toute la France.</h1>
        </div>
        <div>
          <div className="label">{fine(`${fr(all.length)} modèles, ${fr(total.marques.length)} marques, ${sports.length} sports : les tailles réelles et le prix TTC sur chaque fiche.`)}</div>
          <p>{fine(carrefourChapeau(all.length, total.marques.length, sports.length))}</p>
        </div>
      </section>

      <section className="observatory-lead" aria-label="La boutique en chiffres">
        <Chiffres
          items={[
            [fr(all.length), 'modèles au catalogue'],
            [fr(total.marques.length), 'marques'],
            [frais.relais, 'le point relais, offert dès ' + frais.franco],
            ['14 jours', 'pour renvoyer un article'],
          ]}
        />
      </section>

      <div className="ville-tableau">
        <section className="keyword-hub observatory">
          <h2>Le matériel par sport de combat.</h2>
          <TableauRayons id="sports" caption="Le matériel de la boutique, sport par sport" lignes={sports} detail total={{ n: all.length, min: total.min, marques: total.marques.length }} note="Premier prix TTC du jour sur chaque page ; les sacs de frappe et le matériel lourd se livrent sur devis." />
        </section>
      </div>
      <div className="ville-tableau">
        <section className="keyword-hub observatory">
          <h2>Le matériel par type.</h2>
          <TableauRayons id="types" caption="Le matériel de la boutique, rayon par rayon" lignes={types} note="Un modèle peut compter dans deux rayons ; chaque page donne ses propres chiffres." />
        </section>
      </div>

      <SeoBody
        sections={[
          {
            h2: 'Livraison, paiement, retours : les mêmes règles pour toute la France',
            paragraphs: [
              fine(`${livraisonPartout()} Le point relais coûte ${frais.relais} et devient gratuit à partir de ${frais.franco} d’achats ; la livraison à domicile, ${frais.domicile}. La commande part sous ${shop.delais.expedition} et son suivi arrive par e-mail ; les sacs de frappe, bases, portiques et tatamis, trop lourds pour un colis, se livrent sur devis.`),
              fine('Le règlement se fait par carte, sur la page sécurisée de PayPlug, sans compte à ouvrir. Quatorze jours après la réception, un article non utilisé se renvoie dans son emballage et se rembourse ; pour une autre taille, la page contact suffit, avec le numéro de commande.'),
            ],
          },
        ]}
      />

      <section className="ville-ailleurs">
        <h2>Les marques de la boutique.</h2>
        <p>{fine(carrefourMarques(total.marques.length, tete.slice(0, 3).map((b) => ({ nom: b.name, n: b.products.length })), MIN_BRAND_PRODUCTS))}</p>
        <nav className="subfamily-links" aria-label="Les marques les plus présentes">
          {spaced([
            ...tete.map((b) => (
              <a key={b.slug} href={'/marques/' + b.slug + '/'}>
                {`${b.name} · ${fr(b.products.length)} modèles`}
              </a>
            )),
            <a key="toutes" href="/marques/">
              Toutes les marques
            </a>,
          ])}
        </nav>
      </section>

      <section className="observatory-lead" aria-label="La France des sports de combat en chiffres">
        <Chiffres
          items={[
            [fr(FRANCE.lieux), 'lieux de sports de combat en France métropolitaine'],
            [fr(FRANCE.frappe), 'où l’on boxe'],
            [fr(lignes.length), 'grandes villes et régions, chacune sa page'],
            [fr(lieux), 'lieux recensés sur ces pages'],
          ]}
        />
        <Source population />
      </section>

      <SeoBody sections={[{ h2: 'Où l’on pratique : la France des sports de combat, en chiffres', paragraphs: [chiffres1, chiffres2] }]} />
      <Disciplines titre="Les disciplines en France." par={FRANCE.parDiscipline} total={FRANCE.lieux} />

      <div className="ville-tableau">
        <section className="keyword-hub observatory">
          <h2>Les grandes villes, une par une.</h2>
          <div className="hub-prices salles-table" id="villes">
            <table>
              <caption>Lieux de boxe et d’arts martiaux recensés par grande ville</caption>
              <thead>
                <tr>
                  <th scope="col">Ville</th>
                  <th scope="col">Région</th>
                  <th scope="col">Lieux</th>
                  <th scope="col">Où l’on boxe</th>
                  <th scope="col">Salles de boxe</th>
                  <th scope="col">Habitants par lieu</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.slug}>
                    <th scope="row">
                      <a href={villePath(l.slug)}>{'Boutique de boxe ' + l.nom}</a>
                    </th>
                    <td data-label="Région">{l.region}</td>
                    <td data-label="Lieux">{fr(l.lieux)}</td>
                    <td data-label="Où l’on boxe">{fr(l.frappe)}</td>
                    <td data-label="Salles de boxe">{fr(l.boxe)}</td>
                    <td data-label="Habitants par lieu">{l.densite ? fr(l.densite) : VIDE}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hub-prices-note">
              {`Une page par commune de plus de ${fr(SOURCE.seuilHabitants)} habitants qui compte au moins ${SOURCE.seuil} lieux, dont ${SOURCE.seuilFrappe} où l’on boxe.`}
            </p>
          </div>
        </section>
      </div>

      <section className="ville-ailleurs ville-regions">
        <h2>La boutique de boxe, région par région.</h2>
        {parRegion().map(([region, villes]) => (
          <div key={region}>
            <h3>{'Boutique de boxe ' + region}</h3>
            <nav className="subfamily-links" aria-label={'Les grandes villes de la région ' + region}>
              {spaced(
                villes.map((v) => (
                  <a key={v.slug} href={villePath(v.slug)}>
                    {`Boutique de boxe ${v.nom} · ${fr(v.lieux)} lieux`}
                  </a>
                )),
              )}
            </nav>
          </div>
        ))}
      </section>

      <SeoBody sections={[]} faq={faq} heading="Questions sur la boutique sport de combat" />
      <section className="spec-section">
        <div>
          <h2>Les guides pour choisir.</h2>
          {spaced(
            guides.map((g) => (
              <ArrowLink key={g.href} href={g.href}>
                {g.label}
              </ArrowLink>
            )),
          )}
        </div>
      </section>
    </main>
  );
}
