import { after } from 'next/server';
import { db, runtime, isAdmin, readCatalog } from './database';
import { cartToken, resolveCart, shippingFor, uuid, type CartLine } from './commerce';
import {
  createPayplug,
  payplugSettings,
  PayplugError,
  type PayplugBinding,
  type ProviderMode,
} from './payplug';
import { shop, money, lourdDuCatalogue } from './catalog';
import { suspicion } from './alerts';
import { clientIp } from './request';
import { validateRelayPoint, relayLabel, type RelayPoint } from './boxtal';
import { mailerConfigured, sendMail } from './mailer';

/**
 * Commandes payées par PayPlug (13/10/2026, ouverture des ventes).
 *
 * Une tentative de paiement EST la commande : lignes, montants, coordonnées et livraison y sont figés
 * au moment où le client part payer. Le montant vient toujours du catalogue côté serveur (resolveCart),
 * jamais du navigateur ; PayPlug reçoit ce total, et chaque retour est revérifié par un GET authentifié
 * (une notification ne prouve rien par elle-même). Le passage à « paid » est monotone ; les e-mails
 * de commande partent une seule fois, réclamés par `notified_at`.
 *
 * Public : `create` (quand shop.ventesOuvertes et COMMERCE_MODE=payplug_live, ou payplug_test hors
 * production) et `status` (par l'identifiant UUID de la tentative, sans adresse ni identifiant PayPlug).
 * Réservé à l'équipe : `settings`, `reconcile`, et le mode test en production.
 */

type Attempt = {
  id: string;
  cart_id: string;
  request_key: string;
  fingerprint: string;
  cart_revision: number;
  mode: ProviderMode;
  name: string;
  email: string;
  billing: string;
  lines: string;
  subtotal: number;
  shipping: number;
  total: number;
  delivery: string;
  provider_id: string | null;
  payment_url: string | null;
  status: string;
  error: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  refunded_cents: number;
  notified_at?: string | null;
  notify_error?: string | null;
  notify_claim?: string | null;
  client_sent_at?: string | null;
  shop_sent_at?: string | null;
};
/** Le numéro de commande montré au client, sur PayPlug et dans les e-mails. */
export const reference = (id: string) => 'BDB-' + id.slice(0, 8).toUpperCase();
type Stored = {
  first_name: string;
  last_name: string;
  email: string;
  address1: string;
  address2?: string;
  postcode: string;
  city: string;
  country: 'FR';
  phone?: string;
  relay?: RelayPoint | null;
  optin?: boolean;
  /** Version des CGV acceptées et heure de l'acceptation (preuve du consentement). */
  cgvVersion?: string;
  cgvAt?: string;
};
const stored = (a: Attempt): Partial<Stored> => {
  try {
    return JSON.parse(a.billing) as Partial<Stored>;
  } catch {
    return {};
  }
};
const linesOf = (a: Attempt): CartLine[] => {
  try {
    return JSON.parse(a.lines) as CartLine[];
  } catch {
    return [];
  }
};
let columnsReady = false;
/** Colonnes ajoutées sans migration manuelle, au premier passage (même principe que lib/clients.ts). */
async function ensureColumns() {
  if (columnsReady) return;
  const database = await db();
  await database.prepare('ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS notified_at text').run();
  await database.prepare('ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS notify_error text').run();
  for (const column of ['notify_claim', 'client_sent_at', 'shop_sent_at'])
    await database.prepare(`ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS ${column} text`).run();
  columnsReady = true;
}
const sellingMode = (mode: string | undefined): mode is ProviderMode =>
  mode === 'payplug_live' || mode === 'payplug_test';
/** Paiement public : ventes ouvertes et vrai paiement ; le mode test ne s'ouvre au public qu'en local. */
const publicSale = (mode: string | undefined) =>
  shop.ventesOuvertes &&
  (mode === 'payplug_live' || (mode === 'payplug_test' && process.env.NODE_ENV !== 'production'));
