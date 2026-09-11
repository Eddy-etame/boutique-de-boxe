'use client';
import { useEffect, useState } from 'react';

/** Clients et ventes : qui achète, quoi, combien, et l’export CSV pour le suivi. */
type Client = { name: string; email: string; phone: string; optin: boolean; address: string; orders: number; approved: number; declined: number; total: number; first: string; last: string; items: string[]; sources: string[] };
type Report = {
  days: number;
  totals: { clients: number; optin: number; withPhone: number; orders: number; approved: number; declined: number; revenue: number; averageBasket: number; repeatClients: number };
  clients: Client[];
  byDay: { day: string; orders: number; revenue: number }[];
  products: { id: string; name: string; quantity: number; revenue: number; orders: number }[];
  families: { name: string; quantity: number; revenue: number }[];
  brands: { name: string; quantity: number; revenue: number }[];
  deliveries: { mode: string; n: number }[];
  funnel: { productViews: number; adds: number; orders: number; sessionsWithAdd: number };
  recent: { id: string; name: string; email: string; total: number; status: string; source: string; createdAt: string; items: string[] }[];
};
const euros = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const fr = (n: number) => n.toLocaleString('fr-FR');
const when = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const STATUS: Record<string, string> = { simulated_paid: 'Essai approuvé', simulated_declined: 'Essai refusé', paid: 'Payé (PayPlug test)' };
const DELIVERY: Record<string, string> = { relay: 'Point relais', home: 'À domicile' };

