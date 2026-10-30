import { FAIRTEX_SP5, MANUFACTURER_SIZING_GUIDES } from '@/lib/manufacturer-sizing';
import './manufacturer-sizing.css';

/** Server-rendered manufacturer references; no universal sizing calculator or invented fit claims. */
export function ManufacturerSizingGuide() {
  return (
    <section className="manufacturer-sizing" aria-labelledby="manufacturer-sizing-title" data-manufacturer-sizing="true">
      <h2 id="manufacturer-sizing-title">Les repères des fabricants</h2>
      <p>Une taille M ou un même nombre d’onces ne garantit pas la même coupe d’une marque à l’autre. Utilisez le guide du fabricant pour la famille du modèle retenu ; en cas de doute, demandez conseil avant de commander.</p>
      <div className="manufacturer-sizing-guides">
        {MANUFACTURER_SIZING_GUIDES.map((guide) => (
          <section id={guide.id} key={guide.id} aria-labelledby={'sizing-' + guide.id}>
            <h3 id={'sizing-' + guide.id}>{guide.brand}</h3>
            <p>{guide.summary}</p>
            <a href={guide.url}>{guide.label} ↗</a>
          </section>
        ))}
      </div>
      <section id="fairtex-sp5" className="manufacturer-sizing-model" aria-labelledby="fairtex-sp5-title">
        <h3 id="fairtex-sp5-title">Protège-tibias Fairtex SP5</h3>
        <p>Ce tableau concerne le modèle SP5. Mesurez votre stature debout, pieds nus. A indique la longueur de protection du tibia et B la largeur de la partie pied ; toutes les valeurs sont en centimètres.</p>
        <div className="manufacturer-sizing-table">
          <table>
            <caption>Fairtex SP5 : repères indicatifs du fabricant, en cm</caption>
            <thead><tr><th scope="col">Taille</th><th scope="col">Stature</th><th scope="col">Longueur A</th><th scope="col">Largeur B</th></tr></thead>
            <tbody>
              {FAIRTEX_SP5.rows.map((row) => <tr key={row.size}><th scope="row">{row.size}</th><td>{row.height}</td><td>{row.shin}</td><td>{row.foot}</td></tr>)}
            </tbody>
          </table>
        </div>
        <p className="manufacturer-sizing-note">Les intervalles se touchent aux limites : ils ne tranchent pas à eux seuls entre deux tailles. Vérifiez l’ajustement et le modèle exact. Les dimensions d’un autre protège-tibias Fairtex peuvent différer.</p>
        <a href={FAIRTEX_SP5.source}>Consulter le tableau SP5 chez Fairtex ↗</a>
      </section>
      <p className="manufacturer-sizing-note">Sources fabricant consultées le 24 octobre 2026. Pour une autre marque ou un modèle absent de ces guides, contactez-nous avec le nom du produit et vos mesures.</p>
      <a href="/contact/">Demander un conseil de taille</a>
    </section>
  );
}
