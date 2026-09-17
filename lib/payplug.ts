/** Server-only adapter. Never import from a client component. No database or env reads. */
if (typeof window !== 'undefined') throw new Error('PayPlug is server-only.');

export const PAYPLUG_API_VERSION = '2019-08-06';
export const LIVE_PAYMENT_RELEASED = false;
const API_ORIGIN = 'https://api.payplug.com/v1';
export const PAYPLUG_OWNED_ORIGINS = [
  'https://boutique-de-boxe.com',
  'https://www.boutique-de-boxe.com',
] as const;

export type CommerceMode = 'simulation' | 'payplug_test' | 'payplug_live';
export type ProviderMode = Exclude<CommerceMode, 'simulation'>;
export type PayplugEnvironment = {
  COMMERCE_MODE?: string;
  PAYPLUG_TEST_SECRET_KEY?: string;
  PAYPLUG_LIVE_SECRET_KEY?: string;
  PAYPLUG_API_VERSION?: string;
  PAYPLUG_PUBLIC_BASE_URL?: string;
};
export type PaymentBinding = {
  orderId: string;
  attemptId: string;
  amountCents: number;
  currency: 'EUR';
  mode: ProviderMode;
};
export type PayplugBinding = PaymentBinding;
export type PayplugBilling = {
  first_name: string;
  last_name: string;
  email: string;
  address1: string;
  address2?: string;
  postcode: string;
  city: string;
  country: 'FR';
};
export type PayplugShipping = PayplugBilling & {
  delivery_type: 'BILLING' | 'NEW' | 'SHIP_TO_STORE';
};
export type VerifiedPayment = {
  id: string;
  paymentUrl: string | null;
  state: 'pending' | 'paid' | 'failed' | 'unconfirmed';
  isLive: boolean;
  amountCents: number;
  currency: 'EUR';
  paidAt: number | null;
  failureCode: string | null;
  refundedAmountCents: number;
};
export type PayplugErrorCode =
  | 'disabled'
  | 'live_locked'
  | 'configuration'
  | 'invalid_input'
  | 'create_rejected'
  | 'create_unconfirmed'
  | 'retrieve_failed'
  | 'verification_failed'
  | 'invalid_notification';

export class PayplugError extends Error {
  readonly code: PayplugErrorCode;
  readonly ambiguous: boolean;
  readonly upstreamStatus: number | null;
  readonly providerPaymentId: string | null;
  constructor(
    code: PayplugErrorCode,
    options: {
      ambiguous?: boolean;
      upstreamStatus?: number;
      providerPaymentId?: string | null;
    } = {},
  ) {
    const messages: Record<PayplugErrorCode, string> = {
      disabled: 'Les appels PayPlug sont désactivés en simulation.',
      live_locked:
        'Les paiements réels restent verrouillés dans cette version.',
      configuration: 'La configuration serveur PayPlug doit être vérifiée.',
      invalid_input: 'Les données de la tentative de paiement sont invalides.',
      create_rejected: 'PayPlug a refusé la création de cette tentative.',
      create_unconfirmed:
        'La création PayPlug est incertaine. Vérifier la tentative avant toute nouvelle création.',
      retrieve_failed:
        'Le statut PayPlug ne peut pas être confirmé pour le moment.',
      verification_failed:
        'Le paiement ne correspond pas à la tentative enregistrée.',
      invalid_notification: 'La notification de paiement est invalide.',
    };
    super(messages[code]);
    this.name = 'PayplugError';
    this.code = code;
    this.ambiguous = options.ambiguous === true;
    this.upstreamStatus = options.upstreamStatus ?? null;
    this.providerPaymentId = options.providerPaymentId ?? null;
  }
}

const uuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
    v,
  );