/** Limite par adresse IP et par heure, sur la table rate_limits commune aux autres formulaires. */
async function tooMany(request: Request, scope: string, max: number) {
  const bucket = Math.floor(Date.now() / 3600000);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${clientIp(request)}:${bucket}:payplug:${scope}`),
  );
  const key = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  const hits = await (await db())
    .prepare(
      'INSERT INTO rate_limits(key,hits,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=rate_limits.hits+1 RETURNING hits',
    )
    .bind(key, (bucket + 2) * 3600000)
    .first<number>('hits');
  return (hits || 0) > max;
}
const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
function binding(a: Attempt): PayplugBinding {
  return {
    orderId: a.id,
    attemptId: a.id,
    amountCents: a.total,
    currency: 'EUR',
    mode: a.mode,
  };
}
function safe(a: Attempt) {
  return {
    id: a.id,
    reference: reference(a.id),
    status: a.status,
    total: a.total,
    providerId: a.provider_id,
    paymentUrl: a.status === 'pending' ? a.payment_url : null,
    error: a.error,
    createdAt: a.created_at,
    paidAt: a.paid_at,
    refundedCents: a.refunded_cents,
    mode: a.mode,
  };
}
/** Ce que voit le client qui revient de PayPlug : ni adresse, ni identifiant PayPlug, ni journal. */
function publicView(a: Attempt) {
  return {
    id: a.id,
    reference: reference(a.id),
    status: a.status,
    subtotal: a.subtotal,
    shipping: a.shipping,
    total: a.total,
    delivery: a.delivery,
    firstName: stored(a).first_name || '',
    lines: linesOf(a).map(({ name, variant, quantity, price }) => ({ name, variant, quantity, price })),
    paymentUrl: a.status === 'pending' ? a.payment_url : null,
    createdAt: a.created_at,
    paidAt: a.paid_at,
    mode: a.mode,
  };
}
async function byId(id: string) {
  return (await db())
    .prepare('SELECT * FROM payment_attempts WHERE id=?')
    .bind(id)
    .first<Attempt>();
}
async function boundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Demande vide.');
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16000) {
      await reader.cancel();
      throw new Error('Demande trop longue.');
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('Demande invalide.');
  return data;
}
async function applyVerified(
  a: Attempt,
  payment: Awaited<
    ReturnType<ReturnType<typeof createPayplug>['retrieveAndVerifyPayment']>
  >,
) {
  const database = await db(),
    now = new Date().toISOString();
  // Paid is monotonic. A cancelled browser return and a delayed unpaid IPN cannot undo settlement.
  await database.batch([
    database
      .prepare(
        "UPDATE payment_attempts SET provider_id=?,payment_url=?,status=CASE WHEN refunded_cents>0 OR ?>0 THEN 'unconfirmed' WHEN ?='unconfirmed' THEN 'unconfirmed' WHEN status='paid' THEN 'paid' ELSE ? END,refunded_cents=CASE WHEN refunded_cents>? THEN refunded_cents ELSE ? END,paid_at=COALESCE(paid_at,?),error=CASE WHEN refunded_cents>0 OR ?>0 THEN 'Remboursement signalé : vérifier le portail PayPlug.' ELSE ? END,updated_at=? WHERE id=? AND (provider_id IS NULL OR provider_id=?)",
      )
      .bind(
        payment.id,
        payment.paymentUrl,
        payment.refundedAmountCents,
        payment.state,
        payment.state,
        payment.refundedAmountCents,
        payment.refundedAmountCents,
        payment.paidAt ? new Date(payment.paidAt * 1000).toISOString() : null,
        payment.refundedAmountCents,
        payment.failureCode || null,
        now,
        a.id,
        payment.id,
      ),
    database
      .prepare(
        "UPDATE carts SET payload='[]',revision=revision+1,updated_at=? WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM payment_attempts WHERE id=? AND status='paid')",
      )
      .bind(now, a.cart_id, a.cart_revision, a.id),
  ]);
  return (await byId(a.id))!;
}
async function reconcile(a: Attempt) {
  if (!a.provider_id) return a;
  return applyVerified(
    a,
    await createPayplug(await runtime()).retrieveAndVerifyPayment(
      a.provider_id,
      binding(a),
    ),
  );
}
/** Dernière relecture PayPlug par commande (par instance) : la page de retour ne peut pas marteler l'API. */
const lastCheck = new Map<string, number>();
export async function payplugGet(request: Request, action: string) {
  if (action === 'status') {
    const id = new URL(request.url).searchParams.get('id');
    if (!uuid(id)) return reply({ error: 'Référence invalide.' }, 400);
    await ensureColumns();
    const a = await byId(id);
    if (!a) return reply({ error: 'Commande introuvable.' }, 404);
    const admin = await isAdmin();
    let current = a;
    let warning: string | undefined;
    // Le retour du navigateur ne prouve rien : on relit PayPlug côté serveur. Pour le public, au plus
    // une fois toutes les 3 secondes par commande et tant que l'issue n'est pas acquise ; pour
    // l'équipe, à chaque lecture (un remboursement fait dans le portail doit apparaître).
    const last = lastCheck.get(a.id) || 0;
    if (
      a.provider_id &&
      (admin || (['pending', 'unconfirmed'].includes(a.status) && Date.now() - last > 3000))
    ) {
      lastCheck.set(a.id, Date.now());
      if (lastCheck.size > 500) lastCheck.delete(lastCheck.keys().next().value!);
      try {
        current = await reconcile(a);
      } catch {
        warning = 'La confirmation de PayPlug n’a pas pu être relue. Réessayez dans un instant.';
      }
    }
    if (current.status === 'paid' && !current.notified_at) after(() => notifyPaid(current.id));
    return reply({ attempt: admin ? safe(current) : publicView(current), ...(warning ? { warning } : {}) });
  }
  if (!(await isAdmin())) return reply({ error: 'Accès réservé.' }, 403);
  if (action === 'settings') {
    await ensureColumns();
    const database = await db();
    // An interrupted create can already exist at the provider. Never reopen it for creation.
    await database
      .prepare(
        "UPDATE payment_attempts SET status='unconfirmed',error='Création interrompue : vérifier PayPlug avant toute nouvelle tentative.',updated_at=? WHERE status='creating' AND updated_at<?",
      )
      .bind(
        new Date().toISOString(),
        new Date(Date.now() - 120000).toISOString(),
      )
      .run();
    // Une notification perdue et un client qui ferme l'onglet laisseraient une commande payée « en attente » :
    // l'ouverture des réglages relit chez PayPlug les commandes encore ouvertes des trois derniers jours.
    const open = await database
      .prepare("SELECT * FROM payment_attempts WHERE status IN ('pending','unconfirmed') AND provider_id IS NOT NULL AND created_at>? ORDER BY created_at DESC LIMIT 8")
      .bind(new Date(Date.now() - 3 * 86400000).toISOString())
      .all<Attempt>();
    for (const a of open.results) await reconcile(a).catch(() => undefined);
    const attempts = await database
      .prepare('SELECT * FROM payment_attempts ORDER BY created_at DESC LIMIT 100')
      .all<Attempt>();
    // Une commande payée dont les e-mails n'ont pas pu partir est retentée à chaque ouverture des réglages.
    for (const a of attempts.results.filter((x) => x.status === 'paid' && !x.notified_at).slice(0, 5))
      after(() => notifyPaid(a.id));
    return reply({
      settings: payplugSettings(await runtime()),
      mail: mailerConfigured(),
      attempts: attempts.results.map((a) => ({
        ...safe(a),
        name: a.name,
        email: a.email,
        subtotal: a.subtotal,
        shipping: a.shipping,
        delivery: a.delivery,
        customer: stored(a),
        lines: linesOf(a),
        notifiedAt: a.notified_at || null,
        notifyError: a.notify_error || null,
        clientSentAt: a.client_sent_at || null,
        shopSentAt: a.shop_sent_at || null,
      })),
    });
  }
  return reply({ error: 'Ressource introuvable.' }, 404);
}
export async function payplugPost(request: Request, action: string) {
  const env = await runtime();
  if (action === 'ipn') {
    // En simulation, aucune notification n'est attendue ni acceptée.
    if (!sellingMode(env.COMMERCE_MODE))
      return reply({ error: 'Paiements suspendus : notification à représenter.' }, 503);
    if (!request.headers.get('content-type')?.includes('application/json'))
      return reply({ error: 'Format invalide.' }, 400);
    let data;
    try {
      data = await boundedBody(request);
    } catch {
      return reply({ error: 'Notification invalide.' }, 400);
    }
    if (typeof data.id !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(data.id))
      return reply({ received: true, ignored: true });
    await ensureColumns();
    const database = await db();
    let a = await database
      .prepare('SELECT * FROM payment_attempts WHERE provider_id=?')
      .bind(data.id)
      .first<Attempt>();
    // Metadata is only a lookup hint; the authenticated API response must verify the full binding.
    const hint = new URL(request.url).searchParams.get('attempt');
    if (!a && uuid(hint)) a = await byId(hint);
    if (!a)
      return reply(
        { error: 'Association en cours ; notification à représenter.' },
        503,
      );
    try {
      const adapter = createPayplug(env);
      const verified = a.provider_id
        ? await adapter.verifyNotification(data, binding(a), a.provider_id)
        : await adapter.retrieveAndVerifyPayment(data.id, binding(a));
      const updated = await applyVerified(a, verified);
      if (updated.status === 'paid' && !updated.notified_at) after(() => notifyPaid(updated.id));
      return reply({ received: true });
    } catch (error) {
      return reply(
        { error: 'Notification non vérifiée.' },
        error instanceof PayplugError &&
          [
            'verification_failed',
            'invalid_notification',
            'invalid_input',
          ].includes(error.code)
          ? 400
          : 503,
      );
    }
  }
  if (
    request.headers.get('origin') !== new URL(request.url).origin ||
    !request.headers.get('content-type')?.includes('application/json')
  )
    return reply({ error: 'Origine ou format invalide.' }, 400);
  const admin = await isAdmin();
  // Commande publique : seulement quand les ventes sont ouvertes et le vrai paiement branché.
  if (!admin && (action !== 'create' || !publicSale(env.COMMERCE_MODE)))
    return reply(
      {
        error: shop.ventesOuvertes
          ? 'Le paiement en ligne est momentanément indisponible. Votre panier est conservé.'
          : 'Les ventes ne sont pas encore ouvertes.',
      },
      shop.ventesOuvertes ? 409 : 403,
    );
  if (!sellingMode(env.COMMERCE_MODE))
    return reply(
      { error: 'Le paiement en ligne est momentanément indisponible. Votre panier est conservé.' },
      409,
    );
  let data;
  try {
    data = await boundedBody(request);
  } catch {
    return reply({ error: 'Demande invalide.' }, 400);
  }
  if (action === 'reconcile') {
    if (!admin) return reply({ error: 'Accès réservé.' }, 403);
    if (!uuid(data.id)) return reply({ error: 'Référence invalide.' }, 400);
    const a = await byId(data.id);
    if (!a) return reply({ error: 'Tentative introuvable.' }, 404);
    // A portal-discovered ID may reconcile an interrupted create; it can never create another payment.
    const id = a.provider_id || data.paymentId;
    if (typeof id !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(id))
      return reply(
        { error: 'Indiquez l’identifiant PayPlug relevé dans le portail.' },
        400,
      );
    try {
      const updated = await applyVerified(
        a,
        await createPayplug(env).retrieveAndVerifyPayment(id, binding(a)),
      );
      if (updated.status === 'paid' && !updated.notified_at) after(() => notifyPaid(updated.id));
      return reply({ attempt: safe(updated) });
    } catch (error) {
      if (!(error instanceof PayplugError)) console.error('PayPlug reconcile: erreur interne', (error as Error)?.message);
      return reply(
        {
          error:
            'Le paiement ne correspond pas à cette tentative, ou PayPlug est indisponible.',
        },
        409,
      );
    }
  }
  if (action !== 'create')
    return reply({ error: 'Ressource introuvable.' }, 404);
  // Pot de miel : un humain ne voit pas ce champ. Le robot est noté au journal, rien n'est enregistré.
  if (typeof data.website === 'string' && data.website.trim()) {
    console.warn('payplug create: pot de miel rempli');
    return reply({ error: 'Demande invalide.' }, 400);
  }
  if (await tooMany(request, 'create', 12))
    return reply({ error: 'Trop de tentatives. Réessayez dans une heure, ou écrivez-nous.' }, 429);
  const token = cartToken(request);
  if (
    !token ||
    !uuid(data.requestKey) ||
    // Le « test » de l'atelier n'existe qu'en mode test : en live, même l'équipe accepte les CGV.
    !(data.cgv === true || (admin && env.COMMERCE_MODE === 'payplug_test' && data.testConsent === true)) ||
    !Number.isSafeInteger(data.quotedTotal) ||
    !Number.isSafeInteger(data.quotedRevision)
  )
    return reply(
      { error: 'Acceptez les conditions générales de vente pour commander.' },
      400,
    );
  const delivery = data.delivery === undefined ? 'home' : data.delivery;
  if (delivery !== 'home' && delivery !== 'relay')
    return reply({ error: 'Choisissez le mode de livraison.' }, 400);
  if (data.relay !== undefined && (delivery !== 'relay' || !validateRelayPoint(data.relay)))
    return reply({ error: 'Le point relais envoyé est incomplet. Choisissez-le à nouveau sur la carte.' }, 400);
  const relay = delivery === 'relay' && data.relay !== undefined ? validateRelayPoint(data.relay) : null;
  const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
  if (phone && !/^[+0-9 ().-]{6,30}$/.test(phone))
    return reply({ error: 'Vérifiez le numéro de téléphone.' }, 400);
  const b = data.billing;
  const valid = (s: unknown, min: number, max: number) =>
    typeof s === 'string' &&
    s.trim().length >= min &&
    s.length <= max &&
    !s.split('').some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);
  if (
    !b ||
    typeof b !== 'object' ||
    !valid(b.first_name, 1, 80) ||
    !valid(b.last_name, 1, 80) ||
    !valid(b.email, 5, 254) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email) ||
    !valid(b.address1, 3, 150) ||
    (b.address2 !== undefined && b.address2 !== '' && !valid(b.address2, 1, 150)) ||
    !valid(b.city, 2, 100) ||
    typeof b.postcode !== 'string' ||
    !/^\d{5}$/.test(b.postcode) ||
    b.country !== 'FR'
  )
    return reply(
      { error: 'Vérifiez vos coordonnées (adresse en France métropolitaine).' },
      400,
    );
  // France métropolitaine continentale : la Corse (20…), l'outre-mer (97…) et Monaco (98…) sont sur demande.
  if (/^(?:20|97|98)/.test(b.postcode))
    return reply(
      { error: 'La livraison en ligne couvre la France continentale. Pour la Corse ou l’outre-mer, écrivez-nous : nous vous faisons une proposition.' },
      400,
    );
  const address2 = typeof b.address2 === 'string' ? b.address2.trim() : '';
  const billing = {
    first_name: b.first_name.trim(),
    last_name: b.last_name.trim(),
    email: b.email.trim().toLowerCase(),
    address1: b.address1.trim(),
    ...(address2 ? { address2 } : {}),
    city: b.city.trim(),
    postcode: b.postcode,
    country: 'FR' as const,
    language: 'fr' as const,
  };
  // Adresse de robot (lib/alerts.ts) : refusée, rien n'entre au back-office.
  if (suspicion(billing.email)) {
    console.warn('payplug create: adresse de robot refusée');
    return reply({ error: 'Vérifiez votre adresse e-mail.' }, 400);
  }
  const optin = data.optin === true;
  const fingerprint = JSON.stringify([
    billing,
    data.quotedTotal,
    data.quotedRevision,
    delivery,
    relay,
    phone,
    optin,
  ]);
  const database = await db();
  await ensureColumns();
  const previous = await database
    .prepare('SELECT * FROM payment_attempts WHERE cart_id=? AND request_key=?')
    .bind(token, data.requestKey)
    .first<Attempt>();
  if (previous) {
    if (previous.fingerprint !== fingerprint)
      return reply({ error: 'Cette tentative correspond à un autre contenu.' }, 409);
    // Même clé, même contenu : jamais un second paiement pour cette clé. Une création restée incertaine
    // avec un identifiant PayPlug se relit (le client reprend le vrai paiement). Une tentative morte —
    // refusée par PayPlug, ou incertaine sans aucun paiement PayPlug connu — ne peut plus être payée :
    // son lien n'a jamais été remis au client. Le client tire alors une nouvelle clé (restart) et la
    // nouvelle tentative passe par les contrôles ci-dessous (relecture, abandon, révision du panier).
    let current = previous;
    if (current.provider_id && (current.status === 'creating' || current.status === 'unconfirmed')) {
      try {
        current = await reconcile(current);
      } catch {
        /* PayPlug injoignable : l'état connu est rendu, le client pourra réessayer */
      }
    }
    const preparing = current.status === 'creating' && Date.now() - Date.parse(current.updated_at) < 120000;
    if (
      current.status === 'failed' ||
      (!current.provider_id && !preparing && (current.status === 'creating' || current.status === 'unconfirmed'))
    )
      return reply(
        { restart: true, error: 'Le paiement précédent n’a pas abouti. Un nouveau paiement est préparé pour la même commande.' },
        409,
      );
    return reply({ attempt: admin ? safe(current) : publicView(current) });
  }
  const catalog = await readCatalog();
  const cart = await resolveCart(token, catalog),
    shipping = shippingFor(cart.subtotal, delivery),
    total = cart.subtotal + shipping;
  if (
    !cart.items.length ||
    cart.notices.length ||
    data.quotedRevision !== cart.revision ||
    data.quotedTotal !== total
  )
    return reply(
      { error: 'Le panier a changé. Vérifiez le montant et les références.' },
      409,
    );
  // Matériel lourd : sur devis (décision du 13/10/2026), jamais au tarif d'un colis ordinaire. La règle
  // se juge sur la fiche du catalogue (rayon, type), pas sur le seul nom de la ligne.
  const lourds = cart.items.filter((line) => lourdDuCatalogue(line, catalog));
  if (lourds.length)
    return reply(
      {
        error: `Livraison sur devis pour ${lourds.map((l) => l.name).join(', ')} : retirez ${lourds.length > 1 ? 'ces modèles' : 'ce modèle'} du panier pour payer le reste, et écrivez-nous pour le devis.`,
        heavy: lourds.map((l) => l.productId),
      },
      409,
    );
  if (total < 30 || total > 2000000)
    return reply(
      { error: 'Le total doit être compris entre 0,30 € et 20 000 €.' },
      400,
    );
  // Resolve configuration before reserving the cart; this performs no network request.
  const adapter = createPayplug(env);
  const settings = payplugSettings(env);
  if (settings.issues.length) {
    console.error('payplug create: configuration', settings.issues.join(','));
    return reply(
      {
        error: 'Le paiement en ligne est momentanément indisponible. Votre panier est conservé.',
        ...(admin ? { issues: settings.issues } : {}),
      },
      409,
    );
  }
  // Un même panier ne se paie qu'une fois (unicité panier + révision). Pour que le client puisse
  // réessayer, la tentative qui tient le panier est libérée seulement si elle ne peut plus être payée :
  // refusée (carte refusée, expirée, abandonnée), ou sans lien de paiement jamais remis au client.
  // Une tentative encore payable est relue chez PayPlug, puis abandonnée chez PayPlug (PATCH aborted)
  // avant toute nouvelle tentative : jamais deux paiements ouverts pour un panier.
  // Un paiement encore ouvert sur une AUTRE révision du même panier (onglet PayPlug resté ouvert, puis
  // panier modifié) est relu puis abandonné chez PayPlug avant d'en ouvrir un nouveau : jamais deux
  // paiements payables pour un panier. S'il ne peut pas être abandonné, rien n'est créé.
  const others = await database
    .prepare(
      "SELECT * FROM payment_attempts WHERE cart_id=? AND cart_revision<>? AND status IN ('pending','unconfirmed') AND provider_id IS NOT NULL ORDER BY created_at DESC LIMIT 5",
    )
    .bind(token, cart.revision)
    .all<Attempt>();
  for (const other of others.results) {
    let fresh: Attempt | null;
    try {
      fresh = await reconcile(other);
      if (fresh.status === 'pending' && fresh.payment_url)
        fresh = await applyVerified(
          fresh,
          await adapter.abortAndVerifyPayment(fresh.provider_id!, binding(fresh)),
        );
    } catch {
      fresh = null;
    }
    if (!fresh)
      return reply({ error: 'Un paiement précédent de ce panier n’a pas pu être vérifié. Réessayez dans un instant.' }, 409);
    if (fresh.status === 'paid')
      return reply(
        {
          error: `Ce panier vient d’être payé : commande ${reference(fresh.id)}. Rechargez le panier avant de commander à nouveau, ou écrivez-nous.`,
        },
        409,
      );
    if (fresh.status === 'pending' && fresh.payment_url)
      return reply({ error: 'Un paiement est encore ouvert pour ce panier dans une autre fenêtre : réessayez dans quelques minutes.' }, 409);
  }
  let revision = cart.revision;
  const holder = await database
    .prepare('SELECT * FROM payment_attempts WHERE cart_id=? AND cart_revision=?')
    .bind(token, cart.revision)
    .first<Attempt>();
  if (holder && holder.status !== 'paid') {
    const young = holder.status === 'creating' && Date.now() - Date.parse(holder.updated_at) < 120000;
    if (young) return reply({ error: 'Un paiement est en cours de préparation pour ce panier. Patientez quelques secondes.' }, 409);
    let fresh: Attempt | null = holder;
    if (holder.provider_id) {
      try {
        fresh = await reconcile(holder);
        if (fresh.status === 'pending' && fresh.fingerprint === fingerprint && fresh.payment_url)
          return reply({ attempt: admin ? safe(fresh) : publicView(fresh) });
        if (fresh.status === 'pending' && fresh.payment_url)
          fresh = await applyVerified(
            fresh,
            await createPayplug(env).abortAndVerifyPayment(fresh.provider_id!, binding(fresh)),
          );
      } catch {
        fresh = null;
      }
    }
    if (!fresh)
      return reply({ error: 'Le paiement précédent n’a pas pu être vérifié. Réessayez dans un instant.' }, 409);
    if (fresh.status === 'paid') return reply({ attempt: admin ? safe(fresh) : publicView(fresh) });
    const payable = fresh.status === 'pending' && Boolean(fresh.payment_url);
    if (payable)
      return reply({ error: 'Un paiement est encore ouvert pour ce panier : reprenez-le, ou réessayez dans quelques minutes.' }, 409);
    const bumped = await database
      .prepare('UPDATE carts SET revision=revision+1,updated_at=? WHERE id=? AND revision=? RETURNING revision')
      .bind(new Date().toISOString(), token, cart.revision)
      .first<number>('revision');
    if (!bumped) return reply({ error: 'Le panier a changé pendant la préparation.' }, 409);
    revision = bumped;
  }
  const id = crypto.randomUUID(),
    now = new Date().toISOString();
  const keep: Stored = { ...billing, phone, relay, optin, cgvVersion: shop.cgvVersion, cgvAt: now };
  try {
    const row = await database
      .prepare(
        'INSERT INTO payment_attempts(id,cart_id,request_key,fingerprint,cart_revision,mode,name,email,billing,lines,subtotal,shipping,total,delivery,status,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? FROM carts WHERE id=? AND revision=? AND expires_at>? RETURNING id',
      )
      .bind(
        id,
        token,
        data.requestKey,
        fingerprint,
        revision,
        env.COMMERCE_MODE,
        billing.first_name + ' ' + billing.last_name,
        billing.email,
        JSON.stringify(keep),
        JSON.stringify(cart.items),
        cart.subtotal,
        shipping,
        total,
        delivery,
        'creating',
        now,
        now,
        token,
        revision,
        Date.now(),
      )
      .first();
    if (!row)
      return reply(
        { error: 'Le panier a changé pendant la préparation.' },
        409,
      );
  } catch {
    const raced = await database
      .prepare(
        'SELECT * FROM payment_attempts WHERE cart_id=? AND request_key=?',
      )
      .bind(token, data.requestKey)
      .first<Attempt>();
    if (raced?.fingerprint === fingerprint)
      return reply({ attempt: admin ? safe(raced) : publicView(raced) });
    return reply(
      {
        error:
          'Un paiement est déjà préparé pour ce panier. Rechargez la page pour le reprendre.',
      },
      409,
    );
  }
  const a = (await byId(id))!;
  try {
    const payment = await adapter.createHostedPayment({
      binding: binding(a),
      billing,
      reference: reference(a.id),
    });
    const created = await applyVerified(a, payment);
    return reply({ attempt: admin ? safe(created) : publicView(created) }, 201);
  } catch (error) {
    if (!(error instanceof PayplugError)) console.error('PayPlug create: erreur interne', (error as Error)?.message);
    const uncertain = !(error instanceof PayplugError) || error.ambiguous;
    const paymentId =
      error instanceof PayplugError ? error.providerPaymentId : null;
    await database
      .prepare(
        "UPDATE payment_attempts SET status=?,error=?,provider_id=COALESCE(provider_id,?),updated_at=? WHERE id=? AND status='creating'",
      )
      .bind(
        uncertain ? 'unconfirmed' : 'failed',
        uncertain
          ? 'Réponse PayPlug incertaine : vérifier le portail, sans recréer le paiement.'
          : 'PayPlug a refusé la préparation du paiement.',
        paymentId || null,
        new Date().toISOString(),
        id,
      )
      .run();
    const failed = (await byId(id))!;
    if (!uncertain)
      console.error('PayPlug create: refus', error instanceof PayplugError ? error.upstreamStatus : null);
    return reply(
      {
        attempt: admin ? safe(failed) : publicView(failed),
        ...(uncertain ? {} : { error: 'Le paiement n’a pas pu être préparé. Réessayez dans un instant, ou écrivez-nous.' }),
      },
      uncertain ? 202 : 422,
    );
  }
}

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
function deliveryText(a: Attempt) {
  const b = stored(a);
  if (a.delivery === 'relay')
    return b.relay
      ? 'En point relais : ' + relayLabel(b.relay)
      : 'En point relais, le plus proche de votre adresse : il vous est confirmé par e-mail avant l’expédition.';
  return `À domicile : ${b.address1 || ''}${b.address2 ? ', ' + b.address2 : ''}, ${b.postcode || ''} ${b.city || ''}`;
}
const RETRACTATION = [
  'Formulaire de rétractation (à renvoyer seulement si vous souhaitez vous rétracter) :',
  `À l’attention de ${shop.entity} — ${shop.name}, ${shop.address}, ${shop.email} :`,
  'Je vous notifie par la présente ma rétractation du contrat portant sur la vente du bien ci-dessous :',
  'Commandé le / reçu le :',
  'Nom du consommateur :',
  'Adresse du consommateur :',
  'Signature du consommateur (uniquement en cas de notification sur papier) :',
  'Date :',
];
function orderMail(a: Attempt, forShop: boolean, twins: string[]) {
  const b = stored(a);
  const ref = reference(a.id);
  const when = new Date(a.paid_at || a.created_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  const rows = linesOf(a).map((l) => ({
    label: `${l.quantity} × ${l.name}${l.variant ? ' — ' + l.variant : ''}`,
    amount: money(l.price * l.quantity),
  }));
  const shippingLabel = a.delivery === 'relay' ? 'Livraison en point relais' : 'Livraison à domicile';
  const test = a.mode !== 'payplug_live';
  const legal = `${shop.entity} · SIREN ${shop.siren} · ${shop.address} · ${shop.email} · ${shop.phone}`;
  const text = [
    forShop
      ? `Nouvelle commande payée ${ref}${test ? ' (paiement de TEST, aucun débit réel)' : ''}`
      : `Bonjour ${b.first_name || ''},${test ? ' (paiement de TEST : aucun débit réel)' : ''}`,
    ...(forShop && twins.length ? ['', `ATTENTION : ce même panier a déjà une commande payée (${twins.join(', ')}). Vérifier un double paiement avant d’expédier.`] : []),
    '',
    forShop
      ? `Client : ${b.first_name || ''} ${b.last_name || ''} <${a.email}>${b.phone ? ' · ' + b.phone : ''}`
      : `Votre paiement est confirmé : votre commande ${ref} est enregistrée.`,
    `Payée le ${when}${forShop ? ' · PayPlug ' + (a.provider_id || '') : ''}`,
    '',
    ...rows.map((r) => `${r.label} : ${r.amount}`),
    `${shippingLabel} : ${money(a.shipping)}`,
    `Total TTC payé : ${money(a.total)}`,
    '',
    deliveryText(a),
    '',
    forShop
      ? `Lettre d’information : ${b.optin ? 'oui' : 'non'} · CGV ${b.cgvVersion || '?'} acceptées le ${b.cgvAt || '?'}`
      : `Expédition sous ${shop.delais.expedition}, livraison au plus tard sous ${shop.delais.livraisonMax}. Vous disposez de 14 jours après réception pour vous rétracter (retour à vos frais, remboursement sous 14 jours) : ${shop.origin}/retours/ — conditions générales de vente (version du ${b.cgvVersion || shop.cgvVersion}) : ${shop.origin}/conditions-generales-de-vente/. Une question : répondez à cet e-mail.`,
    ...(forShop ? [] : ['', ...RETRACTATION]),
    '',
    `${shop.name} — ${legal}`,
  ].join('\n');
  const cell = 'padding:10px 0;border-bottom:1px solid #ddd';
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(ref)}</title></head><body style="margin:0;background:#efeee8;color:#1c211e;font:15px/1.6 Arial,sans-serif"><div style="max-width:620px;margin:0 auto;padding:32px 24px;background:#ffffff"><p style="font-weight:bold;letter-spacing:.04em;margin:0 0 24px">BOUTIQUE<br>DE BOXE.</p>${
    forShop
      ? `<h1 style="font-size:26px;line-height:1.15;margin:0 0 12px">Nouvelle commande ${esc(ref)}</h1><p style="margin:0 0 4px">${test ? '<b>Paiement de TEST : aucun débit réel, ne pas expédier.</b>' : 'Paiement réel confirmé par PayPlug.'}</p>${twins.length ? `<p style="margin:0 0 8px;color:#a01818"><b>Attention : ce même panier a déjà une commande payée (${esc(twins.join(', '))}). Vérifier un double paiement avant d’expédier.</b></p>` : ''}<p style="margin:0 0 16px">${esc(b.first_name)} ${esc(b.last_name)} · <a href="mailto:${esc(a.email)}">${esc(a.email)}</a>${b.phone ? ' · ' + esc(b.phone) : ''}</p>`
      : `<h1 style="font-size:28px;line-height:1.1;margin:0 0 12px">Merci ${esc(b.first_name)}, votre commande est confirmée.</h1><p style="margin:0 0 16px">Commande <b>${esc(ref)}</b>, payée le ${esc(when)}.${test ? ' <b>Paiement de test : aucun débit réel.</b>' : ''}</p>`
  }<table style="width:100%;border-collapse:collapse;margin:8px 0 16px">${rows
    .map((r) => `<tr><td style="${cell}">${esc(r.label)}</td><td style="${cell};text-align:right;white-space:nowrap">${esc(r.amount)}</td></tr>`)
    .join('')}<tr><td style="${cell}">${esc(shippingLabel)}</td><td style="${cell};text-align:right">${esc(money(a.shipping))}</td></tr><tr><td style="padding:12px 0;font-weight:bold">Total TTC payé</td><td style="padding:12px 0;text-align:right;font-weight:bold">${esc(money(a.total))}</td></tr></table><p style="margin:0 0 16px">${esc(deliveryText(a))}</p>${
    forShop
      ? `<p style="margin:0 0 16px">PayPlug : ${esc(a.provider_id)} · lettre d’information : ${b.optin ? 'oui' : 'non'} · CGV ${esc(b.cgvVersion || '?')} acceptées le ${esc(b.cgvAt || '?')}</p>`
      : `<p style="margin:0 0 16px">Expédition sous ${esc(shop.delais.expedition)}, livraison au plus tard sous ${esc(shop.delais.livraisonMax)}. Vous disposez de 14 jours après réception pour vous rétracter, retour à vos frais, remboursement sous 14 jours : <a href="${shop.origin}/retours/">retours et rétractation</a>. Nos <a href="${shop.origin}/conditions-generales-de-vente/">conditions générales de vente</a> (version du ${esc(b.cgvVersion || shop.cgvVersion)}) s’appliquent à cette commande. Une question : répondez simplement à cet e-mail.</p><p style="font-size:13px;color:#3d443f;margin:16px 0 0;padding:12px;border:1px solid #ddd">${RETRACTATION.map(esc).join('<br>')}</p>`
  }<p style="font-size:12px;color:#596059;margin:24px 0 0">${esc(shop.name)} — ${esc(legal)}</p></div></body></html>`;
  return {
    subject: forShop
      ? `${test ? '[TEST] ' : ''}Nouvelle commande ${ref} · ${money(a.total)}`
      : `${test ? '[TEST] ' : ''}Votre commande ${ref} est confirmée — Boutique de Boxe`,
    text,
    html,
  };
}
/**
 * Les deux e-mails d'une commande payée, une seule fois chacun : la boutique d'abord (une commande
 * payée ne doit jamais passer inaperçue), puis le client. La commande est réservée pour 5 minutes
 * (`notify_claim`) ; chaque envoi réussi est daté à part (`shop_sent_at`, `client_sent_at`) ; un échec
 * laisse la réservation expirer et la notification suivante (PayPlug, retour du client, réglages)
 * reprend là où l'envoi s'est arrêté. Resend reçoit en plus une clé d'idempotence.
 */
