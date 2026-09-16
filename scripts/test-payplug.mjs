// Pure mocked checks: no route calls, no provider calls, no e-mail sends, no env reads.
// Node 24: node --experimental-strip-types .research/payplug-tests.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

globalThis.fetch = async () => {
  throw new Error('REAL NETWORK IS FORBIDDEN IN THIS TEST');
};
const adapterUrl = process.argv[2]
  ? pathToFileURL(resolve(process.argv[2]))
  : new URL('../lib/payplug.ts', import.meta.url);
const {
  createPayplug,
  payplugSettings,
  PayplugError,
  LIVE_PAYMENT_RELEASED,
  PAYPLUG_API_VERSION,
} = await import(adapterUrl.href);
const binding = {
  orderId: '6bc3ecad-6c37-49ee-8055-e78df63e0563',
  attemptId: '2dacb7c9-bd65-4df5-9c5d-5198242c6463',
  amountCents: 12890,
  currency: 'EUR',
  mode: 'payplug_test',
};
const billing = {
  first_name: 'Camille',
  last_name: 'Test',
  email: 'camille@example.invalid',
  address1: '1 adresse de test',
  postcode: '31000',
  city: 'Toulouse',
  country: 'FR',
};
const env = {
  COMMERCE_MODE: 'payplug_test',
  PAYPLUG_TEST_SECRET_KEY: 'sk_test_MOCKKEYONLY',
  PAYPLUG_PUBLIC_BASE_URL: 'https://boutique-de-boxe.fr',
};
const paymentId = 'pay_MockPaymentIdentifier123';
const pending = () => ({
  id: paymentId,
  object: 'payment',
  is_live: false,
  amount: binding.amountCents,
  currency: 'EUR',
  is_paid: false,
  is_refunded: false,
  amount_refunded: 0,
  paid_at: null,
  authorization: null,
  installment_plan_id: null,
  failure: null,
  metadata: {
    integration: 'boutique-de-boxe',
    order_id: binding.orderId,
    attempt_id: binding.attemptId,
    commerce_mode: 'payplug_test',
  },
  hosted_payment: {
    payment_url: 'https://secure.payplug.com/pay/test/MockPaymentIdentifier123',
  },
});
const paid = () => ({ ...pending(), is_paid: true, paid_at: 1789045000 });
function harness(value = pending(), status = 200, settings = env) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, init });
    if (value instanceof Error) throw value;
    return new Response(
      typeof value === 'string' ? value : JSON.stringify(value),
      { status },
    );
  };
  return { calls, adapter: createPayplug(settings, fetcher) };
}
async function code(promise, expected, ambiguous) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof PayplugError);
    assert.equal(error.code, expected);
    if (ambiguous !== undefined) assert.equal(error.ambiguous, ambiguous);
    assert.ok(!error.message.includes('sk_'));
    return true;
  });
}
const tests = [];
const test = (name, run) => tests.push({ name, run });

