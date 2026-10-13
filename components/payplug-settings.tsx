'use client';
import { useEffect, useState, type SyntheticEvent } from 'react';
import { money } from '@/lib/catalog';

type Line = { name: string; variant: string; quantity: number; price: number };
type Customer = {
  first_name?: string;
  last_name?: string;
  address1?: string;
  address2?: string;
  postcode?: string;
  city?: string;
  phone?: string;
  relay?: { name: string; address: string; postcode: string; city: string; network: string; code: string } | null;
  optin?: boolean;
};
type Attempt = {
  id: string;
  reference?: string;
  status: string;
  total: number;
  subtotal?: number;
  shipping?: number;
  delivery?: string;
  providerId?: string | null;
  paymentUrl?: string | null;
  error?: string | null;
  createdAt?: string;
  paidAt?: string | null;
  mode: string;
  name?: string;
  email?: string;
  customer?: Customer;
  lines?: Line[];
  notifiedAt?: string | null;
  notifyError?: string | null;
};
type SettingsData = {
  settings: Record<string, unknown> & { issues: string[]; mode: string };
  attempts: Attempt[];
  mail?: boolean;
};
const states: Record<string, string> = {
  creating: 'Préparation en cours',
  pending: 'En attente du paiement',
  paid: 'Payée',
  failed: 'Paiement refusé',
  unconfirmed: 'À rapprocher du portail PayPlug',
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
    ['payplug_test', 'payplug_live'].includes(data.settings.mode) &&
    !data.settings.issues.length,
  );
  const live = data?.settings.mode === 'payplug_live';
  return (
    <section className="payment-settings">
      <header>
        <span className="eyebrow">PAIEMENTS / RACCORDEMENT</span>
        <h2>PayPlug et les commandes.</h2>
        <p>
          En mode live (COMMERCE_MODE=payplug_live), le panier public paie par
          PayPlug dès que les ventes sont ouvertes. Le mode test reste réservé à
          cet atelier en production.
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
                  : live && configured
                    ? 'PAIEMENTS RÉELS ACTIFS'
                    : 'CONFIGURATION À CORRIGER'}
            </strong>
            <span>
              {live && configured
                ? 'Les clients paient par carte sur la page PayPlug.'
                : 'Aucun encaissement réel.'}
              {data.mail === false && ' · E-mails de commande : RESEND_API_KEY manquante.'}
            </span>
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
                        liveKeyValid: 'Clé de production au bon format',
                        liveReady: 'Raccordement de production complet',
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
                          'Le mode doit être simulation, payplug_test ou payplug_live.',
                        live_key_missing:
                          'Ajouter PAYPLUG_LIVE_SECRET_KEY (clé secrète live) dans les variables de Vercel, environnement Production.',
                        live_key_wrong_mode_or_format:
                          'La clé de production doit commencer par sk_live_.',
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
            <h3>Les commandes PayPlug</h3>
            <p>
              Les 100 plus récentes. Une commande « Payée » est à préparer et à
              expédier ; le client a reçu sa confirmation quand « e-mails
              envoyés » est indiqué.
            </p>
            {data.attempts.length === 0 ? (
              <p>Aucune commande PayPlug enregistrée.</p>
            ) : (
              <div className="payment-attempts">
                {data.attempts.map((a) => (
                  <article key={a.id}>
                    <header>
                      <strong>
                        {a.reference || a.id.slice(0, 8)} · {states[a.status] || a.status}
                        {a.mode !== 'payplug_live' && ' (test)'}
                      </strong>
                      <span>{money(a.total)}</span>
                    </header>
                    <p>
                      {a.name} · <a href={`mailto:${a.email}`}>{a.email}</a>
                      {a.customer?.phone && <> · {a.customer.phone}</>}
                      <br />
                      {a.delivery === 'relay'
                        ? a.customer?.relay
                          ? `Point relais : ${a.customer.relay.name}, ${a.customer.relay.address}, ${a.customer.relay.postcode} ${a.customer.relay.city} (${a.customer.relay.code})`
                          : `Point relais à choisir près de : ${a.customer?.address1 || ''}, ${a.customer?.postcode || ''} ${a.customer?.city || ''}`
                        : `Domicile : ${a.customer?.address1 || ''}${a.customer?.address2 ? ', ' + a.customer.address2 : ''}, ${a.customer?.postcode || ''} ${a.customer?.city || ''}`}
                    </p>
                    {!!a.lines?.length && (
                      <ul>
                        {a.lines.map((l, i) => (
                          <li key={i}>
                            {l.quantity} × {l.name}
                            {l.variant ? ` — ${l.variant}` : ''} · {money(l.price * l.quantity)}
                          </li>
                        ))}
                        <li>Livraison · {money(a.shipping || 0)}</li>
                      </ul>
                    )}
                    <p>
                      {a.createdAt && new Date(a.createdAt).toLocaleString('fr-FR')}
                      {a.paidAt && <> · payée le {new Date(a.paidAt).toLocaleString('fr-FR')}</>}
                      {a.status === 'paid' && (a.notifiedAt ? ' · e-mails envoyés' : ' · e-mails en attente')}
                      {a.notifyError && <> · e-mail : {a.notifyError}</>}
                      <br />
                      <code>{a.providerId || a.id}</code>
                      {a.error && (
                        <>
                          <br />
                          {a.error}
                        </>
                      )}
                    </p>
                    <form onSubmit={(e) => reconcile(e, a.id)}>
                      {!a.providerId && (
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
const publicStates: Record<string, string> = {
  paid: 'Votre commande est confirmée.',
  pending: 'Paiement en cours de confirmation.',
  creating: 'Paiement en préparation.',
  failed: 'Le paiement n’a pas abouti.',
  unconfirmed: 'Paiement en cours de vérification.',
};
type PublicAttempt = {
  id: string;
  reference: string;
  status: string;
  total: number;
  subtotal?: number;
  shipping?: number;
  delivery?: string;
  firstName?: string;
  lines?: Line[];
  paymentUrl?: string | null;
  mode: string;
};
export function PayplugReturn({ id, cancelled = false }: { id: string; cancelled?: boolean }) {
  const [data, setData] = useState<{ attempt: PublicAttempt; warning?: string }>(),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tries = 0;
    // La notification de PayPlug arrive parfois quelques secondes après le retour : on relit
    // le statut côté serveur jusqu'à une issue, une douzaine de fois au plus.
    const read = () =>
      fetch('/api/payplug/status?id=' + encodeURIComponent(id), { signal: c.signal, cache: 'no-store' })
        .then(result<{ attempt: PublicAttempt; warning?: string }>)
        .then((d) => {
          setData(d);
          tries++;
          if (['pending', 'creating', 'unconfirmed'].includes(d.attempt.status) && !cancelled && tries < 12)
            timer = setTimeout(read, 3000 + tries * 500);
        })
        .catch((e) => {
          if (!c.signal.aborted) setError(e.message);
        });
    void read();
    return () => {
      c.abort();
      if (timer) clearTimeout(timer);
    };
  }, [id, retry, cancelled]);
  const a = data?.attempt;
  const paid = a?.status === 'paid';
  const open = a && ['pending', 'creating', 'unconfirmed'].includes(a.status);
  return (
    <section className="payment-return">
      <span className="eyebrow">
        {a ? `COMMANDE ${a.reference}` : 'VOTRE COMMANDE'}
        {a && a.mode !== 'payplug_live' && ' · PAIEMENT DE TEST'}
      </span>
      <h1>
        {a
          ? cancelled && open
            ? 'Paiement interrompu.'
            : paid && a.firstName
              ? `Merci ${a.firstName}, votre commande est confirmée.`
              : publicStates[a.status] || 'Vérification du paiement.'
          : error
            ? 'Commande introuvable.'
            : 'Vérification du paiement…'}
      </h1>
      {error && <p role="alert">{error}</p>}
      {a && (
        <>
          <p role="status">
            {paid
              ? 'Le paiement est confirmé par PayPlug. Un e-mail récapitulatif part à l’adresse indiquée ; un second vous prévient à l’expédition.'
              : a.status === 'failed'
                ? 'Aucun montant n’a été débité. Votre panier est conservé : vous pouvez réessayer, avec la même carte ou une autre.'
                : cancelled
                  ? 'Le paiement n’a pas été validé. Votre panier est conservé ; vous pouvez reprendre le paiement.'
                  : 'La banque confirme le paiement à PayPlug ; cette page se met à jour toute seule.'}
          </p>
          {data?.warning && <p role="status">{data.warning}</p>}
          {!!a.lines?.length && (
            <ul className="checkout-mini-lines">
              {a.lines.map((l, i) => (
                <li key={i}>
                  <span>
                    {l.quantity} × {l.name}
                    {l.variant && <small>{l.variant}</small>}
                  </span>
                  <strong>{money(l.price * l.quantity)}</strong>
                </li>
              ))}
              <li>
                <span>{a.delivery === 'relay' ? 'Livraison en point relais' : 'Livraison à domicile'}</span>
                <strong>{money(a.shipping || 0)}</strong>
              </li>
              <li>
                <span>
                  <b>Total TTC</b>
                </span>
                <strong>{money(a.total)}</strong>
              </li>
            </ul>
          )}
        </>
      )}
      {a?.paymentUrl && open && (
        <a className="button button-dark" href={a.paymentUrl} rel="noreferrer">
          Reprendre le paiement ↗
        </a>
      )}
      {a && !paid && (
        <a className="inline-link" href="/panier/">
          Revenir au panier ↗
        </a>
      )}
      {open && !cancelled && (
        <button
          className="text-button"
          type="button"
          onClick={() => {
            setError('');
            setRetry((n) => n + 1);
          }}
        >
          Revérifier maintenant
        </button>
      )}
      {paid && (
        <a className="button button-dark" href="/materiel-sport-de-combat/">
          Continuer sur la boutique ↗
        </a>
      )}
      <p className="commerce-caption">
        Une question sur la commande : <a href="/contact/">écrivez-nous</a>, en rappelant son numéro.
      </p>
    </section>
  );
}
