'use client';
import { useEffect, useState } from 'react';

/** L’audience, lue depuis la mesure maison : où les visiteurs entrent, ce qu’ils regardent, où ils sortent, ce qu’ils cherchent. */
type Row = { path: string; name: string; views?: number; sessions?: number; dwell?: number | null; depth?: number | null; n?: number; adds?: number };
type Report = {
  days: number;
  totals: { views: number; sessions: number; visitors: number; dwell: number | null; bounceRate: number };
  previous: { views: number; sessions: number; visitors: number; dwell: number | null; bounceRate: number };
  byDay: { day: string; views: number; sessions: number }[];
  pages: Row[];
  entries: Row[];
  exits: Row[];
  transitions: { from: string; to: string; n: number }[];
  products: Row[];
  suggestions: { viewedNotAdded: Row[]; strongExits: Row[]; searchesWithoutResult: { query: string; n: number; none: number }[] };
  conversions: { type: string; n: number }[];
  devices: { device: string; n: number }[];
  referrers: { host: string; n: number }[];
  searches: { query: string; n: number; none: number }[];
  journeys: { sid: string; started: string; ended: string; device: string; from: string; views: number; converted: boolean; pages: { path: string; name: string; dwell: number | null; marks: string[] }[] }[];
};
const when = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const TYPE_LABEL: Record<string, string> = { add_to_cart: 'Ajouts au panier', alert_submit: 'Inscriptions à l’alerte', contact_submit: 'Demandes de contact', search: 'Recherches', filter: 'Filtres utilisés', click: 'Clics', consent: 'Consentements' };
const fr = (n: number | null | undefined) => (n == null ? '—' : Number(n).toLocaleString('fr-FR'));
/** Écart avec la période précédente, en pourcentage ; rien quand la base est vide. */
function Delta({ now, before, invert = false }: { now: number | null | undefined; before: number | null | undefined; invert?: boolean }) {
  if (now == null || before == null || !before) return <em className="audience-delta is-flat">période précédente : {before == null ? '—' : fr(before)}</em>;
  const pct = Math.round(((Number(now) - Number(before)) / Number(before)) * 100);
  const good = invert ? pct <= 0 : pct >= 0;
  return <em className={`audience-delta ${pct === 0 ? 'is-flat' : good ? 'is-up' : 'is-down'}`}>{pct > 0 ? '+' : ''}{fr(pct)} % vs période précédente</em>;
}

function Bars({ rows, max, value }: { rows: Row[]; max: number; value: (r: Row) => number }) {
  return (
    <ul className="audience-bars">
      {rows.map((r) => (
        <li key={r.path}>
          <a href={r.path} target="_blank" rel="noreferrer">{r.name}</a>
          <span style={{ width: `${Math.max(2, (value(r) / (max || 1)) * 100)}%` }} />
          <b>{fr(value(r))}</b>
        </li>
      ))}
    </ul>
  );
}

