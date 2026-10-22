import type { ReactNode } from 'react';
import { money, type Product } from '@/lib/catalog';
import type { SeoFaq } from '@/lib/seo-copy';
import { brandsOf, brandSlug } from '@/lib/brands';
import { brandFamilyFacet } from '@/lib/facets';
import { choix, faits, tranches, texte, prixAffiche, resumeFiche, type GuideRayon as Guide, type Cellule } from '@/lib/guides-rayons';

/**
 * Le guide d’achat d’une page de tête (lib/guides-rayons.ts), rendu SOUS la grille : les modèles restent
 * en haut de la page. Tout est dans le HTML servi, rien n’attend le JavaScript : le chapitre « comment
 * choisir », un modèle réel par usage avec son critère, le tableau propre au rayon, les prix par tranche,
 * les marques, les liens et les questions (les mêmes que la FAQPage du graphe JSON-LD).
 */

/** Un paragraphe et ses liens écrits [texte](/adresse/). */
function Paragraphe({ t }: { t: string }) {
  const morceaux = t.split(/(\[[^\]]+\]\([^)\s]+\))/g);
  return (
    <p>
      {morceaux.map((m, i) => {
        const lien = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(m);
        return lien ? (
          <a key={i} href={lien[2]}>
            {lien[1]}
          </a>
        ) : (
          m
        );
      })}
    </p>
  );
}

const Case = ({ c }: { c: Cellule }) => (typeof c === 'string' ? <>{c}</> : <a href={c.href}>{c.texte}</a>);

/** Au-delà de douze marques (pages qui traversent tout le catalogue), la liste se résume. */
const MARQUES_MAX = 12;

export function GuideRayon({ g, items, all, faq, apresChapitres }: { g: Guide; items: Product[]; all: Product[]; faq: SeoFaq[]; apresChapitres?: ReactNode }) {
  const f = faits(g.slug, items);
  const c = { f, items, all };
  const lignes = choix(g, c);
  const tab = g.tableau?.(c);
  const prix = tranches(f, items, g.slug);
  // Le lien d’une marque : sa page dans la famille quand le rayon n’en a qu’une, sinon sa page de marque.
  const parSlug = new Map(brandsOf(all).map((b) => [b.slug, b]));
  const familles = [...new Set(items.map((p) => p.category))];
  const lienMarque = (nom: string) => {
    const b = parSlug.get(brandSlug(nom));
    if (!b) return null;
    const fam = familles.length === 1 ? brandFamilyFacet(b, familles[0]) : null;
    return fam ? fam.path : '/marques/' + b.slug + '/';
  };
  const marques = f.marques.slice(0, MARQUES_MAX);
  const autres = f.marques.slice(MARQUES_MAX);
  return (
    <section className="rayon-guide" id="guide-rayon" aria-labelledby="guide-rayon-titre" data-rayon-texte="">
      <header className="rayon-guide-tete">
        <span className="eyebrow">LE GUIDE D’ACHAT</span>
        <h2 id="guide-rayon-titre">{g.guide.titre}</h2>
        <Paragraphe t={texte(g.guide.chapeau, c)} />
      </header>
      <div className="rayon-guide-corps">
        {g.guide.chapitres.map((ch) => (
          <div key={ch.titre}>
            <h3>{ch.titre}</h3>
            {ch.texte.map((t, i) => (
              <Paragraphe key={i} t={texte(t, c)} />
            ))}
          </div>
        ))}
      </div>
      {apresChapitres}
      {lignes.length > 0 && (
        <div className="rayon-tableau">
          <h3>{g.usages.titre}</h3>
          <p className="rayon-note">{g.usages.note}</p>
          <div className="hub-prices salles-table">
            <table>
              <caption>{g.usages.titre}</caption>
              <thead>
                <tr>
                  <th scope="col">Usage</th>
                  <th scope="col">Le modèle</th>
                  <th scope="col">Prix</th>
                  <th scope="col">Pourquoi celui-là</th>
                  <th scope="col">La fiche</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.usage}>
                    <th scope="row">{l.usage}</th>
                    <td data-label="Le modèle">
                      <a href={'/produits/' + l.produit.slug + '/'} data-nom-produit="">
                        {l.produit.name}
                      </a>
                    </td>
                    <td data-label="Prix">{prixAffiche(l.produit)}</td>
                    <td data-label="Pourquoi celui-là">{l.critere}</td>
                    <td data-label="La fiche">{resumeFiche(l.produit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab && (
        <div className="rayon-tableau">
          <h3>{tab.titre}</h3>
          <div className="hub-prices salles-table">
            <table>
              <caption>{tab.titre}</caption>
              <thead>
                <tr>
                  {tab.colonnes.map((col) => (
                    <th key={col} scope="col">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tab.lignes.map((l, i) => (
                  <tr key={i}>
                    <th scope="row">
                      <Case c={l[0]} />
                    </th>
                    {l.slice(1).map((cell, j) => (
                      <td key={j} data-label={tab.colonnes[j + 1]}>
                        <Case c={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tab.note && (
            <div className="rayon-note">
              <Paragraphe t={tab.note} />
            </div>
          )}
        </div>
      )}
      <div className="rayon-chiffres">
        {prix.length > 0 && (
          <div className="hub-prices">
            <table>
              <caption>Les prix du rayon</caption>
              <thead>
                <tr>
                  <th scope="col">Tranche</th>
                  <th scope="col">Prix</th>
                  <th scope="col">Modèles</th>
                </tr>
              </thead>
              <tbody>
                {prix.map((t) => (
                  <tr key={t.libelle}>
                    <th scope="row">{t.libelle}</th>
                    <td>{t.de === t.a ? money(t.a) : `${money(t.de)} à ${money(t.a)}`}</td>
                    <td>{t.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hub-prices-note">{`Prix médian : ${money(f.mediane)}. Prix de vente TTC du jour.`}</p>
          </div>
        )}
        {marques.length > 0 && (
          <div className="hub-prices">
            <table>
              <caption>Les marques du rayon</caption>
              <thead>
                <tr>
                  <th scope="col">Marque</th>
                  <th scope="col">Modèles</th>
                  <th scope="col">Dès</th>
                  <th scope="col">Jusqu’à</th>
                </tr>
              </thead>
              <tbody>
                {marques.map((m) => {
                  const href = lienMarque(m.nom);
                  return (
                    <tr key={m.nom}>
                      <th scope="row">{href ? <a href={href}>{m.nom}</a> : m.nom}</th>
                      <td>{m.n}</td>
                      <td>{money(m.min)}</td>
                      <td>{money(m.max)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {autres.length > 0 && <p className="hub-prices-note">{`Et ${autres.length} autres marques, pour ${autres.reduce((n, m) => n + m.n, 0)} modèles.`}</p>}
          </div>
        )}
      </div>
      <nav className="rayon-liens" aria-label="Pour aller plus loin">
        {g.liens.map((b) => (
          <div key={b.titre}>
            <h3>{b.titre}</h3>
            <ul>
              {b.liens.map((l) => (
                <li key={l.href}>
                  <a href={l.href}>{l.texte}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      {faq.length > 0 && (
        <div className="seo-faq rayon-faq">
          <h2>Questions fréquentes</h2>
          {faq.map((q) => (
            <details key={q.question}>
              <summary>{q.question}</summary>
              <p>{q.answer}</p>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
