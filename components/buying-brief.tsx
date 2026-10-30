import type { Product } from '@/lib/catalog';
import { buyingBrief } from '@/lib/buying-brief';
import './buying-brief.css';

/** The first purchasing decision stays in server HTML; no second product grid or client script. */
export function BuyingBrief({ scope, name, items }: { scope: string; name: string; items: Product[] }) {
  const brief = buyingBrief(scope, items);
  if (!brief) return null;
  return (
    <aside className="buying-brief" aria-labelledby={'buying-' + scope} data-buying-brief={scope}>
      <div className="buying-brief-decision">
        <h2 id={'buying-' + scope}>Avant de choisir</h2>
        <p>{brief.answer}</p>
        <nav aria-label={'Pour choisir : ' + name}>
          {brief.links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
        </nav>
      </div>
      <div className="buying-brief-facts">
        <p className="buying-brief-price"><strong>{brief.count.toLocaleString('fr-FR')} {brief.count === 1 ? 'modèle' : 'modèles'}</strong> · {brief.priceRange}</p>
        <p className="buying-brief-note">{brief.priceLabel}.</p>
        <p>{brief.fulfillment}</p>
        <a href="/livraison/">Livraison et conditions</a>
      </div>
    </aside>
  );
}
