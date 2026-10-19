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
// La vraie règle du matériel lourd (lib/catalog.ts, sans import) : le test juge ce que juge la boutique.
// Le vrai contrôle du point relais (lib/boxtal.ts, sans import) : réseaux de la carte, champs complets.
const boxtalModule = {};
vm.runInNewContext(
  ts.transpileModule(readFileSync(resolve(root, 'lib/boxtal.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports: boxtalModule, process: { env: {} } },
);
const catalogModule = {};
vm.runInNewContext(
  ts.transpileModule(readFileSync(resolve(root, 'lib/catalog.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports: catalogModule, Intl },
);
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

test('GET settings is owner only; public status answers only by attempt UUID', async () => {
  const h = harness({ admin: false });
  assert.equal((await h.get('settings')).status, 403);
  assert.equal((await h.get('status', key)).status, 404);
  assert.equal((await h.get('status', 'pas-un-uuid')).status, 400);
  assert.equal(h.adapterCalls.length, 0);
});

test('while sales are closed, create and reconcile are owner only and require same origin', async () => {
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

for (const mode of ['simulation', 'invalid']) {
  test(`${mode} cannot create a PayPlug payment and IPN is deferred (503, PayPlug retries)`, async () => {
    const h = harness({ mode });
    assert.equal((await h.post('create', payload)).status, 409);
    const ipn = await h.post('ipn', {
      id: 'pay_12345678',
      metadata: { attempt_id: key },
    });
    assert.equal(ipn.status, 503);
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

test('a definite create failure never handed a payment link: a new key may try again (13/10/2026)', async () => {
  let reject = true;
  const h = harness({
    onCreate: async () => {
      if (reject) throw new PayplugError('create_rejected', { upstreamStatus: 400 });
      return payment();
    },
  });
  const initial = await h.post('create', payload);
  assert.equal(initial.status, 422);
  assert.equal((await initial.json()).attempt.status, 'failed');
  // La même clé ne rejoue jamais la création : elle demande au client une nouvelle clé (restart),
  // et la nouvelle clé libère le panier.
  const replay = await h.post('create', payload);
  assert.equal(replay.status, 409);
  assert.equal((await replay.json()).restart, true);
  assert.equal(h.calls('create').length, 1);
  reject = false;
  const retry = await h.post('create', { ...payload, requestKey: secondKey });
  assert.equal(retry.status, 201);
  assert.equal(h.calls('create').length, 2);
  assert.equal(h.cart.revision, 2);
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
    /En attente du paiement/,
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
  ventes = false,
  nodeEnv = 'production',
  mailOn = true,
  mailFails = 0,
  onAbort,
  catalog = [],
} = {}) {
  const rows = new Map();
  const mails = [];
  const later = [];
  const rateHits = new Map();
  const schemaCalls = [];
  const adapterModes = [];
  let freshReads = 0;
  let failures = mailFails;
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
          if (sql.startsWith('INSERT INTO rate_limits')) {
            rateHits.set(values[0], (rateHits.get(values[0]) || 0) + 1);
            return rateHits.get(values[0]);
          }
          if (sql === 'SELECT * FROM payment_attempts WHERE cart_id=? AND cart_revision=?')
            return clone(
              [...rows.values()].find((row) => row.cart_id === values[0] && row.cart_revision === values[1]) ?? null,
            );
          if (sql.startsWith('UPDATE carts SET revision=revision+1')) {
            const [updated, id, revision] = values;
            if (id !== cart.id || revision !== cart.revision) return null;
            cart.revision++;
            cart.updated_at = updated;
            return cart.revision;
          }
          if (sql.startsWith('UPDATE payment_attempts SET notify_claim=? WHERE id=?')) {
            const [at, id, expired] = values;
            const row = rows.get(id);
            if (row && row.status === 'paid' && !row.notified_at && (!row.notify_claim || row.notify_claim < expired)) {
              row.notify_claim = at;
              return { id };
            }
            return null;
          }
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
          if (sql.startsWith('SELECT * FROM payment_attempts ORDER BY created_at DESC'))
            return { results: clone([...rows.values()]) };
          if (sql.startsWith("SELECT * FROM payment_attempts WHERE status IN ('pending','unconfirmed') AND provider_id IS NOT NULL"))
            return { results: clone([...rows.values()].filter((r) => ['pending', 'unconfirmed'].includes(r.status) && r.provider_id && r.created_at > values[0])) };
          if (sql.startsWith("SELECT * FROM payment_attempts WHERE cart_id=? AND cart_revision<>? AND status IN ('pending','unconfirmed') AND provider_id IS NOT NULL"))
            return { results: clone([...rows.values()].filter((r) => r.cart_id === values[0] && r.cart_revision !== values[1] && ['pending', 'unconfirmed'].includes(r.status) && r.provider_id)) };
          if (sql.startsWith("SELECT id FROM payment_attempts WHERE cart_id=? AND status='paid' AND id<>?"))
            return { results: [...rows.values()].filter((r) => r.cart_id === values[0] && r.status === 'paid' && r.id !== values[1]).map((r) => ({ id: r.id })) };
          throw new Error(`Unmocked SQL all: ${sql}`);
        },
        async run() {
          if (sql.startsWith('ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS')) return {};
          if (sql.startsWith('UPDATE payment_attempts SET shop_sent_at=?')) {
            const row = rows.get(values[1]);
            if (row) row.shop_sent_at = values[0];
            return {};
          }
          if (sql.startsWith('UPDATE payment_attempts SET client_sent_at=?')) {
            const row = rows.get(values[1]);
            if (row) row.client_sent_at = values[0];
            return {};
          }
          if (sql.startsWith('UPDATE payment_attempts SET notified_at=?, notify_error=NULL, notify_claim=NULL')) {
            const row = rows.get(values[1]);
            if (row) Object.assign(row, { notified_at: values[0], notify_error: null, notify_claim: null });
            return {};
          }
          if (sql.startsWith('UPDATE payment_attempts SET notify_claim=NULL, notify_error=?')) {
            const [message, id] = values;
            const row = rows.get(id);
            if (row) Object.assign(row, { notify_claim: null, notify_error: message });
            return {};
          }
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
            if (sql.includes('refunded_cents=CASE WHEN refunded_cents>? THEN refunded_cents ELSE ? END')) {
              // Portable form (Postgres has no two-argument MAX): the refund amount is bound twice.
              assert.equal(
                values.length,
                13,
                'Verified payment update must bind all thirteen placeholders',
              );
              const [
                provider_id,
                payment_url,
                refundStatus,
                state,
                stateFallback,
                refundCompared,
                refundStored,
                paid_at,
                refundError,
                error,
                updated_at,
                id,
                expectedProvider,
              ] = values;
              assert.equal(state, stateFallback);
              assert.equal(refundCompared, refundStored);
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
    async abortAndVerifyPayment(id, binding) {
      adapterCalls.push({ kind: 'abort', id, binding });
      return onAbort ? onAbort(id, binding) : payment('failed');
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
    process: { env: { NODE_ENV: nodeEnv, ADMIN_EMAIL: 'owner@example.invalid' } },
    console: { error() {}, warn() {}, log() {} },
    require(specifier) {
      if (specifier === 'next/server') return { after: (fn) => later.push(fn) };
      if (specifier === './catalog')
        return {
          shop: {
            ventesOuvertes: ventes,
            name: 'Boutique de Boxe',
            origin: 'https://www.boutique-de-boxe.com',
            entity: 'SAS TEST',
            siren: '000',
            address: 'adresse',
            email: 'boutique@example.invalid',
            phone: '00',
            cgvVersion: '2026-10-13',
            delais: { expedition: '7 jours ouvrés', livraisonMax: '30 jours' },
          },
          money: (cents) => (cents / 100).toFixed(2) + ' EUR',
          estLourd: catalogModule.estLourd,
          lourdDuCatalogue: catalogModule.lourdDuCatalogue,
        };
      if (specifier === './alerts')
        return { suspicion: (email) => (/^r\.o\.b\.o\.t/.test(email) ? 'robot' : null) };
      if (specifier === './request') return { clientIp: () => '203.0.113.7' };
      if (specifier === './boxtal') return boxtalModule;
      if (specifier === './mailer')
        return {
          mailerConfigured: () => mailOn,
          sendMail: async (mail) => {
            if (failures > 0) {
              failures--;
              throw new Error('Resend 500 : test');
            }
            mails.push(mail);
            return { account: 'test', id: 'm' + mails.length };
          },
        };
      if (specifier === './database')
        return {
          db: async () => database,
          runtime: async () => ({ COMMERCE_MODE: mode }),
          isAdmin: async () => admin,
          readCatalog: async () => clone(catalog),
          readCatalogFresh: async () => {
            freshReads++;
            return clone(catalog);
          },
          ensureSchema: async (name) => {
            schemaCalls.push(name);
            return true;
          },
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
          // Comme le vrai : la clé (et donc le mode) vient de l'environnement passé, pas de l'interrupteur courant.
          createPayplug: (env) => {
            const m = env?.COMMERCE_MODE;
            if (m !== 'payplug_test' && m !== 'payplug_live') throw new PayplugError('disabled');
            adapterModes.push(m);
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
    mails,
    schemaCalls,
    adapterModes,
    get freshReads() {
      return freshReads;
    },
    /** Change l'interrupteur des ventes en cours de test (COMMERCE_MODE). */
    setMode: (next) => {
      mode = next;
    },
    /** Exécute ce que la route a confié à after() (e-mails de commande), comme Next après la réponse. */
    flush: async () => {
      while (later.length) await later.shift()();
    },
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



const publicPayload = {
  requestKey: key,
  cgv: true,
  quotedTotal: 4690,
  quotedRevision: 1,
  delivery: 'relay',
  phone: '06 12 34 56 78',
  website: '',
  billing: { ...payload.billing, address2: 'Bâtiment B' },
};
const relayHarness = (options = {}) => {
  const h = harness({ admin: false, ventes: true, mode: 'payplug_live', ...options });
  return h;
};

test('public create is refused while sales are closed, even in live mode', async () => {
  const h = harness({ admin: false, ventes: false, mode: 'payplug_live' });
  assert.equal((await h.post('create', publicPayload)).status, 403);
  assert.equal(h.rows.size, 0);
  assert.equal(h.adapterCalls.length, 0);
});

test('public test mode never opens in production (owner only)', async () => {
  const h = harness({ admin: false, ventes: true, mode: 'payplug_test', nodeEnv: 'production' });
  assert.equal((await h.post('create', publicPayload)).status, 409);
  assert.equal(h.rows.size, 0);
  const local = harness({ admin: false, ventes: true, mode: 'payplug_test', nodeEnv: 'development' });
  // shippingFor est simulé à 890 : le total cité doit suivre le serveur, pas le navigateur.
  assert.equal((await local.post('create', { ...publicPayload, quotedTotal: 4890 })).status, 201);
});

test('live public create: CGV required, server total, live mode stored, payment named with the order reference', async () => {
  const h = relayHarness();
  assert.equal((await h.post('create', { ...publicPayload, cgv: false })).status, 400);
  assert.equal((await h.post('create', { ...publicPayload, testConsent: true, cgv: undefined })).status, 400);
  // Le montant cité par le navigateur ne fait pas foi : 46,90 € n'est pas le total du serveur (40 + 8,90).
  assert.equal((await h.post('create', publicPayload)).status, 409);
  const response = await h.post('create', { ...publicPayload, quotedTotal: 4890 });
  assert.equal(response.status, 201);
  const { attempt } = await response.json();
  const row = h.rows.get(attempt.id);
  assert.equal(row.mode, 'payplug_live');
  assert.equal(row.delivery, 'relay');
  assert.equal(row.total, 4890);
  const stored = JSON.parse(row.billing);
  assert.equal(stored.phone, '06 12 34 56 78');
  assert.equal(stored.address2, 'Bâtiment B');
  const call = h.calls('create')[0].args;
  assert.equal(call.binding.mode, 'payplug_live');
  assert.equal(call.binding.amountCents, 4890);
  assert.match(call.reference, /^BDB-[0-9A-F]{8}$/);
});

test('honeypot and robot addresses are refused before any reservation', async () => {
  const h = relayHarness();
  assert.equal((await h.post('create', { ...publicPayload, quotedTotal: 4890, website: 'http://spam.invalid' })).status, 400);
  assert.equal(
    (await h.post('create', { ...publicPayload, quotedTotal: 4890, billing: { ...publicPayload.billing, email: 'r.o.b.o.t.x@gmail.com' } })).status,
    400,
  );
  assert.equal(h.rows.size, 0);
  assert.equal(h.adapterCalls.length, 0);
});

test('public create is rate limited per address', async () => {
  const h = relayHarness();
  let last;
  for (let i = 0; i < 13; i++) last = await h.post('create', { ...publicPayload, cgv: false });
  assert.equal(last.status, 429);
});

test('public status shows the order without address, e-mail or PayPlug identifier', async () => {
  const h = relayHarness({ onRetrieve: async () => payment('pending') });
  const { attempt } = await (await h.post('create', { ...publicPayload, quotedTotal: 4890 })).json();
  const body = await (await h.get('status', attempt.id)).json();
  assert.equal(body.attempt.reference, 'BDB-' + attempt.id.slice(0, 8).toUpperCase());
  assert.equal(body.attempt.firstName, 'Test');
  for (const hidden of ['providerId', 'email', 'billing', 'customer', 'error', 'name'])
    assert.equal(body.attempt[hidden], undefined, hidden);
  assert.equal(JSON.stringify(body).includes('10 rue du Test'), false);
});

test('a paid order sends the customer and shop e-mails exactly once', async () => {
  const h = relayHarness({ onVerify: async () => payment('paid'), onRetrieve: async () => payment('paid') });
  const { attempt } = await (await h.post('create', { ...publicPayload, quotedTotal: 4890 })).json();
  assert.equal((await h.post('ipn', { id: 'pay_12345678' })).status, 200);
  await h.flush();
  assert.equal((await h.post('ipn', { id: 'pay_12345678' })).status, 200);
  await h.get('status', attempt.id);
  await h.flush();
  assert.equal(h.mails.length, 2);
  assert.deepEqual(h.mails.map((m) => m.to), ['owner@example.invalid', 'nobody@example.invalid'], 'the shop is told first');
  assert.ok(h.mails.every((m) => m.transactional === true), 'order mails never starve behind the newsletter quota');
  assert.match(h.mails[1].text, /Formulaire de rétractation/);
  const row = h.rows.get(attempt.id);
  assert.equal(JSON.parse(row.billing).cgvVersion, '2026-10-13');
  assert.match(h.mails.find((m) => m.to === 'nobody@example.invalid').subject, /BDB-[0-9A-F]{8}/);
  assert.equal(h.mails.find((m) => m.to === 'owner@example.invalid').subject.startsWith('[TEST]'), false);
  assert.ok(h.mails.every((m) => typeof m.key === 'string' && m.key.startsWith('commande/')));
  assert.ok(h.rows.get(attempt.id).notified_at);
});

test('a failed e-mail releases the claim and is retried on the next status read', async () => {
  const h = relayHarness({ mailFails: 1, onVerify: async () => payment('paid'), onRetrieve: async () => payment('paid') });
  const { attempt } = await (await h.post('create', { ...publicPayload, quotedTotal: 4890 })).json();
  await h.post('ipn', { id: 'pay_12345678' });
  await h.flush();
  assert.equal(h.rows.get(attempt.id).notified_at ?? null, null);
  assert.match(h.rows.get(attempt.id).notify_error, /Resend 500/);
  await h.get('status', attempt.id);
  await h.flush();
  assert.equal(h.mails.length, 2);
  assert.equal(h.rows.get(attempt.id).notify_error, null);
});

test('unpaid or refunded orders never send order e-mails', async () => {
  const h = relayHarness({ onVerify: async () => payment('failed'), onRetrieve: async () => payment('failed') });
  await h.post('create', { ...publicPayload, quotedTotal: 4890 });
  await h.post('ipn', { id: 'pay_12345678' });
  await h.flush();
  assert.equal(h.mails.length, 0);
});

test('a declined card releases the cart: the customer can pay again with a new attempt', async () => {
  let state = 'failed';
  const h = relayHarness({ onRetrieve: async () => payment(state), onVerify: async () => payment(state) });
  const first = await (await h.post('create', { ...publicPayload, quotedTotal: 4890 })).json();
  await h.post('ipn', { id: 'pay_12345678' });
  assert.equal(h.rows.get(first.attempt.id).status, 'failed');
  const retry = await h.post('create', { ...publicPayload, quotedTotal: 4890, requestKey: secondKey });
  assert.equal(retry.status, 201);
  const second = (await retry.json()).attempt;
  assert.notEqual(second.id, first.attempt.id);
  assert.equal(h.rows.get(second.id).cart_revision, 2);
  assert.equal(h.calls('create').length, 2);
});

test('an abandoned payment is resumed, never doubled, when nothing changed', async () => {
  const h = relayHarness({ onRetrieve: async () => payment('pending') });
  const first = await (await h.post('create', { ...publicPayload, quotedTotal: 4890 })).json();
  const again = await (await h.post('create', { ...publicPayload, quotedTotal: 4890, requestKey: secondKey })).json();
  assert.equal(again.attempt.id, first.attempt.id);
  assert.equal(h.calls('create').length, 1);
  assert.equal(h.rows.size, 1);
});

test('a holder actually paid at PayPlug is never released for a second payment', async () => {
  let state = 'pending';
  const h = relayHarness({ onRetrieve: async () => payment(state) });
  const first = await (await h.post('create', { ...publicPayload, quotedTotal: 4890 })).json();
  state = 'paid';
  const again = await h.post('create', { ...publicPayload, quotedTotal: 4890, requestKey: secondKey, phone: '' });
  assert.equal((await again.json()).attempt.status, 'paid');
  assert.equal(h.calls('create').length, 1);
  assert.equal(h.rows.get(first.attempt.id).status, 'paid');
});

test('heavy equipment is quoted, never charged at the parcel rate', async () => {
  const h = relayHarness();
  h.cart.items.push({ productId: 'bag', name: 'Sac de frappe Elion 1,35 m 45 kg', variant: '', quantity: 1, price: 19900 });
  const r = await h.post('create', { ...publicPayload, quotedTotal: 4890 });
  assert.equal(r.status, 409);
  const body = await r.json();
  assert.deepEqual(body.heavy, ['bag']);
  assert.match(body.error, /devis/);
  assert.equal(h.rows.size, 0);
  assert.equal(h.adapterCalls.length, 0);
});

test('Corsica, overseas and Monaco postcodes are on request', async () => {
  for (const postcode of ['20000', '97400', '98000']) {
    const h = relayHarness();
    const r = await h.post('create', { ...publicPayload, quotedTotal: 4890, billing: { ...publicPayload.billing, postcode } });
    assert.equal(r.status, 400, postcode);
    assert.equal(h.rows.size, 0);
  }
});

test('a payable payment with changed details is aborted at PayPlug before a new one exists', async () => {
  const h = relayHarness({ onRetrieve: async () => payment('pending'), onAbort: async () => payment('failed') });
  const first = await (await h.post('create', { ...publicPayload, quotedTotal: 4890 })).json();
  const changed = await h.post('create', { ...publicPayload, quotedTotal: 4890, requestKey: secondKey, phone: '' });
  assert.equal(changed.status, 201);
  assert.equal(h.calls('abort').length, 1);
  assert.equal(h.calls('abort')[0].id, 'pay_12345678');
  assert.equal(h.rows.get(first.attempt.id).status, 'failed');
  assert.equal(h.calls('create').length, 2);
});

test('if PayPlug will not abort an open payment, no second payment is created', async () => {
  const h = relayHarness({ onRetrieve: async () => payment('pending'), onAbort: async () => payment('pending') });
  await h.post('create', { ...publicPayload, quotedTotal: 4890 });
  const changed = await h.post('create', { ...publicPayload, quotedTotal: 4890, requestKey: secondKey, phone: '' });
  assert.equal(changed.status, 409);
  assert.equal(h.calls('create').length, 1);
});

test('in live mode the owner cannot use the test consent to skip the CGV', async () => {
  const h = harness({ admin: true, ventes: true, mode: 'payplug_live' });
  assert.equal((await h.post('create', payload)).status, 400);
  assert.equal(h.rows.size, 0);
});

test('public create responses never show the PayPlug identifier or the error journal', async () => {
  const h = relayHarness();
  const body = await (await h.post('create', { ...publicPayload, quotedTotal: 4890 })).json();
  assert.equal(body.attempt.providerId, undefined);
  assert.equal(body.attempt.error, undefined);
  assert.ok(body.attempt.paymentUrl);
});

test('a second paid order on the same cart is flagged to the shop as a possible double payment', async () => {
  const h = relayHarness({ onVerify: async () => payment('paid'), onRetrieve: async () => payment('paid') });
  const first = await (await h.post('create', { ...publicPayload, quotedTotal: 4890 })).json();
  await h.post('ipn', { id: 'pay_12345678' });
  await h.flush();
  const twin = { ...h.rows.get(first.attempt.id), id: '30000000-0000-4000-8000-000000000003', provider_id: 'pay_99999999', notified_at: null, notify_claim: null, shop_sent_at: null, client_sent_at: null, request_key: 'other', cart_revision: 9 };
  h.rows.set(twin.id, twin);
  await h.get('status', twin.id);
  await h.flush();
  const shopMail = h.mails.filter((m) => m.to === 'owner@example.invalid').at(-1);
  assert.match(shopMail.text, /ATTENTION : ce même panier a déjà une commande payée/);
});

test('owner settings re-read open payments at PayPlug (lost notification) and send the e-mails', async () => {
  let state = 'pending';
  const h = relayHarness({ onRetrieve: async () => payment(state) });
  const first = await (await h.post('create', { ...publicPayload, quotedTotal: 4890 })).json();
  state = 'paid';
  const owner = harness({ onRetrieve: async () => payment('paid') });
  // Même base simulée : on rejoue la lecture des réglages par l'équipe sur la ligne existante.
  owner.rows.set(first.attempt.id, { ...h.rows.get(first.attempt.id) });
  const r = await owner.get('settings');
  assert.equal(r.status, 200);
  await owner.flush();
  assert.equal(owner.rows.get(first.attempt.id).status, 'paid');
  assert.equal(owner.mails.length, 2);
});

// 19/10/2026 — client bloqué après une création incertaine ou refusée (audit D3) : la même clé ne rejoue
// jamais une création, mais une tentative morte libère le client au lieu de lui rendre la même impasse.
test('uncertain create without PayPlug id: same key asks for a new key, the new key pays (no reload)', async () => {
  let n = 0;
  const h = relayHarness({
    onCreate: async () => {
      if (++n === 1) throw new PayplugError('create_unconfirmed', { ambiguous: true });
      return payment('pending', { id: 'pay_second01' });
    },
  });
  const first = await h.post('create', { ...publicPayload, quotedTotal: 4890 });
  assert.equal(first.status, 202);
  const dead = (await first.json()).attempt;
  assert.equal(dead.status, 'unconfirmed');
  const replay = await h.post('create', { ...publicPayload, quotedTotal: 4890 });
  assert.equal(replay.status, 409);
  assert.equal((await replay.json()).restart, true);
  assert.equal(h.calls('create').length, 1, 'the same key never creates twice');
  const retry = await h.post('create', { ...publicPayload, quotedTotal: 4890, requestKey: secondKey });
  assert.equal(retry.status, 201);
  const fresh = (await retry.json()).attempt;
  assert.notEqual(fresh.id, dead.id);
  assert.ok(fresh.paymentUrl);
  assert.equal(h.rows.get(fresh.id).cart_revision, 2);
  assert.equal(h.calls('create').length, 2);
});

test('uncertain create with a PayPlug id: the same key re-reads PayPlug and resumes the real payment', async () => {
  const h = relayHarness({
    onCreate: async () => {
      throw new PayplugError('create_unconfirmed', { ambiguous: true, providerPaymentId: 'pay_12345678' });
    },
    onRetrieve: async () => payment('pending'),
  });
  const first = await (await h.post('create', { ...publicPayload, quotedTotal: 4890 })).json();
  assert.equal(first.attempt.paymentUrl, null);
  const replay = await h.post('create', { ...publicPayload, quotedTotal: 4890 });
  assert.equal(replay.status, 200);
  const resumed = (await replay.json()).attempt;
  assert.equal(resumed.id, first.attempt.id);
  assert.equal(resumed.status, 'pending');
  assert.ok(resumed.paymentUrl);
  assert.equal(h.calls('create').length, 1);
});

test('a preparation still running is never restarted; one cut off by the function limit is', async () => {
  const h = relayHarness();
  await h.post('create', { ...publicPayload, quotedTotal: 4890 });
  const row = [...h.rows.values()][0];
  Object.assign(row, { status: 'creating', provider_id: null, payment_url: null, updated_at: new Date().toISOString() });
  const young = await h.post('create', { ...publicPayload, quotedTotal: 4890 });
  assert.equal(young.status, 200);
  assert.equal((await young.json()).attempt.status, 'creating');
  row.updated_at = new Date(Date.now() - 180000).toISOString();
  const cut = await h.post('create', { ...publicPayload, quotedTotal: 4890 });
  assert.equal(cut.status, 409);
  assert.equal((await cut.json()).restart, true);
  assert.equal(h.calls('create').length, 1);
});

test('a refused preparation (422) says why instead of « service indisponible »', async () => {
  const h = relayHarness({
    onCreate: async () => {
      throw new PayplugError('create_rejected', { upstreamStatus: 401 });
    },
  });
  const r = await h.post('create', { ...publicPayload, quotedTotal: 4890 });
  assert.equal(r.status, 422);
  const body = await r.json();
  assert.match(body.error, /n’a pas pu être préparé/);
  assert.equal(body.attempt.status, 'failed');
});

// 19/10/2026 — double paiement (audit D13) : un onglet PayPlug resté ouvert sur une ancienne révision.
const twoTabs = (onAbort) => {
  let n = 0;
  const states = new Map([['pay_oldtab01', 'pending']]);
  const h = relayHarness({
    onCreate: async () => payment('pending', { id: ++n === 1 ? 'pay_oldtab01' : 'pay_newtab02' }),
    onRetrieve: async (id) => payment(states.get(id) ?? 'pending', { id }),
    onAbort: async (id) => {
      const next = onAbort ? onAbort(id) : 'failed';
      states.set(id, next);
      return payment(next, { id });
    },
  });
  return { h, states };
};
const addGloves = (h) => {
  h.cart.items.push({ productId: 'wraps', name: 'Test wraps', variant: '', quantity: 1, price: 1000 });
  h.cart.subtotal += 1000;
  h.cart.revision += 1;
};

test('a payment still open on an older cart revision is aborted at PayPlug before the new one exists', async () => {
  const { h } = twoTabs();
  const old = (await (await h.post('create', { ...publicPayload, quotedTotal: 4890 })).json()).attempt;
  addGloves(h);
  const r = await h.post('create', { ...publicPayload, quotedTotal: 5890, quotedRevision: 2, requestKey: secondKey });
  assert.equal(r.status, 201);
  assert.deepEqual(h.calls('abort').map((c) => c.id), ['pay_oldtab01']);
  assert.equal(h.rows.get(old.id).status, 'failed');
  assert.equal(h.calls('create').length, 2);
});

test('if the older open payment cannot be aborted, no second payment is created', async () => {
  const { h } = twoTabs(() => 'pending');
  await h.post('create', { ...publicPayload, quotedTotal: 4890 });
  addGloves(h);
  const r = await h.post('create', { ...publicPayload, quotedTotal: 5890, quotedRevision: 2, requestKey: secondKey });
  assert.equal(r.status, 409);
  assert.equal(h.calls('create').length, 1);
});

test('an older revision paid meanwhile is reported, never paid a second time silently', async () => {
  const { h, states } = twoTabs();
  const old = (await (await h.post('create', { ...publicPayload, quotedTotal: 4890 })).json()).attempt;
  addGloves(h);
  states.set('pay_oldtab01', 'paid');
  const r = await h.post('create', { ...publicPayload, quotedTotal: 5890, quotedRevision: 2, requestKey: secondKey });
  assert.equal(r.status, 409);
  assert.match((await r.json()).error, new RegExp(old.reference));
  assert.equal(h.rows.get(old.id).status, 'paid');
  assert.equal(h.calls('create').length, 1);
  assert.equal(h.calls('abort').length, 0);
});

test('heavy equipment is judged on the catalogue entry, not only on the line name', async () => {
  const h = relayHarness({
    catalog: [{ id: 'station', name: 'Station d’entraînement Focusmaster', category: 'sacs-de-frappe', specs: { Type: 'Base de frappe et Dummies' } }],
  });
  // Nom de ligne anodin (renommage dans l'atelier) : le rayon et le type suffisent.
  h.cart.items.push({ productId: 'station', name: 'Focusmaster Century', variant: '', quantity: 1, price: 95200 });
  const r = await h.post('create', { ...publicPayload, quotedTotal: 4890 });
  assert.equal(r.status, 409);
  assert.deepEqual((await r.json()).heavy, ['station']);
  assert.equal(h.rows.size, 0);
});

// --- Robustesse du 19/10 (D12, D14, D17, D20, D21, D28, D35) ---

const relay = { code: 'FR-12345', network: 'MONR_NETWORK', name: 'Tabac du Ring', address: '4 rue des Cordes', postcode: '31000', city: 'Toulouse' };

test('D17: switching COMMERCE_MODE does not freeze live attempts (IPN, status, reconcile use the attempt mode)', async () => {
  const h = relayHarness({ onVerify: async () => payment('paid'), onRetrieve: async () => payment('paid') });
  const { attempt } = await (await h.post('create', { ...publicPayload, quotedTotal: 4890 })).json();
  assert.equal(h.rows.get(attempt.id).mode, 'payplug_live');
  for (const next of ['simulation', 'payplug_test']) {
    h.setMode(next);
    h.adapterModes.length = 0;
    assert.equal((await h.post('ipn', { id: 'pay_12345678' })).status, 200);
    assert.deepEqual(h.adapterModes, ['payplug_live']);
  }
  assert.equal(h.rows.get(attempt.id).status, 'paid');
  // L'atelier relit aussi la tentative live alors que l'interrupteur est en simulation.
  h.setMode('simulation');
  const owner = harness({ mode: 'simulation', onRetrieve: async () => payment('paid') });
  owner.rows.set(attempt.id, { ...h.rows.get(attempt.id) });
  const r = await owner.post('reconcile', { id: attempt.id });
  assert.equal(r.status, 200);
  assert.deepEqual(owner.adapterModes, ['payplug_live']);
  // Mais aucune création hors mode de vente.
  assert.equal((await owner.post('create', payload)).status, 409);
});

test('D28: the attempt hint only serves a young creating/pending attempt; old or settled ones are ignored', async () => {
  const h = harness({ onRetrieve: async () => payment('paid') });
  const id = '30000000-0000-4000-8000-000000000001';
  const base = { id, cart_id: cartId, request_key: key, fingerprint: '', cart_revision: 1, mode: 'payplug_test', name: 'T L', email: 'nobody@example.invalid', billing: '{}', lines: '[]', subtotal: 4000, shipping: 890, total: 4890, delivery: 'home', provider_id: null, payment_url: null, error: null, paid_at: null, refunded_cents: 0, updated_at: new Date().toISOString() };
  h.rows.set(id, { ...base, status: 'pending', created_at: new Date(Date.now() - 2 * 3600000).toISOString() });
  assert.equal((await h.post('ipn', { id: 'pay_12345678' }, { attemptHint: id })).status, 503);
  h.rows.set(id, { ...base, status: 'failed', created_at: new Date().toISOString() });
  assert.equal((await h.post('ipn', { id: 'pay_12345678' }, { attemptHint: id })).status, 503);
  assert.equal(h.adapterCalls.length, 0);
  h.rows.set(id, { ...base, status: 'pending', created_at: new Date().toISOString() });
  assert.equal((await h.post('ipn', { id: 'pay_12345678' }, { attemptHint: id })).status, 200);
  assert.equal(h.calls('retrieve').length, 1);
});

test('D28: IPN is rate limited per address before any lookup or provider call', async () => {
  const h = harness();
  let last;
  for (let i = 0; i < 301; i++) last = await h.post('ipn', { id: 'pay_unknown99' });
  assert.equal(last.status, 429);
  assert.equal(h.adapterCalls.length, 0);
});

test('D14: create, IPN and status never touch the schema; the order e-mails ensure it after the response', async () => {
  const h = harness({ onVerify: async () => payment('paid') });
  const { attempt } = await (await h.post('create', payload)).json();
  await h.post('ipn', { id: 'pay_12345678' });
  await h.get('status', attempt.id);
  assert.deepEqual(h.schemaCalls, []);
  await h.flush();
  assert.ok(h.schemaCalls.length >= 1 && h.schemaCalls.every((n) => n === 'payment_attempts.notify'));
});

test('D20: relay point must belong to a map network and to mainland France', async () => {
  const h = relayHarness();
  const send = (r) => h.post('create', { ...publicPayload, quotedTotal: 4890, relay: r });
  assert.equal((await send({ ...relay, network: 'FAKE_NETWORK' })).status, 400);
  const corse = await send({ ...relay, postcode: '20000', city: 'Ajaccio' });
  assert.equal(corse.status, 400);
  assert.match((await corse.json()).error, /France continentale/);
  assert.equal((await send({ ...relay, postcode: '97400', city: 'Saint-Denis' })).status, 400);
  assert.equal(h.rows.size, 0);
  assert.equal(h.adapterCalls.length, 0);
});

test('D21: a relay order sends PayPlug the relay address as SHIP_TO_STORE; home delivery keeps billing', async () => {
  const h = relayHarness();
  const r = await h.post('create', { ...publicPayload, quotedTotal: 4890, relay: { ...relay, network: 'MONR' } });
  assert.equal(r.status, 201);
  const { shipping } = h.calls('create')[0].args;
  assert.equal(shipping.delivery_type, 'SHIP_TO_STORE');
  assert.equal(shipping.address1, relay.address);
  assert.equal(shipping.postcode, relay.postcode);
  assert.equal(shipping.first_name, 'Test');
  const stored = JSON.parse([...h.rows.values()][0].billing);
  assert.equal(stored.relay.network, 'MONR_NETWORK');
  const home = relayHarness();
  assert.equal((await home.post('create', { ...publicPayload, delivery: 'home', quotedTotal: 4890 })).status, 201);
  assert.equal(home.calls('create')[0].args.shipping, undefined);
});

test('D12: a price gap is re-checked on a fresh catalogue before answering « Le panier a changé »', async () => {
  const h = relayHarness();
  assert.equal((await h.post('create', { ...publicPayload, quotedTotal: 4790 })).status, 409);
  assert.equal(h.freshReads, 1);
  assert.equal((await h.post('create', { ...publicPayload, quotedTotal: 4890 })).status, 201);
  assert.equal(h.freshReads, 1);
});
