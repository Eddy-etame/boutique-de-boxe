// HTTP regression checks only: no account, payment, email or analytics submission.
import assert from 'node:assert/strict';
import http from 'node:http';
import vm from 'node:vm';
const hostRequest = (path, host) =>
  new Promise((resolve, reject) => {
    const request = http.get(
      {
        hostname: local.hostname,
        port: local.port,
        path,
        headers: { Host: host },
      },
      (response) => {
        response.resume();
        resolve({
          status: response.statusCode,
          location: response.headers.location,
        });
      },
    );
    request.on('error', reject);
  });
const base = process.env.QA_ORIGIN || 'http://localhost:3000';
const local = new URL(base);
assert.ok(
  ['localhost', '127.0.0.1', '[::1]'].includes(local.hostname),
  'This test only targets a local server.',
);
let staticHtmlTag;
let staticConsentGuard;
for (const cookie of [
  '',
  'bdb_consent=refused',
  'bdb_consent=accepted',
  'bdb_consent=invalid',
]) {
  const r = await fetch(base, { headers: cookie ? { Cookie: cookie } : {} });
  assert.equal(r.status, 200, 'Public shell status');
  const html = await r.text();
  const htmlTag = html.match(/<html\b[^>]*>/)?.[0];
  assert.ok(htmlTag, 'Static HTML root');
  // The cacheable shell does not read cookies on the server. Its head guard
  // sets the consent attribute in the browser before the body is rendered.
  assert.ok(!htmlTag.includes('data-consent-open'), 'No cookie-specific SSR attribute');
  staticHtmlTag ??= htmlTag;
  assert.equal(htmlTag, staticHtmlTag, 'Identical HTML root for all cookie states');
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/)?.[1];
  assert.ok(head, 'Rendered document head');
  const guards = [...head.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .filter((script) => script.includes('data-consent-open'));
  assert.equal(guards.length, 1, 'Exactly one rendered consent guard in the head');
  const guard = guards[0];
  staticConsentGuard ??= guard;
  assert.equal(guard, staticConsentGuard, 'Identical guard for all cookie states');
  const toggles = [];
  vm.runInNewContext(
    guard,
    {
      document: {
        cookie,
        documentElement: {
          toggleAttribute(name, force) {
            toggles.push({ name, force });
          },
        },
      },
    },
    { timeout: 1000 },
  );
  assert.deepEqual(toggles, [{
    name: 'data-consent-open',
    force: !cookie || cookie.endsWith('invalid'),
  }], 'Rendered head guard respects the browser cookie state');
  assert.ok(
    html.includes('<noscript>') &&
      html.includes('.consent-veil{display:none!important}'),
    'No JS content fallback',
  );
  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/www\.boutique-de-boxe\.com\/"/,
  );
}
// Aucune redirection d'hote : www, l'alias Vercel et l'apex servent tous la page.
for (const host of ['www.boutique-de-boxe.com', 'boutique-de-boxe.vercel.app', 'boutique-de-boxe.com']) {
  const r = await hostRequest('/gants-de-boxe/?page=2', host);
  assert.equal(r.status, 200, host);
  assert.equal(r.location, undefined, 'no redirect for ' + host);
}
const apex = await hostRequest('/robots.txt', 'boutique-de-boxe.com');
assert.equal(apex.status, 200, 'apex serves robots');
console.log(
  'PASS: static SSR shell and rendered head guard for 4 cookie states, no-JS fallback markup, .com canonical, no host redirect (www, alias, apex all serve), robots on apex. Local requests only.',
);