export async function notifyPaid(id: string) {
  try {
    await ensureColumns();
    const database = await db();
    const now = new Date().toISOString();
    const claimed = await database
      .prepare(
        "UPDATE payment_attempts SET notify_claim=? WHERE id=? AND status='paid' AND notified_at IS NULL AND (notify_claim IS NULL OR notify_claim<?) RETURNING id",
      )
      .bind(now, id, new Date(Date.now() - 5 * 60000).toISOString())
      .first();
    if (!claimed) return;
    const a = (await byId(id))!;
    try {
      if (!mailerConfigured()) throw new Error('Aucun service d’envoi configuré (RESEND_API_KEY).');
      if (!a.shop_sent_at) {
        const shopTo = (process.env.ADMIN_EMAIL || '').trim() || shop.email;
        // Deux commandes payées pour un même panier : signalées à la boutique (remboursement à étudier).
        const twins = await database
          .prepare("SELECT id FROM payment_attempts WHERE cart_id=? AND status='paid' AND id<>?")
          .bind(a.cart_id, a.id)
          .all<{ id: string }>();
        await sendMail({
          to: shopTo,
          ...orderMail(a, true, twins.results.map((t) => reference(t.id))),
          key: `commande/${a.id}/boutique`,
          transactional: true,
        });
        await database.prepare('UPDATE payment_attempts SET shop_sent_at=? WHERE id=?').bind(new Date().toISOString(), id).run();
      }
      if (!a.client_sent_at) {
        await sendMail({ to: a.email, ...orderMail(a, false, []), key: `commande/${a.id}/client`, transactional: true });
        await database.prepare('UPDATE payment_attempts SET client_sent_at=? WHERE id=?').bind(new Date().toISOString(), id).run();
      }
      await database
        .prepare('UPDATE payment_attempts SET notified_at=?, notify_error=NULL, notify_claim=NULL WHERE id=?')
        .bind(new Date().toISOString(), id)
        .run();
    } catch (error) {
      console.error('commande', reference(id), 'e-mails non partis :', (error as Error)?.message);
      await database
        .prepare('UPDATE payment_attempts SET notify_claim=NULL, notify_error=? WHERE id=?')
        .bind(String((error as Error)?.message || 'erreur').slice(0, 200), id)
        .run();
    }
  } catch (error) {
    console.error('commande', reference(id), 'notification :', (error as Error)?.message);
  }
}
