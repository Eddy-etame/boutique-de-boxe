import { db, runtime, isAdmin } from './database';
import { cartToken, resolveCart, shippingFor, uuid } from './commerce';
import {
  createPayplug,
  payplugSettings,
  PayplugError,
  type PayplugBinding,
} from './payplug';

type Attempt = {
  id: string;
  cart_id: string;
  request_key: string;
  fingerprint: string;
  cart_revision: number;
  mode: 'payplug_test';
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
};
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
        "UPDATE payment_attempts SET provider_id=?,payment_url=?,status=CASE WHEN refunded_cents>0 OR ?>0 THEN 'unconfirmed' WHEN ?='unconfirmed' THEN 'unconfirmed' WHEN status='paid' THEN 'paid' ELSE ? END,refunded_cents=MAX(refunded_cents,?),paid_at=COALESCE(paid_at,?),error=CASE WHEN refunded_cents>0 OR ?>0 THEN 'Remboursement signalé : vérifier le portail PayPlug.' ELSE ? END,updated_at=? WHERE id=? AND (provider_id IS NULL OR provider_id=?)",
      )
      .bind(
        payment.id,
        payment.paymentUrl,
        payment.refundedAmountCents,
        payment.state,
        payment.state,
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
export async function payplugGet(request: Request, action: string) {
  if (!(await isAdmin())) return reply({ error: 'Accès réservé.' }, 403);
  if (action === 'settings') {
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
    const attempts = await database
      .prepare(
        'SELECT id,status,total,provider_id,error,created_at,mode,refunded_cents FROM payment_attempts ORDER BY created_at DESC LIMIT 50',
      )
      .all();
    return reply({
      settings: payplugSettings(await runtime()),
      attempts: attempts.results,
    });
  }
  if (action !== 'status')
    return reply({ error: 'Ressource introuvable.' }, 404);
  const id = new URL(request.url).searchParams.get('id');
  if (!uuid(id)) return reply({ error: 'Référence invalide.' }, 400);
  const a = await byId(id);
  if (!a) return reply({ error: 'Tentative introuvable.' }, 404);
  // Returning from the hosted page supplies no payment evidence. Re-read PayPlug from the server.
  try {
    return reply({ attempt: safe(await reconcile(a)) });
  } catch {
    return reply({
      attempt: safe(a),
      warning:
        'Le statut PayPlug n’a pas pu être revérifié. Consultez le portail avant de réessayer.',
    });
  }
}
export async function payplugPost(request: Request, action: string) {
  const env = await runtime();
  if (action === 'ipn') {
    // The currently deployed simulation never calls PayPlug or accepts payment notifications.
    if (env.COMMERCE_MODE !== 'payplug_test')
      return reply({ received: true, ignored: true });
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
      await applyVerified(a, verified);
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
  if (!(await isAdmin())) return reply({ error: 'Accès réservé.' }, 403);
  if (env.COMMERCE_MODE !== 'payplug_test')
    return reply(
      { error: 'PayPlug est désactivé : la boutique reste en simulation.' },
      409,
    );
  let data;
  try {
    data = await boundedBody(request);
  } catch {
    return reply({ error: 'Demande invalide.' }, 400);
  }
  if (action === 'reconcile') {
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
      return reply({
        attempt: safe(
          await applyVerified(
            a,
            await createPayplug(env).retrieveAndVerifyPayment(id, binding(a)),
          ),
        ),
      });
    } catch {
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
  const token = cartToken(request);
  if (
    !token ||
    !uuid(data.requestKey) ||
    data.testConsent !== true ||
    !Number.isSafeInteger(data.quotedTotal) ||
    !Number.isSafeInteger(data.quotedRevision)
  )
    return reply(
      { error: 'Préparez le panier et confirmez le test PayPlug.' },
      400,
    );
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
    !valid(b.city, 2, 100) ||
    typeof b.postcode !== 'string' ||
    !/^\d{5}$/.test(b.postcode) ||
    b.country !== 'FR'
  )
    return reply(
      { error: 'Vérifiez les coordonnées de facturation du test (France).' },
      400,
    );
  const billing = {
    first_name: b.first_name.trim(),
    last_name: b.last_name.trim(),
    email: b.email.trim().toLowerCase(),
    address1: b.address1.trim(),
    city: b.city.trim(),
    postcode: b.postcode,
    country: 'FR' as const,
    language: 'fr' as const,
  };
  const fingerprint = JSON.stringify([
    billing,
    data.quotedTotal,
    data.quotedRevision,
  ]);
  const database = await db();
  const previous = await database
    .prepare('SELECT * FROM payment_attempts WHERE cart_id=? AND request_key=?')
    .bind(token, data.requestKey)
    .first<Attempt>();
  if (previous)
    return previous.fingerprint === fingerprint
      ? reply({ attempt: safe(previous) })
      : reply({ error: 'Cette tentative correspond à un autre contenu.' }, 409);
  const cart = await resolveCart(token),
    shipping = shippingFor(cart.subtotal, 'home'),
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
  if (total < 30 || total > 2000000)
    return reply(
      {
        error:
          'Le total doit être compris entre 0,30 € et 20 000 € pour le test PayPlug.',
      },
      400,
    );
  // Resolve configuration before reserving the cart; this performs no network request.
  const adapter = createPayplug(env);
  const settings = payplugSettings(env);
  if (settings.issues.length)
    return reply(
      {
        error: 'Le raccordement PayPlug de test est incomplet.',
        issues: settings.issues,
      },
      409,
    );
  const id = crypto.randomUUID(),
    now = new Date().toISOString();
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
        cart.revision,
        'payplug_test',
        billing.first_name + ' ' + billing.last_name,
        billing.email,
        JSON.stringify(billing),
        JSON.stringify(cart.items),
        cart.subtotal,
        shipping,
        total,
        'home',
        'creating',
        now,
        now,
        token,
        cart.revision,
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
      return reply({ attempt: safe(raced) });
    return reply(
      {
        error:
          'Une tentative PayPlug existe déjà pour ce panier. Vérifiez son état dans les réglages avant de recommencer.',
      },
      409,
    );
  }
  const a = (await byId(id))!;
  try {
    const payment = await adapter.createHostedPayment({
      binding: binding(a),
      billing,
    });
    return reply({ attempt: safe(await applyVerified(a, payment)) }, 201);
  } catch (error) {
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
    return reply({ attempt: safe((await byId(id))!) }, uncertain ? 202 : 422);
  }
}
