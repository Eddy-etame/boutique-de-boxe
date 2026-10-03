import type { Metadata } from 'next';
import { shop } from '@/lib/catalog';
import { graph, urlOf, webPageNode, faqNode } from '@/lib/seo';
import { ogImage } from '@/lib/og';
import { SOURCE, FRANCE, VILLES, villePath, dateSource, fine } from '@/lib/villes';
import type { SeoFaq } from '@/lib/seo-copy';
import { spaced } from '@/lib/spaced';
import { Breadcrumb, ArrowLink } from './shop-shell';
import { SeoBody } from './seo-body';

/**
 * « Sport de combat » et « Arts martiaux » (03/10) : deux requêtes du cahier des charges dont Google
 * sert des pages d'information (Wikipédia, annuaires), pas des rayons. Une page de catalogue n'y
 * entre pas. Ces deux pages répondent à la question — quelles disciplines, ce qu'on y fait, où —
 * avec ce que personne d'autre ne publie sous cette forme : le nombre de lieux qui déclarent chaque
 * discipline en France et dans les grandes villes, d'après le Recensement des équipements sportifs
 * du ministère des Sports. Le matériel arrive ensuite, par lien.
 */

type Fiche = {
  /** libellé exact du recensement, ou null quand le recensement ne distingue pas la discipline */
  recensement: string | null;
  nom: string;
  colonne: string;
  texte: string;
  materiel?: [string, string];
};

type Config = {
  slug: string;
  titre: string;
  description: string;
  eyebrow: string;
  h1: string;
  label: string;
  colonne: string;
  chapeau: (n: number) => string;
  fiches: Fiche[];
  sections: { h2: string; paragraphs: string[] }[];
  faq: () => SeoFaq[];
  voisine: [string, string];
  vignette: string;
};

const fr = (n: number) => n.toLocaleString('fr-FR');
const par = (d: string | null) => (d ? FRANCE.parDiscipline[d] || 0 : null);

