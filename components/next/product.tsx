import type { Product } from '@/lib/catalog';
import { categoryFor, cleanName, money } from '@/lib/catalog';
import { productCopy as t } from '@/lib/next/copy/product';
import { globalCopy as g } from '@/lib/next/copy/global';
import { commerceCopy as c } from '@/lib/next/copy/commerce';
import { Buy } from './buy';
import { AlertForm } from '@/components/shop-interactions';
import { ProductMedia, VerifyBox } from './product-client';

export function NextProduct({ product: p, related }: { product: Product; related: Product[] }) {
  const cat = categoryFor(p.category);
  const specs = Object.entries(p.specs).filter(([, v]) => v && v.trim());
  const description = p.description && p.description.trim() !== p.name.trim() ? p.description : '';
  const colours = p.variants?.map((v) => v.attributes?.couleur || v.attributes?.color).filter(Boolean) ?? [];
  return (
    <main id="contenu" className="ne">
      <nav aria-label="Fil d’Ariane" style={{ paddingTop: 24 }}>
        <a href="/">{t.breadcrumbHome}</a>
        {cat && (
          <>
            {' / '}
            <a href={`/${cat.slug}/`}>{cat.name}</a>
          </>
        )}
      </nav>
      <article className="ne-pdp">
        <ProductMedia images={p.images} name={cleanName(p)} missing={t.photosMissing} />
        <div className="ne-pdp-body">
          <span className="ne-label">{p.brand}</span>
          <h1>{cleanName(p)}</h1>
          {p.short && p.short.trim() !== p.name.trim() && (
            <p className="ne-lead">{p.short}</p>
          )}
          <div className="ne-pdp-price">
            <b>{money(p.price)}</b>
            <span className="ne-muted">{g.status.pricePlanned}</span>
          </div>
          <div>
            <span className="ne-label">{p.sizes.length ? t.sizes : ''}</span>
            <Buy product={p} />
          </div>
          {new Set(colours).size > 0 && (
            <p className="ne-muted">
              {t.colours} : {[...new Set(colours)].join(', ')}
            </p>
          )}
          <VerifyBox id={p.id} label={t.verifyBox} />
          {description && (
            <section aria-label={cleanName(p)}>
              <p>{description}</p>
              {p.use && <p style={{ marginTop: 12 }}>{p.use}</p>}
            </section>
          )}
          {specs.length > 0 && (
            <section>
              <h2 style={{ fontSize: 'var(--ne-step-2)', marginBottom: 12 }}>{t.specs}</h2>
              <table className="ne-table">
                <tbody>
                  {specs.map(([k, v]) => (
                    <tr key={k}>
                      <th scope="row">{k}</th>
                      <td>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          <section>
            <h2 style={{ fontSize: 'var(--ne-step-2)', marginBottom: 12 }}>{t.care}</h2>
            <p>{p.care && p.care.trim() ? p.care : t.careUnknown}</p>
          </section>
          <p className="ne-muted">{t.delivery}</p>
          <section>
            <h2 style={{ fontSize: 'var(--ne-step-2)', marginBottom: 12 }}>{t.notify.label}</h2>
            <AlertForm productId={p.id} labels={{ field: c.alerts.email, consent: c.alerts.consent, submit: c.alerts.submit }} />
          </section>
        </div>
      </article>

      {related.length > 0 && (
        <section className="ne-section" aria-labelledby="compare-title">
          <div className="ne-section-head">
            <h2 id="compare-title">{t.compare}</h2>
          </div>
          <div className="ne-grid">
            {related.slice(0, 4).map((r) => (
              <a key={r.id} className="ne-product" href={`/produits/${r.slug}/`}>
                <img src={r.images[0].small} alt="" width={480} height={480} loading="lazy" />
                <span className="ne-label">{r.brand}</span>
                <h3>{cleanName(r)}</h3>
                <span className="ne-sizes">{r.sizes.slice(0, 6).join(' · ')}</span>
                <span className="ne-price">{money(r.price)}</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
