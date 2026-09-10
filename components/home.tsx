import { ArrowUpRight } from 'lucide-react';
import { products, categories, Product } from '@/lib/catalog';
import {
  HeroStage,
  ProductCard,
  SessionChooser,
  AlertForm,
} from './shop-interactions';
import { ArrowLink } from './shop-shell';
export default function Home({ items = products }: { items?: Product[] }) {
  const hero = items.find((p) => p.id === 'mat-blade-gold') || items[0];
  const featured = [
    'mat-blade-gold',
    'mat-shell-mma',
    'mat-bandes-4m',
    'mat-ergo90-14',
  ]
    .map((id) => items.find((p) => p.id === id))
    .filter(Boolean) as Product[];
  return (
    <main id="contenu">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="line-mark" />
            MATÉRIEL DE BOXE & SPORTS DE COMBAT
          </div>
          <h1>
            ÉQUIPEZ
            <br />
            VOTRE <br />
            <em>GESTE.</em>
          </h1>
          <div className="hero-bottom">
            <p>
              Boxe anglaise, MMA, arts martiaux. Le bon équipement commence par
              les bonnes questions.
            </p>
            <ArrowLink href="/materiel-sport-de-combat/" dark>
              Explorer le catalogue
            </ArrowLink>
          </div>
        </div>
        <HeroStage product={hero} />
      </section>
      <div className="discipline-strip">
        <span className="tiny-label">CHOISISSEZ VOTRE TERRAIN</span>
        <a href="/materiel-boxe/">
          Boxe anglaise <ArrowUpRight />
        </a>
        <a href="/materiel-mma/">
          MMA <ArrowUpRight />
        </a>
        <a href="/boutique-arts-martiaux/">
          Arts martiaux <ArrowUpRight />
        </a>
      </div>
      <section className="section-pad selected-section" data-reveal>
        <div className="section-heading">
          <div>
            <span className="eyebrow">01 / LE MATÉRIEL, DANS LE DÉTAIL</span>
            <h2>
              LES PIÈCES
              <br />
              <em>DU COMBAT.</em>
            </h2>
          </div>
          <div>
            <p>
              La fermeture d’un gant. La longueur d’une bande.
              <br />
              Des différences à comprendre avant de choisir.
            </p>
            <a className="inline-link" href="/nouveautes/">
              Toute la sélection <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
        <div className="product-grid">
          {featured.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>
      <SessionChooser items={items} />
      <section className="category-section section-pad" data-reveal>
        <div className="section-heading">
          <div>
            <span className="eyebrow">03 / CHAQUE PIÈCE A SON RÔLE</span>
            <h2>
              ENTREZ PAR
              <br />
              <em>L’ÉQUIPEMENT.</em>
            </h2>
          </div>
          <span className="section-number">06</span>
        </div>
        <div className="category-list">
          {categories.slice(0, 6).map((c, i) => {
            const item = items.find((p) => p.category === c.slug);
            return (
              <a href={`/${c.slug}/`} key={c.slug}>
                <span className="category-number">0{i + 1}</span>
                <h3>{c.name}</h3>
                <span className="category-teaser">{c.label}</span>
                {item && (
                  <img
                    src={item.images[0]?.small}
                    alt=""
                    width={90}
                    height={90}
                    loading="lazy"
                  />
                )}
                <ArrowUpRight size={25} />
              </a>
            );
          })}
        </div>
      </section>
      <section className="guides-feature">
        <div className="guides-art" aria-hidden="true">
          <div className="oz-line">
            <span>10</span>
            <span>12</span>
            <span>14</span>
            <span>16</span>
          </div>
          <div className="oz-big">oz.</div>
          <div className="oz-caption">
            LE POIDS DU GANT.
            <br />
            PAS LA TAILLE DE VOTRE MAIN.
          </div>
        </div>
        <div className="guides-feature-copy">
          <span className="eyebrow">04 / CHOISIR, ÇA S’APPREND</span>
          <h2>
            QUELQUES GRAMMES.
            <br />
            <em>
              DE VRAIES
              <br />
              QUESTIONS.
            </em>
          </h2>
          <p>
            10, 12, 14 ou 16 oz ? L’once indique un poids. Le choix dépend aussi
            de l’usage, du modèle et des consignes de votre salle. On remet les
            repères dans le bon ordre.
          </p>
          <ArrowLink href="/guides/taille-poids-gants-boxe/">
            Comprendre les onces
          </ArrowLink>
          <a className="inline-link" href="/guides/">
            Tous les guides d’achat <ArrowUpRight size={17} />
          </a>
        </div>
      </section>
      <section className="launch-section section-pad">
        <div>
          <span className="eyebrow">LA SUITE SE PRÉPARE</span>
          <h2>
            PRENEZ PLACE
            <br />
            <em>DANS NOTRE COIN.</em>
          </h2>
          <p>
            Le catalogue se construit avant l’ouverture des ventes.
            <br />
            Recevez une alerte lorsque la boutique sera prête.
          </p>
        </div>
        <AlertForm />
      </section>
    </main>
  );
}
