// Read-only contract tests. Every fetch and Worker used by the helper is mocked.
// No real contact, email, database, provider, browser, or production request occurs.
// Run from boutique-de-boxe: node --test .research/test-inlett.mjs
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
const relaySource = readFileSync(resolve(root, 'lib/inlett.ts'), 'utf8');
const workerSource = readFileSync(
  resolve(root, 'public/inlett-pow.js'),
  'utf8',
);
const compiledRelay = ts.transpileModule(relaySource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const challenge = {
  challenge: 'a'.repeat(64),
  timestamp: 1789000000000,
  difficulty: 1,
};
const fields = {
  name: 'Test local',
  email: 'nobody@example.invalid',
  message: 'Message de contrat uniquement.',
  submission_reference: 'local-test-reference',
};

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function harness({
  challengeResponse = jsonResponse(challenge),
  submitResponse = jsonResponse({ success: true }),
  workerMode = 'success',
  onWorkerStart,
  afterWorkerMessage,
} = {}) {
  const calls = [];
  const workers = [];
  const timers = new Set();
  class MockWorker {
    constructor(path) {
      assert.equal(path, '/inlett-pow.js');
      this.terminated = false;
      workers.push(this);
    }
    postMessage(data) {
      this.input = data;
      onWorkerStart?.(this);
      if (workerMode === 'timeout') return;
      queueMicrotask(() => {
        if (workerMode === 'error')
          this.onerror?.(new Error('mock worker error'));
        else
          this.onmessage?.({
            data:
              workerMode === 'bad-payload'
                ? { error: 'mock failure' }
                : { nonce: '9' },
          });
        afterWorkerMessage?.();
      });
    }
    terminate() {
      this.terminated = true;
    }
  }
  const exports = {};
  const context = vm.createContext({
    exports,
    Worker: MockWorker,
    AbortSignal,
    AbortController,
    console,
    setTimeout(callback, delay) {
      const timer = setTimeout(
        () => {
          timers.delete(timer);
          callback();
        },
        delay === 35000 ? 2 : delay,
      );
      timers.add(timer);
      return timer;
    },
    clearTimeout(timer) {
      clearTimeout(timer);
      timers.delete(timer);
    },
    async fetch(url, options) {
      assert.ok(
        url === 'https://inlett.vercel.app/api/challenge' ||
          url ===
            'https://inlett.vercel.app/api/submit/ede03bbe-6591-4e33-a351-1ffe4f050895',
        'Unexpected endpoint; network never allowed',
      );
      calls.push({ url, options });
      const result = calls.length === 1 ? challengeResponse : submitResponse;
      if (result instanceof Error) throw result;
      return typeof result === 'function' ? result(url, options) : result;
    },
  });
  vm.runInContext(compiledRelay, context, { filename: 'inlett.ts' });
  return {
    relay: exports.relayContact,
    calls,
    workers,
    get activeTimers() {
      return timers.size;
    },
    close() {
      for (const timer of timers) clearTimeout(timer);
    },
  };
}

async function exercise(options, expected, expectedCalls = 2) {
  const h = harness(options);
  try {
    assert.equal(await h.relay(fields), expected);
    assert.equal(
      h.calls.length,
      expectedCalls,
      'No retry or duplicate submission may be implicit',
    );
    assert.ok(
      h.workers.every((worker) => worker.terminated),
      'Every created worker must terminate',
    );
    assert.equal(h.activeTimers, 0, 'All helper timers must be cleaned up');
    return h;
  } finally {
    h.close();
  }
}

test('success means accepted_client, never delivered; exact published contract', async () => {
  const h = await exercise({}, 'accepted_client');
  const request = h.calls[1];
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.credentials, 'omit');
  assert.equal(request.options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(request.options.body), {
    ...fields,
    _lang: 'fr',
    _gotcha: '',
    pow_challenge: challenge.challenge,
    pow_timestamp: challenge.timestamp,
    pow_nonce: '9',
  });
  assert.equal(h.calls[0].options.cache, 'no-store');
});

