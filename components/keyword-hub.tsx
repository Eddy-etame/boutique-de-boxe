import { listItem, money, type Product } from '@/lib/catalog';
import { brandsOf, priceTable } from '@/lib/brands';
import { mostViewed, weekLabel, weeklySelection } from '@/lib/hub';
import { QUERY_MAP } from '@/lib/seo-copy';
import { urlOf } from '@/lib/seo';
import { SUBFAMILIES, subfamilyProducts } from '@/lib/subfamilies';
import { ozFacets, brandFamilyFacet } from '@/lib/facets';
import { ProductCard } from './shop-interactions';

/**
 * La page-pilier d’une recherche du brief. Demande du propriétaire : « for keyword in keywords we need
 * to have a page and that page will contain internal links » ; elle parle de la boutique, porte des
 * tops de la semaine et renvoie vers les pages internes.
 *
 * Ce bloc se pose sur chaque page de famille et de sous-famille : la sélection de la semaine (elle
 * change chaque lundi), les plus consultés (mesure maison, seulement quand elle est parlante), les
 * prix réels par équipement ou par marque, et un maillage vers les sous-familles, les marques et les
 * autres recherches, avec la requête exacte en texte de lien.
 */
export async function KeywordHub({
  scope,
  name,
  items,
  all,
  path: givenPath,
}: {
  scope: string;
  name: string;
  items: Product[];
  all: Product[];
  /** le chemin de la page quand il ne se déduit pas du scope (pages de marque) */
  path?: string;
}) {
  if (items.length < 4) return null;
  const path = givenPath || '/' + scope + '/';
  const { week, range } = weekLabel();
  const selection = weeklySelection(scope, items);
  const viewed = await mostViewed(items);
  const families = priceTable(items);
  // Une seule famille : le tableau se lit par marque, c’est là que les prix diffèrent.
  const byBrand = families.length < 2;
  const brandList = brandsOf(items);
  const brands = brandList.slice(0, 8);
  // Une marque dans cette famille : la page « gants de boxe Fairtex » plutôt que toute la marque, quand elle existe.
  const family = families.length === 1 ? families[0].slug : null;
  const brandHref = (b: (typeof brandList)[number]) => {
    const f = family ? brandFamilyFacet(b, family) : null;
    return f && f.scope !== scope ? f.path : '/marques/' + b.slug + '/';
  };
  const rows = byBrand
    ? brandList
        .slice(0, 8)
        .map((b) => {
          const s = b.products.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b);
          return { key: b.slug, label: b.name, href: brandHref(b), count: s.length, min: s[0], median: s[Math.floor(s.length / 2)], max: s[s.length - 1] };
        })
    : families.slice(0, 8).map((f) => ({ key: f.slug, label: f.name, href: undefined as string | undefined, count: f.count, min: f.min, median: f.median, max: f.max }));
  const ids = new Set(items.map((p) => p.id));
  // Les poids de gants : sur les pages de gants de boxe seulement, chaque poids qui a sa page.
  const weights = items.some((p) => p.category === 'gants-de-boxe')
    ? ozFacets(all).map((f) => ({ f, n: f.products.filter((p) => ids.has(p.id)).length })).filter((x) => x.n >= 4 && x.f.scope !== scope)
    : [];
  const subs = SUBFAMILIES.map((s) => ({ s, n: subfamilyProducts(s, all).filter((p) => ids.has(p.id)).length }))
    .filter((x) => x.n >= 4 && x.s.slug !== scope)
    .sort((a, b) => b.n - a.n)
    .slice(0, 8);
  // Les autres recherches du brief : une ligne par page, avec la requête exacte en texte de lien.
  const seenPaths = new Set<string>([path]);
  const searches = QUERY_MAP.filter((q) => (seenPaths.has(q.path) ? false : (seenPaths.add(q.path), true))).slice(0, 8);
  const graph = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': urlOf(path) + '#selection-semaine',
    name: `${name} : la sélection de la semaine ${week}`,
    numberOfItems: selection.length,
    itemListElement: selection.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, url: urlOf('/produits/' + p.slug + '/') })),
  };

  return (
    <section className="keyword-hub" aria-labelledby={'hub-' + scope}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
      <header className="hub-heading">
        <div>
          <span className="eyebrow">CETTE SEMAINE / SEMAINE {week}</span>
          <h2 id={'hub-' + scope}>
            {name} :<br />
            la sélection de la semaine.
          </h2>
        </div>
        <p>
          Quatre modèles choisis {range}, une marque par modèle. La sélection change chaque lundi ; les
          prix sont ceux prévus à l’ouverture des ventes.
        </p>
      </header>
      <div className="product-grid hub-grid">
        {selection.map((p, i) => (
          <ProductCard key={p.id} product={listItem(p)} index={i + 4} />
        ))}
      </div>

      {viewed.length > 0 && (
        <>
          <header className="hub-heading hub-heading-second">
            <div>
              <span className="eyebrow">SEPT DERNIERS JOURS</span>
              <h2>Les plus consultés.</h2>
            </div>
            <p>
              Les modèles les plus regardés sur cette page cette semaine, d’après les visites de la
              boutique. Pas des ventes : les ventes ouvrent bientôt.
            </p>
          </header>
          <div className="product-grid hub-grid">
            {viewed.map((p, i) => (
              <ProductCard key={p.id} product={listItem(p)} index={i + 8} />
            ))}
          </div>
        </>
      )}

      {rows.length >= 2 && (
        <div className="hub-prices">
          <table>
            <caption>
              {name} : les prix prévus, {byBrand ? 'par marque' : 'par équipement'}
            </caption>
            <thead>
              <tr>
                <th scope="col">{byBrand ? 'Marque' : 'Équipement'}</th>
                <th scope="col">Modèles</th>
                <th scope="col">Dès</th>
                <th scope="col">Prix médian</th>
                <th scope="col">Jusqu’à</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row">{r.href ? <a href={r.href}>{r.label}</a> : r.label}</th>
                  <td>{r.count}</td>
                  <td>{money(r.min)}</td>
                  <td>{money(r.median)}</td>
                  <td>{money(r.max)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hub-prices-note">
            Chiffres tirés du catalogue, mis à jour avec lui. Le prix médian partage les modèles en deux
            moitiés égales.
          </p>
        </div>
      )}

      <nav className="hub-links" aria-label={'Autour de ' + name}>
        {subs.length > 0 && (
          <div>
            <h3>Par équipement</h3>
            <ul>
              {subs.map(({ s, n }) => (
                <li key={s.slug}>
                  <a href={'/' + s.slug + '/'}>{s.name}</a> <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {weights.length > 0 && (
          <div>
            <h3>Par poids</h3>
            <ul>
              {weights.map(({ f, n }) => (
                <li key={f.scope}>
                  <a href={f.path}>{f.name}</a> <span>{n}</span>
                </li>
              ))}
              <li>
                <a href="/outils/poids-de-gants/">Quel poids pour moi ?</a>
              </li>
            </ul>
          </div>
        )}
        {brands.length > 0 && (
          <div>
            <h3>Par marque</h3>
            <ul>
              {brands.map((b) => (
                <li key={b.slug}>
                  <a href={brandHref(b)}>{family && brandHref(b) !== '/marques/' + b.slug + '/' ? `${families[0].name} ${b.name}` : b.name}</a> <span>{b.products.length}</span>
                </li>
              ))}
              <li>
                <a href="/marques/">Toutes les marques</a>
              </li>
            </ul>
          </div>
        )}
        <div>
          <h3>Recherches voisines</h3>
          <ul>
            {searches.map((q) => (
              <li key={q.path}>
                <a href={q.path}>{q.query}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>La boutique</h3>
          <ul>
            <li>
              <a href="/livraison/">Livraison dans toute la France</a>
            </li>
            <li>
              <a href="/retours/">Retours et échanges</a>
            </li>
            <li>
              <a href="/faq/">Questions fréquentes</a>
            </li>
            <li>
              <a href="/guides/">Les guides d’achat</a>
            </li>
            <li>
              <a href="/#ouverture">Être prévenu à l’ouverture des ventes</a>
            </li>
          </ul>
        </div>
      </nav>
    </section>
  );
}
