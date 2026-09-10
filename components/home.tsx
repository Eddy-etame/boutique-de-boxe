import { ArrowUpRight, ArrowDown } from 'lucide-react';
import { categories, type Product } from '@/lib/catalog';
import {
  HeroStage,
  ProductCard,
  SessionChooser,
  AlertForm,
} from './shop-interactions';
import { EquipmentCompare } from './equipment-compare';
import selection from '@/lib/data/selection.json';
export default function Home({ items }: { items: Product[] }) {
  const hero = items.find((p) => p.id === 'mat-blade-gold') || items[0];
  const featured = [
    'mat-shell-mma',
    'bench-manto-miko-noir',
    'bench-athena-rashguard-court-noir',
    'mat-bandes-4m',
  ].flatMap((id) => {
    const p = items.find((p) => p.id === id);
    return p ? [p] : [];
  });
  return (
    <main id="contenu" className="store-home">
      <section className="workbench-hero">
        <div className="workbench-copy">
          <span className="eyebrow">
            <i className="tape-mark" />
            MATÉRIEL DE BOXE & SPORTS DE COMBAT
          </span>
          <h1>
            TOUT
            <br />
            POUR LA BOXE
            <br />
            <em>ET LE MMA.</em>
          </h1>
          <div className="workbench-intro">
            <span className="workbench-rule" />
            <p>
              {items.length.toLocaleString('fr-FR')} modèles : gants, bandes, protections, textile, sacs.
              <br />
              Les vraies tailles, les vrais détails.
              <br />
              Prix prévus à l’ouverture des ventes.
            </p>
          </div>
          <a href="/materiel-sport-de-combat/" className="button button-dark">
            Voir tout le matériel <ArrowUpRight size={20} />
          </a>
          <a className="bench-jump" href="#preparer">
            Préparer mon sac de séance <ArrowDown size={16} />
          </a>
        </div>
        {hero && <HeroStage product={hero} />}
        <div className="bench-signature">
          <span>BOUTIQUE DE BOXE / GANTS, PROTECTIONS, TEXTILE, SACS.</span>
          <span>{items.length} MODÈLES</span>
        </div>
      </section>
      <nav className="practice-index" aria-label="Entrer par la pratique">
        <span>PAR DISCIPLINE</span>
        <a href="/materiel-boxe/">
          Boxe anglaise <ArrowUpRight />
        </a>
        <a href="/materiel-mma/">
          MMA <ArrowUpRight />
        </a>
        <a href="/boutique-arts-martiaux/">
          Arts martiaux <ArrowUpRight />
        </a>
      </nav>
      <section className="field-selection section-pad" data-reveal>
        <header className="editorial-heading">
          <div>
            <span className="eyebrow">QUATRE ACHATS FRÉQUENTS</span>
            <h2>
              Par où commencer ?
              <br />
              Par ces quatre-là.
            </h2>
          </div>
          <p>
            Des gants MMA, un kimono, un rashguard et des bandes : quatre
            modèles souvent achetés en premier, avec leurs tailles et leurs prix.
          </p>
        </header>
        <div className="product-grid">
          {featured.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
        <a className="inline-link" href="/nouveautes/">
          Voir les nouveautés <ArrowUpRight size={18} />
        </a>
      </section>
      <SessionChooser
        items={items.filter((p) =>
          selection.sessions.some((s) => s.products.some((r) => r.id === p.id)),
        )}
      />
      <EquipmentCompare
        items={items
          .filter(
            (p) => p.category === 'gants-de-boxe' && p.audience === 'adulte',
          )
          .slice(0, 16)}
      />
      <section className="equipment-index section-pad" data-reveal>
        <header className="editorial-heading">
          <div>
            <span className="eyebrow">PAR TYPE</span>
            <h2>Tout le catalogue, par type.</h2>
          </div>
          <a href="/materiel-sport-de-combat/" className="inline-link">
            Tout voir <ArrowUpRight size={18} />
          </a>
        </header>
        <div className="equipment-rows">
          {categories
            .filter((c) => c.families.length === 1 && c.families[0] === c.slug)
            .map((c, i) => {
              const p = items.find((p) => p.category === c.slug);
              const count = items.filter((p) => p.category === c.slug).length;
              return (
                <a key={c.slug} href={'/' + c.slug + '/'}>
                  <span className="equipment-row-number">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {p && (
                    <img
                      src={p.images[0].small}
                      width={100}
                      height={100}
                      alt=""
                      loading="lazy"
                    />
                  )}
                  <h3>{c.name}</h3>
                  <span className="equipment-row-count">
                    {count} modèle{count > 1 ? 's' : ''}
                  </span>
                  <ArrowUpRight size={25} />
                </a>
              );
            })}
        </div>
      </section>
      <section className="ounce-editorial">
        <div className="ounce-illustration" aria-hidden="true">
          <span>UNITÉ DE POIDS / ONCE</span>
          <div>
            <b>14</b>
            <i>oz</i>
          </div>
          <span>
            LE POIDS DU GANT,
            <br />
            PAS LA TAILLE DE LA MAIN.
          </span>
        </div>
        <div className="ounce-copy">
          <span className="eyebrow">GUIDE / POIDS ET TAILLE</span>
          <h2>
            14 oz, ça veut
            <br />
            dire quoi ?
          </h2>
          <p>
            Le poids se lit sur l’étiquette. La coupe, elle, s’essaie avec vos
            bandes : deux gants de 14 oz ne chaussent pas pareil.
          </p>
          <a
            className="button button-dark"
            href="/guides/taille-poids-gants-boxe/"
          >
            Comprendre les onces <ArrowUpRight size={18} />
          </a>
          <a className="inline-link" href="/guides/">
            Tous les guides d’achat <ArrowUpRight size={17} />
          </a>
        </div>
      </section>
      <section className="opening-note section-pad">
        <div>
          <span className="eyebrow">OUVERTURE DES VENTES</span>
          <h2>
            Soyez prévenu
            <br />
            le jour J.
          </h2>
          <p>
            Vous pouvez déjà essayer la commande, sans payer. Laissez votre
            e-mail : nous vous écrivons le jour de l’ouverture.
          </p>
        </div>
        <AlertForm />
      </section>
    </main>
  );
}