for (const status of [500, 502, 503, 504, 408]) {
  test(`HTTP ${status} after POST stays unconfirmed and is not repeated`, async () => {
    await exercise(
      { submitResponse: jsonResponse({ error: 'mock' }, status) },
      'unconfirmed',
    );
  });
}

for (const status of [400, 403, 404, 429]) {
  test(`HTTP ${status} is a resolved failure without retry`, async () => {
    await exercise(
      {
        submitResponse: jsonResponse(
          {
            code: status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'MOCK_REJECTION',
            error: 'mock',
          },
          status,
        ),
      },
      'failed',
    );
  });
}

test('success:false on 200 is not acceptance', async () => {
  await exercise(
    { submitResponse: jsonResponse({ success: false, code: 'MOCK' }) },
    'failed',
  );
});
test('missing success on 200 is ambiguous', async () => {
  await exercise({ submitResponse: jsonResponse({}) }, 'unconfirmed');
});
test('unreadable success body is ambiguous', async () => {
  await exercise(
    {
      submitResponse: {
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('JSON');
        },
      },
    },
    'unconfirmed',
  );
});
test('transport loss after POST is ambiguous', async () => {
  await exercise({ submitResponse: new Error('network lost') }, 'unconfirmed');
});
test('challenge HTTP failure creates no worker and never posts', async () => {
  const h = await exercise(
    { challengeResponse: jsonResponse({}, 503) },
    'failed',
    1,
  );
  assert.equal(h.workers.length, 0);
});
test('challenge network failure never posts', async () => {
  await exercise({ challengeResponse: new Error('offline') }, 'failed', 1);
});
test('challenge malformed JSON never posts', async () => {
  await exercise(
    {
      challengeResponse: {
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('JSON');
        },
      },
    },
    'failed',
    1,
  );
});

for (const invalid of [
  { ...challenge, challenge: 'short' },
  { ...challenge, timestamp: '1789000000000' },
  { ...challenge, timestamp: Infinity },
  { ...challenge, difficulty: 0 },
  { ...challenge, difficulty: 6 },
  { ...challenge, difficulty: '4' },
]) {
  test(`invalid challenge rejected before worker: ${JSON.stringify(invalid)}`, async () => {
    const h = await exercise(
      { challengeResponse: jsonResponse(invalid) },
      'failed',
      1,
    );
    assert.equal(h.workers.length, 0);
  });
}

for (const workerMode of ['timeout', 'error', 'bad-payload']) {
  test(`worker ${workerMode} never posts and terminates worker`, async () => {
    await exercise({ workerMode }, 'failed', 1);
  });
}