const SPORTS: Config = {
  slug: 'sports-de-combat',
  titre: 'Sport de combat : les disciplines et leurs salles en France',
  description: 'Sport de combat : les 16 disciplines du recensement, ce que chacune permet, et combien de lieux les déclarent en France et dans les grandes villes.',
  eyebrow: 'SPORT DE COMBAT · LES DISCIPLINES EN FRANCE',
  h1: 'Les sports de combat, discipline par discipline.',
  label: 'Sport de combat : frapper, saisir, ou les deux.',
  colonne: 'Famille',
  chapeau: (n) =>
    `Un sport de combat oppose deux personnes qui cherchent, selon des règles, à toucher, projeter ou immobiliser l’autre. En France métropolitaine, ${fr(FRANCE.lieux)} lieux en déclarent au moins un, et ${n} disciplines y sont recensées par le ministère des Sports ; le judo y est le plus présent, la boxe anglaise la première des boxes.`,
  fiches: [
    { recensement: 'Judo, jujitsu', nom: 'Judo, jujitsu', colonne: 'Préhension', texte: 'Projections et immobilisations au sol, en kimono ; aucune frappe en judo.', materiel: ['/kimonos/', 'Kimonos'] },
    { recensement: 'Karaté', nom: 'Karaté', colonne: 'Percussion', texte: 'Coups de poing et de pied contrôlés, travaillés seul en kata et à deux en combat.', materiel: ['/boutique-arts-martiaux/', 'Boutique arts martiaux'] },
    { recensement: 'Aïkido', nom: 'Aïkido', colonne: 'Préhension', texte: 'Clés et projections qui retournent la force de l’attaquant ; sans compétition.', materiel: ['/kimonos/', 'Kimonos'] },
    { recensement: 'Boxe anglaise', nom: 'Boxe anglaise', colonne: 'Percussion', texte: 'Les poings seulement, au-dessus de la ceinture, en rounds de deux ou trois minutes.', materiel: ['/materiel-boxe/', 'Matériel de boxe'] },
    { recensement: 'Taekwondo', nom: 'Taekwondo', colonne: 'Percussion', texte: 'Les jambes avant tout : coups de pied hauts et sautés, plastron électronique en compétition.', materiel: ['/protections-boxe/', 'Protections'] },
    { recensement: 'Tai-chi, qi gong', nom: 'Tai-chi, qi gong', colonne: 'Sans opposition', texte: 'Enchaînements lents issus des arts martiaux chinois, pratiqués pour la souplesse et l’équilibre.' },
    { recensement: 'Full contact', nom: 'Full contact', colonne: 'Percussion', texte: 'Poings et pieds, cibles au-dessus de la ceinture, en pantalon long.', materiel: ['/materiel-kick-boxing/', 'Matériel de kick-boxing'] },
    { recensement: 'Savate boxe française', nom: 'Savate boxe française', colonne: 'Percussion', texte: 'Poings et pieds chaussés : la seule boxe où la chaussure sert à toucher.', materiel: ['/materiel-boxe-francaise/', 'Matériel de boxe française'] },
    { recensement: 'Lutte', nom: 'Lutte', colonne: 'Préhension', texte: 'Amener l’adversaire au sol et le tenir sur le dos, sans frapper.', materiel: ['/chaussures-boxe/', 'Chaussures de lutte'] },
    { recensement: 'Kick-boxing', nom: 'Kick-boxing', colonne: 'Percussion', texte: 'Poings et pieds, coups de pied aux jambes compris, en short.', materiel: ['/materiel-kick-boxing/', 'Matériel de kick-boxing'] },
    { recensement: 'Kendo', nom: 'Kendo', colonne: 'Armes', texte: 'Escrime japonaise au sabre de bambou, en armure, à des cibles précises.' },
    { recensement: 'Muay-thaï', nom: 'Muay-thaï', colonne: 'Percussion', texte: 'Poings, pieds, genoux et coudes, et la saisie au corps-à-corps.', materiel: ['/materiel-boxe-thai/', 'Matériel de boxe thaï'] },
    { recensement: 'Canne et bâton', nom: 'Canne et bâton', colonne: 'Armes', texte: 'Escrime française à la canne, cousine de la savate.' },
    { recensement: 'Sumo', nom: 'Sumo', colonne: 'Préhension', texte: 'Faire sortir l’adversaire du cercle ou lui faire toucher le sol autrement que des pieds.' },
    { recensement: 'Sambo', nom: 'Sambo', colonne: 'Préhension', texte: 'Lutte en veste venue de Russie, avec projections et clés.' },
    { recensement: 'Kung-fu, wushu', nom: 'Kung-fu, wushu', colonne: 'Percussion', texte: 'Arts martiaux chinois, techniques de frappe et formes ; très rarement déclaré au recensement.' },
    { recensement: null, nom: 'MMA', colonne: 'Mixte', texte: 'Frappes debout et combat au sol dans le même assaut, en gants ouverts.', materiel: ['/materiel-mma/', 'Matériel MMA'] },
    { recensement: null, nom: 'Jiu-jitsu brésilien, grappling', colonne: 'Préhension', texte: 'Contrôle et soumission au sol, avec ou sans kimono.', materiel: ['/equipement-jjb/', 'Équipement JJB'] },
  ],
  sections: [
    {
      h2: 'Percussion, préhension, mixte : trois familles',
      paragraphs: [
        'Les sports de percussion cherchent à toucher : poings en boxe anglaise, poings et pieds en kick-boxing, en savate et en karaté, genoux et coudes en plus en muay-thaï. Les sports de préhension cherchent à saisir : projeter et immobiliser en judo et en lutte, soumettre en jiu-jitsu brésilien. Le MMA réunit les deux dans le même assaut.',
        'La famille décide du matériel. Les sports de percussion demandent des gants, des bandes et des protections ; les sports de préhension, une tenue qui résiste aux saisies et presque aucune protection.',
      ],
    },
    {
      h2: 'Quel sport de combat choisir',
      paragraphs: [
        'Pour apprendre à encaisser et à placer ses coups, une boxe : anglaise si l’on veut travailler les poings et les déplacements, kick-boxing ou muay-thaï si l’on veut aussi les jambes. Pour apprendre à chuter, à saisir et à contrôler sans frapper, le judo, la lutte ou le jiu-jitsu brésilien. Pour la condition physique sans opposition, le cardio boxe et le tai-chi.',
        'Le meilleur indicateur reste l’offre près de chez soi : un sport pratiqué dans dix lieux de sa ville se choisit plus facilement qu’un sport pratiqué dans un seul. Le tableau des grandes villes, plus bas, le dit ville par ville.',
      ],
    },
  ],
  faq: () => {
    const [d1, d2, d3] = Object.entries(FRANCE.parDiscipline);
    return [
      { question: fine('Quel est le sport de combat le plus présent en France ?'), answer: `Le judo et le jujitsu, déclarés dans ${fr(d1[1])} des ${fr(FRANCE.lieux)} lieux de sports de combat recensés en France métropolitaine, devant le karaté (${fr(d2[1])}) et l’aïkido (${fr(d3[1])}). Ces chiffres comptent des lieux, pas des licenciés. Source : ${SOURCE.nom}, ${SOURCE.editeur}.` },
      { question: fine('Combien y a-t-il de salles de boxe en France ?'), answer: `${fr(FRANCE.boxe)} salles sont classées « salle de boxe » au recensement du ministère des Sports, et ${fr(FRANCE.frappe)} lieux déclarent au moins une boxe — anglaise, française, thaï, kick-boxing ou full contact.` },
      { question: fine('Quelle différence entre un sport de combat et un art martial ?'), answer: 'Le sport de combat se définit par la compétition et ses règles ; l’art martial, par une tradition, une progression par grades et souvent une part de travail sans adversaire. Beaucoup de disciplines sont les deux, comme le judo, le karaté ou le taekwondo.' },
      { question: fine('Le MMA est-il un sport de combat reconnu en France ?'), answer: 'Oui : les compétitions de MMA sont autorisées en France depuis 2020, encadrées par une fédération délégataire du ministère des Sports. Le recensement des équipements, lui, ne distingue pas encore le MMA parmi les disciplines déclarées.' },
    ];
  },
  voisine: ['/les-arts-martiaux/', 'Les arts martiaux, leur origine et leurs dojos'],
  vignette: 'sports-de-combat',
};

