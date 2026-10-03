import { categoryFor, getCategoryProducts, money, type Product } from '@/lib/catalog';
import { SUBFAMILIES, subfamilyProducts } from '@/lib/subfamilies';
import { FRANCE, SOURCE, dateSource } from '@/lib/villes';
import type { SeoFaq } from '@/lib/seo-copy';
import { dansLeRayon, ENFANT } from '@/lib/rayons';
import { LIGNES, rayon } from './materiel-par-discipline';

/**
 * « Matériel de boxe » (03/10) : la page de tête et ses pages d'entrée.
 *
 * Trois blocs, tous calculés sur le catalogue du jour :
 *   - le tableau des trois sacs (débuter, s'entraîner à deux, monter sur le ring) et ce que
 *     chacun coûte, au premier prix puis au prix médian de ses rayons — sur /materiel-boxe/ ;
 *   - le sac d'un niveau, pièce par pièce — sur les pages « débutant » et « compétition » ;
 *   - ce qu'une discipline demande d'abord, puis ensuite, et le nombre de lieux qui la déclarent
 *     en France d'après le recensement du ministère des Sports — sur les pages par boxe.
 * Aucun chiffre n'est écrit à la main : un prix qui change dans le catalogue change ici.
 */

const fr = (n: number) => n.toLocaleString('fr-FR');

/** Un rayon pour un adulte : ses modèles, son premier prix, son prix médian. */
function piece(slug: string, all: Product[]) {
  const sub = SUBFAMILIES.find((s) => s.slug === slug);
  const cat = sub ? undefined : categoryFor(slug);
  const prix = (sub ? subfamilyProducts(sub, all) : cat ? getCategoryProducts(cat, all) : [])
    .filter((p) => p.price > 0 && dansLeRayon(slug, p) && p.audience !== 'enfant' && !ENFANT.test(p.name))
    .map((p) => p.price)
    .sort((a, b) => a - b);
  return { slug, nom: sub?.name || cat?.name || slug, n: prix.length, des: prix[0] ?? 0, median: prix[Math.floor(prix.length / 2)] ?? 0 };
}

const NIVEAUX = [
  { cle: 'debutant', nom: 'Débuter', quand: 'Le premier cours, le sac, les pattes d’ours.', pieces: ['bandes-de-boxe', 'gants-de-boxe', 'protege-dents'], page: 'materiel-boxe-debutant' },
  { cle: 'regulier', nom: 'S’entraîner à deux', quand: 'Le sparring, chaque semaine.', pieces: ['bandes-de-boxe', 'gants-de-boxe-sparring', 'protege-dents', 'casques-de-boxe', 'coquilles'], page: null },
  { cle: 'competition', nom: 'Monter sur le ring', quand: 'Le combat, sous le règlement d’une fédération.', pieces: ['bandes-de-boxe', 'gants-de-boxe-a-lacets', 'protege-dents', 'coquilles', 'chaussures-boxe', 'shorts-de-boxe'], page: 'materiel-boxe-competition' },
] as const;

/** Les trois sacs et leur coût : la somme des premiers prix, puis des prix médians, de leurs rayons. */
function sacs(all: Product[]) {
  return NIVEAUX.map((niveau) => {
    const pieces = niveau.pieces.map((s) => piece(s, all)).filter((p) => p.n > 0);
    return { ...niveau, pieces, des: pieces.reduce((n, p) => n + p.des, 0), median: pieces.reduce((n, p) => n + p.median, 0) };
  });
}

const NOTE = 'Somme du premier prix, puis du prix médian, de chaque rayon de la ligne, modèles adultes seulement. Prix prévus à l’ouverture des ventes, calculés sur le catalogue du jour.';

