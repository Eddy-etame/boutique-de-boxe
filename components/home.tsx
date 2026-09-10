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
            AVANT
            <br />
            LE PREMIER
            <br />
            <em>COUP.</em>
          </h1>
          <div className="workbench-intro">
            <span className="workbench-rule" />
            <p>
              Une paire à enfiler.
              <br />
              Une fermeture à ajuster.
              <br />
              Le matériel se choisit dans le détail.
            </p>
          </div>
          <a href="/materiel-sport-de-combat/" className="button button-dark">
            Tout l’équipement <ArrowUpRight size={20} />
          </a>
          <a className="bench-jump" href="#preparer">
            Préparer mon sac de séance <ArrowDown size={16} />
          </a>
        </div>
        {hero && <HeroStage product={hero} />}
        <div className="bench-signature">
          <span>BOUTIQUE DE BOXE / LE MATÉRIEL, REGARDÉ DE PRÈS.</span>
          <span>{items.length} RÉFÉRENCES À EXPLORER</span>
        </div>
      </section>
      <nav className="practice-index" aria-label="Entrer par la pratique">
        <span>VOTRE TERRAIN</span>
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
            <span className="eyebrow">DE LA GARDE AU TAPIS</span>
            <h2>
              Les gestes changent.
              <br />
              Les pièces aussi.
            </h2>
          </div>
          <p>
            Un gant fermé, une paume ouverte, un kimono ou un rashguard :
            commencez par reconnaître ce que votre séance demande.
          </p>
        </header>
        <div className="product-grid">
          {featured.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
        <a className="inline-link" href="/nouveautes/">
          Voir les dernières références <ArrowUpRight size={18} />
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
            <span className="eyebrow">L’INDEX DU MATÉRIEL</span>
            <h2>Une pièce manque ?</h2>
          </div>
          <a href="/materiel-sport-de-combat/" className="inline-link">
            Toutes les références <ArrowUpRight size={18} />
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
                    {count} référence{count > 1 ? 's' : ''}
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
            LE POIDS DU GANT.
            <br />
            PAS LE VOLUME DE VOTRE MAIN.
          </span>
        </div>
        <div className="ounce-copy">
          <span className="eyebrow">LE CARNET / POIDS & AJUSTEMENT</span>
          <h2>
            Le chiffre ne dit
            <br />
            pas tout.
          </h2>
          <p>
            Deux gants de 14 oz peuvent chausser différemment. Le poids se lit
            sur l’étiquette. La coupe s’essaie, avec vos bandes.
          </p>
          <a
            className="button button-dark"
            href="/guides/taille-poids-gants-boxe/"
          >
            Comprendre les onces <ArrowUpRight size={18} />
          </a>
          <a className="inline-link" href="/guides/">
            Ouvrir le carnet des guides <ArrowUpRight size={17} />
          </a>
        </div>
      </section>
      <section className="opening-note section-pad">
        <div>
          <span className="eyebrow">LES VENTES SE PRÉPARENT</span>
          <h2>
            Gardez une place
            <br />
            dans votre sac.
          </h2>
          <p>
            Explorez le catalogue et essayez le parcours jusqu’au reçu. Aucun
            paiement réel. L’alerte vous préviendra de l’ouverture des ventes.
          </p>
        </div>
        <AlertForm />
      </section>
    </main>
  );
}