export const isPayplugPaymentId = (v: unknown): v is string =>
  typeof v === 'string' && /^pay_[A-Za-z0-9]{8,100}$/.test(v);
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function configuredMode(env: PayplugEnvironment): CommerceMode | null {
  const v = env.COMMERCE_MODE?.trim() || 'simulation';
  return v === 'simulation' || v === 'payplug_test' || v === 'payplug_live'
    ? v
    : null;
}
function publicOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/' ||
      !PAYPLUG_OWNED_ORIGINS.some((origin) => origin === url.origin)
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Safe for an authenticated settings response: no key values, fragments, or key-derived hashes. */
export function payplugSettings(env: PayplugEnvironment) {
  const mode = configuredMode(env);
  const origin = publicOrigin(env.PAYPLUG_PUBLIC_BASE_URL);
  const testKeyConfigured = !!env.PAYPLUG_TEST_SECRET_KEY?.trim();
  const liveKeyConfigured = !!env.PAYPLUG_LIVE_SECRET_KEY?.trim();
  const testKeyValid = /^sk_test_[A-Za-z0-9]+$/.test(
    env.PAYPLUG_TEST_SECRET_KEY?.trim() || '',
  );
  const versionValid =
    !env.PAYPLUG_API_VERSION || env.PAYPLUG_API_VERSION === PAYPLUG_API_VERSION;
  const issues: string[] = [];
  if (!mode) issues.push('invalid_commerce_mode');
  if (!origin) issues.push('public_base_url_missing_or_unapproved');
  if (!testKeyConfigured) issues.push('test_key_missing');
  else if (!testKeyValid) issues.push('test_key_wrong_mode_or_format');
  if (!versionValid) issues.push('unsupported_api_version');
  if (mode === 'payplug_live') issues.push('live_release_locked');
  return {
    mode: mode ?? 'invalid',
    apiVersion: PAYPLUG_API_VERSION,
    publicBaseUrl: origin,
    testKeyConfigured,
    liveKeyConfigured,
    testReady: Boolean(origin && testKeyValid && versionValid),
    hostedTestEnabled:
      mode === 'payplug_test' &&
      Boolean(origin && testKeyValid && versionValid),
    liveReleased: LIVE_PAYMENT_RELEASED,
    liveEnabled: false,
    issues,
  };
}

function validateBinding(binding: PaymentBinding, mode: ProviderMode) {
  if (
    !binding ||
    !uuid(binding.orderId) ||
    !uuid(binding.attemptId) ||
    binding.mode !== mode ||
    binding.currency !== 'EUR' ||
    !Number.isSafeInteger(binding.amountCents) ||
    binding.amountCents < 30 ||
    binding.amountCents > 2_000_000
  ) {
    throw new PayplugError('invalid_input');
  }
}

function field(value: unknown, max: number, optional = false): string {
  if (optional && value === undefined) return '';
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.trim().length > max ||
    value.split('').some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  ) {
    throw new PayplugError('invalid_input');
  }
  return value.trim();
}
function customer(input: PayplugBilling) {
  if (!record(input) || input.country !== 'FR')
    throw new PayplugError('invalid_input');
  const email = field(input.email, 255);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new PayplugError('invalid_input');
  const address2 = field(input.address2, 255, true);
  return {
    first_name: field(input.first_name, 100),
    last_name: field(input.last_name, 100),
    email,
    address1: field(input.address1, 255),
    ...(address2 ? { address2 } : {}),
    postcode: field(input.postcode, 16),
    city: field(input.city, 100),
    country: 'FR',
    language: 'fr',
  };
}
function paymentUrl(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || value.length > 2048)
    throw new PayplugError('verification_failed');
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'secure.payplug.com' ||
      url.port ||
      url.username ||
      url.password ||
      url.hash ||
      !/^\/pay\/(?:test\/)?[A-Za-z0-9]+\/?$/.test(url.pathname)
    ) {
      throw new Error('url');
    }
    return url.href;
  } catch {
    throw new PayplugError('verification_failed');
  }
}

