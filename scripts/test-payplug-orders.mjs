// Read-only tests of the actual orchestration source. D1, auth and PayPlug are
// injected mocks. No request, payment, email or real database write is possible.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'package.json'));
const ts = require('typescript');
const source = readFileSync(resolve(root, 'lib/payplug-orders.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const cartId = '10000000-0000-4000-8000-000000000001';
const key = '20000000-0000-4000-8000-000000000001';
const secondKey = '20000000-0000-4000-8000-000000000002';
const origin = 'https://unit.test.invalid';
const payload = {
  requestKey: key,
  testConsent: true,
  quotedTotal: 4890,
  quotedRevision: 1,
  billing: {
    first_name: 'Test',
    last_name: 'Local',
    email: 'nobody@example.invalid',
    address1: '10 rue du Test',
    city: 'Toulouse',
    postcode: '31000',
    country: 'FR',
  },
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const payment = (state = 'pending', overrides = {}) => ({
  id: 'pay_12345678',
  paymentUrl: 'https://secure.payplug.com/pay/test',
  state,
  paidAt: state === 'paid' ? 1789000000 : null,
  failureCode: null,
  refundedAmountCents: 0,
  ...overrides,
});

class PayplugError extends Error {
  constructor(code, options = {}) {
    super(code);
    this.code = code;
    this.ambiguous = options.ambiguous === true;
    this.upstreamStatus = options.upstreamStatus ?? null;
    this.providerPaymentId = options.providerPaymentId ?? null;
  }
}

test('GET settings and status are owner only', async () => {
  const h = harness({ admin: false });
  assert.equal((await h.get('settings')).status, 403);
  assert.equal((await h.get('status', key)).status, 403);
  assert.equal(h.adapterCalls.length, 0);
});

test('create and reconcile are owner only and require same origin', async () => {
  const h = harness({ admin: false });
  assert.equal((await h.post('create', payload)).status, 403);
  assert.equal(
    (await h.post('reconcile', { id: key, paymentId: 'pay_12345678' })).status,
    403,
  );
  assert.equal(
    (await h.post('create', payload, { origin: 'https://foreign.invalid' }))
      .status,
    400,
  );
  assert.equal(h.adapterCalls.length, 0);
});

for (const mode of ['simulation', 'payplug_live', 'invalid']) {
  test(`${mode} cannot create a PayPlug test and IPN is ignored`, async () => {
    const h = harness({ mode });
    assert.equal((await h.post('create', payload)).status, 409);
    const ipn = await h.post('ipn', {
      id: 'pay_12345678',
      metadata: { attempt_id: key },
    });
    assert.equal(ipn.status, 200);
    assert.equal((await ipn.json()).ignored, true);
    assert.equal(h.adapterCalls.length, 0);
    assert.equal(h.rows.size, 0);
  });
}

test('invalid consent, billing, amount and revision fail before reservation', async () => {
  const h = harness();
  assert.equal(
    (await h.post('create', { ...payload, testConsent: false })).status,
    400,
  );
  assert.equal(
    (
      await h.post('create', {
        ...payload,
        billing: { ...payload.billing, country: 'US' },
      })
    ).status,
    400,
  );
  assert.equal(
    (await h.post('create', { ...payload, quotedTotal: 1 })).status,
    409,
  );
  assert.equal(
    (await h.post('create', { ...payload, quotedRevision: 2 })).status,
    409,
  );
  assert.equal(h.rows.size, 0);
  assert.equal(h.adapterCalls.length, 0);
});

test('incomplete configuration never reserves a cart revision', async () => {
  const h = harness({ issues: ['Missing public base URL'] });
  assert.equal((await h.post('create', payload)).status, 409);
  assert.equal(h.rows.size, 0);
  assert.equal(h.adapterCalls.length, 0);
});

test('create persists immutable server-calculated details and returns only safe fields', async () => {
  const h = harness();
  const response = await h.post('create', payload);
  assert.equal(response.status, 201);
  const { attempt } = await response.json();
  assert.equal(attempt.status, 'pending');
  assert.equal(attempt.total, 4890);
  assert.equal(attempt.mode, 'payplug_test');
  for (const privateField of [
    'cart_id',
    'request_key',
    'fingerprint',
    'billing',
    'lines',
    'email',
  ])
    assert.equal(attempt[privateField], undefined);
  const row = h.rows.get(attempt.id);
  assert.equal(row.subtotal, 4000);
  assert.equal(row.shipping, 890);
  assert.equal(row.delivery, 'home');
  assert.equal(JSON.parse(row.billing).email, 'nobody@example.invalid');
  assert.equal(h.calls('create').length, 1);
});

test('exact key replay returns the same attempt without creating again', async () => {
  const h = harness();
  const first = await (await h.post('create', payload)).json();
  const replay = await (await h.post('create', payload)).json();
  assert.equal(replay.attempt.id, first.attempt.id);
  assert.equal(h.rows.size, 1);
  assert.equal(h.calls('create').length, 1);
});

test('same key with different normalized billing is 409', async () => {
  const h = harness();
  await h.post('create', payload);
  const response = await h.post('create', {
    ...payload,
    billing: { ...payload.billing, first_name: 'Other' },
  });
  assert.equal(response.status, 409);
  assert.equal(h.calls('create').length, 1);
});

test('concurrent same-key/same-payload creation has one row and one provider call', async () => {
  const h = harness({ raceInitialReads: true });
  const results = await Promise.all([
    h.post('create', payload),
    h.post('create', payload),
  ]);
  assert.ok(results.every((result) => [200, 201].includes(result.status)));
  const bodies = await Promise.all(results.map((result) => result.json()));
  assert.equal(bodies[0].attempt.id, bodies[1].attempt.id);
  assert.equal(h.rows.size, 1);
  assert.equal(h.calls('create').length, 1);
});

test('concurrent same-key/different-billing race rejects the losing fingerprint', async () => {
  const h = harness({ raceInitialReads: true });
  const changed = {
    ...payload,
    billing: { ...payload.billing, last_name: 'Changed' },
  };
  const results = await Promise.all([
    h.post('create', payload),
    h.post('create', changed),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
  assert.equal(h.rows.size, 1);
  assert.equal(h.calls('create').length, 1);
});

test('different keys racing on one cart revision cannot create two payments', async () => {
  const h = harness({ raceInitialReads: true });
  const results = await Promise.all([
    h.post('create', payload),
    h.post('create', { ...payload, requestKey: secondKey }),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
  assert.equal(h.rows.size, 1);
  assert.equal(h.calls('create').length, 1);
});

test('paid IPN arriving before create returns cannot be undone by pending response', async () => {
  const h = harness({
    onCreate: async ({ binding }) => {
      const notification = await h.post(
        'ipn',
        { id: 'pay_12345678' },
        { attemptHint: binding.attemptId },
      );
      assert.equal(notification.status, 200);
      return payment('pending');
    },
    onVerify: async () => payment('paid'),
    onRetrieve: async () => payment('paid'),
  });
  const response = await h.post('create', payload);
  assert.equal(response.status, 201);
  const { attempt } = await response.json();
  assert.equal(attempt.status, 'paid');
  assert.equal(attempt.paymentUrl, null);
  assert.equal(h.cart.items.length, 0);
  assert.equal(h.cart.revision, 2);
  assert.equal(h.calls('create').length, 1);
  assert.equal(h.calls('retrieve').length, 1);
});

test('IPN paid confirmation survives later ambiguous create failure', async () => {
  const h = harness({
    onCreate: async ({ binding }) => {
      const notification = await h.post(
        'ipn',
        { id: 'pay_12345678' },
        { attemptHint: binding.attemptId },
      );
      assert.equal(notification.status, 200);
      throw new PayplugError('create_unconfirmed', { ambiguous: true });
    },
    onVerify: async () => payment('paid'),
    onRetrieve: async () => payment('paid'),
  });
  const { attempt } = await (await h.post('create', payload)).json();
  assert.equal(attempt.status, 'paid');
  assert.equal(h.cart.revision, 2);
});

test('forged IPN URL hint is merely a lookup hint; verifier must authorize state', async () => {
  const h = harness({
    onVerify: async () => {
      throw new PayplugError('verification_failed');
    },
  });
  const { attempt } = await (await h.post('create', payload)).json();
  const response = await h.post(
    'ipn',
    { id: 'pay_forged999', is_paid: true },
    { attemptHint: attempt.id },
  );
  assert.equal(response.status, 400);
  assert.equal(h.rows.get(attempt.id).status, 'pending');
  assert.equal(h.cart.revision, 1);
  assert.equal(h.calls('verify').length, 1);
});

test('unassociated IPN requests a later retry without calling provider or mutating storage', async () => {
  const h = harness();
  const response = await h.post('ipn', {
    id: 'pay_unknown99',
    metadata: { attempt_id: key },
  });
  assert.equal(response.status, 503);
  assert.equal(h.adapterCalls.length, 0);
});

test('uncertain create is retained and exact retry never calls create again', async () => {
  const h = harness({
    onCreate: async () => {
      throw new PayplugError('create_unconfirmed', {
        ambiguous: true,
        providerPaymentId: 'pay_12345678',
      });
    },
  });
  const first = await h.post('create', payload);
  assert.equal(first.status, 202);
  const initial = await first.json();
  assert.equal(initial.attempt.status, 'unconfirmed');
  assert.equal(initial.attempt.providerId, 'pay_12345678');
  const replay = await (await h.post('create', payload)).json();
  assert.equal(replay.attempt.id, initial.attempt.id);
  assert.equal(h.calls('create').length, 1);
});

test('IPN recovers an uncertain create with null provider ID through strict retrieval', async () => {
  const h = harness({
    onCreate: async () => {
      throw new PayplugError('create_unconfirmed', { ambiguous: true });
    },
    onRetrieve: async (id, binding) => {
      assert.equal(id, 'pay_12345678');
      assert.equal(binding.amountCents, 4890);
      assert.equal(binding.currency, 'EUR');
      assert.equal(binding.mode, 'payplug_test');
      assert.equal(binding.orderId, binding.attemptId);
      assert.ok(h.rows.has(binding.attemptId));
      return payment('paid');
    },
    onVerify: async () => {
      assert.fail(
        'Null provider IDs must use authenticated retrieval, not notification verification',
      );
    },
  });
  const { attempt } = await (await h.post('create', payload)).json();
  assert.equal(attempt.status, 'unconfirmed');
  assert.equal(attempt.providerId, null);
  const notification = await h.post(
    'ipn',
    { id: 'pay_12345678', is_paid: false },
    { attemptHint: attempt.id },
  );
  assert.equal(notification.status, 200);
  assert.equal(h.rows.get(attempt.id).provider_id, 'pay_12345678');
  assert.equal(h.rows.get(attempt.id).status, 'paid');
  assert.equal(h.calls('retrieve').length, 1);
  assert.equal(h.calls('verify').length, 0);
  assert.equal(h.calls('create').length, 1);
});

test('body metadata cannot associate an early IPN when the provider ID is still null', async () => {
  const h = harness({
    onCreate: async () => {
      throw new PayplugError('create_unconfirmed', { ambiguous: true });
    },
  });
  const { attempt } = await (await h.post('create', payload)).json();
  const response = await h.post('ipn', {
    id: 'pay_forged999',
    metadata: { attempt_id: attempt.id },
    is_paid: true,
  });
  assert.equal(response.status, 503);
  assert.equal(h.calls('retrieve').length, 0);
  assert.equal(h.calls('verify').length, 0);
  assert.equal(h.rows.get(attempt.id).status, 'unconfirmed');
});

for (const [code, expectedStatus] of [
  ['verification_failed', 400],
  ['invalid_input', 400],
  ['retrieve_failed', 503],
]) {
  test(`null-ID IPN ${code} does not mutate the attempt and returns ${expectedStatus}`, async () => {
    const h = harness({
      onCreate: async () => {
        throw new PayplugError('create_unconfirmed', { ambiguous: true });
      },
      onRetrieve: async () => {
        throw new PayplugError(code);
      },
    });
    const { attempt } = await (await h.post('create', payload)).json();
    const response = await h.post(
      'ipn',
      { id: 'pay_forged999', is_paid: true },
      { attemptHint: attempt.id },
    );
    assert.equal(response.status, expectedStatus);
    assert.equal(h.rows.get(attempt.id).status, 'unconfirmed');
    assert.equal(h.rows.get(attempt.id).provider_id, null);
    assert.equal(h.cart.revision, 1);
    assert.equal(h.calls('retrieve').length, 1);
    assert.equal(h.calls('verify').length, 0);
  });
}

test('stored-ID IPN upstream retrieval failure requests provider retry', async () => {
  const h = harness({
    onVerify: async () => {
      throw new PayplugError('retrieve_failed');
    },
  });
  const { attempt } = await (await h.post('create', payload)).json();
  const response = await h.post('ipn', { id: 'pay_12345678' });
  assert.equal(response.status, 503);
  assert.equal(h.rows.get(attempt.id).status, 'pending');
  assert.equal(h.calls('verify').length, 1);
});

test('definite create failure retains the cart revision reservation', async () => {
  const h = harness({
    onCreate: async () => {
      throw new PayplugError('create_rejected', { upstreamStatus: 400 });
    },
  });
  const initial = await h.post('create', payload);
  assert.equal(initial.status, 422);
  assert.equal((await initial.json()).attempt.status, 'failed');
  assert.equal(
    (await h.post('create', { ...payload, requestKey: secondKey })).status,
    409,
  );
  assert.equal(h.calls('create').length, 1);
});

test('browser status is verified server-side; query paid=true supplies no evidence', async () => {
  const h = harness({ onRetrieve: async () => payment('pending') });
  const { attempt } = await (await h.post('create', payload)).json();
  const response = await h.get('status', `${attempt.id}&paid=true`);
  assert.equal((await response.json()).attempt.status, 'pending');
  assert.equal(h.calls('retrieve').length, 1);
});

test('verified settlement does not clear a cart edited after test preparation', async () => {
  const h = harness({ onRetrieve: async () => payment('paid') });
  const { attempt } = await (await h.post('create', payload)).json();
  h.cart.revision = 2;
  h.cart.items.push({ productId: 'extra', quantity: 1 });
  await h.get('status', attempt.id);
  assert.equal(h.rows.get(attempt.id).status, 'paid');
  assert.equal(h.cart.revision, 2);
  assert.equal(h.cart.items.length, 2);
});

for (const delayedState of ['paid', 'pending']) {
  test(`verified refund remains under review after a delayed ${delayedState} snapshot`, async () => {
    let nextPayment = payment('paid');
    const h = harness({ onRetrieve: async () => nextPayment });
    const { attempt } = await (await h.post('create', payload)).json();
    await h.get('status', attempt.id);
    assert.equal(h.rows.get(attempt.id).status, 'paid');
    const paidAt = h.rows.get(attempt.id).paid_at;
    nextPayment = payment('unconfirmed', {
      refundedAmountCents: 1500,
      paidAt: 1789000000,
    });
    await h.get('status', attempt.id);
    assert.equal(h.rows.get(attempt.id).status, 'unconfirmed');
    assert.equal(h.rows.get(attempt.id).refunded_cents, 1500);
    nextPayment = payment(delayedState);
    const later = await (await h.get('status', attempt.id)).json();
    assert.equal(later.attempt.status, 'unconfirmed');
    assert.equal(later.attempt.paymentUrl, null);
    assert.match(later.attempt.error, /Remboursement/);
    assert.equal(h.rows.get(attempt.id).refunded_cents, 1500);
    assert.equal(h.rows.get(attempt.id).paid_at, paidAt);
    assert.equal(h.cart.revision, 2);
    assert.equal(h.calls('create').length, 1);
  });
}

test('ordinary uncertain creation can still reconcile to paid when no refund exists', async () => {
  const h = harness({
    onCreate: async () => {
      throw new PayplugError('create_unconfirmed', {
        ambiguous: true,
        providerPaymentId: 'pay_12345678',
      });
    },
    onRetrieve: async () => payment('paid'),
  });
  const { attempt } = await (await h.post('create', payload)).json();
  assert.equal(attempt.status, 'unconfirmed');
  const verified = await (await h.get('status', attempt.id)).json();
  assert.equal(verified.attempt.status, 'paid');
  assert.equal(verified.attempt.error, null);
  assert.equal(h.rows.get(attempt.id).refunded_cents, 0);
});

test('stale creating becomes unconfirmed and is not reopened for creation', async () => {
  const h = harness();
  const { attempt } = await (await h.post('create', payload)).json();
  const row = h.rows.get(attempt.id);
  row.status = 'creating';
  row.provider_id = null;
  row.updated_at = new Date(Date.now() - 180000).toISOString();
  await h.get('settings');
  assert.equal(row.status, 'unconfirmed');
  await h.post('create', payload);
  assert.equal(h.calls('create').length, 1);
});

for (const status of [408, 500, 503]) {
  test(`actual settings UI retains the exact request body and key after HTTP ${status}`, async () => {
    const h = settingsHarness(status);
    await h.mountAndLoadCart();
    await h.submit();
    const retryTree = h.render();
    assert.match(h.text(retryTree), /Reprendre la même tentative/);
    assert.equal(
      h.find(retryTree, (node) => node.type === 'fieldset').props.disabled,
      true,
    );
    assert.equal(
      h.find(
        retryTree,
        (node) =>
          node.type === 'button' && /Charger le panier/.test(h.text(node)),
      ).props.disabled,
      true,
    );
    h.fields.first_name = 'Changed after timeout';
    await h.submit();
    assert.equal(h.creates.length, 2);
    assert.deepEqual(h.creates[0], h.creates[1]);
    assert.equal(h.creates[1].billing.first_name, 'Test');
    assert.equal(h.creates[1].quotedRevision, 1);
    assert.equal(h.creates[1].quotedTotal, 4890);
    assert.match(h.creates[0].requestKey, /^[a-f0-9-]{36}$/);
  });
}

test('actual settings UI retains pending attempt after failed manual reconciliation', async () => {
  const pending = {
    id: key,
    status: 'pending',
    total: 4890,
    mode: 'payplug_test',
    providerId: 'pay_12345678',
    paymentUrl: 'https://secure.payplug.com/pay/test',
  };
  const h = settingsHarness(201, {
    createResult: { attempt: pending },
    initialAttempts: [{ ...pending, provider_id: pending.providerId }],
    reconcileStatus: 409,
  });
  await h.mountAndLoadCart();
  await h.submit();
  const tree = h.render();
  const reconciliation = h.find(
    tree,
    (node) =>
      node.type === 'form' && /Revérifier auprès de PayPlug/.test(h.text(node)),
  );
  assert.ok(reconciliation);
  await reconciliation.props.onSubmit({
    preventDefault() {},
    currentTarget: {},
  });
  const failedTree = h.render();
  assert.match(
    h.text(h.find(failedTree, (node) => node.props?.role === 'alert')),
    /Controlled reconciliation failure/,
  );
  assert.match(
    h.text(h.find(failedTree, (node) => node.props?.role === 'status')),
    /En attente chez PayPlug/,
  );
  assert.doesNotMatch(h.text(failedTree), /Paiement de test confirmé/);
  assert.equal(
    h.find(
      failedTree,
      (node) => node.type === 'a' && /Ouvrir PayPlug/.test(h.text(node)),
    ).props.href,
    pending.paymentUrl,
  );
  assert.equal(h.creates.length, 1);
});

function settingsHarness(
  createStatus,
  { createResult, initialAttempts = [], reconcileStatus = 409 } = {},
) {
  const source = readFileSync(
    resolve(root, 'components/payplug-settings.tsx'),
    'utf8',
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const state = [],
    pendingEffects = [],
    creates = [];
  let cursor = 0,
    effectsMounted = false;
  const fields = { ...payload.billing, consent: 'on' };
  const jsx = (type, props) => ({ type, props: props || {} });
  const exports = {};
  const context = vm.createContext({
    exports,
    AbortController,
    Response,
    crypto: webcrypto,
    FormData: class {
      get(name) {
        return fields[name] ?? null;
      }
    },
    require(specifier) {
      if (specifier === 'react')
        return {
          useState(initial) {
            const index = cursor++;
            if (!(index in state))
              state[index] =
                typeof initial === 'function' ? initial() : initial;
            return [
              state[index],
              (value) => {
                state[index] =
                  typeof value === 'function' ? value(state[index]) : value;
              },
            ];
          },
          useEffect(effect) {
            if (!effectsMounted) pendingEffects.push(effect);
          },
        };
      if (specifier === 'react/jsx-runtime')
        return { jsx, jsxs: jsx, Fragment: 'fragment' };
      if (specifier === '@/lib/catalog')
        return { money: (cents) => `${cents / 100} EUR` };
      throw new Error(`Unmocked UI dependency: ${specifier}`);
    },
    async fetch(url, options = {}) {
      if (url === '/api/payplug/settings')
        return Response.json({
          settings: { mode: 'payplug_test', issues: [] },
          attempts: initialAttempts,
        });
      if (url === '/api/commerce/cart')
        return Response.json({ subtotal: 4000, revision: 1, items: [{}] });
      if (url === '/api/payplug/create') {
        creates.push(JSON.parse(options.body));
        return Response.json(
          createResult || { error: 'Controlled uncertain test response' },
          { status: createStatus },
        );
      }
      if (url === '/api/payplug/reconcile')
        return Response.json(
          { error: 'Controlled reconciliation failure' },
          { status: reconcileStatus },
        );
      throw new Error(`Real network is forbidden: ${url}`);
    },
  });
  vm.runInContext(code, context, { filename: 'payplug-settings.tsx' });
  const render = () => {
    cursor = 0;
    return exports.PayplugSettings();
  };
  const text = (node) =>
    typeof node === 'string' || typeof node === 'number'
      ? String(node)
      : Array.isArray(node)
        ? node.map(text).join(' ')
        : node && typeof node === 'object'
          ? text(node.props?.children)
          : '';
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = find(child, predicate);
        if (found) return found;
      }
      return null;
    }
    if (predicate(node)) return node;
    return find(node.props?.children, predicate);
  }
  return {
    creates,
    fields,
    render,
    find,
    text,
    async mountAndLoadCart() {
      render();
      effectsMounted = true;
      for (const effect of pendingEffects) effect();
      await new Promise((resolve) => setImmediate(resolve));
      const button = find(
        render(),
        (node) =>
          node.type === 'button' && /Charger le panier/.test(text(node)),
      );
      assert.ok(button);
      assert.equal(button.props.disabled, false);
      await button.props.onClick();
    },
    async submit() {
      const form = find(render(), (node) => node.type === 'form');
      assert.ok(form);
      await form.props.onSubmit({ preventDefault() {}, currentTarget: {} });
    },
  };
}

function harness({
  admin = true,
  mode = 'payplug_test',
  issues = [],
  raceInitialReads = false,
  onCreate,
  onRetrieve,
  onVerify,
} = {}) {
  const rows = new Map();
  const cart = {
    id: cartId,
    revision: 1,
    subtotal: 4000,
    notices: [],
    items: [
      {
        productId: 'gloves',
        name: 'Test glove',
        variant: '12 oz',
        quantity: 1,
        price: 4000,
      },
    ],
    expires_at: Date.now() + 86400000,
  };
  const adapterCalls = [];
  let initialReads = 0,
    release;
  const barrier = new Promise((resolve) => {
    release = resolve;
  });
  const findKey = (cart_id, request_key) =>
    [...rows.values()].find(
      (row) => row.cart_id === cart_id && row.request_key === request_key,
    );
  const database = {
    prepare(sql) {
      let values = [];
      const statement = {
        sql,
        bind(...input) {
          values = input;
          return this;
        },
        async first() {
          if (sql === 'SELECT * FROM payment_attempts WHERE id=?')
            return clone(rows.get(values[0]) ?? null);
          if (sql.includes('WHERE provider_id=?'))
            return clone(
              [...rows.values()].find((row) => row.provider_id === values[0]) ??
                null,
            );
          if (sql.includes('WHERE cart_id=? AND request_key=?')) {
            const snapshot = clone(findKey(...values) ?? null);
            if (raceInitialReads && initialReads < 2) {
              if (++initialReads === 2) release();
              await barrier;
            }
            return snapshot;
          }
          if (sql.startsWith('INSERT INTO payment_attempts')) {
            const [
              id,
              cart_id,
              request_key,
              fingerprint,
              cart_revision,
              mode,
              name,
              email,
              billing,
              lines,
              subtotal,
              shipping,
              total,
              delivery,
              status,
              created_at,
              updated_at,
              expectedId,
              expectedRevision,
              now,
            ] = values;
            if (
              expectedId !== cart.id ||
              expectedRevision !== cart.revision ||
              cart.expires_at <= now
            )
              return null;
            if (
              findKey(cart_id, request_key) ||
              [...rows.values()].some(
                (row) =>
                  row.cart_id === cart_id &&
                  row.cart_revision === cart_revision,
              )
            )
              throw new Error('UNIQUE payment reservation');
            rows.set(id, {
              id,
              cart_id,
              request_key,
              fingerprint,
              cart_revision,
              mode,
              name,
              email,
              billing,
              lines,
              subtotal,
              shipping,
              total,
              delivery,
              status,
              created_at,
              updated_at,
              provider_id: null,
              payment_url: null,
              error: null,
              paid_at: null,
              refunded_cents: 0,
            });
            return { id };
          }
          throw new Error(`Unmocked SQL first: ${sql}`);
        },
        async all() {
          if (sql.startsWith('SELECT id,status,total,provider_id'))
            return { results: clone([...rows.values()]) };
          throw new Error(`Unmocked SQL all: ${sql}`);
        },
        async run() {
          if (sql.includes("SET status='unconfirmed'")) {
            const [updated, threshold] = values;
            for (const row of rows.values())
              if (row.status === 'creating' && row.updated_at < threshold) {
                row.status = 'unconfirmed';
                row.updated_at = updated;
              }
            return {};
          }
          if (sql.startsWith('UPDATE payment_attempts SET provider_id=')) {
            if (sql.includes('refunded_cents=MAX')) {
              assert.equal(
                values.length,
                12,
                'Verified payment update must bind all twelve placeholders',
              );
              const [
                provider_id,
                payment_url,
                refundStatus,
                state,
                stateFallback,
                refundStored,
                paid_at,
                refundError,
                error,
                updated_at,
                id,
                expectedProvider,
              ] = values;
              assert.equal(state, stateFallback);
              const row = rows.get(id);
              if (
                row &&
                (!row.provider_id || row.provider_id === expectedProvider)
              ) {
                const reviewed = row.refunded_cents > 0;
                Object.assign(row, {
                  provider_id,
                  payment_url,
                  status:
                    reviewed || refundStatus > 0 || state === 'unconfirmed'
                      ? 'unconfirmed'
                      : row.status === 'paid'
                        ? 'paid'
                        : state,
                  refunded_cents: Math.max(row.refunded_cents, refundStored),
                  paid_at: row.paid_at ?? paid_at,
                  error:
                    reviewed || refundError > 0
                      ? 'Remboursement signalé : vérifier le portail PayPlug.'
                      : error,
                  updated_at,
                });
              }
              return {};
            }
            const overridingUnconfirmed = sql.includes("WHEN ?='unconfirmed'");
            const [provider_id, payment_url, state, ...remaining] = values;
            const [paid_at, error, updated_at, id, expectedProvider] =
              overridingUnconfirmed ? remaining.slice(1) : remaining;
            const row = rows.get(id);
            if (
              row &&
              (!row.provider_id || row.provider_id === expectedProvider)
            ) {
              Object.assign(row, {
                provider_id,
                payment_url,
                status:
                  overridingUnconfirmed && state === 'unconfirmed'
                    ? 'unconfirmed'
                    : row.status === 'paid'
                      ? 'paid'
                      : state,
                paid_at: row.paid_at ?? paid_at,
                error,
                updated_at,
              });
            }
            return {};
          }
          if (sql.startsWith("UPDATE carts SET payload='[]'")) {
            const [updated, id, revision, attemptId] = values;
            if (
              id === cart.id &&
              revision === cart.revision &&
              rows.get(attemptId)?.status === 'paid'
            ) {
              cart.items = [];
              cart.revision++;
              cart.updated_at = updated;
            }
            return {};
          }
          if (sql.startsWith('UPDATE payment_attempts SET status=?')) {
            const [status, error, provider_id, updated_at, id] = values;
            const row = rows.get(id);
            if (row?.status === 'creating')
              Object.assign(row, {
                status,
                error,
                provider_id: row.provider_id ?? provider_id,
                updated_at,
              });
            return {};
          }
          throw new Error(`Unmocked SQL run: ${sql}`);
        },
      };
      return statement;
    },
    async batch(statements) {
      for (const statement of statements) await statement.run();
      return [];
    },
  };
  const adapter = {
    async createHostedPayment(args) {
      adapterCalls.push({ kind: 'create', args });
      return onCreate ? onCreate(args) : payment();
    },
    async retrieveAndVerifyPayment(id, binding) {
      adapterCalls.push({ kind: 'retrieve', id, binding });
      return onRetrieve ? onRetrieve(id, binding) : payment();
    },
    async verifyNotification(data, binding, expectedId) {
      adapterCalls.push({ kind: 'verify', data, binding, expectedId });
      return onVerify ? onVerify(data, binding, expectedId) : payment();
    },
  };
  const exports = {};
  const context = vm.createContext({
    exports,
    Request,
    Response,
    TextEncoder,
    TextDecoder,
    URL,
    crypto: webcrypto,
    require(specifier) {
      if (specifier === './database')
        return {
          db: async () => database,
          runtime: async () => ({ COMMERCE_MODE: mode }),
          isAdmin: async () => admin,
        };
      if (specifier === './commerce')
        return {
          cartToken: (request) =>
            request.headers.get('cookie')?.includes(`bd_cart=${cartId}`)
              ? cartId
              : null,
          resolveCart: async () => clone(cart),
          shippingFor: () => 890,
          uuid: (value) =>
            typeof value === 'string' &&
            /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
              value,
            ),
        };
      if (specifier === './payplug')
        return {
          PayplugError,
          payplugSettings: () => ({ mode, issues }),
          createPayplug: () => {
            if (mode !== 'payplug_test') throw new PayplugError('disabled');
            return adapter;
          },
        };
      throw new Error(`Unmocked dependency: ${specifier}`);
    },
    fetch() {
      throw new Error('Real network is forbidden');
    },
  });
  vm.runInContext(compiled, context, { filename: 'payplug-orders.ts' });
  return {
    rows,
    cart,
    adapterCalls,
    calls: (kind) => adapterCalls.filter((call) => call.kind === kind),
    get: (action, id) =>
      exports.payplugGet(
        new Request(`${origin}/api/payplug/${action}${id ? '?id=' + id : ''}`),
        action,
      ),
    post: (action, body, options = {}) =>
      exports.payplugPost(
        new Request(
          `${origin}/api/payplug/${action}${options.attemptHint ? '?attempt=' + encodeURIComponent(options.attemptHint) : ''}`,
          {
            method: 'POST',
            headers: {
              Origin: options.origin ?? origin,
              'Content-Type': 'application/json',
              Cookie: `bd_cart=${cartId}`,
            },
            body: JSON.stringify(body),
          },
        ),
        action,
      ),
  };
}