const ARTS: Config = {
  slug: 'les-arts-martiaux',
  titre: 'Arts martiaux : la liste, leur origine et leurs dojos en France',
  description: 'Arts martiaux : judo, karaté, aïkido, taekwondo, kendo, tai-chi… leur origine, leur principe, et combien de lieux les déclarent en France.',
  eyebrow: 'ARTS MARTIAUX · LA LISTE ET LEURS DOJOS',
  h1: 'Les arts martiaux, leur origine et leurs dojos.',
  label: 'Arts martiaux : une tradition, des grades, un principe.',
  colonne: 'Origine',
  chapeau: () =>
    `Un art martial est une méthode de combat transmise par une tradition, enseignée par grades et souvent pratiquée sans adversaire autant qu’avec. En France métropolitaine, ${fr(FRANCE.dojos)} dojos et salles d’arts martiaux sont recensés par le ministère des Sports ; le judo y est déclaré dans ${fr(FRANCE.parDiscipline['Judo, jujitsu'] || 0)} lieux.`,
  fiches: [
    { recensement: 'Judo, jujitsu', nom: 'Judo, jujitsu', colonne: 'Japon', texte: 'Fondé par Jigorō Kanō en 1882 : utiliser le déséquilibre de l’autre pour le projeter.', materiel: ['/kimonos/', 'Kimonos de judo'] },
    { recensement: 'Karaté', nom: 'Karaté', colonne: 'Okinawa, Japon', texte: 'La « main vide » : frapper sans arme, du poing, du pied et du tranchant de la main.', materiel: ['/boutique-arts-martiaux/', 'Kimonos et protections'] },
    { recensement: 'Aïkido', nom: 'Aïkido', colonne: 'Japon', texte: 'Créé par Morihei Ueshiba : se placer et neutraliser l’attaque plutôt que la rendre.', materiel: ['/ceintures/', 'Ceintures'] },
    { recensement: 'Taekwondo', nom: 'Taekwondo', colonne: 'Corée', texte: 'La « voie du pied et du poing », où les jambes portent l’essentiel des techniques.', materiel: ['/protections-boxe/', 'Protections'] },
    { recensement: 'Tai-chi, qi gong', nom: 'Tai-chi, qi gong', colonne: 'Chine', texte: 'Le geste martial ralenti jusqu’à devenir un travail du souffle et de l’équilibre.' },
    { recensement: 'Kendo', nom: 'Kendo', colonne: 'Japon', texte: 'La « voie du sabre » : l’escrime des samouraïs, au shinai de bambou.' },
    { recensement: 'Sumo', nom: 'Sumo', colonne: 'Japon', texte: 'Lutte rituelle où l’on gagne en sortant l’autre du cercle.' },
    { recensement: 'Kung-fu, wushu', nom: 'Kung-fu, wushu', colonne: 'Chine', texte: 'Des centaines de styles chinois, souvent pratiqués dans des associations qui ne les déclarent pas comme tels.' },
    { recensement: null, nom: 'Jiu-jitsu brésilien', colonne: 'Brésil', texte: 'Né du judo et du jujitsu japonais, développé au Brésil autour du combat au sol.', materiel: ['/equipement-jjb/', 'Équipement JJB'] },
    { recensement: null, nom: 'Krav-maga', colonne: 'Israël', texte: 'Méthode d’autodéfense sans compétition, tournée vers les situations réelles.', materiel: ['/leggings/', 'Pantalons et leggings'] },
  ],
  sections: [
    {
      h2: 'Ce qu’un art martial apprend, en plus du combat',
      paragraphs: [
        'Les arts martiaux transmettent une étiquette — le salut, le tatami, le respect du professeur — et une progression par grades, souvent marquée par la couleur de la ceinture. Beaucoup y ajoutent des formes codifiées, kata en karaté, poomsae en taekwondo, qu’on travaille seul avant de les appliquer à deux.',
        'Certains ont gardé la compétition au centre, comme le judo ou le taekwondo ; d’autres l’ont écartée, comme l’aïkido ou le krav-maga. Les deux voies se valent : elles ne demandent ni le même engagement physique, ni le même équipement.',
      ],
    },
    {
      h2: 'Quel art martial pour commencer',
      paragraphs: [
        'Pour un enfant, le judo reste le plus facile à trouver : c’est l’art martial le plus déclaré en France, et il apprend d’abord à tomber sans se faire mal. Pour travailler les frappes, le karaté ou le taekwondo. Pour une pratique sans compétition, l’aïkido ou le tai-chi.',
        'Le premier équipement est presque toujours le même : un kimono à sa taille et la ceinture blanche. Les protections ne viennent qu’avec le combat, et chaque club dit lesquelles il impose.',
      ],
    },
  ],
  faq: () => [
    { question: fine('Quel est l’art martial le plus pratiqué en France ?'), answer: `Le judo, avec le jujitsu : il est déclaré dans ${fr(FRANCE.parDiscipline['Judo, jujitsu'] || 0)} lieux en France métropolitaine, loin devant le karaté (${fr(FRANCE.parDiscipline['Karaté'] || 0)}) et l’aïkido (${fr(FRANCE.parDiscipline['Aïkido'] || 0)}), d’après le recensement du ministère des Sports. Ces chiffres comptent des lieux, pas des pratiquants.` },
    { question: fine('Combien y a-t-il de dojos en France ?'), answer: `${fr(FRANCE.dojos)} dojos et salles d’arts martiaux sont recensés en France métropolitaine, sur ${fr(FRANCE.salles)} salles de sports de combat au total. Source : ${SOURCE.nom}, ${SOURCE.editeur}.` },
    { question: fine('Quel art martial choisir pour se défendre ?'), answer: 'Le krav-maga est construit pour l’autodéfense ; le judo et le jiu-jitsu brésilien apprennent à contrôler sans frapper. Le bon choix reste celui qu’on pratiquera longtemps, donc celui qu’on trouve près de chez soi.' },
    { question: fine('Quel équipement pour débuter un art martial ?'), answer: 'Un kimono à sa taille — de JJB, de judo ou de karaté selon la discipline — et la ceinture blanche. Les gants, les protège-tibias et le protège-dents ne viennent qu’avec le combat.' },
  ],
  voisine: ['/sports-de-combat/', 'Les sports de combat, discipline par discipline'],
  vignette: 'les-arts-martiaux',
};

