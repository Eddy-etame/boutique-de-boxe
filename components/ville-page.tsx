import type { Metadata } from 'next';
import { categoryFor, getCategoryProducts, listItem, type Product } from '@/lib/catalog';
import { SUBFAMILIES, subfamilyProducts } from '@/lib/subfamilies';
import { graph, urlOf, webPageNode, faqNode } from '@/lib/seo';
import { ogImage } from '@/lib/og';
import { Breadcrumb, ArrowLink } from './shop-shell';
import { ProductCard } from './shop-interactions';
import { SeoBody } from './seo-body';
import { spaced } from '@/lib/spaced';
import { dansLeRayon, ENFANT } from '@/lib/rayons';
import {
  SOURCE, FRANCE, VILLES, REGIONS, CARREFOUR, villePath, dateSource, regionTotal, regionDisciplines,
  CLUBS_BOXING_CENTER, NOBLE_ART, A_COTE, BALMA, RAYON, a, de, dansDepartement, siteDe, fine, estBoxingCenter,
  villeTitre, villeDescription, villeDensite, villeChapeau, villeSections, villeFaq, villeKit, parArrondissement,
  regionTitre, regionDescription, regionChapeau, regionFaq, livraison, livraisonPartout,
  CARREFOUR_TITRE, CARREFOUR_DESCRIPTION, carrefourChapeau, carrefourFaq, franceEnChiffres,
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
export const carrefourMetadata = () =>
  meta(HUB_PATH, CARREFOUR_TITRE, CARREFOUR_DESCRIPTION, CARREFOUR, ['boutique sport de combat france', 'boutique sport de combat', 'boutique de boxe en ligne', 'salle de boxe par ville']);

/* ── Morceaux partagés ─────────────────────────────────────────────────── */

const fr = (n: number) => n.toLocaleString('fr-FR');
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
const graine = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

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
  'Boxe anglaise': ['/materiel-boxe/', 'Le matériel de boxe anglaise'],
  'Savate boxe française': ['/chaussures-boxe/', 'Les chaussures de boxe'],
  'Muay-thaï': ['/protege-tibias/', 'Les protège-tibias'],
  'Kick-boxing': ['/protections-boxe/', 'Les protections de boxe'],
  'Full contact': ['/gants-de-boxe/', 'Les gants de boxe'],
};

function Kit({ lieu, compte, all, seed }: { lieu: string; compte: { frappe: number; parDiscipline: Record<string, number> }; all: Product[]; seed: number }) {
  const k = villeKit(lieu, compte);
  const items = kitProducts(k.sources, all, seed, k.discipline);
  // jamais une carte seule sur sa rangée : quatre colonnes au bureau, deux au téléphone
  const rangee = items.slice(0, items.length >= 4 ? items.length - (items.length % 4) : items.length - (items.length % 2));
  const [href, texte] = RAYON_DE[k.discipline] || RAYON_DE['Boxe anglaise'];
  return (
    <section className="ville-kit">
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
    </section>
  );
}

/** Les grandes villes les plus proches, et les pages de la même région : pas la liste entière des villes sur chaque page. */
function Voisines({ v }: { v: Ville }) {
  const idf = IDF.includes(v.codeDepartement) ? REGIONS.find((r) => r.slug === 'ile-de-france') : undefined;
  return (
    <section className="ville-ailleurs">
      <h2>{fine(`Autour ${de(v.nom)} : les grandes villes voisines.`)}</h2>
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
          'Boutique de Boxe est la boutique de la SAS Boxing Center. Avant le premier achat, le premier cours : les trois clubs de Toulouse proposent une séance d’essai à 10 €, deux autres attendent au sud de l’agglomération, et le Noble Art Portésien enseigne la boxe anglaise à Portet.',
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
              ...webPageNode({ path, name: titre, description: villeDescription(v), type: 'CollectionPage', image: '/vignette/x/boutique-de-boxe-' + v.slug + '.png', dateModified: SOURCE.maj, keywords: ['boutique de boxe ' + v.nom.toLowerCase(), 'salle de boxe ' + v.nom], mainEntity: urlOf(path) + '#lieux' }),
              spatialCoverage: { '@type': 'City', name: v.nom, containedInPlace: { '@type': 'AdministrativeArea', name: v.departement } },
              isBasedOn: sourceNode(),
            },
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
          <div className="label">{fine(villeDensite(v))}</div>
          <p>{villeChapeau(v)}</p>
        </div>
      </section>

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

      <Disciplines titre={`Les disciplines ${a(v.nom)}.`} par={v.parDiscipline} total={v.lieux.length} />

      {/* Hors de « main > section » : l’apparition au défilement attend 8 % de la section à l’écran, ce qu’un
         tableau de plusieurs milliers de pixels n’atteint jamais (Paris au téléphone, Île-de-France) — il resterait invisible. */}
      <div className="ville-tableau">
        <Arrondissements v={v} />
        <section className="keyword-hub observatory">
          <h2>{`Les ${fr(v.lieux.length)} lieux ${de(v.nom)}.`}</h2>
          <Lieux lieux={v.lieux} caption={nomListe} id="lieux" />
        </section>
      </div>

      <Kit lieu={a(v.nom)} compte={v} all={all} seed={graine(v.slug)} />

      <SeoBody sections={villeSections(v)} faq={faq} heading={`Questions sur la boxe ${a(v.nom)}`} />
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
              ...webPageNode({ path, name: titre, description: regionDescription(r), type: 'CollectionPage', image: '/vignette/x/boutique-de-boxe-' + r.slug + '.png', dateModified: SOURCE.maj, keywords: ['boutique de boxe ' + r.nom.toLowerCase()], mainEntity: urlOf(path) + '#departements' }),
              spatialCoverage: { '@type': 'AdministrativeArea', name: r.nom },
              isBasedOn: sourceNode(),
            },
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
          <div className="label">{`${fr(t.lieux)} lieux de boxe et d’arts martiaux, commune par commune.`}</div>
          <p>{regionChapeau(r)}</p>
        </div>
      </section>

      <section className="observatory-lead" aria-label={`${r.nom} en chiffres`}>
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

      <Kit lieu={'en ' + r.nom} compte={{ frappe: t.frappe, parDiscipline: par }} all={all} seed={graine(r.slug)} />

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

