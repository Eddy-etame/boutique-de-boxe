import { categoryFor, getCategoryProducts, money, type Product } from '@/lib/catalog';
import { SUBFAMILIES, subfamilyProducts } from '@/lib/subfamilies';
import { FRANCE, SOURCE, CARREFOUR, dateSource, fine } from '@/lib/villes';
import type { SeoFaq } from '@/lib/seo-copy';
import { dansLeRayon } from '@/lib/rayons';

/**
 * « Matériel sport de combat » (29/09) : ce que chaque discipline demande d'abord,
 * puis ensuite, avec pour chaque rayon son nombre de modèles et son premier prix,
 * calculés sur le catalogue ; et, pour chaque discipline, le nombre de lieux qui la
 * déclarent en France d'après le Recensement des équipements sportifs. Aucune autre
 * page ne met ces deux relevés côte à côte : c'est ce qui rend la page citable.
 */

export type Ligne = { discipline: string; recensement: string | null; essentiel: string[]; ensuite: string[] };

export const LIGNES: Ligne[] = [
  { discipline: 'Boxe anglaise', recensement: 'Boxe anglaise', essentiel: ['bandes-de-boxe', 'gants-de-boxe', 'protege-dents'], ensuite: ['casques-de-boxe', 'chaussures-boxe', 'cordes-a-sauter'] },
  { discipline: 'Savate boxe française', recensement: 'Savate boxe française', essentiel: ['chaussures-boxe', 'gants-de-boxe', 'protege-dents'], ensuite: ['coquilles', 'casques-de-boxe'] },
  { discipline: 'Muay-thaï', recensement: 'Muay-thaï', essentiel: ['protege-tibias', 'gants-de-boxe', 'bandes-de-boxe'], ensuite: ['shorts-de-boxe', 'coquilles', 'protege-dents'] },
  { discipline: 'Kick-boxing', recensement: 'Kick-boxing', essentiel: ['gants-de-boxe', 'protege-tibias', 'protege-dents'], ensuite: ['coquilles', 'casques-de-boxe'] },
  { discipline: 'Full contact', recensement: 'Full contact', essentiel: ['gants-de-boxe', 'protege-tibias', 'casques-de-boxe'], ensuite: ['protege-dents', 'bandes-de-boxe'] },
  { discipline: 'MMA', recensement: null, essentiel: ['gants-mma', 'shorts-mma', 'protege-dents'], ensuite: ['rashguards', 'protege-tibias', 'coquilles'] },
  { discipline: 'Jiu-jitsu brésilien', recensement: null, essentiel: ['kimonos', 'ceintures'], ensuite: ['rashguards', 'shorts-mma'] },
  { discipline: 'Judo, jujitsu', recensement: 'Judo, jujitsu', essentiel: ['kimonos', 'ceintures'], ensuite: [] },
  { discipline: 'Karaté', recensement: 'Karaté', essentiel: ['kimonos', 'ceintures'], ensuite: ['protege-tibias', 'protege-dents', 'coquilles'] },
];

/** Un rayon du catalogue : son nom, son adresse, son nombre de modèles et son premier prix. */
export function rayon(slug: string, all: Product[]) {
  const sub = SUBFAMILIES.find((s) => s.slug === slug);
  const cat = sub ? undefined : categoryFor(slug);
  const items = (sub ? subfamilyProducts(sub, all) : cat ? getCategoryProducts(cat, all) : []).filter((p) => dansLeRayon(slug, p));
  const prix = items.map((p) => p.price).filter((n) => n > 0);
  return { slug, nom: sub?.name || cat?.name || slug, n: items.length, des: prix.length ? Math.min(...prix) : null };
}

export function Rayon({ r }: { r: ReturnType<typeof rayon> }) {
  return (
    <li>
      <a href={'/' + r.slug + '/'}>{r.nom}</a>{' '}
      <small>{r.des ? `${r.n} modèles, dès ${money(r.des)}` : `${r.n} modèles`}</small>
    </li>
  );
}