export function Audience() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    fetch(`/api/analytics?days=${days}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (data.error) setError(data.error);
        else setReport(data);
      })
      .catch(() => { if (alive) setError('Lecture impossible.'); });
    return () => { alive = false; };
  }, [days]);

  if (error) return <p className="commerce-error">{error}</p>;
  if (!report || report.days !== days) return <p>Lecture de l’audience…</p>;
  const t = report.totals;
  const maxViews = Math.max(...report.pages.map((p) => p.views || 0), 1);
  return (
    <div className="admin-audience">
      <div className="audience-head">
        <h2>Où les visiteurs entrent, ce qu’ils regardent, où ils sortent.</h2>
        <div className="segmented" role="group" aria-label="Période">
          {[7, 30, 90].map((d) => (
            <button key={d} aria-pressed={days === d} onClick={() => setDays(d)}>
              {d} jours
            </button>
          ))}
        </div>
      </div>
      <div className="admin-stats">
        <div><strong>{fr(t.views)}</strong><span>pages vues</span><Delta now={t.views} before={report.previous?.views} /></div>
        <div><strong>{fr(t.sessions)}</strong><span>visites</span><Delta now={t.sessions} before={report.previous?.sessions} /></div>
        <div><strong>{fr(t.visitors)}</strong><span>visiteurs</span><Delta now={t.visitors} before={report.previous?.visitors} /></div>
        <div><strong>{t.dwell == null ? '—' : fr(t.dwell) + ' s'}</strong><span>temps moyen par page</span><Delta now={t.dwell} before={report.previous?.dwell} /></div>
        <div><strong>{fr(t.bounceRate)} %</strong><span>visites d’une seule page</span><Delta now={t.bounceRate} before={report.previous?.bounceRate} invert /></div>
      </div>
      {t.views === 0 && <p className="commerce-caption">Aucune visite mesurée sur la période : la mesure ne compte que les visiteurs qui ont accepté les cookies.</p>}

      <section className="audience-block">
        <h3>À mettre en avant, à corriger</h3>
        <div className="audience-suggestions">
          <article>
            <h4>Modèles vus, jamais ajoutés au panier</h4>
            {report.suggestions.viewedNotAdded.length ? <Bars rows={report.suggestions.viewedNotAdded} max={maxViews} value={(r) => r.views || 0} /> : <p>Rien à signaler.</p>}
            <p>Un modèle regardé sans ajout : photo, prix ou taille à revoir, ou un modèle à retirer de la sélection.</p>
          </article>
          <article>
            <h4>Où les visites s’arrêtent</h4>
            {report.suggestions.strongExits.length ? <Bars rows={report.suggestions.strongExits} max={Math.max(...report.suggestions.strongExits.map((r) => r.n || 0), 1)} value={(r) => r.n || 0} /> : <p>Rien à signaler.</p>}
            <p>La page de sortie la plus fréquente est la première à retravailler : lien suivant, texte, modèles proches.</p>
          </article>
          <article>
            <h4>Recherches sans résultat</h4>
            {report.suggestions.searchesWithoutResult.length ? (
              <ul className="audience-list">{report.suggestions.searchesWithoutResult.map((s) => <li key={s.query}><span>{s.query}</span><b>{fr(s.none)}</b></li>)}</ul>
            ) : <p>Aucune.</p>}
            <p>Ce que les visiteurs cherchent et ne trouvent pas : matériel à ajouter, ou nom à corriger.</p>
          </article>
        </div>
      </section>

      <section className="audience-block">
        <h3>Parcours des dernières visites</h3>
        <p className="commerce-caption">Une ligne par visite : d’où elle vient, chaque page dans l’ordre avec le temps passé, et ce qui s’y est fait.</p>
        <ol className="audience-journeys">
          {report.journeys.map((j) => (
            <li key={j.sid} className={j.converted ? 'is-converted' : ''}>
              <div className="journey-head">
                <strong>{when(j.started)}</strong>
                <span>{j.device || 'appareil inconnu'} · via {j.from}</span>
                <span>{fr(j.views)} page{j.views > 1 ? 's' : ''}{j.converted ? ' · a agi' : ''}</span>
              </div>
              <div className="journey-steps">
                {j.pages.map((p, i) => (
                  <span key={i} className="journey-step">
                    <a href={p.path} target="_blank" rel="noreferrer">{p.name}</a>
                    {p.dwell != null && <small>{fr(p.dwell)} s</small>}
                    {p.marks.map((m, k) => <em key={k}>{m}</em>)}
                  </span>
                ))}
                {!j.pages.length && <span className="journey-step"><small>aucune page mesurée</small></span>}
              </div>
            </li>
          ))}
          {!report.journeys.length && <li><span>Aucune visite mesurée sur la période.</span></li>}
        </ol>
      </section>

      <div className="audience-grid">
        <section className="audience-block">
          <h3>Pages les plus vues</h3>
          <table className="audience-table">
            <thead><tr><th>Page</th><th>Vues</th><th>Visites</th><th>Temps</th><th>Lecture</th></tr></thead>
            <tbody>
              {report.pages.map((p) => (
                <tr key={p.path}>
                  <td><a href={p.path} target="_blank" rel="noreferrer">{p.name}</a></td>
                  <td>{fr(p.views)}</td>
                  <td>{fr(p.sessions)}</td>
                  <td>{p.dwell == null ? '—' : fr(p.dwell) + ' s'}</td>
                  <td>{p.depth == null ? '—' : fr(p.depth) + ' %'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="audience-block">
          <h3>Pages d’entrée</h3>
          <Bars rows={report.entries} max={Math.max(...report.entries.map((r) => r.n || 0), 1)} value={(r) => r.n || 0} />
          <h3>Pages de sortie</h3>
          <Bars rows={report.exits} max={Math.max(...report.exits.map((r) => r.n || 0), 1)} value={(r) => r.n || 0} />
        </section>
        <section className="audience-block">
          <h3>Enchaînements les plus fréquents</h3>
          <ul className="audience-list">
            {report.transitions.map((x) => (
              <li key={x.from + x.to}><span>{x.from} → {x.to}</span><b>{fr(x.n)}</b></li>
            ))}
            {!report.transitions.length && <li><span>Aucun enchaînement mesuré.</span></li>}
          </ul>
        </section>
        <section className="audience-block">
          <h3>Modèles les plus vus</h3>
          <table className="audience-table">
            <thead><tr><th>Modèle</th><th>Vues</th><th>Ajouts</th></tr></thead>
            <tbody>
              {report.products.slice(0, 20).map((p) => (
                <tr key={p.path}><td><a href={p.path} target="_blank" rel="noreferrer">{p.name}</a></td><td>{fr(p.views)}</td><td>{fr(p.adds)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="audience-block">
          <h3>Actions</h3>
          <ul className="audience-list">
            {report.conversions.map((c) => <li key={c.type}><span>{TYPE_LABEL[c.type] || c.type}</span><b>{fr(c.n)}</b></li>)}
            {!report.conversions.length && <li><span>Aucune action mesurée.</span></li>}
          </ul>
          <h3>Recherches</h3>
          <ul className="audience-list">
            {report.searches.slice(0, 12).map((s) => <li key={s.query}><span>{s.query}</span><b>{fr(s.n)}</b></li>)}
            {!report.searches.length && <li><span>Aucune recherche mesurée.</span></li>}
          </ul>
        </section>
        <section className="audience-block">
          <h3>Appareils</h3>
          <ul className="audience-list">{report.devices.map((d) => <li key={d.device}><span>{d.device || 'inconnu'}</span><b>{fr(d.n)}</b></li>)}</ul>
          <h3>Provenances</h3>
          <ul className="audience-list">{report.referrers.map((r) => <li key={r.host}><span>{r.host}</span><b>{fr(r.n)}</b></li>)}</ul>
          <h3>Par jour</h3>
          <ul className="audience-list">{report.byDay.slice(-14).map((d) => <li key={d.day}><span>{d.day}</span><b>{fr(d.views)} vues · {fr(d.sessions)} visites</b></li>)}</ul>
        </section>
      </div>
    </div>
  );
}