/** This is called only on objects returned by our authenticated, fixed-origin GET/POST. */
function verifyPayment(
  value: unknown,
  binding: PaymentBinding,
  expectedId?: string,
): VerifiedPayment {
  if (
    !record(value) ||
    value.object !== 'payment' ||
    !isPayplugPaymentId(value.id) ||
    (expectedId !== undefined && value.id !== expectedId) ||
    value.is_live !== (binding.mode === 'payplug_live') ||
    value.currency !== binding.currency ||
    value.amount !== binding.amountCents ||
    typeof value.is_paid !== 'boolean' ||
    typeof value.is_refunded !== 'boolean' ||
    !Number.isSafeInteger(value.amount_refunded) ||
    (value.amount_refunded as number) < 0 ||
    (value.amount_refunded as number) > binding.amountCents ||
    !record(value.metadata) ||
    value.metadata.order_id !== binding.orderId ||
    value.metadata.attempt_id !== binding.attemptId ||
    value.metadata.integration !== 'boutique-de-boxe' ||
    value.metadata.commerce_mode !== binding.mode
  ) {
    throw new PayplugError('verification_failed');
  }
  const failed = value.failure !== null && value.failure !== undefined;
  if (failed && !record(value.failure))
    throw new PayplugError('verification_failed');
  const refund = value.is_refunded || (value.amount_refunded as number) > 0;
  if (
    value.is_paid &&
    (failed ||
      !Number.isSafeInteger(value.paid_at) ||
      (value.paid_at as number) <= 0)
  ) {
    throw new PayplugError('verification_failed');
  }
  const hosted = value.hosted_payment;
  if (hosted !== null && hosted !== undefined && !record(hosted))
    throw new PayplugError('verification_failed');
  // A refund or unsupported installment/deferred response requires review, never fulfillment.
  const deferred =
    value.authorization !== null && value.authorization !== undefined;
  const installment =
    value.installment_plan_id !== null &&
    value.installment_plan_id !== undefined;
  const state =
    refund || installment || (deferred && !value.is_paid)
      ? 'unconfirmed'
      : value.is_paid
        ? 'paid'
        : failed
          ? 'failed'
          : 'pending';
  return {
    id: value.id,
    paymentUrl: paymentUrl(record(hosted) ? hosted.payment_url : null),
    state,
    isLive: value.is_live as boolean,
    amountCents: value.amount as number,
    currency: 'EUR',
    paidAt: value.is_paid ? (value.paid_at as number) : null,
    failureCode:
      failed &&
      record(value.failure) &&
      typeof value.failure.code === 'string' &&
      /^[a-z0-9_]{1,80}$/.test(value.failure.code)
        ? value.failure.code
        : null,
    refundedAmountCents: value.amount_refunded as number,
  };
}