export function CarrefourPage({ all }: { all: Product[] }) {
  const lignes = [
    ...VILLES.map((v) => ({ slug: v.slug, nom: v.nom, region: v.region, lieux: v.lieux.length, boxe: v.boxe, frappe: v.frappe, densite: v.habitantsParLieu as number | null })),
    ...REGIONS.map((r) => {
      const t = regionTotal(r);
      return { slug: r.slug, nom: r.nom + ' (hors Paris)', region: r.nom, lieux: t.lieux, boxe: t.boxe, frappe: t.frappe, densite: null as number | null };
    }),
  ].sort((x, y) => y.lieux - x.lieux);
  const total = lignes.reduce((n, l) => n + l.lieux, 0);
  const faq = carrefourFaq();
  const [chiffres1, chiffres2] = franceEnChiffres();
  return (
    <main id="contenu" className="page-wrap ville-page">
      <Breadcrumb items={[{ label: 'Boutique sport de combat' }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: graph([
            {
              ...webPageNode({ path: HUB_PATH, name: CARREFOUR_TITRE, description: CARREFOUR_DESCRIPTION, type: 'CollectionPage', image: '/vignette/x/' + CARREFOUR + '.png', dateModified: SOURCE.maj, keywords: ['boutique sport de combat france', 'boutique sport de combat'], mainEntity: urlOf(HUB_PATH) + '#villes' }),
              isBasedOn: sourceNode(),
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
          <span className="eyebrow">{`BOUTIQUE SPORT DE COMBAT FRANCE · ${lignes.length} VILLES ET RÉGIONS`}</span>
          <h1>La boutique sport de combat, ville par ville.</h1>
        </div>
        <div>
          <div className="label">{fine('Boutique sport de combat France : un catalogue, toutes les grandes villes.')}</div>
          <p>{carrefourChapeau(total)}</p>
        </div>
      </section>

      <section className="observatory-lead" aria-label="La France des sports de combat en chiffres">
        <Chiffres
          items={[
            [fr(FRANCE.lieux), 'lieux de sports de combat en France métropolitaine'],
            [fr(FRANCE.frappe), 'où l’on boxe'],
            [fr(lignes.length), 'grandes villes et régions, chacune sa page'],
            [fr(all.length), 'modèles au catalogue'],
          ]}
        />
        <Source population />
      </section>

      <SeoBody sections={[{ h2: 'La France des sports de combat, en chiffres', paragraphs: [chiffres1, chiffres2] }]} />
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

      <SeoBody
        sections={[
          {
            h2: 'Une boutique sport de combat en ligne, pour toute la France',
            paragraphs: [
              livraisonPartout(),
              'Le catalogue couvre la boxe anglaise, le kick-boxing, le muay-thaï, le MMA, le jiu-jitsu brésilien, la savate et les arts martiaux : gants, protections, textile, sacs de frappe et chaussures, avec les tailles réelles de chaque modèle.',
            ],
          },
        ]}
        faq={faq}
        heading="Questions sur la boutique sport de combat"
      />
      <section className="spec-section">
        <div>
          <h2>Du matériel par discipline.</h2>
          {spaced([
            <ArrowLink key="m" href={MATERIEL}>Matériel sport de combat</ArrowLink>,
            <ArrowLink key="b" href="/materiel-boxe/">Matériel de boxe</ArrowLink>,
            <ArrowLink key="mma" href="/materiel-mma/">Matériel de MMA</ArrowLink>,
            <ArrowLink key="am" href="/boutique-arts-martiaux/">Boutique arts martiaux</ArrowLink>,
          ])}
        </div>
      </section>
    </main>
  );
}

