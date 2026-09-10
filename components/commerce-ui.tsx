'use client';

// Independent UI draft. Root integrates this as components/commerce-ui.tsx.
// lib/commerce is server-only at runtime: all imports from it MUST stay type-only.
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Download,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { money, type Product } from '@/lib/catalog';
import type { Cart, CartLine, Order } from '@/lib/commerce';

const CART_EVENT = 'boutique:cart-changed';
const CART_BUSY_EVENT = 'boutique:cart-busy';
const API = '/api/commerce/';
const CATALOGUE = '/materiel-sport-de-combat/';
const receiptPath = (id: string) => `/recu/?id=${encodeURIComponent(id)}`;
const downloadPath = (id: string) =>
  `${API}receipt?id=${encodeURIComponent(id)}&download=1`;

type ApiFailure = Error & { status?: number; uncertain?: boolean };

async function request<T>(
  action: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${action}`, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal ?? AbortSignal.timeout(25_000),
    });
  } catch {
    throw Object.assign(
      new Error(
        'La réponse n’a pas pu être confirmée. Vos informations sont conservées.',
      ),
      { uncertain: body !== undefined },
    ) as ApiFailure;
  }
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || data === null) {
    throw Object.assign(
      new Error(data?.error || 'Le service est momentanément indisponible.'),
      {
        status: response.status,
        uncertain:
          body !== undefined &&
          (response.status >= 500 || response.status === 408 || response.ok),
      },
    ) as ApiFailure;
  }
  return data;
}

// One browser-tab queue avoids overlapping read/modify/write requests from several
// product buttons. Every published count comes from the server response.
let cachedCart: Cart | null = null;
let pendingRead: Promise<Cart> | null = null;
let mutationQueue: Promise<unknown> = Promise.resolve();
let cartRevision = 0;
let cartBusy = 0;

function publishCart(cart: Cart) {
  cachedCart = cart;
  window.dispatchEvent(new CustomEvent<Cart>(CART_EVENT, { detail: cart }));
}

async function readCart(): Promise<Cart> {
  if (pendingRead) return pendingRead;
  const revision = cartRevision;
  pendingRead = request<Cart>('cart')
    .then((cart) => {
      // A GET begun before a mutation may not overwrite its newer response.
      if (revision === cartRevision) publishCart(cart);
      return revision === cartRevision ? cart : (cachedCart ?? cart);
    })
    .finally(() => {
      pendingRead = null;
    });
  return pendingRead;
}

function mutateCart(body: unknown): Promise<Cart> {
  cartBusy++;
  window.dispatchEvent(
    new CustomEvent<number>(CART_BUSY_EVENT, { detail: cartBusy }),
  );
  const operation = mutationQueue
    .catch(() => undefined)
    .then(async () => {
      cartRevision++;
      const cart = await request<Cart>('cart', body);
      publishCart(cart);
      return cart;
    });
  mutationQueue = operation;
  return operation.finally(() => {
    cartBusy--;
    window.dispatchEvent(
      new CustomEvent<number>(CART_BUSY_EVENT, { detail: cartBusy }),
    );
  });
}

function useCart() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const value = await readCart();
      if (mounted.current) setCart(value);
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : 'Panier indisponible.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const changed = (event: Event) => {
      setCart((event as CustomEvent<Cart>).detail);
      setError('');
      setLoading(false);
    };
    const busyChanged = (event: Event) =>
      setBusy((event as CustomEvent<number>).detail > 0);
    window.addEventListener(CART_EVENT, changed);
    window.addEventListener(CART_BUSY_EVENT, busyChanged);
    void readCart()
      .then((value) => {
        if (mounted.current) setCart(value);
      })
      .catch((e) => {
        if (mounted.current)
          setError(e instanceof Error ? e.message : 'Panier indisponible.');
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
      window.removeEventListener(CART_EVENT, changed);
      window.removeEventListener(CART_BUSY_EVENT, busyChanged);
    };
  }, [refresh]);
  return { cart, error, loading, busy, refresh };
}

export function CartLink() {
  const { cart, error } = useCart();
  const count = cart?.items.reduce((total, item) => total + item.quantity, 0);
  const badge = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const onAdded = () => {
      const el = badge.current;
      if (!el) return;
      el.setAttribute('data-bump', 'true');
      const t = setTimeout(() => el.setAttribute('data-bump', 'false'), 500);
      return () => clearTimeout(t);
    };
    window.addEventListener('boutique:cart-added', onAdded);
    return () => window.removeEventListener('boutique:cart-added', onAdded);
  }, []);
  return (
    <a
      className="cart-link"
      href="/panier/"
      aria-label={
        count === undefined
          ? 'Ouvrir le panier'
          : `Panier : ${count} article${count > 1 ? 's' : ''}`
      }
    >
      <ShoppingBag size={19} aria-hidden="true" />
      <span>Panier</span>
      <span ref={badge} className="cart-count" aria-hidden="true" data-bump="false">
        {count ?? (error ? '—' : '…')}
      </span>
    </a>
  );
}

export type AddToCartLabels = { add?: string; adding?: string; choose?: string; note?: string; check?: string };
export function AddToCart({
  product,
  variant = '',
  labels = {},
}: {
  product: Product;
  variant?: string;
  labels?: AddToCartLabels;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const helpId = useId();
  const valid = product.sizes.length
    ? product.sizes.includes(variant)
    : variant === '';

  async function add() {
    if (!valid || busy) return;
    setBusy(true);
    setStatus('');
    setError('');
    try {
      await mutateCart({
        action: 'add',
        productId: product.id,
        variant,
        quantity: 1,
      });
      setStatus(
        `${product.name}${variant ? ` · ${variant}` : ''} ajouté au panier.`,
      );
      window.dispatchEvent(new Event('boutique:cart-added'));
    } catch (e) {
      const failure = e as ApiFailure;
      setError(
        failure.uncertain
          ? 'L’ajout n’a pas pu être confirmé. Vérifiez votre panier avant d’ajouter à nouveau ce modèle.'
          : failure.message || 'Ajout impossible.',
      );
      if (failure.uncertain || failure.status === 409)
        void readCart().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="add-to-cart">
      <button
        type="button"
        className="button button-dark cart-add"
        disabled={busy || !valid}
        onClick={add}
        aria-describedby={helpId}
      >
        {busy ? (labels.adding ?? 'Ajout en cours…') : (labels.add ?? 'Ajouter au panier')}
        <Plus size={19} aria-hidden="true" />
      </button>
      <p id={helpId} className="commerce-caption">
        {!valid
          ? (labels.choose ?? 'Choisissez une taille pour ajouter ce modèle.')
          : (labels.note ?? 'Commande d’essai : rien n’est payé ni envoyé.')}
      </p>
      {error && (
        <p role="alert" className="commerce-error">
          {error} <a href="/panier/">{labels.check ?? 'Vérifier le panier'}</a>
        </p>
      )}
      <div className="cart-added" role="status" aria-live="polite">
        {status && (
          <>
            <p>
              <Check size={16} aria-hidden="true" /> {status}
            </p>
            <a href="/panier/">
              Préparer mon panier <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function Steps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="commerce-steps" aria-label="Votre parcours d’essai">
      {['L’équipement', 'L’essai', 'Le reçu'].map((label, i) => (
        <li
          key={label}
          className={
            current === i + 1
              ? 'is-current'
              : current > i + 1
                ? 'is-complete'
                : ''
          }
          aria-current={current === i + 1 ? 'step' : undefined}
        >
          <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

type Delivery = 'relay' | 'home';
type PaymentOutcome = 'approved' | 'declined';
type CheckoutPayload = {
  name: string;
  email: string;
  delivery: Delivery;
  paymentOutcome: PaymentOutcome;
  consent: true;
  quotedTotal: number;
  quotedRevision: number;
  website: string;
};
type Attempt = {
  key: string;
  payload: CheckoutPayload;
  fingerprint: string;
  state: 'pending' | 'uncertain' | 'resolved';
};
type CheckoutResponse = {
  id: string;
  status: 'simulated_paid' | 'simulated_declined';
  emailStatus: string;
};

// Display estimate only. Checkout must always validate the quote against the
// server's shippingFor(), which remains authoritative.
function shippingEstimate(subtotal: number, delivery: Delivery) {
  return delivery === 'home' ? 890 : subtotal >= 6900 ? 0 : 690;
}

function EmailStatus({ status, email }: { status: string; email?: string }) {
  const messages: Record<string, { label: string; detail: string }> = {
    pending: {
      label: 'Reçu en attente d’envoi',
      detail:
        'Votre reçu est enregistré. Il peut déjà être téléchargé ci-dessous.',
    },
    queued: {
      label: 'Reçu en attente d’envoi',
      detail:
        'Votre reçu est enregistré. Il peut déjà être téléchargé ci-dessous.',
    },
    sending: {
      label: 'Transmission en cours',
      detail:
        'Le service d’envoi traite la demande. La réception dans votre boîte n’est pas encore confirmée.',
    },
    unconfigured: {
      label: 'E-mail pas encore disponible',
      detail:
        'Le service d’envoi reste à configurer. Conservez votre reçu en le téléchargeant.',
    },
    accepted: {
      label: 'Reçu transmis au service d’envoi',
      detail: `Le service a accepté l’e-mail${email ? ` destiné à ${email}` : ''}. Cela ne confirme pas encore son arrivée dans votre boîte.`,
    },
    unconfirmed: {
      label: 'Envoi à vérifier',
      detail:
        'La réponse du service d’envoi n’a pas été confirmée. L’équipe doit vérifier son journal avant un nouvel envoi.',
    },
    failed: {
      label: 'E-mail non transmis',
      detail:
        'Le service d’envoi a refusé la demande. Votre reçu reste enregistré et téléchargeable.',
    },
    not_applicable: {
      label: 'Aucun reçu à envoyer',
      detail: 'La tentative de paiement simulé a été refusée.',
    },
  };
  const value = messages[status] ?? {
    label: 'Statut e-mail à vérifier',
    detail: 'Le reçu enregistré reste disponible au téléchargement.',
  };
  return (
    <div className={`receipt-email status-${status}`}>
      <strong>{value.label}</strong>
      <p>{value.detail}</p>
    </div>
  );
}

export function CartPage() {
  const {
    cart,
    error: cartError,
    loading,
    busy: cartBusyNow,
    refresh,
  } = useCart();
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [delivery, setDelivery] = useState<Delivery>('relay');
  const [paymentOutcome, setPaymentOutcome] =
    useState<PaymentOutcome>('approved');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [declinedId, setDeclinedId] = useState('');
  const attempt = useRef<Attempt | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const busyRef = useRef(false);
  const fieldId = useId();
  const shipping = cart ? shippingEstimate(cart.subtotal, delivery) : 0;
  const total = (cart?.subtotal ?? 0) + shipping;
  const locked = busy || uncertain;

  function moveTo(next: 1 | 2) {
    setStep(next);
    setError('');
    setAnnouncement('');
    requestAnimationFrame(() => {
      heading.current?.focus();
      heading.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
  }

  async function updateLine(line: CartLine, quantity: number) {
    if (cartBusyNow || locked) return;
    setError('');
    try {
      await mutateCart({
        action: 'update',
        productId: line.productId,
        variant: line.variant,
        quantity,
      });
      attempt.current = null;
      setAnnouncement(
        quantity === 0
          ? `${line.name} retiré du panier.`
          : `${line.name} : quantité ${quantity}.`,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'La quantité n’a pas pu être modifiée.',
      );
    }
  }

  async function submit(event?: SyntheticEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busyRef.current || cartBusyNow) return;
    if (
      !uncertain &&
      (!cart?.items.length || !consent || !form.current?.reportValidity())
    )
      return;
    let current = attempt.current;
    if (!uncertain) {
      const payload: CheckoutPayload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        delivery,
        paymentOutcome,
        consent: true,
        quotedTotal: total,
        quotedRevision: cart!.revision,
        website,
      };
      const fingerprint = JSON.stringify(payload);
      // Keep the same key on an exact repeat, including a resolved decline.
      // Change it only for a new payload after a definite completed response.
      if (
        !current ||
        (current.state === 'resolved' && current.fingerprint !== fingerprint)
      ) {
        current = {
          key: crypto.randomUUID(),
          payload,
          fingerprint,
          state: 'pending',
        };
      }
    }
    if (!current) return;
    current.state = 'pending';
    attempt.current = current;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setDeclinedId('');
    try {
      const result = await request<CheckoutResponse>('checkout', {
        ...current.payload,
        idempotencyKey: current.key,
      });
      if (
        !result.id ||
        !['simulated_paid', 'simulated_declined'].includes(result.status)
      ) {
        throw Object.assign(
          new Error('La réponse de votre tentative doit être vérifiée.'),
          {
            uncertain: true,
          },
        ) as ApiFailure;
      }
      current.state = 'resolved';
      setUncertain(false);
      if (result.status === 'simulated_paid') {
        cartRevision++;
        publishCart({
          items: [],
          subtotal: 0,
          notices: [],
          revision: current.payload.quotedRevision + 1,
        });
        window.location.assign(receiptPath(result.id));
        return;
      }
      setDeclinedId(result.id);
      setAnnouncement(
        'Paiement d’essai refusé, comme demandé. Votre panier est conservé. Sélectionnez « Paiement approuvé » pour tester le reçu.',
      );
    } catch (e) {
      const failure = e as ApiFailure;
      if (failure.uncertain) {
        current.state = 'uncertain';
        setUncertain(true);
        setError(
          'La réponse n’a pas été confirmée. Reprenez cette même tentative : ses coordonnées, son montant et sa référence restent inchangés.',
        );
      } else {
        current.state = 'resolved';
        setUncertain(false);
        setError(
          failure.message ||
            'La tentative n’a pas abouti. Vérifiez vos informations.',
        );
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="commerce-page cart-page">
      <header className="commerce-heading">
        <p className="eyebrow">Le banc de préparation</p>
        <h1 ref={heading} tabIndex={-1}>
          {step === 1 ? (
            <>
              Tout pour
              <br />
              votre séance.
            </>
          ) : (
            <>
              Le dernier
              <br />
              essai.
            </>
          )}
        </h1>
        <p>
          {step === 1
            ? 'Ajustez les quantités, puis essayez le parcours jusqu’au reçu.'
            : 'Choisissez un scénario et vérifiez le récapitulatif. Votre adresse e-mail sert à recevoir le reçu de simulation.'}
        </p>
        <span className="simulation-stamp">
          Simulation · Aucun débit · Aucune expédition
        </span>
      </header>
      <Steps current={step} />
      <noscript>
        <p>
          Le panier nécessite JavaScript. Vous pouvez continuer à
          consulter <a href={CATALOGUE}>tous les équipements</a> et leurs
          caractéristiques.
        </p>
      </noscript>
      <div className="commerce-announcement" role="status" aria-live="polite">
        {announcement}
      </div>
      {(error || cartError) && (
        <div className="commerce-error" role="alert">
          <p>{error || cartError}</p>
          {!locked && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setError('');
                void refresh();
              }}
            >
              Recharger le panier <RefreshCw size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {!cart && loading && (
        <div className="cart-loading" role="status">
          <span className="eyebrow">Votre équipement se rassemble</span>
          <p>Chargement du panier enregistré…</p>
        </div>
      )}

      {cart && cart.items.length === 0 && !uncertain && (
        <div className="cart-empty">
          <ShoppingBag size={42} strokeWidth={1.2} aria-hidden="true" />
          <h2>Le banc est libre.</h2>
          <p>
            Commencez par les pièces dont vous avez besoin pour votre prochaine
            séance.
          </p>
          <a className="button button-dark" href={CATALOGUE}>
            Choisir mon équipement <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </div>
      )}

      {cart && (cart.items.length > 0 || uncertain) && (
        <>
          {cart.notices.length > 0 && (
            <div className="commerce-notices" role="status">
              <p>
                <strong>Le catalogue a évolué.</strong>
              </p>
              <ul>
                {cart.notices.map((notice, i) => (
                  <li key={`${i}-${notice}`}>{notice}</li>
                ))}
              </ul>
              <p>Vérifiez les références ci-dessous avant de poursuivre.</p>
              {cart.items[0] && (
                <button
                  type="button"
                  className="text-button"
                  disabled={cartBusyNow || locked}
                  onClick={() =>
                    void updateLine(cart.items[0], cart.items[0].quantity)
                  }
                >
                  Confirmer cette sélection actualisée{' '}
                  <Check size={15} aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          <div className={`cart-layout step-${step}`}>
            <div className="cart-main">
              {step === 1 ? (
                <>
                  <div className="cart-section-title">
                    <h2>Votre sélection</h2>
                    <span>
                      {cart.items.reduce((sum, item) => sum + item.quantity, 0)}{' '}
                      article(s)
                    </span>
                  </div>
                  <ul
                    className="cart-lines"
                    aria-label="Articles de votre panier"
                  >
                    {cart.items.map((line, index) => (
                      <li
                        className="cart-line"
                        key={`${line.productId}:${line.variant}`}
                      >
                        <span className="cart-line-index" aria-hidden="true">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <a
                          className="cart-line-image"
                          href={`/produits/${line.slug}/`}
                          tabIndex={-1}
                          aria-hidden="true"
                        >
                          <img
                            src={line.image}
                            alt=""
                            width={180}
                            height={180}
                            loading="lazy"
                          />
                        </a>
                        <div className="cart-line-detail">
                          <a
                            href={`/produits/${line.slug}/`}
                            className="cart-line-name"
                          >
                            {line.name}
                          </a>
                          <p>
                            {line.variant || 'Taille unique'}{' '}
                            <span aria-hidden="true">·</span>{' '}
                            {money(line.price)} / unité
                          </p>
                          <div className="cart-line-actions">
                            <div
                              className="cart-quantity"
                              role="group"
                              aria-label={`Quantité pour ${line.name}${line.variant ? `, ${line.variant}` : ''}`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  void updateLine(line, line.quantity - 1)
                                }
                                disabled={
                                  cartBusyNow || locked || line.quantity <= 1
                                }
                                aria-label={`Diminuer la quantité de ${line.name}`}
                              >
                                <Minus size={16} aria-hidden="true" />
                              </button>
                              <span
                                className="cart-quantity-value"
                                aria-label={`Quantité : ${line.quantity}`}
                              >
                                {line.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  void updateLine(line, line.quantity + 1)
                                }
                                disabled={
                                  cartBusyNow || locked || line.quantity >= 10
                                }
                                aria-label={`Augmenter la quantité de ${line.name}`}
                              >
                                <Plus size={16} aria-hidden="true" />
                              </button>
                            </div>
                            <button
                              type="button"
                              className="cart-remove"
                              disabled={cartBusyNow || locked}
                              onClick={() => void updateLine(line, 0)}
                              aria-label={`Retirer ${line.name}${line.variant ? `, ${line.variant}` : ''}`}
                            >
                              <Trash2 size={15} aria-hidden="true" />
                              <span>Retirer</span>
                            </button>
                          </div>
                        </div>
                        <strong className="cart-line-total">
                          {money(line.price * line.quantity)}
                        </strong>
                      </li>
                    ))}
                  </ul>
                  <a href={CATALOGUE} className="text-button cart-continue">
                    <ArrowLeft size={16} aria-hidden="true" /> Compléter mon
                    équipement
                  </a>
                </>
              ) : (
                <form
                  ref={form}
                  className="checkout-form"
                  id={`${fieldId}-checkout`}
                  onSubmit={submit}
                >
                  <fieldset disabled={locked} className="checkout-fields">
                    <legend>
                      <span>01</span> Le reçu, à votre nom
                    </legend>
                    <label htmlFor={`${fieldId}-name`}>
                      Nom et prénom
                      <input
                        id={`${fieldId}-name`}
                        name="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        minLength={2}
                        maxLength={100}
                        autoComplete="name"
                      />
                    </label>
                    <label htmlFor={`${fieldId}-email`}>
                      Adresse e-mail
                      <input
                        id={`${fieldId}-email`}
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        maxLength={254}
                        autoComplete="email"
                        inputMode="email"
                        aria-describedby={`${fieldId}-email-note`}
                      />
                    </label>
                    <p
                      className="commerce-caption"
                      id={`${fieldId}-email-note`}
                    >
                      Le reçu sera destiné à cette adresse. Les détails de
                      l’envoi seront indiqués après la simulation.
                    </p>
                    <label className="honeypot" aria-hidden="true">
                      Laisser vide
                      <input
                        name="website"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        tabIndex={-1}
                        autoComplete="off"
                      />
                    </label>
                  </fieldset>
                  <fieldset disabled={locked} className="checkout-fields">
                    <legend id={`${fieldId}-delivery-label`}>
                      <span>02</span> La livraison à essayer
                    </legend>
                    <RadioGroup
                      name="delivery"
                      value={delivery}
                      onValueChange={(value) => setDelivery(value as Delivery)}
                      disabled={locked}
                      aria-labelledby={`${fieldId}-delivery-label`}
                      className="commerce-choice-group"
                    >
                      <label
                        className={`commerce-choice ${delivery === 'relay' ? 'is-selected' : ''}`}
                        htmlFor={`${fieldId}-relay`}
                      >
                        <RadioGroupItem id={`${fieldId}-relay`} value="relay" />
                        <span>
                          <strong>Point relais</strong>
                          <small>
                            Estimation offerte dès 69 € d’équipement.
                          </small>
                        </span>
                        <b>{money(shippingEstimate(cart.subtotal, 'relay'))}</b>
                      </label>
                      <label
                        className={`commerce-choice ${delivery === 'home' ? 'is-selected' : ''}`}
                        htmlFor={`${fieldId}-home`}
                      >
                        <RadioGroupItem id={`${fieldId}-home`} value="home" />
                        <span>
                          <strong>À domicile</strong>
                          <small>Essai du calcul des frais de livraison.</small>
                        </span>
                        <b>{money(890)}</b>
                      </label>
                    </RadioGroup>
                    <p className="commerce-caption">
                      Aucune adresse postale n’est demandée : cet essai ne
                      déclenche aucune expédition. Les frais réels, notamment
                      pour le matériel lourd, restent à confirmer.
                    </p>
                  </fieldset>
                  <fieldset disabled={locked} className="checkout-fields">
                    <legend id={`${fieldId}-payment-label`}>
                      <span>03</span> Le scénario de paiement
                    </legend>
                    <RadioGroup
                      name="paymentOutcome"
                      value={paymentOutcome}
                      onValueChange={(value) =>
                        setPaymentOutcome(value as PaymentOutcome)
                      }
                      disabled={locked}
                      aria-labelledby={`${fieldId}-payment-label`}
                      className="commerce-choice-group payment-choices"
                    >
                      <label
                        className={`commerce-choice ${paymentOutcome === 'approved' ? 'is-selected' : ''}`}
                        htmlFor={`${fieldId}-approved`}
                      >
                        <RadioGroupItem
                          id={`${fieldId}-approved`}
                          value="approved"
                        />
                        <span>
                          <strong>Paiement approuvé</strong>
                          <small>Créer une commande d’essai et son reçu.</small>
                        </span>
                        <span className="choice-code" aria-hidden="true">
                          OK
                        </span>
                      </label>
                      <label
                        className={`commerce-choice ${paymentOutcome === 'declined' ? 'is-selected' : ''}`}
                        htmlFor={`${fieldId}-declined`}
                      >
                        <RadioGroupItem
                          id={`${fieldId}-declined`}
                          value="declined"
                        />
                        <span>
                          <strong>Paiement refusé</strong>
                          <small>
                            Tester le refus en conservant votre panier.
                          </small>
                        </span>
                        <span className="choice-code" aria-hidden="true">
                          TEST
                        </span>
                      </label>
                    </RadioGroup>
                    <p className="commerce-caption">
                      Aucune carte bancaire ni coordonnée de paiement ne sont
                      utilisées.
                    </p>
                  </fieldset>
                  <label
                    className="simulation-consent"
                    htmlFor={`${fieldId}-consent`}
                  >
                    <input
                      id={`${fieldId}-consent`}
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      required
                      disabled={locked}
                    />
                    <span>
                      Je confirme qu’il s’agit d’une simulation : aucun débit,
                      aucune réservation de stock et aucune expédition.
                    </span>
                  </label>
                  <p className="commerce-caption">
                    Vos coordonnées servent à ce parcours et à son reçu.{' '}
                    <a href="/confidentialite/">Données personnelles</a>.
                  </p>
                </form>
              )}
            </div>

            <aside
              className="cart-summary"
              aria-label="Récapitulatif du panier"
            >
              <p className="eyebrow">Votre commande</p>
              <h2>Votre récapitulatif.</h2>
              {step === 2 && (
                <ul className="checkout-mini-lines">
                  {cart.items.map((line) => (
                    <li key={`${line.productId}:${line.variant}`}>
                      <span>
                        {line.quantity} × {line.name}
                        <small>{line.variant}</small>
                      </span>
                      <strong>{money(line.quantity * line.price)}</strong>
                    </li>
                  ))}
                </ul>
              )}
              <dl className="commerce-totals">
                <div>
                  <dt>Équipement</dt>
                  <dd>{money(cart.subtotal)}</dd>
                </div>
                <div>
                  <dt>
                    Livraison simulée
                    <small>
                      {delivery === 'relay' ? 'Point relais' : 'À domicile'}
                    </small>
                  </dt>
                  <dd>{money(shipping)}</dd>
                </div>
                <div className="commerce-total">
                  <dt>Total simulé</dt>
                  <dd>{money(total)}</dd>
                </div>
              </dl>
              <p className="commerce-caption">
                Prix prévus à l’ouverture des ventes. Le montant est vérifié à
                la validation.
              </p>
              {step === 1 ? (
                <button
                  type="button"
                  className="button button-dark"
                  disabled={
                    cartBusyNow ||
                    loading ||
                    !cart.items.length ||
                    cart.notices.length > 0
                  }
                  onClick={() => moveTo(2)}
                >
                  Essayer le parcours{' '}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </button>
              ) : (
                <>
                  {uncertain ? (
                    <div className="checkout-uncertain">
                      <p>
                        <strong>Une seule tentative à reprendre.</strong>
                      </p>
                      <p>
                        Vos choix restent verrouillés pendant la vérification
                        pour éviter une deuxième commande.
                      </p>
                      <button
                        type="button"
                        className="button button-dark"
                        disabled={busy}
                        onClick={() => void submit()}
                      >
                        {busy
                          ? 'Vérification en cours…'
                          : 'Reprendre la même tentative'}
                        <RefreshCw size={17} aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      form={`${fieldId}-checkout`}
                      className="button button-dark"
                      disabled={
                        busy ||
                        cartBusyNow ||
                        !consent ||
                        !cart.items.length ||
                        cart.notices.length > 0
                      }
                    >
                      {busy
                        ? 'Simulation en cours…'
                        : paymentOutcome === 'approved'
                          ? 'Simuler et créer le reçu'
                          : 'Tester le paiement refusé'}
                      <ArrowUpRight size={18} aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-button"
                    disabled={locked}
                    onClick={() => moveTo(1)}
                  >
                    <ArrowLeft size={15} aria-hidden="true" /> Modifier mon
                    équipement
                  </button>
                </>
              )}
              <p className="simulation-zero">
                <strong>0 €</strong>
                <span>réellement débités</span>
              </p>
              {declinedId && (
                <p className="commerce-caption">
                  Tentative refusée enregistrée : {declinedId.slice(0, 8)}.
                  Aucun reçu de paiement n’est créé pour un refus.
                </p>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

type PublicOrder = Omit<
  Order,
  'cart_id' | 'idempotency_key' | 'fingerprint' | 'lines'
> & {
  lines: CartLine[];
};

export function ReceiptPage({ id }: { id: string }) {
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const result = await request<{ order: PublicOrder }>(
        `receipt?id=${encodeURIComponent(id)}`,
      );
      if (mounted.current) setOrder(result.order);
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : 'Reçu indisponible.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [id]);
  useEffect(() => {
    mounted.current = true;
    void request<{ order: PublicOrder }>('receipt?id=' + encodeURIComponent(id))
      .then((result) => {
        if (mounted.current) setOrder(result.order);
      })
      .catch((e) => {
        if (mounted.current)
          setError(e instanceof Error ? e.message : 'Reçu indisponible.');
      })
      .finally(() => {
        if (mounted.current) setBusy(false);
      });
    return () => {
      mounted.current = false;
    };
  }, [refresh, id]);

  return (
    <div className="commerce-page receipt-page">
      <header className="commerce-heading print-hide">
        <p className="eyebrow">L’équipement, prêt sur le papier</p>
        <h1>
          Votre séance
          <br />
          prend forme.
        </h1>
        <p>Voici le récapitulatif enregistré de votre commande d’essai.</p>
        <span className="simulation-stamp">
          Simulation · Aucun débit · Aucune expédition
        </span>
      </header>
      <div className="print-hide">
        <Steps current={3} />
      </div>
      {busy && !order && <p role="status">Chargement de votre reçu protégé…</p>}
      {error && (
        <div className="commerce-error print-hide" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => void refresh()}
          >
            Réessayer <RefreshCw size={16} aria-hidden="true" />
          </button>
          <p className="commerce-caption">
            Ce reçu est accessible depuis le navigateur de la simulation ou par
            l’administrateur. Un lien seul ne donne pas accès à vos coordonnées.
          </p>
        </div>
      )}
      {order && (
        <div className="receipt-layout">
          <article className="receipt-paper" aria-labelledby="receipt-title">
            <div className="receipt-masthead">
              <span className="receipt-wordmark">
                BOUTIQUE
                <br />
                DE BOXE.
              </span>
              <span className="receipt-reference">
                ESSAI / {order.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <p className="receipt-disclosure">
              SIMULATION — AUCUN DÉBIT — AUCUNE EXPÉDITION
            </p>
            <h2 id="receipt-title">
              Reçu de votre
              <br />
              commande d’essai.
            </h2>
            <div className="receipt-meta">
              <div>
                <span>Préparé pour</span>
                <strong>{order.name}</strong>
                <p>{order.email}</p>
              </div>
              <div>
                <span>Enregistré le</span>
                <strong>
                  {new Date(order.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'Europe/Paris',
                  })}
                </strong>
                <p>
                  {new Date(order.created_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Paris',
                  })}{' '}
                  · heure de Paris
                </p>
              </div>
            </div>
            <table className="receipt-table">
              <caption className="sr-only">
                Équipement et montants simulés
              </caption>
              <thead>
                <tr>
                  <th scope="col">Équipement</th>
                  <th scope="col">Montant</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <tr key={`${line.productId}:${line.variant}`}>
                    <td>
                      <strong>{line.name}</strong>
                      <span>
                        {line.variant || 'Taille unique'} · {line.quantity} ×{' '}
                        {money(line.price)}
                      </span>
                    </td>
                    <td>{money(line.quantity * line.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="commerce-totals">
              <div>
                <dt>Sous-total</dt>
                <dd>{money(order.subtotal)}</dd>
              </div>
              <div>
                <dt>
                  Livraison simulée
                  <small>
                    {order.delivery === 'home' ? 'À domicile' : 'Point relais'}
                  </small>
                </dt>
                <dd>{money(order.shipping)}</dd>
              </div>
              <div className="commerce-total">
                <dt>Total simulé</dt>
                <dd>{money(order.total)}</dd>
              </div>
            </dl>
            <p className="receipt-paid">
              <Check size={18} aria-hidden="true" />
              <span>
                Paiement d’essai approuvé.
                <br />
                <strong>Montant réellement débité : 0 €.</strong>
              </span>
            </p>
            <footer className="receipt-fineprint">
              <p>
                Ce document n’est ni une facture ni une preuve d’achat. Les prix
                et frais de livraison sont ceux prévus à l’ouverture. Aucun
                article n’est réservé ni expédié.
              </p>
              <p>
                Référence complète : <span>{order.id}</span>
              </p>
            </footer>
          </article>
          <aside
            className="receipt-tools print-hide"
            aria-label="Conserver votre reçu"
          >
            <p className="eyebrow">La trace de votre essai</p>
            <h2>
              À garder.
              <br />À vérifier.
            </h2>
            <EmailStatus status={order.email_status} email={order.email} />
            <a
              className="button button-dark"
              href={downloadPath(order.id)}
              download
            >
              Télécharger le reçu <Download size={18} aria-hidden="true" />
            </a>
            <button
              type="button"
              className="button button-light"
              onClick={() => window.print()}
            >
              Imprimer le reçu <Printer size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => void refresh()}
            >
              {busy ? 'Vérification…' : 'Actualiser le statut e-mail'}
              <RefreshCw size={15} aria-hidden="true" />
            </button>
            <p className="commerce-caption">
              Le téléchargement contient vos coordonnées et les détails de cet
              essai. Conservez-le dans un espace personnel.
            </p>
            <a className="text-button" href={CATALOGUE}>
              Retour à l’équipement{' '}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </aside>
        </div>
      )}
    </div>
  );
}

type AdminOrder = Pick<
  Order,
  | 'id'
  | 'name'
  | 'email'
  | 'total'
  | 'delivery'
  | 'status'
  | 'created_at'
  | 'email_status'
  | 'email_attempts'
  | 'email_error'
>;
const emailLabels: Record<string, string> = {
  pending: 'En attente',
  queued: 'En attente',
  unconfigured: 'À configurer',
  sending: 'En cours',
  accepted: 'Accepté par le service',
  unconfirmed: 'À vérifier',
  failed: 'Refusé par le service',
  not_applicable: 'Sans reçu',
};

export function OrdersAdmin() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const mounted = useRef(false);
  const searchId = useId();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request<{ orders: AdminOrder[] }>('admin-orders');
      if (mounted.current) setOrders(data.orders);
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : 'Commandes indisponibles.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void request<{ orders: AdminOrder[] }>('admin-orders')
      .then((result) => {
        if (mounted.current) setOrders(result.orders);
      })
      .catch((e) => {
        if (mounted.current)
          setError(e instanceof Error ? e.message : 'Commandes indisponibles.');
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  async function retry(order: AdminOrder) {
    if (
      sending ||
      order.status !== 'simulated_paid' ||
      !['pending', 'unconfigured', 'failed'].includes(order.email_status)
    )
      return;
    setSending(order.id);
    setStatus('');
    setError('');
    try {
      await request<{ ok: boolean }>('admin-email', { id: order.id });
      setStatus(
        `Demande traitée pour ${order.id.slice(0, 8)}. Le statut ci-dessous indique la réponse du service, pas la réception dans la boîte.`,
      );
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'La demande d’envoi n’a pas pu être confirmée.',
      );
    } finally {
      setSending('');
    }
  }

  const normalized = query.trim().toLocaleLowerCase('fr');
  const filtered =
    orders?.filter(
      (order) =>
        (!normalized ||
          `${order.id} ${order.name} ${order.email}`
            .toLocaleLowerCase('fr')
            .includes(normalized)) &&
        (filter === 'all' ||
          (filter === 'attention'
            ? ['unconfigured', 'failed', 'unconfirmed'].includes(
                order.email_status,
              )
            : order.status === filter)),
    ) ?? [];

  return (
    <section className="orders-admin" aria-labelledby="orders-title">
      <header className="orders-heading">
        <div>
          <p className="eyebrow">Parcours de démonstration</p>
          <h2 id="orders-title">Commandes & reçus.</h2>
          <p>
            Chaque ligne correspond à un essai enregistré. Aucun chiffre
            ci-dessous n’est un encaissement.
          </p>
        </div>
        <button
          type="button"
          className="text-button"
          disabled={loading || !!sending}
          onClick={() => void refresh()}
        >
          {loading ? 'Chargement…' : 'Actualiser'}
          <RefreshCw size={16} aria-hidden="true" />
        </button>
      </header>
      <div className="orders-controls">
        <label htmlFor={`${searchId}-query`}>
          Rechercher
          <input
            id={`${searchId}-query`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Référence, nom ou e-mail"
          />
        </label>
        <label htmlFor={`${searchId}-filter`}>
          Afficher
          <select
            id={`${searchId}-filter`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Toutes les tentatives</option>
            <option value="simulated_paid">Paiements d’essai approuvés</option>
            <option value="simulated_declined">
              Paiements d’essai refusés
            </option>
            <option value="attention">E-mails à traiter</option>
          </select>
        </label>
      </div>
      {error && (
        <p className="commerce-error" role="alert">
          {error}
        </p>
      )}
      <p className="commerce-announcement" role="status" aria-live="polite">
        {status}
      </p>
      {!orders && loading && (
        <p role="status">Chargement des commandes d’essai…</p>
      )}
      {orders && (
        <>
          <p className="commerce-caption">
            {filtered.length} résultat(s) parmi les {orders.length} dernières
            tentatives chargées. Affichage limité à 300 enregistrements.
          </p>
          {filtered.length === 0 ? (
            <p className="orders-empty">
              {orders.length
                ? 'Aucune tentative ne correspond à ces critères.'
                : 'Aucune commande d’essai enregistrée.'}
            </p>
          ) : (
            <ul className="orders-list">
              {filtered.map((order) => {
                const canRetry =
                  order.status === 'simulated_paid' &&
                  ['pending', 'unconfigured', 'failed'].includes(
                    order.email_status,
                  );
                return (
                  <li key={order.id} className="order-row">
                    <div className="order-identity">
                      <span className="order-reference">
                        {order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <h3>{order.name}</h3>
                      <p>{order.email}</p>
                      <time dateTime={order.created_at}>
                        {new Date(order.created_at).toLocaleString('fr-FR', {
                          timeZone: 'Europe/Paris',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · Paris
                      </time>
                    </div>
                    <div className="order-amount">
                      <strong>{money(order.total)}</strong>
                      <span>Montant simulé</span>
                      <p>
                        {order.status === 'simulated_paid'
                          ? 'Essai approuvé'
                          : 'Essai refusé'}{' '}
                        · {order.delivery === 'home' ? 'Domicile' : 'Relais'}
                      </p>
                    </div>
                    <div className="order-delivery">
                      <span
                        className={`order-email-status status-${order.email_status}`}
                      >
                        {emailLabels[order.email_status] ?? order.email_status}
                      </span>
                      <p>{order.email_attempts} tentative(s) d’envoi</p>
                      {order.email_error && (
                        <p className="order-email-error">{order.email_error}</p>
                      )}
                      {order.email_status === 'unconfirmed' && (
                        <p className="commerce-caption">
                          Vérifier le journal du prestataire avant tout nouvel
                          envoi.
                        </p>
                      )}
                    </div>
                    <div className="order-actions">
                      {order.status === 'simulated_paid' && (
                        <>
                          <a
                            className="text-button"
                            href={receiptPath(order.id)}
                          >
                            Ouvrir le reçu{' '}
                            <ArrowUpRight size={15} aria-hidden="true" />
                          </a>
                          <a
                            className="text-button"
                            href={downloadPath(order.id)}
                            download
                          >
                            Télécharger{' '}
                            <Download size={15} aria-hidden="true" />
                          </a>
                        </>
                      )}
                      {canRetry && (
                        <button
                          type="button"
                          className="button button-dark"
                          disabled={!!sending}
                          onClick={() => void retry(order)}
                        >
                          {sending === order.id
                            ? 'Demande en cours…'
                            : 'Relancer l’envoi'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