async function responseObject(response: Response): Promise<unknown> {
  if (!response.body) throw new Error('empty_response');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      length += result.value.byteLength;
      if (length > 65_536) {
        await reader.cancel();
        throw new Error('response_too_large');
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export function createPayplug(
  envInput: PayplugEnvironment,
  fetcher: typeof fetch = fetch,
) {
  // Capture configuration so caller mutation cannot swap keys/modes during a request.
  const env = { ...envInput };
  function enabled() {
    const mode = configuredMode(env);
    if (mode === 'simulation') throw new PayplugError('disabled');
    if (mode === 'payplug_live') throw new PayplugError('live_locked');
    const settings = payplugSettings(env);
    if (
      mode !== 'payplug_test' ||
      !settings.hostedTestEnabled ||
      !settings.publicBaseUrl
    ) {
      throw new PayplugError('configuration');
    }
    return {
      mode,
      key: env.PAYPLUG_TEST_SECRET_KEY!.trim(),
      origin: settings.publicBaseUrl,
    };
  }
  async function request(
    method: 'POST' | 'GET',
    path: string,
    payload?: unknown,
  ) {
    const { key } = enabled();
    const creating = method === 'POST';
    let response: Response;
    try {
      response = await fetcher(`${API_ORIGIN}${path}`, {
        method,
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(12_000),
        headers: {
          Authorization: `Bearer ${key}`,
          'PayPlug-Version': PAYPLUG_API_VERSION,
          Accept: 'application/json',
          ...(creating ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(creating ? { body: JSON.stringify(payload) } : {}),
      });
    } catch (cause) {
      // Journal technique sans corps de réponse : nom et message de l'erreur réseau seulement.
      console.error('PayPlug', creating ? 'create' : 'retrieve', 'fetch failed:', (cause as Error)?.name, (cause as Error)?.message);
      throw new PayplugError(
        creating ? 'create_unconfirmed' : 'retrieve_failed',
        { ambiguous: creating },
      );
    }
    if (response.status !== 200 && response.status !== 201) {
      // Do not expose or log provider error bodies: they can echo billing data.
      await response.body?.cancel().catch(() => undefined);
      console.error('PayPlug', creating ? 'create' : 'retrieve', 'upstream status', response.status);
      const definiteRejection = [400, 401, 403, 404, 405, 422].includes(
        response.status,
      );
      throw new PayplugError(
        creating
          ? definiteRejection
            ? 'create_rejected'
            : 'create_unconfirmed'
          : 'retrieve_failed',
        {
          ambiguous: creating && !definiteRejection,
          upstreamStatus: response.status,
        },
      );
    }
    try {
      return await responseObject(response);
    } catch (cause) {
      console.error('PayPlug', creating ? 'create' : 'retrieve', 'unreadable response:', (cause as Error)?.name, (cause as Error)?.message, 'status', response.status);
      throw new PayplugError(
        creating ? 'create_unconfirmed' : 'retrieve_failed',
        { ambiguous: creating, upstreamStatus: response.status },
      );
    }
  }

  async function retrieveAndVerifyPayment(id: string, binding: PaymentBinding) {
    const { mode } = enabled();
    validateBinding(binding, mode);
    if (!isPayplugPaymentId(id)) throw new PayplugError('invalid_input');
    const snapshot = { ...binding };
    const value = await request('GET', `/payments/${encodeURIComponent(id)}`);
    try {
      return verifyPayment(value, snapshot, id);
    } catch (cause) {
      console.error('PayPlug retrieve verify failed:', (cause as Error)?.message, JSON.stringify({ id: record(value) ? value.id : null, is_live: record(value) ? value.is_live : null, amount: record(value) ? value.amount : null, currency: record(value) ? value.currency : null, meta: record(value) && record(value.metadata) ? value.metadata : null, binding: snapshot }));
      throw cause;
    }
  }
  return {
    async createHostedPayment(input: {
      binding: PaymentBinding;
      billing: PayplugBilling;
      shipping?: PayplugShipping;
    }) {
      const { mode, origin } = enabled();
      validateBinding(input?.binding, mode);
      const binding = { ...input.binding };
      const billing = customer(input.billing);
      const shippingType = input.shipping?.delivery_type ?? 'BILLING';
      if (!['BILLING', 'NEW', 'SHIP_TO_STORE'].includes(shippingType))
        throw new PayplugError('invalid_input');
      const shipping = input.shipping ? customer(input.shipping) : billing;
      const returnUrl = new URL('/paiement-retour/', origin);
      returnUrl.searchParams.set('id', binding.attemptId);
      const cancelUrl = new URL(returnUrl);
      cancelUrl.searchParams.set('cancel', '1');
      const notificationUrl = new URL('/api/payplug/ipn', origin);
      notificationUrl.searchParams.set('attempt', binding.attemptId);
      const value = await request('POST', '/payments', {
        amount: binding.amountCents,
        currency: binding.currency,
        billing,
        shipping: { ...shipping, delivery_type: shippingType },
        description: `Boutique de Boxe · essai ${binding.attemptId.slice(0, 8)}`,
        hosted_payment: {
          return_url: returnUrl.href,
          cancel_url: cancelUrl.href,
        },
        notification_url: notificationUrl.href,
        save_card: false,
        allow_save_card: false,
        metadata: {
          integration: 'boutique-de-boxe',
          order_id: binding.orderId,
          attempt_id: binding.attemptId,
          commerce_mode: binding.mode,
        },
      });
      try {
        const verified = verifyPayment(value, binding);
        if (!verified.paymentUrl || verified.state !== 'pending')
          throw new PayplugError('verification_failed');
        return verified;
      } catch (cause) {
        // Diagnostic sans donnees personnelles : identifiants, montants et mode seulement.
        console.error('PayPlug create verify failed:', (cause as Error)?.message, JSON.stringify({ id: record(value) ? value.id : null, is_live: record(value) ? value.is_live : null, amount: record(value) ? value.amount : null, currency: record(value) ? value.currency : null, meta: record(value) && record(value.metadata) ? value.metadata : null, binding }));
        // The provider may already have created an object even if our validation failed.
        throw new PayplugError('create_unconfirmed', {
          ambiguous: true,
          providerPaymentId:
            record(value) && isPayplugPaymentId(value.id) ? value.id : null,
        });
      }
    },
    retrieveAndVerifyPayment,
    async verifyNotification(
      body: unknown,
      binding: PaymentBinding,
      storedPaymentId: string | null,
    ) {
      const { mode } = enabled();
      validateBinding(binding, mode);
      if (
        !record(body) ||
        body.object !== 'payment' ||
        body.is_live !== false ||
        !isPayplugPaymentId(body.id) ||
        !isPayplugPaymentId(storedPaymentId) ||
        body.id !== storedPaymentId
      ) {
        throw new PayplugError('invalid_notification');
      }
      // Ignore every supplied status/amount/metadata field. The HTTPS GET is authoritative.
      return retrieveAndVerifyPayment(storedPaymentId, binding);
    },
  };
}
