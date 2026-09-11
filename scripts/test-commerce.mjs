/**
 * Local-only integration test draft for the boutique simulated checkout.
 * No source changes, no catalogue edits, no real card data or e-mail recipients.
 * Run only with outbound mail disabled on the LOCAL server:
 *   node .research/commerce-security-tests.mjs --email-disabled
 * Optional: COMMERCE_TEST_BASE=http://localhost:3000
 *
 * Contract reviewed against app/api/commerce/[action]/route.ts on 2026-09-10.
 * Some checks intentionally expose the pending concurrency/header hardening.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = new URL(process.env.COMMERCE_TEST_BASE || 'http://localhost:3000');
assert.ok(
  base.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname),
  'These tests may create synthetic orders and must only run on localhost.',
);
assert.ok(
  process.argv.includes('--email-disabled'),
  'Confirm the local server has outbound email disabled with --email-disabled.',
);
assert.equal(base.pathname, '/');
const origin = base.origin;
const run = randomUUID();
const recipient = `commerce-${run}@example.invalid`;
const results = [];

// Current exact response shapes. Prices and totals are integer cents.
const contract = {
  cart: (body) => body,
  lines: (cart) => cart.items,
  productId: (line) => line.productId,
  quantity: (line) => line.quantity,
  unitPrice: (line) => line.price,
  subtotal: (cart) => cart.subtotal,
  order: (body) => body.order || body,
  orderId: (body) => (body.order || body).id,
  orderStatus: (body) => (body.order || body).status,
  emailStatus: (body) =>
    body.order ? body.order.email_status : body.emailStatus,
  add: (product, quantity = 1, variant = product.sizes?.[0] || '') => ({
    action: 'add',
    productId: product.id,
    variant,
    quantity,
  }),
  update: (line, quantity) => ({
    action: 'update',
    productId: line.productId,
    variant: line.variant,
    quantity,
  }),
};

class Session {
  cookies = new Map();
  lastSetCookies = [];
  setCookieHistory = [];
  constructor() {
    // The hosted service must use trusted edge IPs. Local test fixture only.
    this.testIP = `203.0.113.${1 + Math.floor(Math.random() * 253)}`;
  }
  async request(path, payload, headers = {}) {
    const supplied = { ...headers };
    const h = {
      Origin: origin,
      'cf-connecting-ip': this.testIP,
      ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(this.cookies.size
        ? { Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ') }
        : {}),
      ...supplied,
    };
    for (const key of Object.keys(h)) if (h[key] === null) delete h[key];
    const response = await fetch(new URL(path, base), {
      method: payload === undefined ? 'GET' : 'POST',
      headers: h,
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });
    this.lastSetCookies = response.headers.getSetCookie();
    this.setCookieHistory.push(...this.lastSetCookies);
    for (const cookie of this.lastSetCookies) {
      const pair = cookie.split(';', 1)[0];
      const split = pair.indexOf('=');
      this.cookies.set(pair.slice(0, split), pair.slice(split + 1));
    }
    const raw = await response.text();
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      body = { nonJson: raw.slice(0, 250) };
    }
    return { response, body, raw, status: response.status };
  }
  async cart() {
    const r = await this.request('/api/commerce/cart');
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const cart = contract.cart(r.body);
    assert.ok(
      Array.isArray(contract.lines(cart)),
      'Cart must return an items/lines array.',
    );
    return cart;
  }
  async clear() {
    const r = await this.request('/api/commerce/cart', { action: 'clear' });
    assert.ok([200, 204].includes(r.status), JSON.stringify(r.body));
  }
}
const rejected = (r) =>
  assert.ok(
    [400, 403, 409, 422].includes(r.status),
    `Expected validation rejection, received ${r.status}: ${JSON.stringify(r.body)}`,
  );
const successful = (r) =>
  assert.ok(
    [200, 201].includes(r.status),
    `Expected success, received ${r.status}: ${JSON.stringify(r.body)}`,
  );
async function check(name, fn) {
  await fn();
  results.push(name);
  console.log(`PASS ${name}`);
}
async function add(session, product, quantity = 1) {
  const r = await session.request(
    '/api/commerce/cart',
    contract.add(product, quantity),
  );
  successful(r);
  return session.cart();
}
async function checkoutBody(session, overrides = {}) {
  const cart = await session.cart();
  const delivery = overrides.delivery || 'relay';
  const shipping = delivery === 'home' ? 890 : cart.subtotal >= 6900 ? 0 : 690;
  return {
    name: 'Test simulation local',
    email: recipient,
    delivery: 'relay',
    address1: '12 rue du Ring',
    postcode: '31000',
    city: 'Toulouse',
    paymentOutcome: 'approved',
    idempotencyKey: randomUUID(),
    consent: true,
    quotedTotal: cart.subtotal + shipping,
    quotedRevision: cart.revision,
    ...overrides,
  };
}

const catalogueResult = await new Session().request('/api/catalog');
assert.equal(catalogueResult.status, 200);
const products = catalogueResult.body.products;
assert.ok(Array.isArray(products));
const product = products.find(
  (p) => p.sizes?.length > 0 && Number.isSafeInteger(p.price) && p.price > 100,
);
assert.ok(
  product,
  'A valid variant product is required for meaningful commerce checks.',
);
const activeSessions = [];
const session = () => {
  const s = new Session();
  activeSessions.push(s);
  return s;
};

try {
  await check(
    'Cart session is private and uses an HttpOnly cookie',
    async () => {
      const s = session();
      await s.cart();
      if (!s.cookies.has('bd_cart')) await add(s, product);
      const cookie = s.setCookieHistory.find((c) => c.startsWith('bd_cart='));
      assert.ok(s.cookies.has('bd_cart'), 'Cart session cookie missing.');
      assert.ok(cookie, 'Cart cookie was not issued by the server.');
      assert.match(cookie, /;\s*HttpOnly(?:;|$)/i);
      assert.match(cookie, /;\s*SameSite=(?:Strict|Lax)(?:;|$)/i);
      const other = session();
      assert.equal(contract.lines(await other.cart()).length, 0);
    },
  );

  await check('Foreign and missing Origin cannot mutate a cart', async () => {
    const s = session();
    await s.cart();
    for (const Origin of ['https://unrelated.example', null]) {
      rejected(
        await s.request('/api/commerce/cart', contract.add(product), {
          Origin,
        }),
      );
    }
    assert.equal(contract.lines(await s.cart()).length, 0);
  });

  await check(
    'Client supplied prices are ignored and server cents are used',
    async () => {
      const s = session();
      successful(
        await s.request('/api/commerce/cart', {
          ...contract.add(product, 2),
          price: 1,
          unitPrice: 1,
          priceCents: 1,
          total: 1,
          subtotal: 1,
        }),
      );
      const cart = await s.cart();
      const lines = contract.lines(cart);
      assert.equal(lines.length, 1);
      assert.equal(contract.quantity(lines[0]), 2);
      assert.equal(contract.unitPrice(lines[0]), product.price);
      assert.equal(contract.subtotal(cart), 2 * product.price);
    },
  );

  await check(
    'Unknown products and invented variants are rejected',
    async () => {
      const s = session();
      await s.cart();
      rejected(
        await s.request('/api/commerce/cart', {
          ...contract.add(product),
          productId: 'does-not-exist-' + run,
        }),
      );
      rejected(
        await s.request(
          '/api/commerce/cart',
          contract.add(product, 1, 'variant-inventee-' + run),
        ),
      );
      assert.equal(contract.lines(await s.cart()).length, 0);
    },
  );

  await check('Add quantity must be an integer from 1 to 10', async () => {
    const s = session();
    await s.cart();
    for (const quantity of [-1, 0, 0.5, 1.5, 11, 1000000, '2', null]) {
      rejected(
        await s.request('/api/commerce/cart', contract.add(product, quantity)),
      );
    }
    assert.equal(contract.lines(await s.cart()).length, 0);
  });

  await check(
    'Duplicate additions cannot bypass the per-line quantity limit',
    async () => {
      const s = session();
      await add(s, product, 10);
      rejected(await s.request('/api/commerce/cart', contract.add(product, 1)));
      const cart = await s.cart();
      assert.equal(contract.lines(cart).length, 1);
      assert.equal(contract.quantity(contract.lines(cart)[0]), 10);
    },
  );

  await check(
    'Updates recalculate the authoritative total and reject fractions',
    async () => {
      const s = session();
      const before = await add(s, product, 1);
      const line = contract.lines(before)[0];
      rejected(
        await s.request('/api/commerce/cart', contract.update(line, 2.5)),
      );
      successful(
        await s.request('/api/commerce/cart', {
          ...contract.update(line, 3),
          price: 1,
          subtotal: 1,
        }),
      );
      const after = await s.cart();
      assert.equal(contract.quantity(contract.lines(after)[0]), 3);
      assert.equal(contract.subtotal(after), product.price * 3);
      successful(
        await s.request(
          '/api/commerce/cart',
          contract.update(contract.lines(after)[0], 0),
        ),
      );
      assert.equal(
        contract.lines(await s.cart()).length,
        0,
        'Quantity zero is the current remove-line contract.',
      );
    },
  );

  await check(
    'Concurrent accepted cart mutations do not overwrite one another',
    async () => {
      const secondProduct = products.find(
        (p) => p.id !== product.id && Number.isSafeInteger(p.price),
      );
      assert.ok(secondProduct);
      for (let round = 0; round < 3; round += 1) {
        const s = session();
        await add(s, product, 1);
        const operations = [
          contract.add(product, 1),
          contract.add(secondProduct, 1),
        ];
        const outcomes = await Promise.all(
          operations.map((payload) => s.request('/api/commerce/cart', payload)),
        );
        for (let i = 0; i < outcomes.length; i += 1) {
          if (outcomes[i].status === 409) {
            await s.cart();
            successful(await s.request('/api/commerce/cart', operations[i]));
          } else successful(outcomes[i]);
        }
        const cart = await s.cart();
        assert.equal(
          cart.items.find((l) => l.productId === product.id)?.quantity,
          2,
        );
        assert.equal(
          cart.items.find((l) => l.productId === secondProduct.id)?.quantity,
          1,
        );
        assert.equal(cart.subtotal, 2 * product.price + secondProduct.price);
      }
    },
  );

  await check(
    'A cart contains at most 30 distinct product variants',
    async () => {
      const candidates = products.flatMap((p) =>
        (p.sizes.length ? p.sizes : ['']).map((variant) => ({ p, variant })),
      );
      assert.ok(
        candidates.length >= 31,
        'This boundary check requires at least 31 valid product/variant pairs.',
      );
      const s = session();
      for (const { p, variant } of candidates.slice(0, 30)) {
        successful(
          await s.request('/api/commerce/cart', contract.add(p, 1, variant)),
        );
      }
      assert.equal((await s.cart()).items.length, 30);
      const { p, variant } = candidates[30];
      rejected(
        await s.request('/api/commerce/cart', contract.add(p, 1, variant)),
      );
      assert.equal((await s.cart()).items.length, 30);
    },
  );

  await check(
    'Checkout validates consent, delivery, payment outcome and key',
    async () => {
      const s = session();
      await add(s, product);
      for (const invalid of [
        { consent: false },
        { delivery: 'free-secret' },
        { paymentOutcome: 'paid' },
        { idempotencyKey: 'guessable' },
        { email: 'invalid' },
        { name: '' },
        { quotedTotal: '1' },
        { quotedRevision: 0 },
        { quotedRevision: '1' },
      ]) {
        rejected(
          await s.request(
            '/api/commerce/checkout',
            await checkoutBody(s, invalid),
          ),
        );
      }
      assert.equal(contract.lines(await s.cart()).length, 1);
    },
  );

  await check(
    'A forged or stale quoted amount cannot be accepted',
    async () => {
      const s = session();
      await add(s, product);
      const r = await s.request(
        '/api/commerce/checkout',
        await checkoutBody(s, { quotedTotal: 1 }),
      );
      assert.equal(r.status, 409);
      assert.equal((await s.cart()).items.length, 1);
    },
  );

  await check(
    'A stale cart revision is rejected even when its total is unchanged',
    async () => {
      const s = session();
      const initial = await add(s, product, 1);
      const payload = await checkoutBody(s);
      successful(
        await s.request(
          '/api/commerce/cart',
          contract.update(initial.items[0], 2),
        ),
      );
      successful(
        await s.request(
          '/api/commerce/cart',
          contract.update(initial.items[0], 1),
        ),
      );
      const current = await s.cart();
      assert.equal(current.subtotal, initial.subtotal);
      assert.ok(current.revision > payload.quotedRevision);
      assert.equal(
        (await s.request('/api/commerce/checkout', payload)).status,
        409,
      );
      assert.equal((await s.cart()).items.length, 1);
    },
  );

  await check('Foreign Origin cannot submit checkout', async () => {
    const s = session();
    await add(s, product);
    rejected(
      await s.request('/api/commerce/checkout', await checkoutBody(s), {
        Origin: 'https://unrelated.example',
      }),
    );
    assert.equal(contract.lines(await s.cart()).length, 1);
  });

  await check('Declined simulation does not issue a paid receipt', async () => {
    const s = session();
    await add(s, product);
    const r = await s.request(
      '/api/commerce/checkout',
      await checkoutBody(s, { paymentOutcome: 'declined' }),
    );
    assert.ok(
      [200, 201, 402, 409, 422].includes(r.status),
      JSON.stringify(r.body),
    );
    assert.equal(contract.orderStatus(r.body), 'simulated_declined');
    const id = contract.orderId(r.body);
    if (id) {
      const receipt = await s.request(
        '/api/commerce/receipt?id=' + encodeURIComponent(id),
      );
      assert.equal(
        receipt.status,
        404,
        'The receipt endpoint is reserved to approved simulations.',
      );
    }
    assert.equal(
      contract.lines(await s.cart()).length,
      1,
      'Declined payment should keep the customer cart.',
    );
  });

  await check(
    'Concurrent identical checkout and replay return one order',
    async () => {
      const s = session();
      await add(s, product, 2);
      const payload = await checkoutBody(s);
      const [first, second] = await Promise.all([
        s.request('/api/commerce/checkout', payload),
        s.request('/api/commerce/checkout', payload),
      ]);
      successful(first);
      successful(second);
      const id = contract.orderId(first.body);
      assert.match(
        id || '',
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      assert.equal(contract.orderId(second.body), id);
      const replay = await s.request('/api/commerce/checkout', payload);
      successful(replay);
      assert.equal(contract.orderId(replay.body), id);
      const changed = await s.request('/api/commerce/checkout', {
        ...payload,
        delivery: 'home',
      });
      assert.equal(
        changed.status,
        409,
        'Same idempotency key with different request must conflict.',
      );

      const receipt = await s.request(
        '/api/commerce/receipt?id=' + encodeURIComponent(id),
      );
      assert.equal(receipt.status, 200, JSON.stringify(receipt.body));
      assert.match(
        receipt.response.headers.get('cache-control') || '',
        /no-store/i,
      );
      assert.match(
        receipt.response.headers.get('x-robots-tag') || '',
        /noindex/i,
      );
      const order = contract.order(receipt.body);
      assert.equal(
        order.status,
        'simulated_paid',
        'Receipt must explicitly identify a simulation.',
      );
      assert.equal(order.lines.length, 1);
      assert.equal(order.lines[0].price, product.price);
      assert.equal(order.lines[0].quantity, 2);
      assert.equal(order.subtotal, product.price * 2);
      assert.equal(order.total, payload.quotedTotal);
      for (const field of ['cart_id', 'idempotency_key', 'fingerprint'])
        assert.ok(!(field in order));
      assert.ok(
        !['accepted', 'sent', 'delivered'].includes(
          contract.emailStatus(receipt.body),
        ),
        'Disabled local mail must never claim an e-mail was sent.',
      );

      const stranger = session();
      const denied = await stranger.request(
        '/api/commerce/receipt?id=' + encodeURIComponent(id),
      );
      assert.ok([401, 403, 404].includes(denied.status));
      assert.ok(!JSON.stringify(denied.body).includes(recipient));
      const forged = session();
      forged.cookies.set('bd_cart', randomUUID());
      assert.ok(
        [401, 403, 404].includes(
          (
            await forged.request(
              '/api/commerce/receipt?id=' + encodeURIComponent(id),
            )
          ).status,
        ),
      );
      const downloaded = await s.request(
        '/api/commerce/receipt?id=' + encodeURIComponent(id) + '&download=1',
      );
      assert.equal(downloaded.status, 200);
      assert.match(
        downloaded.response.headers.get('cache-control') || '',
        /no-store/i,
      );
      assert.match(
        downloaded.response.headers.get('x-robots-tag') || '',
        /noindex/i,
      );
      assert.match(
        downloaded.response.headers.get('content-security-policy') || '',
        /default-src 'none'/,
      );
      assert.match(downloaded.raw, /SIMULATION/);
    },
  );

  await check(
    'Different simultaneous keys cannot pay for the same cart revision twice',
    async () => {
      const s = session();
      await add(s, product, 1);
      const payload = await checkoutBody(s);
      const outcomes = await Promise.all([
        s.request('/api/commerce/checkout', payload),
        s.request('/api/commerce/checkout', {
          ...payload,
          idempotencyKey: randomUUID(),
        }),
      ]);
      const approved = outcomes.filter(
        (r) =>
          [200, 201].includes(r.status) &&
          contract.orderStatus(r.body) === 'simulated_paid',
      );
      assert.ok(
        approved.length >= 1,
        'One checkout should claim the cart successfully.',
      );
      assert.equal(
        new Set(approved.map((r) => contract.orderId(r.body))).size,
        1,
        'One cart snapshot produced two paid orders.',
      );
      for (const rejectedOutcome of outcomes.filter(
        (r) => ![200, 201].includes(r.status),
      )) {
        assert.ok(
          [400, 409].includes(rejectedOutcome.status),
          JSON.stringify(rejectedOutcome.body),
        );
      }
      assert.equal((await s.cart()).items.length, 0);
    },
  );

  await check(
    'Order administration and e-mail retry reject anonymous callers',
    async () => {
      const s = session();
      assert.equal((await s.request('/api/commerce/admin-orders')).status, 403);
      assert.equal(
        (await s.request('/api/commerce/admin-email', { id: randomUUID() }))
          .status,
        403,
      );
      assert.equal(
        (
          await s.request('/api/commerce/admin-orders', undefined, {
            'oai-authenticated-user-id': 'forged',
            'oai-authenticated-user-email': recipient,
          })
        ).status,
        403,
      );
    },
  );

  await check(
    'Random and malformed receipt IDs never reveal an order',
    async () => {
      const s = session();
      for (const id of [randomUUID(), "' OR 1=1 --", '../atelier']) {
        const r = await s.request(
          '/api/commerce/receipt?id=' + encodeURIComponent(id),
        );
        assert.ok([400, 401, 403, 404, 422].includes(r.status));
        assert.ok(!JSON.stringify(r.body).includes(recipient));
      }
    },
  );

  console.log(
    JSON.stringify(
      {
        passed: results.length,
        base: origin,
        results,
        note: 'Synthetic orders may remain in local D1; no production data or real recipient used.',
      },
      null,
      2,
    ),
  );
} finally {
  await Promise.allSettled(activeSessions.map((s) => s.clear()));
}
