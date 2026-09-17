'use client';
import { BriefBoard } from './brief-board';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { CatalogEditor } from './catalog-editor';
import type { Product } from '@/lib/catalog';

// Chaque panneau d’onglet est chargé à l’ouverture de son onglet, pas au chargement
// de l’atelier : le gros module de commande et les tableaux recharts ne pèsent plus
// sur l’entrée. Déclarés au niveau module pour ne pas se remonter à chaque rendu.
const loading = () => <p role="status">Chargement…</p>;
const OrdersAdmin = dynamic(() => import('./commerce-ui').then((m) => m.OrdersAdmin), { ssr: false, loading });
const Audience = dynamic(() => import('./audience').then((m) => m.Audience), { ssr: false, loading });
const Clients = dynamic(() => import('./clients').then((m) => m.Clients), { ssr: false, loading });
const PayplugSettings = dynamic(() => import('./payplug-settings').then((m) => m.PayplugSettings), { ssr: false, loading });
const CatalogueImports = dynamic(() => import('./catalogue-imports').then((m) => m.CatalogueImports), { ssr: false, loading });
type RecordRow = Record<string, string | number>;
type AdminData = {
  products: Product[];
  alerts: RecordRow[];
  contacts: RecordRow[];
  overrides: RecordRow[];
};
export function Admin() {
  const [data, setData] = useState<AdminData>();
  const [error, setError] = useState('');
  const [tab, setTab] = useState('products');
  const [selected, setSelected] = useState('');
  const [saved, setSaved] = useState('');
  async function refresh() {
    try {
      const r = await fetch('/api/admin');
      const d = (await r.json()) as AdminData & { error?: string };
      if (!r.ok) throw new Error(d.error || 'Administration indisponible');
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }
  useEffect(() => {
    let active = true;
    fetch('/api/admin')
      .then(async (r) => {
        const d = (await r.json()) as AdminData & { error?: string };
        if (!r.ok) throw new Error(d.error || 'Administration indisponible');
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Erreur');
      });
    return () => {
      active = false;
    };
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Chargement des demandes…</p>;
  const p = data.products.find((p) => p.id === selected) || data.products[0];
  const override = data.overrides.find((o) => o.product_id === p?.id);
  async function remove(kind: string, id: string) {
    if (
      !window.confirm('Supprimer définitivement cette demande et ses données ?')
    )
      return;
    const r = await fetch('/api/admin-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, id }),
    });
    if (!r.ok) {
      setError('Suppression impossible.');
      return;
    }
    await refresh();
  }
  return (
    <div className="admin-dashboard">
      <div className="admin-stats">
        <div>
          <strong>{data.products.length}</strong>
          <span>références en préparation</span>
        </div>
        <div>
          <strong>{data.alerts.length}</strong>
          <span>alertes enregistrées</span>
        </div>
        <div>
          <strong>{data.contacts.length}</strong>
          <span>demandes de contact</span>
        </div>
      </div>
      <CatalogEditor onSaved={refresh} />
      <div
        className="admin-tabs"
        role="group"
        aria-label="Sections de l’administration"
      >
        {[
          ['products', 'Produits'],
          ['orders', 'Commandes d’essai'],
          ['payments', 'Réglages PayPlug'],
          ['imports', 'Imports du catalogue'],
          ['alerts', 'Alertes'],
          ['contacts', 'Contacts'],
          ['seo', 'Suivi SEO'],
          ['audience', 'Audience'],
          ['clients', 'Clients & ventes'],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id);
              setSaved('');
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'orders' && <OrdersAdmin />}
      {tab === 'clients' && <Clients />}
      {tab === 'payments' && <PayplugSettings />}
      {tab === 'imports' && (
        <CatalogueImports
          sources={[
            { value: 'Boxing-Shop', label: 'Boxing-Shop' },
            { value: 'Le Coin du Ring', label: 'Le Coin du Ring' },
          ]}
        />
      )}
      {tab === 'products' && p && (
        <div className="admin-editor">
          <label>
            Référence
            <select
              value={p.id}
              onChange={(e) => {
                setSelected(e.target.value);
                setSaved('');
              }}
            >
              {data.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <CatalogEditor
            key={'full-' + p.id + '-' + p.updatedAt}
            product={p}
            onSaved={refresh}
          />
          <form
            key={'quick-' + p.id + '-' + p.updatedAt}
            onSubmit={async (e) => {
              e.preventDefault();
              setSaved('');
              const f = new FormData(e.currentTarget);
              const r = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  productId: p.id,
                  name: f.get('name'),
                  description: f.get('description'),
                  priceCents: Math.round(Number(f.get('price')) * 100),
                  internalStock: Number(f.get('stock')),
                  plannedDiscount: Number(f.get('discount')),
                }),
              });
              const result = (await r.json()) as { error?: string };
              setSaved(
                r.ok
                  ? 'Modifications enregistrées. Les pages publiques utilisent ces informations.'
                  : result.error || 'Enregistrement impossible.',
              );
              if (r.ok) await refresh();
            }}
          >
            <label>
              Nom du produit
              <input
                name="name"
                required
                minLength={3}
                maxLength={180}
                defaultValue={p.name}
              />
            </label>
            <label>
              Description détaillée
              <textarea
                name="description"
                required
                minLength={30}
                maxLength={8000}
                rows={7}
                defaultValue={p.description}
              />
            </label>
            <div className="admin-fields">
              <label>
                Prix indicatif (€)
                <input
                  name="price"
                  type="number"
                  step=".01"
                  min="0"
                  max="50000"
                  required
                  defaultValue={p.price / 100}
                />
              </label>
              <label>
                Stock interne
                <input
                  name="stock"
                  type="number"
                  min="0"
                  max="100000"
                  required
                  defaultValue={Number(override?.internal_stock) || 0}
                />
              </label>
              <label>
                Remise préparée
                <select
                  name="discount"
                  defaultValue={String(override?.planned_discount || 0)}
                >
                  <option value="0">Aucune</option>
                  <option value="15">15 % (non publiée)</option>
                </select>
              </label>
            </div>
            <p className="form-privacy">
              Stock et remise restent internes. Les références gardent le statut
              « Bientôt disponible ». Modifiez les photos et déclinaisons dans «
              Toutes les caractéristiques et photos ».
            </p>
            <button className="button button-blue">
              Enregistrer le produit ↗
            </button>
            <a
              className="inline-link"
              href={'/produits/' + p.slug + '/'}
              target="_blank"
              rel="noreferrer"
            >
              Voir la fiche publique ↗
            </a>
            <p role="status">{saved}</p>
          </form>
        </div>
      )}
      {(tab === 'alerts' || tab === 'contacts') && (
        <div className="admin-inbox">
          <p>
            {tab === 'alerts'
              ? 'Les inscriptions sont enregistrées. Aucun envoi automatique d’e-mail n’est activé. Avant tout envoi, inclure le lien de désinscription individuel.'
              : 'Demandes enregistrées dans la boutique. Traitez-les depuis votre messagerie habituelle.'}{' '}
            Les 300 demandes les plus récentes sont affichées.
          </p>
          {data[tab as 'alerts' | 'contacts'].length === 0 ? (
            <p className="empty-state">Aucune demande enregistrée.</p>
          ) : (
            data[tab as 'alerts' | 'contacts'].map((row) => (
              <article key={row.id}>
                <div>
                  <strong>{String(row.name || row.email)}</strong>
                  <span>
                    {new Date(row.created_at).toLocaleString('fr-FR')}
                  </span>
                </div>
                <a href={'mailto:' + row.email}>{row.email}</a>
                {tab === 'alerts' ? (
                  <>
                    <p>
                      {row.product_id === 'launch'
                        ? 'Ouverture de la boutique'
                        : row.product_name ||
                          data.products.find((p) => p.id === row.product_id)
                            ?.name ||
                          'Référence ' + row.product_id}{' '}
                      {row.product_archived ? '(retirée du catalogue) ' : ''}
                      {row.variant}
                    </p>
                    <label>
                      Lien de désinscription
                      <input
                        readOnly
                        value={
                          typeof window === 'undefined'
                            ? ''
                            : window.location.origin +
                              '/desinscription/?token=' +
                              row.unsubscribe_token
                        }
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <p className="message-text">{row.message}</p>
                    <small>
                      Relais Inlett :{' '}
                      {(
                        {
                          accepted_client:
                            'demande acceptée par Inlett ; livraison e-mail non vérifiée',
                          failed: 'refusé, demande conservée ici',
                          unconfirmed:
                            'résultat non confirmé ; vérifier Inlett avant tout renvoi',
                          pending:
                            'demande conservée ici, sans relais navigateur',
                        } as Record<string, string>
                      )[String(row.relay_status)] || 'à vérifier'}
                    </small>
                  </>
                )}
                <button
                  className="text-button"
                  onClick={() => remove(tab, String(row.id))}
                >
                  Supprimer les données de cette demande
                </button>
              </article>
            ))
          )}
        </div>
      )}
      {tab === 'audience' && <Audience />}
      {tab === 'seo' && (
        <div className="admin-seo">
          <BriefBoard />
          <h2>Les bases sont en place. Les résultats se mesurent.</h2>
          <p>
            Les métadonnées, le sitemap et les données structurées sont générés
            à partir du catalogue. Un aperçu privé reste inaccessible aux
            moteurs ; le suivi commence après la connexion du domaine et
            l’ouverture publique.
          </p>
          <div className="admin-fields">
            <article>
              <h3>Search Console</h3>
              <p>
                Propriété à connecter pour boutique-de-boxe.fr : indexation,
                requêtes, clics, impressions et position. Aucune donnée de
                performance n’est simulée.
              </p>
            </article>
            <article>
              <h3>Mesure d’audience</h3>
              <p>
                La mesure est faite par la boutique elle-même, avec l’accord du
                visiteur : voir l’onglet Audience. Aucun outil tiers.
              </p>
            </article>
            <article>
              <h3>Suivi mensuel</h3>
              <p>
                Exporter les requêtes par page, comparer les périodes et suivre
                les demandes de contact et d’alerte. Les variantes de filtres
                n’ajoutent pas de pages indexables.
              </p>
            </article>
          </div>
          <a className="inline-link" href="/sitemap.xml">
            Consulter le sitemap ↗
          </a>
        </div>
      )}
    </div>
  );
}