export function MaterielParDiscipline({ all }: { all: Product[] }) {
  const lignes = LIGNES.map((l) => ({ ...l, lieux: l.recensement ? FRANCE.parDiscipline[l.recensement] || 0 : null, essentiel: l.essentiel.map((s) => rayon(s, all)), ensuite: l.ensuite.map((s) => rayon(s, all)) }));
  return (
    <div className="ville-tableau">
      <section className="keyword-hub observatory materiel-disciplines">
        <h2>Le matériel sport de combat, discipline par discipline.</h2>
        <p className="materiel-disciplines-lead">
          {`Neuf sports de combat, ce que chacun demande d’abord et ce qui vient ensuite, avec le nombre de modèles et le premier prix de chaque rayon du catalogue. En regard, le nombre de lieux qui déclarent la discipline en France métropolitaine, sur ${FRANCE.lieux.toLocaleString('fr-FR')} recensés par le ministère des Sports ; ville par ville, voir `}
          <a href={'/' + CARREFOUR + '/'}>la boutique sport de combat France</a>.
        </p>
        <div className="hub-prices salles-table">
          <table>
            <caption>Le matériel de chaque sport de combat, et ses lieux en France</caption>
            <thead>
              <tr>
                <th scope="col">Discipline</th>
                <th scope="col">Lieux en France</th>
                <th scope="col">D’abord</th>
                <th scope="col">Ensuite</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.discipline}>
                  <th scope="row">{l.discipline}</th>
                  <td data-label="Lieux en France">{l.lieux === null ? <span className="salle-vide">non recensé</span> : l.lieux.toLocaleString('fr-FR')}</td>
                  <td data-label="D’abord">
                    <ul className="materiel-rayons">
                      {l.essentiel.map((r) => (
                        <Rayon key={r.slug} r={r} />
                      ))}
                    </ul>
                  </td>
                  <td data-label="Ensuite">
                    {l.ensuite.length ? (
                      <ul className="materiel-rayons">
                        {l.ensuite.map((r) => (
                          <Rayon key={r.slug} r={r} />
                        ))}
                      </ul>
                    ) : (
                      <span className="salle-vide">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hub-prices-note">
            {`Lieux : ${SOURCE.nom}, ${SOURCE.editeur}, mis à jour le ${dateSource()} ; le recensement ne distingue ni le MMA ni le jiu-jitsu brésilien. Modèles et prix : le catalogue du jour, prix prévus à l’ouverture des ventes.`}
          </p>
        </div>
      </section>
    </div>
  );
}

/** Les questions que seul le recensement permet de trancher. */
export function materielFaq(): SeoFaq[] {
  const top = Object.entries(FRANCE.parDiscipline);
  const [d1, d2, d3] = top;
  const anglaise = FRANCE.parDiscipline['Boxe anglaise'] || 0;
  const boxes = ['Boxe anglaise', 'Savate boxe française', 'Muay-thaï', 'Kick-boxing', 'Full contact'].map((d) => [d, FRANCE.parDiscipline[d] || 0] as const).sort((a, b) => b[1] - a[1]);
  const min = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  return [
    {
      question: fine('Quel sport de combat a le plus de salles en France ?'),
      answer: `${d1[0].split(',')[0]} : il est déclaré dans ${d1[1].toLocaleString('fr-FR')} des ${FRANCE.lieux.toLocaleString('fr-FR')} lieux de sports de combat recensés en France métropolitaine, devant ${min(d2[0])} (${d2[1].toLocaleString('fr-FR')}) et ${min(d3[0])} (${d3[1].toLocaleString('fr-FR')}). La boxe anglaise l’est dans ${anglaise.toLocaleString('fr-FR')} lieux. Source : ${SOURCE.nom}, ${SOURCE.editeur}.`,
    },
    {
      question: fine('Quelle boxe a le plus de salles en France ?'),
      answer: `${boxes[0][0]}, déclarée dans ${boxes[0][1].toLocaleString('fr-FR')} lieux, devant ${min(boxes[1][0])} (${boxes[1][1].toLocaleString('fr-FR')}), ${min(boxes[2][0])} (${boxes[2][1].toLocaleString('fr-FR')}), ${min(boxes[3][0])} (${boxes[3][1].toLocaleString('fr-FR')}) et ${min(boxes[4][0])} (${boxes[4][1].toLocaleString('fr-FR')}) ; ${FRANCE.frappe.toLocaleString('fr-FR')} lieux déclarent au moins une boxe. Chacune a son matériel : le tableau de cette page le détaille.`,
    },
  ];
}
