import { ArrowUpRight, ArrowDown } from 'lucide-react';
import { categories, categoryFor, getCategoryProducts, listItem, shop, type Product } from '@/lib/catalog';
import { HOME_FAQ } from '@/lib/seo-copy';
import { SeoBody } from './seo-body';
import { HeroRing } from './hero-ring';
import {
  ProductCard,
  SessionChooser,
  AlertForm,
} from './shop-interactions';
import { EquipmentCompare } from './equipment-compare';
import selection from '@/lib/data/selection.json';
import { spaced } from '@/lib/spaced';
import { EQUIPEMENT_BOXE_ANGLAISE_PRET, RAYONS_PRATIQUE, nomDeRayon } from './liens-du-site';

/** « 1 042 » : un compte tel que les textes l’écrivent (insécable U+00A0, la police d’affichage n’a pas l’espace fine). */
const nombre = (n: number) => n.toLocaleString('fr-FR').replace(/ /g, ' ');
export default function Home({ items }: { items: Product[] }) {
  // Quatre rounds à la une : le rouge qui arrête l’œil, le noir et or, le prix d’entrée du club, une protection.
  // Le nom court est écrit à la main : une fiche de pesée ne porte pas un intitulé de catalogue.
  const rounds = (
    [
      ['bs-2000706', 'Cleto Reyes Pro Sparring, rouge'],
      ['bs-2000703', 'Cleto Reyes High Precision, noir et or'],
      ['mat-blade-gold', 'Blade Metal Boxe, noir et blanc'],
      ['bs-10038', 'Casque Adidas FFB, bleu'],
    ] as const
  ).flatMap(([id, label]) => {
    const p = items.find((p) => p.id === id);
    return p ? [{ product: listItem(p), label }] : [];
  });
  const heroes = rounds.length ? rounds : items.slice(0, 1).map((p) => ({ product: listItem(p), label: p.name }));
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
          {/* L’affiche porte la requête en tête, comme le nom de l’organisateur au-dessus d’un combat : la
              première ligne du H1, visible, dans la police du héros ; le slogan reste l’affiche. Le texte est
              écrit en casse normale (lu tel quel par les moteurs et les lecteurs d’écran), les capitales
              viennent du style. Les blancs avant chaque saut de ligne gardent les mots séparés dans le texte lu. */}
          <h1>
            <span className="hero-billing">
              <i className="tape-mark" aria-hidden="true" />
              Boutique de boxe, MMA et sports de combat.
            </span>{' '}
            Tout{' '}
            <br />
            pour la boxe{' '}
            <br />
            <em>et le MMA.</em>
          </h1>
          <div className="workbench-intro">
            <span className="workbench-rule" />
            <p>
              Tout le matériel de boxe et de MMA : gants, bandes, protections,
              sacs de frappe.
              <br />
              Le matériel des salles, livré chez vous, dans toute la France.
              <br />
              {shop.ventesOuvertes ? (
                <>
                  Les ventes sont ouvertes : paiement par carte sur la page sécurisée de PayPlug.{' '}
                  <a href="/vente-materiel-de-boxe/">Comment se passe la vente de matériel de boxe</a>.
                </>
              ) : (
                <>
                  {`Ouverture des ventes le ${shop.ouverture.long}.`}{' '}
                  <a href="#ouverture">Laissez votre e-mail</a>, on vous prévient le matin même.
                </>
              )}
            </p>
          </div>
          <div className="hero-actions">
            {shop.ventesOuvertes ? (
              <a href="/materiel-boxe/" className="button button-tape">
                Matériel de boxe <ArrowUpRight size={20} />
              </a>
            ) : (
              <a href="#ouverture" className="button button-tape">
                Me prévenir à l’ouverture <ArrowDown size={20} />
              </a>
            )}
            <a href="/boutique-boxe/" className="button button-dark">
              Toute la boutique boxe <ArrowUpRight size={20} />
            </a>
          </div>
          <a className="bench-jump" href="#preparer">
            Préparer mon sac de séance <ArrowDown size={16} />
          </a>
        </div>
        <HeroRing items={heroes.map((h) => h.product)} labels={heroes.map((h) => h.label)} />
        <div className="bench-signature">
          <span>BOUTIQUE DE BOXE / GANTS, PROTECTIONS, TEXTILE, SACS.</span>
          <span>{nombre(items.length)} MODÈLES</span>
        </div>
      </section>
      <nav className="practice-index" aria-label="Entrer par la pratique">
        <span>PAR DISCIPLINE</span>{' '}
        <a href={EQUIPEMENT_BOXE_ANGLAISE_PRET ? '/equipement-boxe-anglaise/' : '/materiel-boxe/'}>
          Boxe anglaise <ArrowUpRight />
        </a>{' '}
        <a href="/materiel-boxe-thai/">
          Boxe thaï <ArrowUpRight />
        </a>{' '}
        <a href="/materiel-kick-boxing/">
          Kick-boxing <ArrowUpRight />
        </a>{' '}
        <a href="/materiel-mma/">
          MMA <ArrowUpRight />
        </a>{' '}
        <a href="/equipement-jjb/">
          JJB <ArrowUpRight />
        </a>{' '}
        <a href="/boutique-arts-martiaux/">
          Arts martiaux <ArrowUpRight />
        </a>
      </nav>
      <section className="field-selection section-pad" data-reveal>
        <header className="editorial-heading">
          <div>
            <span className="eyebrow">QUATRE PIÈCES POUR COMMENCER</span>
            <h2>
              Par où commencer ?
              <br />
              Par ces quatre-là.
            </h2>
          </div>
          <p>
            Des gants MMA, un kimono, un rashguard et des bandes : quatre points
            de départ à choisir selon votre pratique, avec leurs tailles et
            leurs prix.
          </p>
        </header>
        <div className="product-grid">
          {featured.map((p, i) => (
            <ProductCard key={p.id} product={listItem(p)} index={i} />
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
      {/* Chaque rayon du concours a ici un lien, une seule fois, avec une ancre qui décrit sa page : les dix
          rayons par type, puis les pages de tête par pratique ; le rayon de toutes les disciplines est le
          lien de l’en-tête. */}
      <section className="equipment-index section-pad" data-reveal>
        <header className="editorial-heading">
          <div>
            <span className="eyebrow">PAR TYPE</span>
            <h2>Tout le catalogue, par type.</h2>
          </div>
          <a href="/materiel-sport-de-combat/" className="inline-link">
            Tout le matériel sport de combat <ArrowUpRight size={18} />
          </a>
        </header>
        <div className="equipment-rows">
          {spaced(categories
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
                      src={p.cut?.small ?? p.images[0].small}
                      width={100}
                      height={100}
                      alt=""
                      loading="lazy"
                    />
                  )}
                  <h3>{nomDeRayon(c.slug, c.name)}</h3>
                  <span className="equipment-row-count">
                    <b data-count={count}>{count}</b> modèle
                    {count > 1 ? 's' : ''}
                  </span>
                  <ArrowUpRight size={25} />
                </a>
              );
            }))}
        </div>
        <div className="practice-band">
          <p className="eyebrow practice-band-label">
            <i className="tape-mark" aria-hidden="true" /> Ou par pratique
          </p>
          <div className="practice-band-grid">
            {spaced(RAYONS_PRATIQUE.filter((r) => r.href !== '/materiel-sport-de-combat/').map((r) => {
              const c = categoryFor(r.href.slice(1, -1));
              const count = c ? getCategoryProducts(c, items).length : 0;
              return (
                <a key={r.href} href={r.href}>
                  <h3>{r.label}</h3>{' '}
                  {c && count > 0 && (
                    <span className="practice-band-count">
                      {c.families.length > 1 && <>{c.families.length} rayons · </>}
                      <b>{nombre(count)}</b> modèles
                    </span>
                  )}
                  <ArrowUpRight size={24} aria-hidden="true" />
                </a>
              );
            }))}
          </div>
        </div>
      </section>
      <section className="ounce-editorial" data-reveal>
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
      {!shop.ventesOuvertes && (
      <section id="ouverture" className="opening-note section-pad" data-reveal>
        <div>
          <span className="eyebrow">OUVERTURE DES VENTES</span>
          <h2>
            Soyez prévenu
            <br />
            le jour J.
          </h2>
          <p>
            {`Les ventes ouvrent le ${shop.ouverture.long}. Vous pouvez déjà remplir votre panier et enregistrer vos choix, ou laisser simplement votre e-mail : nous vous écrivons le matin même.`}
          </p>
        </div>
        <AlertForm />
      </section>
      )}
      {/* L’accueil n’a pas le conteneur des pages : la FAQ prend la gouttière des sections. */}
      <div className="home-faq section-pad">
        <div className="home-faq-intro">
          <span className="eyebrow">AVANT DE COMMANDER</span>
          <p>
            {shop.ventesOuvertes ? 'Paiement, livraison, retours, tailles, marques' : 'Ouverture des ventes, panier, livraison, tailles, marques'}
            : les réponses courtes, sans chercher.
          </p>
          <a className="inline-link" href="/faq/">
            Toutes les questions <ArrowUpRight size={17} />
          </a>
        </div>
        <SeoBody sections={[]} faq={HOME_FAQ} heading="Questions fréquentes" />
      </div>
    </main>
  );
}