test('real worker finds a nonce whose actual SHA256 satisfies the challenge', async () => {
  let result;
  const self = {
    onmessage: null,
    postMessage: (value) => {
      result = value;
    },
  };
  const context = vm.createContext({
    self,
    TextEncoder,
    crypto: webcrypto,
    performance,
  });
  vm.runInContext(workerSource, context, { filename: 'inlett-pow.js' });
  await self.onmessage({ data: challenge });
  assert.match(result.nonce, /^\d+$/);
  const digest = Buffer.from(
    await webcrypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${challenge.challenge}:${result.nonce}`),
    ),
  ).toString('hex');
  assert.ok(digest.startsWith('0'));
});

test('worker elapsed-time bound ends with error rather than an invented nonce', async () => {
  let clockCalls = 0;
  let result;
  const self = {
    onmessage: null,
    postMessage: (value) => {
      result = value;
    },
  };
  const context = vm.createContext({
    self,
    TextEncoder,
    crypto: webcrypto,
    performance: { now: () => (clockCalls++ === 0 ? 0 : 30001) },
  });
  vm.runInContext(workerSource, context, { filename: 'inlett-pow.js' });
  await self.onmessage({ data: challenge });
  assert.equal(result.error, 'challenge-timeout');
  assert.equal(result.nonce, undefined);
});

test('D1 contact keyed replay returns the same ID; changed payload is 409', async () => {
  const { route, database } = apiHarness();
  const key = '10000000-0000-4000-8000-000000000001';
  const first = await postContact(route, { ...fields, requestKey: key });
  const second = await postContact(route, { ...fields, requestKey: key });
  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal((await first.json()).id, (await second.json()).id);
  assert.equal(database.rows.size, 1);
  const conflicting = await postContact(route, {
    ...fields,
    message: 'Different message with the same key.',
    requestKey: key,
  });
  assert.equal(conflicting.status, 409);
});

test('relay status requires matching token and cannot overwrite a terminal state', async () => {
  const { route, database } = apiHarness();
  const saved = await (
    await postContact(route, {
      ...fields,
      requestKey: '10000000-0000-4000-8000-000000000004',
    })
  ).json();
  const wrongToken = '10000000-0000-4000-8000-000000000009';
  await postContact(
    route,
    { id: saved.id, token: wrongToken, state: 'accepted_client' },
    'contact-relay',
  );
  assert.equal(database.rows.get(saved.id).relay_status, 'unconfirmed');
  await postContact(
    route,
    { id: saved.id, token: saved.relayToken, state: 'accepted_client' },
    'contact-relay',
  );
  assert.equal(database.rows.get(saved.id).relay_status, 'accepted_client');
  await postContact(
    route,
    { id: saved.id, token: saved.relayToken, state: 'failed' },
    'contact-relay',
  );
  assert.equal(database.rows.get(saved.id).relay_status, 'accepted_client');
});

// Force both initial reads to miss. The real query must resolve its conflict
// to the same winner, authorizing only the successful inserter to relay.
test('concurrent same-key requests both resolve to one durable contact', async () => {
  const { route, database } = apiHarness({ forceKeyReadRace: true });
  const payload = {
    ...fields,
    requestKey: '10000000-0000-4000-8000-000000000002',
  };
  const results = await Promise.all([
    postContact(route, payload),
    postContact(route, payload),
  ]);
  assert.ok(results.every((result) => [200, 201].includes(result.status)));
  assert.equal(database.rows.size, 1);
  const bodies = await Promise.all(results.map((result) => result.json()));
  assert.equal(bodies[0].id, bodies[1].id);
  assert.equal(
    bodies.filter((value) => value.relayStatus === 'pending').length,
    1,
  );
});

test('an aborted caller stops work before any network or worker operation', async () => {
  const h = harness();
  try {
    const controller = new AbortController();
    controller.abort();
    assert.equal(await h.relay(fields, controller.signal), 'failed');
    assert.equal(h.calls.length, 0);
    assert.equal(h.workers.length, 0);
    assert.equal(h.activeTimers, 0);
  } finally {
    h.close();
  }
});

test('abort during worker work terminates it before any provider POST', async () => {
  const controller = new AbortController();
  const h = harness({
    workerMode: 'timeout',
    onWorkerStart: () => controller.abort(),
  });
  try {
    assert.equal(await h.relay(fields, controller.signal), 'failed');
    assert.equal(h.calls.length, 1);
    assert.ok(h.workers[0].terminated);
    assert.equal(h.workers[0].onmessage, null);
    assert.equal(h.workers[0].onerror, null);
    assert.equal(h.activeTimers, 0);
  } finally {
    h.close();
  }
});

test('abort between solving and provider POST prevents the send', async () => {
  const controller = new AbortController();
  const h = harness({ afterWorkerMessage: () => controller.abort() });
  try {
    assert.equal(await h.relay(fields, controller.signal), 'failed');
    assert.equal(h.calls.length, 1);
    assert.equal(h.activeTimers, 0);
  } finally {
    h.close();
  }
});

test('abort after provider POST begins is unconfirmed and never retried', async () => {
  const controller = new AbortController();
  const h = harness({
    submitResponse: (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener(
          'abort',
          () => reject(new Error('aborted')),
          { once: true },
        );
        queueMicrotask(() => controller.abort());
      }),
  });
  try {
    assert.equal(await h.relay(fields, controller.signal), 'unconfirmed');
    assert.equal(h.calls.length, 2);
    assert.equal(h.activeTimers, 0);
    assert.ok(h.workers[0].terminated);
  } finally {
    h.close();
  }
});

test('parent abort listener is removed after completed submission', async () => {
  const controller = new AbortController();
  const signal = controller.signal;
  const listeners = new Set();
  const add = signal.addEventListener.bind(signal);
  const remove = signal.removeEventListener.bind(signal);
  signal.addEventListener = (name, fn, options) => {
    if (name === 'abort') listeners.add(fn);
    return add(name, fn, options);
  };
  signal.removeEventListener = (name, fn, options) => {
    if (name === 'abort') listeners.delete(fn);
    return remove(name, fn, options);
  };
  const h = harness();
  try {
    assert.equal(await h.relay(fields, signal), 'accepted_client');
    assert.equal(listeners.size, 0);
    assert.equal(h.activeTimers, 0);
  } finally {
    h.close();
  }
});

test('ContactForm unmount aborts its pending first-party request without resetting input', async () => {
  const h = contactFormHarness({
    fetchResult: (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener(
          'abort',
          () => reject(new Error('aborted')),
          { once: true },
        );
        queueMicrotask(() => h.unmount());
      }),
  });
  await h.submit();
  assert.equal(h.requests.length, 1);
  assert.ok(h.requests[0].options.signal.aborted);
  assert.equal(h.relayCalls.length, 0);
  assert.equal(h.resetCount, 0);
  assert.equal(h.stateWritesAfterUnmount, 0);
});

test('ContactForm unmount aborts relay and does not issue a later acknowledgement', async () => {
  const h = contactFormHarness({
    relayResult: (_fields, signal) =>
      new Promise((resolve) => {
        signal.addEventListener('abort', () => resolve('failed'), {
          once: true,
        });
        queueMicrotask(() => h.unmount());
      }),
  });
  await h.submit();
  assert.equal(h.requests.length, 1);
  assert.equal(h.relayCalls.length, 1);
  assert.ok(h.relayCalls[0].signal.aborted);
  assert.equal(h.resetCount, 0);
  assert.equal(h.stateWritesAfterUnmount, 0);
});

test('ContactForm immediate duplicate event does not create a second save or relay', async () => {
  const h = contactFormHarness();
  await Promise.all([h.submit(), h.submit()]);
  assert.equal(
    h.requests.filter((call) => call.url === '/api/contact').length,
    1,
  );
  assert.equal(h.relayCalls.length, 1);
  assert.equal(h.resetCount, 1);
  h.unmount();
});

test('receipt with no provider remains saved as unconfigured, with no network call', async () => {
  const h = receiptHarness('pending');
  await h.sendReceipt({ ...h.order });
  assert.equal(h.order.email_status, 'unconfigured');
  assert.equal(h.networkCalls, 0);
});

test('missing credentials cannot turn an uncertain receipt into a retryable receipt', async () => {
  const h = receiptHarness('unconfirmed');
  await h.sendReceipt({ ...h.order });
  assert.equal(h.order.email_status, 'unconfirmed');
  assert.equal(h.networkCalls, 0);
});

test('accepted receipt is not re-sent when provider configuration is absent', async () => {
  const h = receiptHarness('accepted');
  await h.sendReceipt({ ...h.order });
  assert.equal(h.order.email_status, 'accepted');
  assert.equal(h.networkCalls, 0);
});

test('replayed contact cannot authorize two browser relay sends', async () => {
  const { route } = apiHarness();
  const payload = {
    ...fields,
    requestKey: '10000000-0000-4000-8000-000000000003',
  };
  const first = await (await postContact(route, payload)).json();
  const second = await (await postContact(route, payload)).json();
  const relaysAuthorized = [first, second].filter(
    (value) => value.relayStatus === 'pending',
  ).length;
  assert.equal(relaysAuthorized, 1);
});

function postContact(route, body, action = 'contact') {
  const origin = 'https://unit.test.invalid';
  return route.POST(
    new Request(`${origin}/api/${action}`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ action }) },
  );
}

function apiHarness({ forceKeyReadRace = false } = {}) {
  const rows = new Map();
  const keys = new Map();
  let racedReads = 0;
  let releaseReads;
  const readBarrier = new Promise((resolve) => {
    releaseReads = resolve;
  });
  const database = {
    rows,
    prepare(sql) {
      let values = [];
      return {
        bind(...input) {
          values = input;
          return this;
        },
        async first() {
          if (sql.includes('RETURNING hits')) return 1;
          if (sql.includes('FROM contacts WHERE request_key=?')) {
            const id = keys.get(values[0]);
            const snapshot = id ? { ...rows.get(id) } : null;
            if (forceKeyReadRace && racedReads < 2) {
              racedReads++;
              if (racedReads === 2) releaseReads();
              await readBarrier;
            }
            return snapshot;
          }
          throw new Error(`Unexpected mocked first SQL: ${sql}`);
        },
        async run() {
          if (sql.startsWith('DELETE FROM rate_limits')) return {};
          if (sql.startsWith('INSERT INTO contacts')) {
            const [
              id,
              name,
              email,
              message,
              created_at,
              request_key,
              relay_token,
              relay_status,
            ] = values;
            if (request_key && keys.has(request_key)) {
              if (sql.includes('ON CONFLICT(request_key) DO NOTHING'))
                return {};
              throw new Error('UNIQUE constraint failed: contacts.request_key');
            }
            rows.set(id, {
              id,
              name,
              email,
              message,
              created_at,
              request_key,
              relay_token,
              relay_status,
            });
            if (request_key) keys.set(request_key, id);
            return {};
          }
          if (sql.startsWith('UPDATE contacts SET relay_status=?')) {
            const [state, id, token] = values;
            const row = rows.get(id);
            const expectedState = sql.includes("relay_status='unconfirmed'")
              ? 'unconfirmed'
              : 'pending';
            if (
              row &&
              row.relay_token === token &&
              row.relay_status === expectedState
            )
              row.relay_status = state;
            return {};
          }
          throw new Error(`Unexpected mocked run SQL: ${sql}`);
        },
      };
    },
  };
  const source = readFileSync(
    resolve(root, 'app/api/[action]/route.ts'),
    'utf8',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  const context = vm.createContext({
    exports,
    Response,
    Request,
    TextEncoder,
    TextDecoder,
    URL,
    URLSearchParams,
    crypto: webcrypto,
    require(specifier) {
      if (specifier === '@/lib/database')
        return {
          db: async () => database,
          isAdmin: async () => false,
          readCatalog: async () => [],
        };
      if (specifier === '@/lib/product-input')
        return {
          validateProduct() {
            throw new Error('Not used by these tests');
          },
        };
      if (specifier === '@/lib/catalog')
        return {
          shop: {
            origin: 'https://unit.test.invalid',
            intendedDomain: 'https://unit.test.invalid',
          },
        };
      if (specifier === '@/lib/request') return { clientIp: () => 'unit-test' };
      if (specifier === '@/lib/auth')
        return { getSessionUser: async () => null, DEV_OWNER_EMAIL: 'seedy@sites.test' };
      // La liste en fenêtre et les inscriptions ne sont pas exercées ici ; la validation d’adresse l’est.
      if (specifier === '@/lib/listing') return { listingFor: () => null };
      if (specifier === 'next/cache') return { revalidatePath: () => {} };
      if (specifier === '@/lib/newsletter') return { unsubscribeAll: async () => true };
      if (specifier === '@/lib/suggest') return { suggest: () => ({ pages: [], products: [], total: 0 }), nearest: () => ({ pages: [], products: [] }) };
      if (specifier === '@/lib/alerts')
        return {
          emailValid: (value) => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
          normalisePhone: () => '',
          ensureAlertContact: async () => {},
          insertAlert() {
            throw new Error('Not used by these tests');
          },
        };
      throw new Error(`Unmocked dependency is forbidden: ${specifier}`);
    },
    fetch() {
      throw new Error('Network is forbidden in API harness');
    },
  });
  vm.runInContext(compiled, context, { filename: 'contact-route.ts' });
  return { route: exports, database };
}

function receiptHarness(email_status) {
  const order = {
    id: '10000000-0000-4000-8000-000000000005',
    status: 'simulated_paid',
    email_status,
  };
  const source = readFileSync(resolve(root, 'lib/commerce.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  let networkCalls = 0;
  const database = {
    prepare(sql) {
      return {
        bind() {
          return this;
        },
        async run() {
          if (sql.includes("email_status='unconfigured'")) {
            order.email_status = 'unconfigured';
            return {};
          }
          throw new Error(`Unexpected receipt SQL: ${sql}`);
        },
      };
    },
  };
  const context = vm.createContext({
    exports,
    require(specifier) {
      if (specifier === './database')
        return {
          db: async () => database,
          runtime: async () => ({}),
          readCatalog: async () => [],
        };
      if (specifier === './catalog')
        return { money: (cents) => String(cents), shop: {} };
      if (specifier === './boxtal') return { parseRelay: () => null, relayLabel: () => '' };
      throw new Error(`Unmocked receipt dependency: ${specifier}`);
    },
    fetch() {
      networkCalls++;
      throw new Error('No real network permitted');
    },
  });
  vm.runInContext(compiled, context, { filename: 'commerce.ts' });
  return {
    order,
    sendReceipt: exports.sendReceipt,
    get networkCalls() {
      return networkCalls;
    },
  };
}

function contactFormHarness({ fetchResult, relayResult } = {}) {
  const source = readFileSync(
    resolve(root, 'components/contact-form.tsx'),
    'utf8',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const effects = [];
  const cleanups = [];
  const requests = [];
  const relayCalls = [];
  let unmounted = false;
  let resetCount = 0;
  let stateWritesAfterUnmount = 0;
  const exports = {};
  const element = (type, props) => ({ type, props });
  const context = vm.createContext({
    exports,
    AbortController,
    AbortSignal,
    crypto: webcrypto,
    setTimeout,
    clearTimeout,
    FormData: class {
      constructor(form) {
        this.form = form;
      }
      entries() {
        return Object.entries(this.form.fields);
      }
    },
    require(specifier) {
      if (specifier === 'react')
        return {
          useRef: (current) => ({ current }),
          useState: (initial) => [
            initial,
            () => {
              if (unmounted) stateWritesAfterUnmount++;
            },
          ],
          useEffect: (callback) => effects.push(callback),
        };
      if (specifier === 'react/jsx-runtime')
        return { jsx: element, jsxs: element };
      if (specifier === 'lucide-react') return { ArrowUpRight: () => null };
      if (specifier === '@/lib/inlett')
        return {
          relayContact(fields, signal) {
            relayCalls.push({ fields, signal });
            return relayResult
              ? relayResult(fields, signal)
              : Promise.resolve('accepted_client');
          },
        };
      throw new Error(`Unmocked component dependency: ${specifier}`);
    },
    fetch(url, options) {
      assert.ok(
        ['/api/contact', '/api/contact-relay'].includes(url),
        'Component must only use mocked first-party endpoints',
      );
      requests.push({ url, options });
      return fetchResult
        ? fetchResult(url, options)
        : Promise.resolve(
            jsonResponse({
              id: 'unit-contact',
              relayToken: 'unit-token',
              relayStatus: 'pending',
            }),
          );
    },
  });
  vm.runInContext(compiled, context, { filename: 'contact-form.tsx' });
  const component = exports.ContactForm();
  for (const callback of effects) cleanups.push(callback());
  const form = {
    fields: {
      name: fields.name,
      email: fields.email,
      message: fields.message,
      website: '',
    },
    reset() {
      resetCount++;
    },
  };
  return {
    requests,
    relayCalls,
    submit: () =>
      component.props.onSubmit({ preventDefault() {}, currentTarget: form }),
    unmount() {
      if (unmounted) return;
      unmounted = true;
      for (const cleanup of cleanups) cleanup?.();
    },
    get resetCount() {
      return resetCount;
    },
    get stateWritesAfterUnmount() {
      return stateWritesAfterUnmount;
    },
  };
}