export const DISCIPLINES_PAGES: Record<string, Config> = { [SPORTS.slug]: SPORTS, [ARTS.slug]: ARTS };

export const disciplinesMetadata = (c: Config): Metadata => {
  const path = '/' + c.slug + '/';
  return {
    title: { absolute: c.titre },
    description: c.description,
    keywords: [c.eyebrow.split(' · ')[0].toLowerCase(), c.slug === 'sports-de-combat' ? 'liste des sports de combat' : 'liste des arts martiaux', c.slug === 'sports-de-combat' ? 'salles de sport de combat en France' : 'dojos en France', 'recensement des équipements sportifs'],
    alternates: { canonical: path, languages: { 'fr-FR': path, 'x-default': path } },
    openGraph: { title: c.titre, description: c.description, url: path, type: 'website', locale: 'fr_FR', siteName: shop.name, images: ogImage('x', c.vignette, c.titre) },
    twitter: { card: 'summary_large_image', title: c.titre, description: c.description },
  };
};

export function DisciplinesPage({ config: c }: { config: Config }) {
  const path = '/' + c.slug + '/';
  const recenses = c.fiches.filter((f) => f.recensement);
  const lignes = [...c.fiches].sort((a, b) => (par(b.recensement) ?? -1) - (par(a.recensement) ?? -1));
  const noms = new Set(recenses.map((f) => f.recensement as string));
  const villes = VILLES.map((v) => ({ v, n: Object.entries(v.parDiscipline).filter(([d]) => noms.has(d)).reduce((s, [, k]) => s + k, 0), top: Object.entries(v.parDiscipline).filter(([d]) => noms.has(d)).sort((a, b) => b[1] - a[1])[0] }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 12);
  const faq = c.faq();
  return (
    <main id="contenu" className="page-wrap ville-page">
      <Breadcrumb items={[{ label: c.eyebrow.split(' · ')[0].charAt(0) + c.eyebrow.split(' · ')[0].slice(1).toLowerCase() }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: graph([
            {
              ...webPageNode({ path, name: c.titre, description: c.description, image: '/vignette/x/' + c.vignette + '.png', dateModified: SOURCE.maj, mainEntity: urlOf(path) + '#disciplines' }),
              isBasedOn: { '@type': 'Dataset', name: SOURCE.nom, url: SOURCE.url, license: SOURCE.licenceUrl, creator: { '@type': 'GovernmentOrganization', name: 'Ministère des Sports' }, dateModified: SOURCE.maj },
            },
            {
              '@type': 'ItemList',
              '@id': urlOf(path) + '#disciplines',
              name: c.h1.replace(/\.$/, ''),
              numberOfItems: lignes.length,
              itemListElement: lignes.map((f, i) => ({ '@type': 'ListItem', position: i + 1, name: f.nom, description: f.texte })),
            },
            faqNode(path, faq),
          ]),
        }}
      />
      <section className="page-heading">
        <div>
          <span className="eyebrow">{c.eyebrow}</span>
          <h1>{c.h1}</h1>
        </div>
        <div>
          <div className="label">{fine(c.label)}</div>
          <p>{c.chapeau(recenses.length)}</p>
        </div>
      </section>

      <section className="observatory-lead vente-chiffres" aria-label="En chiffres">
        <div className="observatory-figures">
          {(c.slug === 'sports-de-combat'
            ? [
                [fr(FRANCE.lieux), 'lieux de sports de combat en France métropolitaine'],
                [fr(FRANCE.frappe), 'où l’on boxe'],
                [fr(FRANCE.dojos), 'dojos et salles d’arts martiaux'],
                [fr(FRANCE.salles), 'salles de sports de combat'],
              ]
            : [
                [fr(FRANCE.dojos), 'dojos et salles d’arts martiaux'],
                [fr(FRANCE.parDiscipline['Judo, jujitsu'] || 0), 'lieux où le judo est déclaré'],
                [fr(FRANCE.parDiscipline['Karaté'] || 0), 'lieux où le karaté est déclaré'],
                [fr(FRANCE.parDiscipline['Aïkido'] || 0), 'lieux où l’aïkido est déclaré'],
              ]
          ).map(([n, l]) => (
            <div key={l}>
              <strong>{n}</strong> <span>{l}</span>
            </div>
          ))}
        </div>
        <p className="observatory-cite">
          Source : <a href={SOURCE.url}>{SOURCE.nom}</a>, {SOURCE.editeur}, <a href={SOURCE.licenceUrl}>{SOURCE.licence}</a>, mis à jour le {dateSource()}.
        </p>
      </section>

      <div className="ville-tableau">
        <section className="keyword-hub observatory">
          <h2>{c.slug === 'sports-de-combat' ? 'Les disciplines, de la plus présente à la plus rare.' : 'Chaque art martial, son origine et ses lieux.'}</h2>
          <div className="hub-prices salles-table" id="liste">
            <table>
              <caption>{c.h1}</caption>
              <thead>
                <tr>
                  <th scope="col">Discipline</th>
                  <th scope="col">{c.colonne}</th>
                  <th scope="col">Ce qu’on y fait</th>
                  <th scope="col">Lieux en France</th>
                  <th scope="col">Le matériel</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((f) => (
                  <tr key={f.nom}>
                    <th scope="row">{f.nom}</th>
                    <td data-label={c.colonne}>{f.colonne}</td>
                    <td data-label="Ce qu’on y fait">{f.texte}</td>
                    <td data-label="Lieux en France">{f.recensement ? fr(par(f.recensement) || 0) : <span className="salle-vide">non recensé</span>}</td>
                    <td data-label="Le matériel">{f.materiel ? <a href={f.materiel[0]}>{f.materiel[1]}</a> : <span className="salle-vide">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hub-prices-note">
              {`Un lieu compte une fois par discipline qu’il déclare : un même dojo peut accueillir le judo, le karaté et l’aïkido. « Non recensé » : le recensement ne distingue pas cette discipline.`}
            </p>
          </div>
        </section>
      </div>

      <SeoBody sections={c.sections} />

      <div className="ville-tableau">
        <section className="keyword-hub observatory">
          <h2>{c.slug === 'sports-de-combat' ? 'Où les pratiquer : les grandes villes.' : 'Les grandes villes des arts martiaux.'}</h2>
          <div className="hub-prices salles-table">
            <table>
              <caption>{c.slug === 'sports-de-combat' ? 'Déclarations de sports de combat par grande ville' : 'Déclarations d’arts martiaux par grande ville'}</caption>
              <thead>
                <tr>
                  <th scope="col">Ville</th>
                  <th scope="col">Déclarations</th>
                  <th scope="col">La plus déclarée</th>
                </tr>
              </thead>
              <tbody>
                {villes.map(({ v, n, top }) => (
                  <tr key={v.slug}>
                    <th scope="row">
                      <a href={villePath(v.slug)}>{v.nom}</a>
                    </th>
                    <td data-label="Déclarations">{fr(n)}</td>
                    <td data-label="La plus déclarée">{top ? `${top[0]} (${fr(top[1])})` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hub-prices-note">
              {`Les ${villes.length} grandes villes où les disciplines de cette page sont le plus déclarées ; chaque ville a sa page, lieu par lieu, avec les adresses.`}
            </p>
          </div>
        </section>
      </div>

      <SeoBody sections={[]} faq={faq} heading={c.slug === 'sports-de-combat' ? 'Questions sur les sports de combat' : 'Questions sur les arts martiaux'} />

      <section className="spec-section">
        <div>
          <h2>Pour aller plus loin.</h2>
          {spaced([
            <ArrowLink key="v" href={c.voisine[0]}>{c.voisine[1]}</ArrowLink>,
            <ArrowLink key="m" href="/materiel-sport-de-combat/">Le matériel de chaque sport de combat</ArrowLink>,
            <ArrowLink key="a" href="/boutique-arts-martiaux/">Boutique arts martiaux</ArrowLink>,
            <ArrowLink key="c" href="/boutique-sport-de-combat/">Les salles, ville par ville</ArrowLink>,
          ])}
        </div>
        <div>
          <h2>Les sources.</h2>
          <p>
            Lieux et disciplines : <a href={SOURCE.url}>{SOURCE.nom}</a>, {SOURCE.editeur}, mis à jour le {dateSource()}. Définitions générales : <a href="https://fr.wikipedia.org/wiki/Sport_de_combat">Wikipédia, « Sport de combat »</a> et <a href="https://fr.wikipedia.org/wiki/Art_martial">« Art martial »</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
