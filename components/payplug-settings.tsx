'use client';
import { useEffect, useState, type SyntheticEvent } from 'react';
import { money } from '@/lib/catalog';

type Attempt = {
  id: string;
  status: string;
  total: number;
  provider_id?: string | null;
  providerId?: string | null;
  paymentUrl?: string | null;
  error?: string | null;
  created_at?: string;
  mode: string;
};
type SettingsData = {
  settings: Record<string, unknown> & { issues: string[]; mode: string };
  attempts: Attempt[];
};
const states: Record<string, string> = {
  creating: 'Préparation en cours',
  pending: 'En attente chez PayPlug',
  paid: 'Paiement de test confirmé',
  failed: 'Échec confirmé',
  unconfirmed: 'À rapprocher du portail',
};
async function result<T>(r: Response): Promise<T> {
  const d = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error(d.error || 'Service indisponible.');
  return d;
}
export function PayplugSettings() {
  const [data, setData] = useState<SettingsData>(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [attempt, setAttempt] = useState<Attempt>(),
    [cart, setCart] = useState<{
      subtotal: number;
      revision: number;
      items: unknown[];
    }>(),
    [retryBody, setRetryBody] = useState<Record<string, unknown>>();
  useEffect(() => {
    const c = new AbortController();
    fetch('/api/payplug/settings', { signal: c.signal })
      .then(result<SettingsData>)
      .then(setData)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, []);
  async function refresh() {
    setError('');
    try {
      setData(await result<SettingsData>(await fetch('/api/payplug/settings')));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Réessayez.');
    }
  }
  async function loadCart() {
    setBusy(true);
    setError('');
    try {
      setCart(await result(await fetch('/api/commerce/cart')));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Panier indisponible.');
    } finally {
      setBusy(false);
    }
  }
  async function create(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart) return;
    const f = new FormData(event.currentTarget);
    const body = retryBody || {
      requestKey: crypto.randomUUID(),
      testConsent: f.get('consent') === 'on',
      quotedTotal: cart.subtotal + 890,
      quotedRevision: cart.revision,
      billing: {
        first_name: f.get('first_name'),
        last_name: f.get('last_name'),
        email: f.get('email'),
        address1: f.get('address1'),
        city: f.get('city'),
        postcode: f.get('postcode'),
        country: 'FR',
      },
    };
    setBusy(true);
    setRetryBody(body);
    setError('');
    try {
      const r = await fetch('/api/payplug/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = (await r.json()) as { attempt?: Attempt; error?: string };
      if (d.attempt) {
        setAttempt(d.attempt);
        setRetryBody(undefined);
        await refresh();
      } else {
        if (r.status < 500 && r.status !== 408) setRetryBody(undefined);
        throw new Error(
          d.error || 'Réponse incertaine : réessayez cette même tentative.',
        );
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Réponse incertaine : réessayez cette même tentative.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function reconcile(event: SyntheticEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(event.currentTarget);
    try {
      const d = await result<{ attempt: Attempt }>(
        await fetch('/api/payplug/reconcile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, paymentId: f.get('paymentId') }),
        }),
      );
      setAttempt(d.attempt);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vérification impossible.');
    } finally {
      setBusy(false);
    }
  }
  const configured = Boolean(
    data &&
    data.settings.mode === 'payplug_test' &&
    !data.settings.issues.length,
  );
  return (
    <section className="payment-settings">
      <header>
        <span className="eyebrow">PAIEMENTS / RACCORDEMENT</span>
        <h2>PayPlug, prêt à raccorder.</h2>
        <p>
          Le panier public reste en simulation. Les tests PayPlug sont réservés
          à cet atelier ; les paiements réels restent verrouillés dans le code.
        </p>
      </header>
      {error && (
        <p role="alert" className="payment-error">
          {error}
        </p>
      )}
      {!data ? (
        <p role="status">Lecture des réglages…</p>
      ) : (
        <>
          <div className="payment-mode">
            <strong>
              {data.settings.mode === 'simulation'
                ? 'SIMULATION ACTIVE'
                : data.settings.mode === 'payplug_test'
                  ? 'ENVIRONNEMENT PAYPLUG DE TEST'
                  : 'CONFIGURATION À CORRIGER'}
            </strong>
            <span>Aucun encaissement réel autorisé.</span>
          </div>
          <dl className="payment-checks">
            {Object.entries(data.settings)
              .filter(
                ([k, v]) =>
                  typeof v === 'boolean' ||
                  ['apiVersion', 'publicBaseUrl', 'mode'].includes(k),
              )
              .map(([key, value]) => (
                <div key={key}>
                  <dt>
                    {(
                      {
                        mode: 'Mode configuré',
                        testKeyConfigured: 'Clé PayPlug de test',
                        liveKeyConfigured: 'Clé PayPlug de production',
                        publicBaseUrl: 'URL publique des retours',
                        apiVersion: 'Version de l’API',
                        liveReleased: 'Activation des paiements réels',
                        hostedTestEnabled: 'Parcours PayPlug de test autorisé',
                        liveEnabled: 'Encaissements réels autorisés',
                        testReady: 'Raccordement de test complet',
                        ready: 'Configuration utilisable',
                      } as Record<string, string>
                    )[key] || key}
                  </dt>
                  <dd>
                    {typeof value === 'boolean'
                      ? value
                        ? 'Oui'
                        : 'Non'
                      : typeof value === 'string'
                        ? value
                        : 'À renseigner'}
                  </dd>
                </div>
              ))}
          </dl>
          {!!data.settings.issues.length && (
            <div className="payment-pending">
              <h3>Ce qui manque au raccordement</h3>
              <ul>
                {data.settings.issues.map((issue, i) => (
                  <li key={i}>
                    {(
                      {
                        invalid_commerce_mode:
                          'Le mode doit être simulation ou payplug_test.',
                        public_base_url_missing_or_unapproved:
                          'Renseigner l’URL HTTPS de cette boutique pour les retours et notifications.',
                        test_key_missing:
                          'Ajouter la clé secrète PayPlug de test dans les secrets de l’hébergement.',
                        test_key_wrong_mode_or_format:
                          'La clé fournie ne correspond pas au format d’une clé de test.',
                        unsupported_api_version:
                          'Utiliser la version d’API vérifiée : 2019-08-06.',
                        live_release_locked:
                          'Les paiements réels sont verrouillés dans cette version.',
                      } as Record<string, string>
                    )[issue] || issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p>
            Les clés se renseignent dans les secrets de l’hébergement. Cet écran
            affiche leur présence, jamais leur valeur. Le guide de raccordement
            se trouve dans <code>docs/PAYPLUG-WIRING.md</code> du dépôt.
          </p>
          <button
            className="button button-dark"
            type="button"
            onClick={refresh}
            disabled={busy}
          >
            Relire la configuration
          </button>
          <section className="payment-sandbox">
            <h3>Parcours PayPlug de test</h3>
            <p>
              Préparez des articles dans le panier, puis utilisez des
              coordonnées de test et une carte de test PayPlug sur sa page
              sécurisée. Aucun numéro de carte ne transite par la boutique.
            </p>
            <button
              type="button"
              className="button button-outline"
              disabled={
                !configured || busy || Boolean(retryBody) || Boolean(attempt)
              }
              onClick={loadCart}
            >
              Charger le panier pour le test
            </button>
            {!configured && (
              <p className="form-privacy">
                Ce contrôle s’ouvrira avec une configuration PayPlug de test
                complète. Le parcours de simulation reste disponible dans le
                panier.
              </p>
            )}
            {cart && (
              <form onSubmit={create}>
                <p>
                  <strong>
                    {cart.items.length} ligne(s) · {money(cart.subtotal + 890)}{' '}
                    de test
                  </strong>
                  <br />
                  Livraison à domicile indicative comprise : 8,90 €. Aucune
                  expédition.
                </p>
                <fieldset
                  disabled={busy || Boolean(retryBody) || Boolean(attempt)}
                  className="payment-billing"
                >
                  <legend>Coordonnées pour le test</legend>
                  {[
                    ['first_name', 'Prénom', 'text'],
                    ['last_name', 'Nom', 'text'],
                    ['email', 'E-mail', 'email'],
                    ['address1', 'Adresse', 'text'],
                    ['city', 'Ville', 'text'],
                    ['postcode', 'Code postal', 'text'],
                  ].map(([name, label, type]) => (
                    <label key={name}>
                      {label}
                      <input
                        name={name}
                        type={type}
                        required
                        maxLength={name === 'postcode' ? 5 : 150}
                        pattern={name === 'postcode' ? '[0-9]{5}' : undefined}
                      />
                    </label>
                  ))}
                  <label className="payment-consent">
                    <input type="checkbox" name="consent" required />
                    Je confirme qu’il s’agit d’un test sans encaissement ni
                    expédition.
                  </label>
                </fieldset>
                <button
                  className="button button-dark"
                  disabled={
                    !configured ||
                    busy ||
                    Boolean(attempt) ||
                    !cart.items.length ||
                    cart.subtotal + 890 > 2000000
                  }
                >
                  {busy
                    ? 'Préparation…'
                    : retryBody
                      ? 'Reprendre la même tentative'
                      : 'Préparer le paiement PayPlug de test'}
                </button>
              </form>
            )}
            {attempt && (
              <div role="status">
                <h4>{states[attempt.status] || attempt.status}</h4>
                <p>Référence {attempt.id}</p>
                {attempt.error && <p>{attempt.error}</p>}
                {['paid', 'failed'].includes(attempt.status) && (
                  <>
                    <p>
                      Pour un autre test, préparez ou modifiez le panier, puis
                      rechargez-le.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setAttempt(undefined);
                        setCart(undefined);
                        setRetryBody(undefined);
                      }}
                    >
                      Préparer une nouvelle séance de test
                    </button>
                  </>
                )}
                {attempt.paymentUrl && attempt.status === 'pending' && (
                  <a
                    className="button button-dark"
                    href={attempt.paymentUrl}
                    rel="noreferrer"
                  >
                    Ouvrir PayPlug en mode test ↗
                  </a>
                )}
              </div>
            )}
          </section>
          <section>
            <h3>Les dernières tentatives PayPlug</h3>
            <p>
              Les 50 tentatives les plus récentes. Les commandes simulées
              restent dans leur onglet dédié.
            </p>
            {data.attempts.length === 0 ? (
              <p>Aucune tentative PayPlug enregistrée.</p>
            ) : (
              <div className="payment-attempts">
                {data.attempts.map((a) => (
                  <article key={a.id}>
                    <header>
                      <strong>{states[a.status] || a.status}</strong>
                      <span>{money(a.total)}</span>
                    </header>
                    <p>
                      <code>{a.id}</code>
                      <br />
                      {a.error}
                    </p>
                    <form onSubmit={(e) => reconcile(e, a.id)}>
                      {!a.provider_id && (
                        <label>
                          Identifiant relevé dans le portail PayPlug
                          <input
                            name="paymentId"
                            placeholder="pay_…"
                            required
                            pattern="pay_[A-Za-z0-9]+"
                          />
                        </label>
                      )}
                      <button type="submit" disabled={busy || !configured}>
                        Revérifier auprès de PayPlug
                      </button>
                    </form>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
export function PayplugReturn({ id }: { id: string }) {
  const [data, setData] = useState<{ attempt: Attempt; warning?: string }>(),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    fetch('/api/payplug/status?id=' + encodeURIComponent(id), {
      signal: c.signal,
    })
      .then(result<{ attempt: Attempt; warning?: string }>)
      .then(setData)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [id, retry]);
  return (
    <section className="payment-return">
      <span className="eyebrow">PAYPLUG / TEST ADMINISTRATEUR</span>
      <h1>
        {data
          ? states[data.attempt.status] || 'Vérifier le paiement'
          : 'Retour du paiement de test.'}
      </h1>
      <p>
        La confirmation provient de la vérification serveur auprès de PayPlug.
        Le retour sur cette page ne vaut pas preuve de paiement.
      </p>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <p>
            Référence {data.attempt.id} · {money(data.attempt.total)}
          </p>
          {data.warning && <p role="status">{data.warning}</p>}
          <p>
            Aucun paiement réel, aucune expédition et aucune facture d’achat.
          </p>
        </>
      )}
      <button
        className="button button-dark"
        onClick={() => {
          setError('');
          setRetry((n) => n + 1);
        }}
      >
        Revérifier le statut
      </button>
      <a className="inline-link" href="/atelier/">
        Revenir aux réglages ↗
      </a>
    </section>
  );
}