test('simulation and missing mode block every method before fetch even with configured keys', async () => {
  for (const settings of [
    { ...env, COMMERCE_MODE: 'simulation' },
    { ...env, COMMERCE_MODE: undefined },
  ]) {
    const h = harness(pending(), 200, settings);
    await code(h.adapter.createHostedPayment({ binding, billing }), 'disabled');
    await code(
      h.adapter.retrieveAndVerifyPayment(paymentId, binding),
      'disabled',
    );
    await code(
      h.adapter.verifyNotification(
        { id: paymentId, object: 'payment', is_live: false },
        binding,
        paymentId,
      ),
      'disabled',
    );
    assert.equal(h.calls.length, 0);
  }
});
test('live remains blocked irrespective keys or a caller-supplied release flag', async () => {
  assert.equal(LIVE_PAYMENT_RELEASED, false);
  const h = harness(pending(), 200, {
    ...env,
    COMMERCE_MODE: 'payplug_live',
    PAYPLUG_LIVE_SECRET_KEY: 'sk_live_MOCKKEYONLY',
    LIVE_PAYMENT_RELEASED: true,
  });
  await code(
    h.adapter.createHostedPayment({
      binding: { ...binding, mode: 'payplug_live' },
      billing,
    }),
    'live_locked',
  );
  assert.equal(h.calls.length, 0);
});
test('wrong-mode key, unsupported API version, unknown mode and unowned origins fail closed', async () => {
  const patches = [
    { PAYPLUG_TEST_SECRET_KEY: 'sk_live_MOCKKEYONLY' },
    { PAYPLUG_TEST_SECRET_KEY: '' },
    { PAYPLUG_API_VERSION: '2026-09-10' },
    { COMMERCE_MODE: 'TEST' },
    { PAYPLUG_PUBLIC_BASE_URL: 'https://boutique-de-boxe.com' },
    { PAYPLUG_PUBLIC_BASE_URL: 'https://boutique-de-boxe.vercel.app' },
    { PAYPLUG_PUBLIC_BASE_URL: 'http://boutique-de-boxe.fr' },
    { PAYPLUG_PUBLIC_BASE_URL: 'https://boutique-de-boxe.fr.evil.invalid' },
    { PAYPLUG_PUBLIC_BASE_URL: 'https://user:password@boutique-de-boxe.fr/' },
    { PAYPLUG_PUBLIC_BASE_URL: 'https://boutique-de-boxe.fr/?token=secret' },
    { PAYPLUG_PUBLIC_BASE_URL: 'https://boutique-de-boxe.fr/nested' },
  ];
  for (const patch of patches) {
    const h = harness(pending(), 200, { ...env, ...patch });
    await code(
      h.adapter.createHostedPayment({ binding, billing }),
      'configuration',
    );
    assert.equal(h.calls.length, 0);
  }
});
test('settings expose presence only and default to a disabled simulation', () => {
  const settings = payplugSettings({
    ...env,
    PAYPLUG_LIVE_SECRET_KEY: 'sk_live_MOCKKEYONLY',
  });
  assert.equal(settings.testKeyConfigured, true);
  assert.equal(settings.liveKeyConfigured, true);
  assert.equal(settings.hostedTestEnabled, true);
  assert.equal(settings.liveEnabled, false);
  assert.equal(settings.apiVersion, PAYPLUG_API_VERSION);
  assert.equal(JSON.stringify(settings).includes('MOCKKEY'), false);
  assert.equal(payplugSettings({}).mode, 'simulation');
  assert.equal(payplugSettings({}).hostedTestEnabled, false);
});
test('creation sends the frozen exact total, reserved binding and safe URLs without tokens or email triggers', async () => {
  const h = harness(pending(), 201);
  const created = await h.adapter.createHostedPayment({
    binding,
    billing,
    metadata: { order_id: 'attacker', amount: 1 },
    amount: 1,
    paymentOutcome: 'approved',
  });
  assert.equal(created.state, 'pending');
  assert.equal(h.calls.length, 1);
  const { url, init } = h.calls[0];
  const body = JSON.parse(init.body);
  assert.equal(url, 'https://api.payplug.com/v1/payments');
  assert.equal(init.method, 'POST');
  assert.equal(init.redirect, 'error');
  assert.equal(init.cache, 'no-store');
  assert.equal(init.headers['PayPlug-Version'], '2019-08-06');
  assert.equal(init.headers.Authorization, 'Bearer sk_test_MOCKKEYONLY');
  assert.equal(body.amount, 12890);
  assert.equal(body.currency, 'EUR');
  assert.equal(body.metadata.order_id, binding.orderId);
  assert.equal(body.metadata.attempt_id, binding.attemptId);
  assert.equal(body.shipping.delivery_type, 'BILLING');
  assert.equal(body.shipping.address1, billing.address1);
  assert.equal(body.billing.language, 'fr');
  assert.equal(
    body.hosted_payment.return_url,
    `${env.PAYPLUG_PUBLIC_BASE_URL}/paiement-retour/?id=${binding.attemptId}`,
  );
  assert.equal(
    body.hosted_payment.cancel_url,
    `${env.PAYPLUG_PUBLIC_BASE_URL}/paiement-retour/?id=${binding.attemptId}&cancel=1`,
  );
  assert.equal(
    body.notification_url,
    `${env.PAYPLUG_PUBLIC_BASE_URL}/api/payplug/ipn?attempt=${binding.attemptId}`,
  );
  assert.equal(body.hosted_payment.sent_by, undefined);
  assert.equal(body.authorized_amount, undefined);
  assert.equal(body.save_card, false);
  assert.equal(body.allow_save_card, false);
  assert.equal(
    JSON.stringify(body.hosted_payment).includes(billing.email),
    false,
  );
});
test('invalid cents, currency, identifiers or mode are rejected before provider creation', async () => {
  for (const patch of [
    { amountCents: 128.9 },
    { amountCents: '12890' },
    { amountCents: 29 },
    { amountCents: 2_000_001 },
    { amountCents: NaN },
    { currency: 'USD' },
    { orderId: 'x' },
    { attemptId: '../another' },
    { mode: 'payplug_live' },
  ]) {
    const h = harness();
    await code(
      h.adapter.createHostedPayment({
        binding: { ...binding, ...patch },
        billing,
      }),
      'invalid_input',
    );
    assert.equal(h.calls.length, 0);
  }
});
test('missing real billing details are rejected instead of inventing an address', async () => {
  for (const patch of [
    { first_name: '' },
    { address1: '' },
    { postcode: '' },
    { country: 'GB' },
    { email: 'not-an-email' },
    { last_name: 'Test\r\nInjected' },
  ]) {
    const h = harness();
    await code(
      h.adapter.createHostedPayment({
        binding,
        billing: { ...billing, ...patch },
      }),
      'invalid_input',
    );
    assert.equal(h.calls.length, 0);
  }
});
test('a paid object is accepted only after an authenticated retrieval of the exact stored ID', async () => {
  const h = harness(paid());
  const result = await h.adapter.retrieveAndVerifyPayment(paymentId, binding);
  assert.equal(result.state, 'paid');
  assert.equal(result.paidAt, 1789045000);
  assert.equal(
    h.calls[0].url,
    `https://api.payplug.com/v1/payments/${paymentId}`,
  );
  assert.equal(h.calls[0].init.method, 'GET');
  assert.equal(
    h.calls[0].init.headers.Authorization,
    'Bearer sk_test_MOCKKEYONLY',
  );
});
test('notification status and amount are ignored; provider GET remains authoritative', async () => {
  const h = harness(pending());
  const result = await h.adapter.verifyNotification(
    {
      id: paymentId,
      object: 'payment',
      is_live: false,
      is_paid: true,
      paid_at: 1789045000,
      amount: 1,
      metadata: { order_id: binding.orderId },
    },
    binding,
    paymentId,
  );
  assert.equal(result.state, 'pending');
  assert.equal(h.calls.length, 1);
});
test('wrong notification mode/type/ID causes zero API requests and no cross-mode fallback', async () => {
  for (const body of [
    { id: paymentId, object: 'payment', is_live: true },
    { id: paymentId, object: 'refund', is_live: false },
    { id: 'pay_AnotherPayment123', object: 'payment', is_live: false },
    { id: 'https://evil.invalid', object: 'payment', is_live: false },
  ]) {
    const h = harness(paid());
    await code(
      h.adapter.verifyNotification(body, binding, paymentId),
      'invalid_notification',
    );
    assert.equal(h.calls.length, 0);
  }
});
test('payment validation requires BOTH metadata bindings, exact ID, EUR and exact integer amount', async () => {
  const good = paid();
  const patches = [
    { id: 'pay_AnotherPayment123' },
    { currency: 'USD' },
    { is_live: true },
    { amount: binding.amountCents - 1 },
    { amount: binding.amountCents / 4 },
    { amount: String(binding.amountCents) },
    {
      metadata: {
        ...good.metadata,
        order_id: '7bc3ecad-6c37-49ee-8055-e78df63e0563',
      },
    },
    {
      metadata: {
        ...good.metadata,
        attempt_id: '3dacb7c9-bd65-4df5-9c5d-5198242c6463',
      },
    },
    { metadata: { ...good.metadata, commerce_mode: 'payplug_live' } },
    { metadata: { ...good.metadata, integration: 'another-shop' } },
    { object: 'refund' },
    { is_paid: 'true' },
    { paid_at: null },
    { is_refunded: undefined },
    { amount_refunded: -1 },
    { amount_refunded: binding.amountCents + 1 },
    { failure: { code: 'card_declined' } },
  ];
  for (const patch of patches) {
    const h = harness({ ...good, ...patch });
    await code(
      h.adapter.retrieveAndVerifyPayment(paymentId, binding),
      'verification_failed',
    );
    assert.equal(h.calls.length, 1);
  }
});
test('an authorization does not become paid, and refunds/installments require review', async () => {
  for (const value of [
    {
      ...pending(),
      authorization: {
        authorized_at: 1789045000,
        authorized_amount: binding.amountCents,
      },
      auto_capture: true,
    },
    { ...paid(), amount_refunded: 100 },
    { ...paid(), is_refunded: true, amount_refunded: binding.amountCents },
    { ...paid(), installment_plan_id: 'inst_MockOnly' },
  ]) {
    const h = harness(value);
    assert.equal(
      (await h.adapter.retrieveAndVerifyPayment(paymentId, binding)).state,
      'unconfirmed',
    );
  }
});
test('a declined card stays failed and does not produce a paid result', async () => {
  const h = harness({
    ...pending(),
    failure: { code: 'card_declined', message: 'private upstream text' },
  });
  const result = await h.adapter.retrieveAndVerifyPayment(paymentId, binding);
  assert.equal(result.state, 'failed');
  assert.equal(result.failureCode, 'card_declined');
  assert.equal(result.paidAt, null);
  assert.equal(JSON.stringify(result).includes('private upstream'), false);
});
test('POST timeout, 500, 202, 409 or malformed success are uncertain and never retried', async () => {
  for (const [value, status] of [
    [new Error('timeout with private data'), 200],
    ['upstream private', 500],
    ['queued', 202],
    ['conflict', 409],
    ['not JSON', 201],
  ]) {
    const h = harness(value, status);
    await code(
      h.adapter.createHostedPayment({ binding, billing }),
      'create_unconfirmed',
      true,
    );
    assert.equal(h.calls.length, 1);
  }
});
test('untrusted hosted URLs make creation uncertain and retain only provider ID for reconciliation', async () => {
  for (const url of [
    'https://secure.payplug.com.evil.invalid/pay/test/Test',
    'https://user:pw@secure.payplug.com/pay/test/Test',
    'http://secure.payplug.com/pay/test/Test',
    'https://secure.payplug.com/other',
  ]) {
    const h = harness(
      { ...pending(), hosted_payment: { payment_url: url } },
      201,
    );
    await assert.rejects(
      h.adapter.createHostedPayment({ binding, billing }),
      (error) => {
        assert.equal(error.code, 'create_unconfirmed');
        assert.equal(error.ambiguous, true);
        assert.equal(error.providerPaymentId, paymentId);
        return true;
      },
    );
    assert.equal(h.calls.length, 1);
  }
});
test('a definite 400 rejection remains distinct from ambiguity and never echoes raw provider details', async () => {
  const h = harness(
    {
      message: 'sk_test_PrivateKey, client@example.invalid, 1 private address',
    },
    400,
  );
  await assert.rejects(
    h.adapter.createHostedPayment({ binding, billing }),
    (error) => {
      assert.equal(error.code, 'create_rejected');
      assert.equal(error.ambiguous, false);
      assert.equal(error.upstreamStatus, 400);
      assert.equal(JSON.stringify(error).includes('private'), false);
      return true;
    },
  );
  assert.equal(h.calls.length, 1);
});
test('GET errors keep status unknown and do not retry another key', async () => {
  for (const status of [401, 404, 500]) {
    const h = harness({ message: 'private' }, status);
    await code(
      h.adapter.retrieveAndVerifyPayment(paymentId, binding),
      'retrieve_failed',
      false,
    );
    assert.equal(h.calls.length, 1);
  }
});
test('oversized provider response fails closed', async () => {
  const h = harness(' '.repeat(65_537), 201);
  await code(
    h.adapter.createHostedPayment({ binding, billing }),
    'create_unconfirmed',
    true,
  );
  assert.equal(h.calls.length, 1);
});
test('factory captures configuration so later caller mutation cannot swap key or mode', async () => {
  const config = { ...env };
  const h = harness(pending(), 201, config);
  config.COMMERCE_MODE = 'payplug_live';
  config.PAYPLUG_TEST_SECRET_KEY = 'sk_live_LaterChange';
  await h.adapter.createHostedPayment({ binding, billing });
  assert.equal(
    h.calls[0].init.headers.Authorization,
    'Bearer sk_test_MOCKKEYONLY',
  );
});

let failures = 0;
for (const { name, run } of tests) {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}
console.log(
  `${tests.length - failures}/${tests.length} pure mocked checks passed. External requests: 0.`,
);
if (failures) process.exitCode = 1;
