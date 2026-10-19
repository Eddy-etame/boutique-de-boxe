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
import { RelayPicker } from './relay-picker';
import { relayLabel, type RelayPoint } from '@/lib/boxtal';
import { devisHref, estLourd, money, shop } from '@/lib/catalog';
import type { CartLine, Order } from '@/lib/commerce';
// Le panier partagé (file d’attente, lecture, compteur) vit dans un petit module à part :
// le header l’utilise sur chaque page sans charger ce tunnel de commande.
import { API, mutateCart, readCart, request, useCart, type ApiFailure } from './cart-store';

const CATALOGUE = '/materiel-sport-de-combat/';
const receiptPath = (id: string) => `/recu/?id=${encodeURIComponent(id)}`;
const downloadPath = (id: string) =>
  `${API}receipt?id=${encodeURIComponent(id)}&download=1`;

function Steps({ current, labels = ['L’équipement', 'L’essai', 'Le reçu'] }: { current: 1 | 2 | 3; labels?: string[] }) {
  return (
    <ol className="commerce-steps" aria-label="Votre parcours">
      {labels.map((label, i) => (
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
// Paiement réel (13/10/2026) : le panier part chez PayPlug ; le montant est recalculé par le serveur.
type CheckoutPayload = {
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    address1: string;
    address2: string;
    postcode: string;
    city: string;
    country: 'FR';
  };
  phone: string;
  optin: boolean;
  delivery: Delivery;
  relay?: RelayPoint;
  cgv: true;
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
  attempt: { id: string; status: string; paymentUrl: string | null; reference?: string };
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

/**
 * `paiementPret` (13/10/2026) : le serveur dit si PayPlug peut encaisser (clé live posée, mode live).
 * Ventes ouvertes mais paiement pas encore branché : le panier redevient « Enregistrer mes choix »,
 * et le dit honnêtement — jamais un bouton « payer » qui échoue.
 */
export function CartPage({ paiementPret = true }: { paiementPret?: boolean }) {
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
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [delivery, setDelivery] = useState<Delivery>('relay');
  const [relay, setRelay] = useState<RelayPoint | null>(null);
  const [consent, setConsent] = useState(false);
  const [phone, setPhone] = useState('');
  const [optin, setOptin] = useState(false);
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [postcode, setPostcode] = useState('');
  const [city, setCity] = useState('');
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const attempt = useRef<Attempt | null>(null);
  // Réponses incertaines d’affilée : après deux reprises sans réponse, le formulaire se déverrouille
  // (le serveur reprend un paiement déjà préparé, il n’en crée jamais un second).
  const uncertainRuns = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const busyRef = useRef(false);
  const fieldId = useId();
  // Ventes fermées (Eddy, 29/09) : aucun paiement, pas même simulé. Le panier se termine par
  // « Enregistrer mes choix » : prénom, e-mail, mobile facultatif — un contact à prévenir à l’ouverture.
  const indisponible = shop.ventesOuvertes && !paiementPret;
  const choix = !shop.ventesOuvertes || indisponible;
  const [firstName, setFirstName] = useState('');
  const [leadPostcode, setLeadPostcode] = useState('');
  const [smsOk, setSmsOk] = useState(false);
  const [leadConsent, setLeadConsent] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const shipping = cart ? shippingEstimate(cart.subtotal, delivery) : 0;
  const total = (cart?.subtotal ?? 0) + shipping;
  // Matériel lourd (13/10/2026) : livraison sur devis, hors paiement en ligne.
  const lourds = !choix && cart ? cart.items.filter((line) => estLourd(line)) : [];
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

  async function saveChoices(event?: SyntheticEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busyRef.current || cartBusyNow || !cart?.items.length) return;
    if (!leadConsent || !form.current?.reportValidity()) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      await request<{ ok: true }>('choices', {
        firstName: firstName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        smsConsent: smsOk && phone.trim() !== '',
        postcode: leadPostcode.trim(),
        consent: true,
        quotedRevision: cart.revision,
        website,
      });
      setSaved(firstName.trim());
      setAnnouncement('Vos choix sont enregistrés.');
      requestAnimationFrame(() => heading.current?.focus());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'L’enregistrement n’a pas abouti. Réessayez.');
    } finally {
      busyRef.current = false;
      setBusy(false);
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
        billing: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          address1: address1.trim(),
          address2: address2.trim(),
          postcode: postcode.trim(),
          city: city.trim(),
          country: 'FR',
        },
        phone: phone.trim(),
        optin,
        delivery,
        ...(delivery === 'relay' && relay ? { relay } : {}),
        cgv: true,
        quotedTotal: total,
        quotedRevision: cart!.revision,
        website,
      };
      const fingerprint = JSON.stringify(payload);
      // Même clé pour une même demande : un double clic ou une reprise ne crée jamais deux paiements.
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
    try {
      let result: CheckoutResponse;
      try {
        result = await request<CheckoutResponse>('/api/payplug/create', {
          ...current.payload,
          requestKey: current.key,
        });
      } catch (e) {
        if (!(e as ApiFailure).restart) throw e;
        // La tentative précédente est morte (refusée, ou jamais remise par PayPlug) : une nouvelle clé
        // pour la même commande, sans recharger ni ressaisir. Le panier est relu : le serveur a pu en
        // changer la révision ; si le montant a bougé, le client le vérifie avant de payer.
        const fresh = await readCart();
        const payload: CheckoutPayload = {
          ...current.payload,
          quotedRevision: fresh.revision,
          quotedTotal: fresh.subtotal + shippingEstimate(fresh.subtotal, current.payload.delivery),
        };
        if (fresh.notices.length || payload.quotedTotal !== current.payload.quotedTotal)
          throw Object.assign(new Error('Le panier a changé. Vérifiez le montant et les références avant de payer.'), {
            status: 409,
          }) as ApiFailure;
        current = { key: crypto.randomUUID(), payload, fingerprint: JSON.stringify(payload), state: 'pending' };
        attempt.current = current;
        result = await request<CheckoutResponse>('/api/payplug/create', {
          ...current.payload,
          requestKey: current.key,
        });
      }
      const a = result.attempt;
      if (a?.status === 'paid') {
        window.location.assign(`/paiement-retour/?id=${encodeURIComponent(a.id)}`);
        return;
      }
      if (!a?.paymentUrl || a.status !== 'pending') {
        throw Object.assign(
          new Error('Le paiement n’a pas pu être préparé. Votre panier est conservé : réessayez.'),
          { uncertain: a?.status === 'unconfirmed' || a?.status === 'creating' },
        ) as ApiFailure;
      }
      current.state = 'resolved';
      uncertainRuns.current = 0;
      setUncertain(false);
      setAnnouncement('Ouverture de la page de paiement sécurisée…');
      // La page de paiement PayPlug (secure.payplug.com) : la carte n’est jamais saisie sur ce site.
      window.location.assign(a.paymentUrl);
      return;
    } catch (e) {
      const failure = e as ApiFailure;
      if (failure.uncertain && ++uncertainRuns.current >= 3) {
        // Deux reprises sans réponse : le client n’est plus enfermé. Même contenu = même clé (le
        // serveur rend l’état réel) ; contenu modifié = nouvelle tentative, l’ancienne est relue d’abord.
        current.state = 'resolved';
        uncertainRuns.current = 0;
        setUncertain(false);
        setError(
          'PayPlug ne confirme toujours pas. Réessayez dans un instant ou modifiez votre commande : un paiement déjà préparé est repris, jamais doublé.',
        );
      } else if (failure.uncertain) {
        current.state = 'uncertain';
        setUncertain(true);
        setError(
          'La réponse n’a pas été confirmée. Reprenez cette même commande : ses coordonnées, son montant et sa référence restent inchangés, et aucun second paiement n’est créé.',
        );
      } else {
        current.state = 'resolved';
        uncertainRuns.current = 0;
        setUncertain(false);
        if (failure.status === 409) void readCart().catch(() => undefined);
        setError(
          failure.message ||
            'La commande n’a pas abouti. Vérifiez vos informations.',
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
          {saved !== null ? (
            <>
              C’est
              <br />
              enregistré.
            </>
          ) : step === 1 ? (
            <>
              Tout pour
              <br />
              votre séance.
            </>
          ) : choix ? (
            <>
              Vos choix,
              <br />
              gardés.
            </>
          ) : (
            <>
              La livraison,
              <br />
              puis le paiement.
            </>
          )}
        </h1>
        <p>
          {indisponible
            ? step === 1 && saved === null
              ? 'Le paiement en ligne est momentanément indisponible. Enregistrez vos choix : on vous écrit dès qu’il est rétabli, votre panier vous attend.'
              : 'Aucun paiement pour l’instant : vos choix sont gardés, on vous écrit dès que le paiement en ligne est rétabli.'
            : choix
            ? step === 1 && saved === null
              ? 'Ajustez les quantités, puis enregistrez vos choix : on vous prévient le jour de l’ouverture des ventes.'
              : 'Aucun paiement : les ventes ne sont pas encore ouvertes. Vos choix sont gardés pour ce jour-là.'
            : step === 1
              ? 'Ajustez les quantités, puis passez à la livraison et au paiement.'
              : 'Vos coordonnées, la livraison, puis le paiement par carte sur la page sécurisée de PayPlug. La confirmation arrive par e-mail.'}
        </p>
        <span className="simulation-stamp">
          {indisponible ? 'Paiement en ligne momentanément indisponible' : choix ? `Ventes le ${shop.ouverture.court} · Aucun paiement` : 'Paiement sécurisé · Carte bancaire · PayPlug'}
        </span>
      </header>
      <Steps current={saved !== null ? 3 : step} labels={choix ? ['L’équipement', 'Vos coordonnées', 'C’est enregistré'] : ['L’équipement', 'La livraison', 'Le paiement']} />
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

      {saved !== null && (
        <div className="cart-empty cart-saved">
          <Check size={42} strokeWidth={1.2} aria-hidden="true" />
          <h2>{saved ? `Merci ${saved}, vos choix sont gardés.` : 'Vos choix sont gardés.'}</h2>
          <p>
            {indisponible ? 'Dès que le paiement en ligne est rétabli, un e-mail vous le dira' : 'Le jour de l’ouverture des ventes, un e-mail vous le dira'}{phone.trim() && smsOk ? ', et un SMS' : ''}. Votre panier reste ici, prêt pour ce jour-là.
          </p>
          <a className="button button-dark" href={CATALOGUE}>
            Continuer à choisir <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </div>
      )}

      {saved === null && !cart && loading && (
        <div className="cart-loading" role="status">
          <span className="eyebrow">Votre équipement se rassemble</span>
          <p>Chargement du panier enregistré…</p>
        </div>
      )}

      {saved === null && cart && cart.items.length === 0 && !uncertain && (
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

      {saved === null && cart && (cart.items.length > 0 || uncertain) && (
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
                  {lourds.length > 0 && (
                    <div className="commerce-notices" role="status">
                      <p>
                        <strong>Livraison sur devis : {lourds.map((l) => l.name).join(', ')}.</strong>
                      </p>
                      <p>
                        Le matériel lourd ou encombrant ne se paie pas en ligne : retirez-le pour payer le
                        reste, et <a href={devisHref}>écrivez-nous</a> pour recevoir le devis de livraison.
                      </p>
                    </div>
                  )}
                  <a href={CATALOGUE} className="text-button cart-continue">
                    <ArrowLeft size={16} aria-hidden="true" /> Compléter mon
                    équipement
                  </a>
                </>
              ) : choix ? (
                <form ref={form} className="checkout-form" id={`${fieldId}-checkout`} onSubmit={saveChoices}>
                  <fieldset disabled={busy} className="checkout-fields">
                    <legend>
                      <span>01</span> Pour vous prévenir à l’ouverture
                    </legend>
                    <label htmlFor={`${fieldId}-prenom`}>
                      Prénom
                      <input
                        id={`${fieldId}-prenom`}
                        name="given-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        minLength={2}
                        maxLength={60}
                        autoComplete="given-name"
                      />
                    </label>
                    <label htmlFor={`${fieldId}-email-choix`}>
                      Adresse e-mail
                      <input
                        id={`${fieldId}-email-choix`}
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        maxLength={254}
                        autoComplete="email"
                      />
                    </label>
                    <div className="checkout-row">
                      <label htmlFor={`${fieldId}-tel-choix`}>
                        Mobile <small>facultatif</small>
                        <input
                          id={`${fieldId}-tel-choix`}
                          name="tel"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          maxLength={30}
                          pattern="[+0-9 ().\-]*"
                          autoComplete="tel"
                        />
                      </label>
                      <label htmlFor={`${fieldId}-cp-choix`}>
                        Code postal <small>facultatif</small>
                        <input
                          id={`${fieldId}-cp-choix`}
                          name="postal-code"
                          value={leadPostcode}
                          onChange={(e) => setLeadPostcode(e.target.value)}
                          inputMode="numeric"
                          pattern="[0-9]{5}"
                          maxLength={5}
                          autoComplete="postal-code"
                        />
                      </label>
                    </div>
                    {phone.trim() !== '' && (
                      <label className="simulation-consent checkout-optin" htmlFor={`${fieldId}-sms-choix`}>
                        <input id={`${fieldId}-sms-choix`} type="checkbox" checked={smsOk} onChange={(e) => setSmsOk(e.target.checked)} />
                        <span>Un SMS le jour de l’ouverture, et rien d’autre.</span>
                      </label>
                    )}
                    <label className="honeypot" aria-hidden="true">
                      Laisser vide
                      <input name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" />
                    </label>
                  </fieldset>
                  <label className="simulation-consent" htmlFor={`${fieldId}-accord-choix`}>
                    <input
                      id={`${fieldId}-accord-choix`}
                      type="checkbox"
                      checked={leadConsent}
                      onChange={(e) => setLeadConsent(e.target.checked)}
                      required
                    />
                    <span>
                      {indisponible ? 'J’accepte que Boutique de Boxe garde ces choix et m’écrive dès que le paiement en ligne est rétabli.' : 'J’accepte que Boutique de Boxe garde ces choix et me prévienne de l’ouverture des ventes.'} Un lien de désinscription dans chaque message.
                    </span>
                  </label>
                  <p className="commerce-caption">
                    Aucun paiement, aucune réservation de stock.{' '}
                    <a href="/confidentialite/">Données personnelles</a>.
                  </p>
                </form>
              ) : (
                <form
                  ref={form}
                  className="checkout-form"
                  id={`${fieldId}-checkout`}
                  onSubmit={submit}
                >
                  <fieldset disabled={locked} className="checkout-fields">
                    <legend>
                      <span>01</span> Vos coordonnées et l’adresse de livraison
                    </legend>
                    <div className="checkout-row">
                      <label htmlFor={`${fieldId}-given`}>
                        Prénom
                        <input
                          id={`${fieldId}-given`}
                          name="given-name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          maxLength={80}
                          autoComplete="given-name"
                        />
                      </label>
                      <label htmlFor={`${fieldId}-family`}>
                        Nom
                        <input
                          id={`${fieldId}-family`}
                          name="family-name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          maxLength={80}
                          autoComplete="family-name"
                        />
                      </label>
                    </div>
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
                      La confirmation de commande, puis l’avis d’expédition,
                      partent à cette adresse.
                    </p>
                    <label htmlFor={`${fieldId}-phone`}>
                      Téléphone <small>(facultatif, pour la livraison)</small>
                      <input
                        id={`${fieldId}-phone`}
                        name="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        maxLength={30}
                        pattern="[+0-9 ().-]*"
                        autoComplete="tel"
                        inputMode="tel"
                      />
                    </label>
                    <label htmlFor={`${fieldId}-address1`}>
                      Adresse
                      <input
                        id={`${fieldId}-address1`}
                        name="address1"
                        value={address1}
                        onChange={(e) => setAddress1(e.target.value)}
                        required
                        minLength={3}
                        maxLength={150}
                        autoComplete="address-line1"
                      />
                    </label>
                    <label htmlFor={`${fieldId}-address2`}>
                      Complément <small>(bâtiment, étage, facultatif)</small>
                      <input
                        id={`${fieldId}-address2`}
                        name="address2"
                        value={address2}
                        onChange={(e) => setAddress2(e.target.value)}
                        maxLength={150}
                        autoComplete="address-line2"
                      />
                    </label>
                    <div className="checkout-row">
                      <label htmlFor={`${fieldId}-postcode`}>
                        Code postal
                        <input
                          id={`${fieldId}-postcode`}
                          name="postcode"
                          value={postcode}
                          onChange={(e) => setPostcode(e.target.value)}
                          required
                          pattern="[0-9]{5}"
                          inputMode="numeric"
                          maxLength={5}
                          autoComplete="postal-code"
                        />
                      </label>
                      <label htmlFor={`${fieldId}-city`}>
                        Ville
                        <input
                          id={`${fieldId}-city`}
                          name="city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          required
                          minLength={2}
                          maxLength={100}
                          autoComplete="address-level2"
                        />
                      </label>
                    </div>
                    <p className="commerce-caption">Livraison en France continentale. Corse et outre-mer : <a href="/contact/">sur demande</a>.</p>
                    <label className="simulation-consent checkout-optin" htmlFor={`${fieldId}-optin`}>
                      <input
                        id={`${fieldId}-optin`}
                        type="checkbox"
                        checked={optin}
                        onChange={(e) => setOptin(e.target.checked)}
                        disabled={locked}
                      />
                      <span>
                        Recevoir par e-mail les nouveautés et les offres de la boutique. Un lien de désinscription dans chaque message.
                      </span>
                    </label>
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
                      <span>02</span> La livraison
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
                            Offerte dès 69 € d’équipement.
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
                          <small>Remise en main propre à votre adresse.</small>
                        </span>
                        <b>{money(890)}</b>
                      </label>
                    </RadioGroup>
                    {delivery === 'relay' && <RelayPicker postcode={postcode} city={city} value={relay} onChange={setRelay} disabled={locked} />}
                    {delivery === 'relay' && !relay && (
                      <p className="commerce-caption">
                        Sans point choisi sur la carte, le point relais le plus proche de votre adresse vous est confirmé par e-mail avant l’expédition.
                      </p>
                    )}
                  </fieldset>
                  <fieldset disabled={locked} className="checkout-fields">
                    <legend>
                      <span>03</span> Le paiement
                    </legend>
                    <p className="commerce-caption">
                      Par carte bancaire (CB, Visa, Mastercard), sur la page sécurisée de notre
                      prestataire de paiement PayPlug : vos données de carte ne transitent jamais
                      par ce site. Le paiement est débité à la validation ; la commande est
                      confirmée par e-mail.
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
                      J’ai lu et j’accepte les{' '}
                      <a href="/conditions-generales-de-vente/" target="_blank" rel="noopener">conditions générales de vente</a>,
                      dont le droit de rétractation de 14 jours.
                    </span>
                  </label>
                  <p className="commerce-caption">
                    Vos coordonnées servent à traiter et livrer la commande.{' '}
                    <a href="/confidentialite/">Données personnelles</a>.
                  </p>
                </form>
              )}
            </div>

            <aside
              className="cart-summary"
              aria-label="Récapitulatif du panier"
            >
              <p className="eyebrow">{choix ? 'Vos choix' : 'Votre commande'}</p>
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
                {!choix && (
                <div>
                  <dt>
                    Livraison
                    <small>
                      {delivery === 'relay' ? (relay ? 'Point relais · ' + relay.name : 'Point relais') : 'À domicile'}
                    </small>
                  </dt>
                  <dd>{money(shipping)}</dd>
                </div>
                )}
                {!choix && (
                <div className="commerce-total">
                  <dt>Total TTC</dt>
                  <dd>{money(total)}</dd>
                </div>
                )}
              </dl>
              <p className="commerce-caption">
                {choix ? 'Prix de vente.' : 'Prix TTC. Le montant est recalculé et vérifié à la validation.'}
              </p>
              {step === 1 ? (
                <button
                  type="button"
                  className="button button-dark"
                  disabled={
                    cartBusyNow ||
                    loading ||
                    !cart.items.length ||
                    cart.notices.length > 0 ||
                    lourds.length > 0
                  }
                  onClick={() => moveTo(2)}
                >
                  {choix ? 'Enregistrer mes choix' : 'Passer à la livraison'}{' '}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </button>
              ) : (
                <>
                  {choix ? (
                    <button
                      type="submit"
                      form={`${fieldId}-checkout`}
                      className="button button-dark"
                      disabled={busy || cartBusyNow || !leadConsent || !cart.items.length || cart.notices.length > 0}
                    >
                      {busy ? 'Enregistrement…' : 'Enregistrer mes choix'}
                      <ArrowUpRight size={18} aria-hidden="true" />
                    </button>
                  ) : uncertain ? (
                    <div className="checkout-uncertain">
                      <p>
                        <strong>Une seule commande à reprendre.</strong>
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
                          : 'Reprendre la même commande'}
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
                      {busy ? 'Préparation du paiement…' : `Commander et payer ${money(total)}`}
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
              {!choix && step === 2 && (
                <p className="commerce-caption">
                  Commande avec obligation de paiement. Le bouton ouvre la page de paiement sécurisée.
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
  relay?: RelayPoint | null;
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
                    {order.delivery === 'home' ? 'À domicile' : order.relay ? 'Point relais · ' + relayLabel(order.relay) : 'Point relais'}
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
              Télécharger le reçu (PDF) <Download size={18} aria-hidden="true" />
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
              Le PDF contient vos coordonnées et les détails de cet essai.
              Conservez-le dans un espace personnel.
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