/** /materiel-boxe/ : les trois sacs, côte à côte. */
export function MaterielParNiveau({ all }: { all: Product[] }) {
  const lignes = sacs(all);
  return (
    <div className="ville-tableau">
      <section className="keyword-hub observatory materiel-disciplines">
        <h2>Le matériel de boxe, niveau par niveau.</h2>
        <p className="materiel-disciplines-lead">
          Trois sacs, du premier cours au ring : ce que chacun contient, puis ce qu’il coûte en entier, au premier prix et au prix médian du catalogue. Boxe par boxe, la liste change : voir le{' '}
          <a href="/materiel-boxe-thai/">matériel de boxe thaï</a>, le <a href="/materiel-kick-boxing/">matériel de kick-boxing</a>, le{' '}
          <a href="/materiel-boxe-francaise/">matériel de boxe française</a>, le <a href="/materiel-mma/">matériel MMA</a> et l’<a href="/equipement-jjb/">équipement JJB</a>.
        </p>
        <div className="hub-prices salles-table">
          <table>
            <caption>Le matériel de boxe et son budget, niveau par niveau</caption>
            <thead>
              <tr>
                <th scope="col">Niveau</th>
                <th scope="col">Dans le sac</th>
                <th scope="col">Au premier prix</th>
                <th scope="col">Au prix médian</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.cle}>
                  <th scope="row">
                    {l.page ? <a href={'/' + l.page + '/'}>{l.nom}</a> : l.nom} <small>{l.quand}</small>
                  </th>
                  <td data-label="Dans le sac">
                    <ul className="materiel-rayons">
                      {l.pieces.map((p) => (
                        <li key={p.slug}>
                          <a href={'/' + p.slug + '/'}>{p.nom}</a> <small>{`${p.n} modèles, dès ${money(p.des)}`}</small>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td data-label="Au premier prix">{money(l.des)}</td>
                  <td data-label="Au prix médian">{money(l.median)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hub-prices-note">{NOTE}</p>
        </div>
      </section>
    </div>
  );
}

/** Les pages « débutant » et « compétition » : le sac du niveau, pièce par pièce. */
export function KitNiveau({ niveau, all }: { niveau: 'debutant' | 'competition'; all: Product[] }) {
  const sac = sacs(all).find((s) => s.cle === niveau);
  if (!sac || !sac.pieces.length) return null;
  const titre = niveau === 'debutant' ? 'Le premier sac de boxe, chiffré.' : 'Le sac de compétition, chiffré.';
  return (
    <div className="ville-tableau">
      <section className="keyword-hub observatory materiel-disciplines">
        <h2>{titre}</h2>
        <p className="materiel-disciplines-lead">
          {`${sac.pieces.length} pièces. En prenant le premier prix de chaque rayon, le sac revient à ${money(sac.des)} ; au prix médian, à ${money(sac.median)}. Pour comparer avec les autres niveaux, voir `}
          <a href="/materiel-boxe/">tout le matériel de boxe</a>.
        </p>
        <div className="hub-prices salles-table">
          <table>
            <caption>{niveau === 'debutant' ? 'Le premier sac de boxe, pièce par pièce' : 'Le sac de compétition, pièce par pièce'}</caption>
            <thead>
              <tr>
                <th scope="col">Pièce</th>
                <th scope="col">Modèles</th>
                <th scope="col">Dès</th>
                <th scope="col">Prix médian</th>
              </tr>
            </thead>
            <tbody>
              {sac.pieces.map((p) => (
                <tr key={p.slug}>
                  <th scope="row">
                    <a href={'/' + p.slug + '/'}>{p.nom}</a>
                  </th>
                  <td data-label="Modèles">{p.n}</td>
                  <td data-label="Dès">{money(p.des)}</td>
                  <td data-label="Prix médian">{money(p.median)}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">Le sac entier</th>
                <td data-label="Modèles">{`${sac.pieces.length} pièces`}</td>
                <td data-label="Dès">{money(sac.des)}</td>
                <td data-label="Prix médian">{money(sac.median)}</td>
              </tr>
            </tbody>
          </table>
          <p className="hub-prices-note">{NOTE}</p>
        </div>
      </section>
    </div>
  );
}

const ARTICLE: Record<string, string> = {
  'Muay-thaï': 'le muay-thaï',
  'Kick-boxing': 'le kick-boxing',
  'Savate boxe française': 'la savate boxe française',
  'Jiu-jitsu brésilien': 'le jiu-jitsu brésilien',
};

/** Les pages par boxe : ce que la discipline demande, dans l'ordre, et où elle se pratique. */
export function KitDiscipline({ discipline, nom, all }: { discipline: string; nom: string; all: Product[] }) {
  const ligne = LIGNES.find((l) => l.discipline === discipline);
  if (!ligne) return null;
  const lieux = ligne.recensement ? FRANCE.parDiscipline[ligne.recensement] || 0 : 0;
  const rangs = [...ligne.essentiel.map((s) => ({ quand: 'D’abord', r: rayon(s, all) })), ...ligne.ensuite.map((s) => ({ quand: 'Ensuite', r: rayon(s, all) }))].filter((x) => x.r.n > 0);
  const le = ARTICLE[discipline] || discipline.toLowerCase();
  return (
    <div className="ville-tableau">
      <section className="keyword-hub observatory materiel-disciplines">
        <h2>{`${nom} : d’abord, ensuite.`}</h2>
        <p className="materiel-disciplines-lead">
          {lieux
            ? `${fr(lieux)} lieux déclarent ${le} en France métropolitaine, sur ${fr(FRANCE.lieux)} lieux de sports de combat recensés par le ministère des Sports. Ce que la discipline demande, dans l’ordre où un club le demande, avec le nombre de modèles et le premier prix de chaque rayon ; les autres disciplines sont dans `
            : `Ce que ${le} demande, dans l’ordre où un club le demande, avec le nombre de modèles et le premier prix de chaque rayon ; les autres disciplines sont dans `}
          <a href="/materiel-sport-de-combat/">le matériel sport de combat</a>.
        </p>
        <div className="hub-prices salles-table">
          <table>
            <caption>{`${nom} : les rayons, dans l’ordre`}</caption>
            <thead>
              <tr>
                <th scope="col">Rayon</th>
                <th scope="col">Quand</th>
                <th scope="col">Modèles</th>
                <th scope="col">Dès</th>
              </tr>
            </thead>
            <tbody>
              {rangs.map(({ quand, r }) => (
                <tr key={r.slug}>
                  <th scope="row">
                    <a href={'/' + r.slug + '/'}>{r.nom}</a>
                  </th>
                  <td data-label="Quand">{quand}</td>
                  <td data-label="Modèles">{r.n}</td>
                  <td data-label="Dès">{r.des ? money(r.des) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hub-prices-note">
            {lieux ? (
              <>
                Lieux : <a href={SOURCE.url}>{SOURCE.nom}</a>, {SOURCE.editeur}, mis à jour le {dateSource()}. Modèles et prix : le catalogue du jour, prix prévus à l’ouverture des ventes.
              </>
            ) : (
              'Modèles et prix : le catalogue du jour, prix prévus à l’ouverture des ventes. Le recensement du ministère des Sports ne distingue pas cette discipline.'
            )}
          </p>
        </div>
      </section>
    </div>
  );
}

/** La question que seul le catalogue permet de chiffrer, pour /materiel-boxe/. */
export function budgetFaq(all: Product[]): SeoFaq[] {
  const [debut, regulier, ring] = sacs(all);
  return [
    {
      question: 'Combien coûte un équipement de boxe complet ?',
      answer: `Pour débuter, des bandes, des gants et un protège-dents reviennent à ${money(debut.des)} au premier prix du catalogue et à ${money(debut.median)} au prix médian. Le sac de sparring, avec le casque et la coquille, va de ${money(regulier.des)} à ${money(regulier.median)} ; celui de compétition, avec les chaussures et le short, de ${money(ring.des)} à ${money(ring.median)}. Prix prévus à l’ouverture des ventes.`,
    },
  ];
}