export function Clients() {
  const [days, setDays] = useState(90);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    let alive = true;
    fetch(`/api/commerce/admin-clients?days=${days}`, { cache: 'no-store' })
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
  if (!report || report.days !== days) return <p>Lecture des clients…</p>;
  const t = report.totals;
  const q = query.trim().toLocaleLowerCase('fr');
  const clients = report.clients.filter((c) => !q || `${c.name} ${c.email} ${c.phone} ${c.items.join(' ')}`.toLocaleLowerCase('fr').includes(q));
  const maxRevenue = Math.max(...report.products.map((p) => p.revenue), 1);
  // Les commandes comptent tout le monde, les vues seulement les visiteurs consentants : un taux n'a de sens que si la base est plus grande.
  const pct = (a: number, b: number) => (b && a <= b ? ` · ${Math.round((a / b) * 100)} %` : '');
  return (
    <div className="admin-audience admin-clients">
      <div className="audience-head">
        <div>
          <h2>Qui achète, quoi, et combien.</h2>
          <p className="commerce-caption">Commandes d’essai approuvées et paiements PayPlug de test. Aucun chiffre n’est un encaissement tant que la boutique reste en simulation.</p>
        </div>
        <div className="clients-tools">
          <div className="segmented" role="group" aria-label="Période">
            {[30, 90, 365].map((d) => (
              <button key={d} aria-pressed={days === d} onClick={() => setDays(d)}>{d} jours</button>
            ))}
          </div>
          <a className="button" href={`/api/commerce/admin-export?kind=clients&days=${days}`}>Exporter les clients (CSV)</a>
          <a className="button" href={`/api/commerce/admin-export?kind=ventes&days=${days}`}>Exporter les ventes (CSV)</a>
        </div>
      </div>
      <div className="admin-stats">
        <div><strong>{fr(t.clients)}</strong><span>clients</span></div>
        <div><strong>{fr(t.approved)}</strong><span>commandes approuvées</span></div>
        <div><strong>{euros(t.revenue)}</strong><span>chiffre d’essai</span></div>
        <div><strong>{euros(t.averageBasket)}</strong><span>panier moyen</span></div>
        <div><strong>{fr(t.optin)}</strong><span>accords e-mail</span></div>
      </div>
      <section className="audience-block">
        <h3>De la fiche à la commande</h3>
        <ol className="clients-funnel">
          <li><strong>{fr(report.funnel.productViews)}</strong><span>fiches vues</span></li>
          <li><strong>{fr(report.funnel.adds)}</strong><span>ajouts au panier{pct(report.funnel.adds, report.funnel.productViews) && `${pct(report.funnel.adds, report.funnel.productViews)} des vues`}</span></li>
          <li><strong>{fr(report.funnel.orders)}</strong><span>commandes approuvées{pct(report.funnel.orders, report.funnel.sessionsWithAdd) && `${pct(report.funnel.orders, report.funnel.sessionsWithAdd)} des visites avec ajout`}</span></li>
        </ol>
        <p className="commerce-caption">Les vues et ajouts ne comptent que les visiteurs qui ont accepté la mesure ; les commandes comptent toutes.</p>
      </section>
      <div className="audience-grid">
        <section className="audience-block">
          <h3>Modèles vendus</h3>
          <ul className="audience-bars">
            {report.products.map((p) => (
              <li key={p.id}>
                <a href={`/produits/${p.id}/`} target="_blank" rel="noreferrer">{p.name}</a>
                <span style={{ width: `${Math.max(2, (p.revenue / maxRevenue) * 100)}%` }} />
                <b>{fr(p.quantity)}</b>
              </li>
            ))}
            {!report.products.length && <li><span>Aucune vente sur la période.</span></li>}
          </ul>
        </section>
        <section className="audience-block">
          <h3>Par famille</h3>
          <ul className="audience-list">{report.families.map((f) => <li key={f.name}><span>{f.name}</span><b>{euros(f.revenue)} · {fr(f.quantity)} pièce{f.quantity > 1 ? 's' : ''}</b></li>)}</ul>
          <h3>Par marque</h3>
          <ul className="audience-list">{report.brands.map((b) => <li key={b.name}><span>{b.name}</span><b>{euros(b.revenue)}</b></li>)}</ul>
          <h3>Livraison choisie</h3>
          <ul className="audience-list">{report.deliveries.map((d) => <li key={d.mode}><span>{DELIVERY[d.mode] || d.mode}</span><b>{fr(d.n)}</b></li>)}</ul>
        </section>
        <section className="audience-block">
          <h3>Par jour</h3>
          <ul className="audience-list">
            {report.byDay.slice(-14).map((d) => <li key={d.day}><span>{d.day}</span><b>{fr(d.orders)} commande{d.orders > 1 ? 's' : ''} · {euros(d.revenue)}</b></li>)}
            {!report.byDay.length && <li><span>Aucune commande approuvée.</span></li>}
          </ul>
          <h3>Clients fidèles</h3>
          <p className="commerce-caption">{fr(t.repeatClients)} client{t.repeatClients > 1 ? 's ont' : ' a'} commandé plus d’une fois. {fr(t.declined)} essai{t.declined > 1 ? 's' : ''} refusé{t.declined > 1 ? 's' : ''} sur {fr(t.orders)}.</p>
        </section>
      </div>
      <section className="audience-block">
        <div className="clients-search">
          <h3>Clients</h3>
          <label>
            <span className="sr-only">Rechercher un client</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, e-mail, téléphone, modèle…" />
          </label>
        </div>
        <div className="clients-scroll">
          <table className="audience-table clients-table">
            <thead><tr><th>Client</th><th>Contact</th><th>E-mail</th><th>Commandes</th><th>Total</th><th>Dernière</th><th>Modèles</th></tr></thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.email}>
                  <td><strong>{c.name}</strong><br /><small>{c.sources.map((s) => (s === 'payplug' ? 'PayPlug test' : 'essai')).join(', ')}</small></td>
                  <td><a href={`mailto:${c.email}`}>{c.email}</a>{c.phone && <><br /><a href={`tel:${c.phone}`}>{c.phone}</a></>}{c.address && <><br /><small>{c.address}</small></>}</td>
                  <td>{c.optin ? 'oui' : 'non'}</td>
                  <td>{fr(c.approved)}{c.declined ? ` (+${c.declined} refusée${c.declined > 1 ? 's' : ''})` : ''}</td>
                  <td>{euros(c.total)}</td>
                  <td>{when(c.last)}</td>
                  <td className="clients-items">{c.items.slice(0, 4).join(' · ')}{c.items.length > 4 ? ` · +${c.items.length - 4}` : ''}</td>
                </tr>
              ))}
              {!clients.length && <tr><td colSpan={7}>Aucun client sur la période.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="audience-block">
        <h3>Dernières commandes</h3>
        <ul className="audience-list">
          {report.recent.slice(0, 20).map((o) => (
            <li key={o.id}><span>{when(o.createdAt)} · {o.name} · {o.items.join(', ')}</span><b>{euros(o.total)} · {STATUS[o.status] || o.status}</b></li>
          ))}
          {!report.recent.length && <li><span>Aucune commande sur la période.</span></li>}
        </ul>
      </section>
    </div>
  );
}
