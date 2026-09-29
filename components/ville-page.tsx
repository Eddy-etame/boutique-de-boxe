import type { Metadata } from 'next';
import { categoryFor, getCategoryProducts, listItem, type Product } from '@/lib/catalog';
import { SUBFAMILIES, subfamilyProducts } from '@/lib/subfamilies';
import { graph, urlOf, webPageNode, faqNode } from '@/lib/seo';
import { ogImage } from '@/lib/og';
import { Breadcrumb, ArrowLink } from './shop-shell';
import { ProductCard } from './shop-interactions';
import { SeoBody } from './seo-body';
import { spaced } from '@/lib/spaced';
import {
  SOURCE, VILLES, REGIONS, CARREFOUR, villePath, dateSource, regionTotal, regionDisciplines,
  CLUBS_BOXING_CENTER, A_COTE, RAYON, a, de, dansDepartement, siteDe, fine,
  villeTitre, villeDescription, villeChapeau, villeSections, villeFaq, villeKit,
  regionTitre, regionDescription, regionChapeau, regionFaq, livraison, livraisonPartout,
  CARREFOUR_TITRE, CARREFOUR_DESCRIPTION, carrefourChapeau, CARREFOUR_FAQ,
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
const adresseDe = (l: Lieu) => [l.adresse, [l.codePostal, l.commune].filter(Boolean).join(' ')].filter(Boolean).join(', ');

/** Un nombre stable par ville : chaque page montre d'autres modèles que sa voisine. */
const graine = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function kitProducts(sources: string[], all: Product[], seed: number) {
  const pris = new Set<string>();
  return sources
    .map((slug, i) => {
      const sub = SUBFAMILIES.find((x) => x.slug === slug);
      const cat = sub ? null : categoryFor(slug);
      const pool = (sub ? subfamilyProducts(sub, all) : cat ? getCategoryProducts(cat, all) : []).filter((p) => p.images[0] && p.price > 0 && !pris.has(p.id));
      const juste = slug === 'kimonos' ? pool.filter((p) => /kimono/i.test(p.name)) : pool;
      if (juste.length) pool.splice(0, pool.length, ...juste);
      const beaux = pool.filter((p) => p.cut?.mode === 'pose');
      const choix = beaux.length >= 3 ? beaux : pool;
      if (!choix.length) return null;
      const p = choix[(seed + i * 7) % choix.length];
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

function Source() {
  return (
    <p className="observatory-cite">
      Source : <a href={SOURCE.url}>{SOURCE.nom}</a>, {SOURCE.editeur}, <a href={SOURCE.licenceUrl}>{SOURCE.licence}</a> · mis à jour le {dateSource()}. Sont listés les lieux
      ouverts aux clubs ou au public ; les salles réservées aux scolaires ne le sont pas.
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
            <strong>{n}</strong>
          </li>
        ))}
      </ol>
      <p className="hub-prices-note">Nombre de lieux qui déclarent chaque discipline ; un lieu en déclare souvent plusieurs. Chaque discipline mène au matériel qu’elle demande.</p>
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
              <tr key={l.id}>
                <th scope="row">
                  {l.nom}{' '}
                  <small>{l.salles.map((s) => s.nom).join(' · ')}</small>
                </th>
                <td data-label="Disciplines">{l.disciplines.length ? l.disciplines.join(', ') : <span className="salle-vide">non déclarées</span>}</td>
                <td data-label="Adresse">{adresseDe(l) || <span className="salle-vide">non renseignée</span>}</td>
                <td data-label="En ligne">
                  {site && hote(site) ? (
                    <a href={lien(site)} rel={CLUBS_BOXING_CENTER.some((c) => c.site === site) ? undefined : 'nofollow noopener'}>
                      {hote(site)}
                    </a>
                  ) : (
                    <span className="salle-vide">pas de site déclaré</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Kit({ lieu, compte, all, seed }: { lieu: string; compte: { frappe: number; parDiscipline: Record<string, number> }; all: Product[]; seed: number }) {
  const k = villeKit(lieu, compte);
  const items = kitProducts(k.sources, all, seed);
  // jamais une carte seule sur sa rangée : quatre colonnes au bureau, deux au téléphone
  const rangee = items.slice(0, items.length >= 4 ? items.length - (items.length % 4) : items.length - (items.length % 2));
  const rayon = k.kind === 'frappe' ? ['/materiel-boxe/', 'Tout le matériel de boxe'] : ['/boutique-arts-martiaux/', 'Toute la boutique arts martiaux'];
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
        <ArrowLink href={rayon[0]}>{rayon[1]}</ArrowLink>{' '}
        <ArrowLink href="/outils/poids-de-gants/">Quel poids de gants ?</ArrowLink>
      </div>
    </section>
  );
}

function AutresVilles({ sauf }: { sauf?: string }) {
  const liens = [...VILLES.map((v) => ({ slug: v.slug, nom: v.nom })), ...REGIONS.map((r) => ({ slug: r.slug, nom: r.nom }))]
    .filter((x) => x.slug !== sauf)
    .sort((x, y) => x.nom.localeCompare(y.nom, 'fr'));
  return (
    <section className="ville-ailleurs">
      <h2>La boutique de boxe, dans les autres villes.</h2>
      <nav className="subfamily-links" aria-label="Les autres villes">
        {spaced(
          liens.map((x) => (
            <a key={x.slug} href={villePath(x.slug)}>
              {'Boutique de boxe ' + x.nom}
            </a>
          )),
        )}{' '}
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
          name: l.nom,
          ...(l.adresse || l.codePostal
            ? { address: { '@type': 'PostalAddress', ...(l.adresse ? { streetAddress: l.adresse } : {}), ...(l.codePostal ? { postalCode: l.codePostal } : {}), ...(l.commune ? { addressLocality: l.commune } : {}), addressCountry: 'FR' } }
            : {}),
          ...(site ? { url: lien(site) } : {}),
          identifier: { '@type': 'PropertyValue', propertyID: 'Recensement des équipements sportifs', value: l.id },
        },
      };
    }),
  };
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
          <div className="label">
            {fr(v.lieux.length)} lieux de boxe et d’arts martiaux, et le matériel que chacun demande.
          </div>
          <p>{villeChapeau(v)}</p>
        </div>
      </section>

      <section className="observatory-lead" aria-label={`${v.nom} en chiffres`}>
        <Chiffres
          items={[
            [fr(v.lieux.length), `lieux recensés ${a(v.nom)}`],
            [fr(v.frappe), 'où l’on boxe : anglaise, française, thaïe, kick, full contact'],
            [fr(v.boxe), 'salles de boxe dédiées'],
            [fr(v.dojos), 'dojos et salles d’arts martiaux'],
          ]}
        />
        <Source />
      </section>

      {toulouse && (
        <section className="ville-clubs">
          <h2>Les clubs Boxing Center, à Toulouse et à ses portes.</h2>
          <p>Boutique de Boxe est la boutique de la SAS Boxing Center, dont les clubs de boxe et de MMA sont à Toulouse et au sud de l’agglomération.</p>
          <ul>
            {CLUBS_BOXING_CENTER.map((c) => (
              <li key={c.site}>
                <a href={c.site}>{c.nom}</a>{' '}
                <span>{c.lieu}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
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
        </section>
      )}

      <Disciplines titre={`Les disciplines ${a(v.nom)}.`} par={v.parDiscipline} total={v.lieux.length} />

      {/* Hors de « main > section » : l’apparition au défilement attend 8 % de la section à l’écran, ce qu’un
         tableau de plusieurs milliers de pixels n’atteint jamais (Paris au téléphone, Île-de-France) — il resterait invisible. */}
      <div className="ville-tableau">
        <section className="keyword-hub observatory">
          <h2>
            Les {fr(v.lieux.length)} lieux {de(v.nom)}.
          </h2>
          <Lieux lieux={v.lieux} caption={nomListe} id="lieux" />
        </section>
      </div>

      <Kit lieu={a(v.nom)} compte={v} all={all} seed={graine(v.slug)} />

      <SeoBody sections={villeSections(v)} faq={faq} heading={`Questions sur la boxe ${a(v.nom)}`} />
      <AutresVilles sauf={v.slug} />
    </main>
  );
}

/* ── Page d'une région (Île-de-France hors Paris) ──────────────────────── */

function Communes({ g }: { g: Groupe }) {
  return (
    <div className="hub-prices salles-table">
      <table>
        <caption>
          Les lieux de boxe et d’arts martiaux {dansDepartement(g)}, commune par commune
        </caption>
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
              <th scope="row">{c.nom}</th>
              <td data-label="Lieux">{c.lieux}</td>
              <td data-label="Salles de boxe">{c.boxe}</td>
              <td data-label="Où l’on boxe">{c.frappe}</td>
              <td data-label="Disciplines">{c.disciplines.join(', ') || <span className="salle-vide">non déclarées</span>}</td>
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
          <div className="label">{fr(t.lieux)} lieux de boxe et d’arts martiaux, commune par commune.</div>
          <p>{regionChapeau(r)}</p>
        </div>
      </section>

      <section className="observatory-lead" aria-label={`${r.nom} en chiffres`}>
        <Chiffres
          items={[
            [fr(t.lieux), 'lieux recensés hors Paris'],
            [fr(t.frappe), 'où l’on boxe : anglaise, française, thaïe, kick, full contact'],
            [fr(t.boxe), 'salles de boxe dédiées'],
            [paris ? fr(paris.lieux.length) : '—', 'lieux de plus à Paris, sur sa propre page'],
          ]}
        />
        <Source />
      </section>

      {paris && (
        <nav className="subfamily-links" aria-label="Paris">
          <a href={villePath('paris')}>{fine(`Boutique de boxe Paris : les ${fr(paris.lieux.length)} lieux de la capitale`)}</a>
        </nav>
      )}

      <Disciplines titre={`Les disciplines en ${r.nom}.`} par={par} total={t.lieux} />

      {/* Hors de « main > section » : l’apparition au défilement attend 8 % de la section à l’écran, ce qu’un
         tableau de plusieurs milliers de pixels n’atteint jamais (Paris au téléphone, Île-de-France) — il resterait invisible. */}
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
      <AutresVilles sauf={r.slug} />
    </main>
  );
}

/* ── Carrefour « Boutique sport de combat France » ─────────────────────── */

export function CarrefourPage({ all }: { all: Product[] }) {
  const lignes = [
    ...VILLES.map((v) => ({ slug: v.slug, nom: v.nom, region: v.region, lieux: v.lieux.length, boxe: v.boxe, frappe: v.frappe, tete: Object.keys(v.parDiscipline)[0] })),
    ...REGIONS.map((r) => {
      const t = regionTotal(r);
      return { slug: r.slug, nom: r.nom + ' (hors Paris)', region: r.nom, lieux: t.lieux, boxe: t.boxe, frappe: t.frappe, tete: Object.keys(regionDisciplines(r))[0] };
    }),
  ].sort((x, y) => y.lieux - x.lieux);
  const total = lignes.reduce((n, l) => n + l.lieux, 0);
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
            faqNode(HUB_PATH, CARREFOUR_FAQ),
          ]),
        }}
      />
      <section className="page-heading">
        <div>
          <span className="eyebrow">{`BOUTIQUE SPORT DE COMBAT FRANCE · ${lignes.length} VILLES ET RÉGIONS`}</span>
          <h1>La boutique sport de combat, ville par ville.</h1>
        </div>
        <div>
          <div className="label">{fine('Boutique sport de combat France : un catalogue, toutes les villes.')}</div>
          <p>{carrefourChapeau(total)}</p>
        </div>
      </section>

      <section className="observatory-lead" aria-label="La boutique en chiffres">
        <Chiffres
          items={[
            [fr(lignes.length), 'villes et régions, chacune sa page'],
            [fr(total), 'lieux de boxe et d’arts martiaux recensés'],
            [fr(all.length), 'modèles au catalogue'],
            ['France', 'métropolitaine, à domicile ou en point relais'],
          ]}
        />
        <Source />
      </section>

      {/* Hors de « main > section » : l’apparition au défilement attend 8 % de la section à l’écran, ce qu’un
         tableau de plusieurs milliers de pixels n’atteint jamais (Paris au téléphone, Île-de-France) — il resterait invisible. */}
      <div className="ville-tableau">
      <section className="keyword-hub observatory">
        <h2>Les lieux de boxe et d’arts martiaux, par ville.</h2>
        <div className="hub-prices salles-table" id="villes">
          <table>
            <caption>Lieux de boxe et d’arts martiaux recensés par ville</caption>
            <thead>
              <tr>
                <th scope="col">Ville</th>
                <th scope="col">Région</th>
                <th scope="col">Lieux</th>
                <th scope="col">Salles de boxe</th>
                <th scope="col">Où l’on boxe</th>
                <th scope="col">La plus déclarée</th>
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
                  <td data-label="Salles de boxe">{fr(l.boxe)}</td>
                  <td data-label="Où l’on boxe">{fr(l.frappe)}</td>
                  <td data-label="La plus déclarée">{l.tete}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hub-prices-note">
            Une ville a sa page à partir de {SOURCE.seuil} lieux recensés. Recensement des équipements sportifs du {dateSource()}.
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
        faq={CARREFOUR_FAQ}
        heading="Questions sur la boutique sport de combat"
      />
      <section className="spec-section">
        <div>
          <h2>Du matériel par discipline.</h2>
          <ArrowLink href="/materiel-boxe/">Matériel de boxe anglaise</ArrowLink>
          <ArrowLink href="/materiel-mma/">Matériel de MMA</ArrowLink>
          <ArrowLink href="/boutique-arts-martiaux/">Boutique arts martiaux</ArrowLink>
          <ArrowLink href="/materiel-sport-de-combat/">Tout le matériel de sport de combat</ArrowLink>
        </div>
      </section>
    </main>
  );
}
