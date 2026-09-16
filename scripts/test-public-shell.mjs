// HTTP regression checks only: no account, payment, email or analytics submission.
import assert from 'node:assert/strict';
import http from 'node:http';
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
for (const cookie of [
  '',
  'bdb_consent=refused',
  'bdb_consent=accepted',
  'bdb_consent=invalid',
]) {
  const r = await fetch(base, { headers: cookie ? { Cookie: cookie } : {} });
  const html = await r.text();
  const open = html.match(/<html[^>]*>/)[0].includes('data-consent-open');
  assert.equal(
    open,
    !cookie || cookie.endsWith('invalid'),
    'SSR consent state',
  );
  assert.ok(
    html.includes('<noscript>') &&
      html.includes('.consent-veil{display:none!important}'),
    'No JS content fallback',
  );
  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/boutique-de-boxe.fr\/"/,
  );
}
for (const host of ['www.boutique-de-boxe.fr', 'boutique-de-boxe.vercel.app']) {
  const r = await hostRequest('/gants-de-boxe/?page=2', host);
  assert.equal(r.status, 308, host);
  assert.equal(
    r.location,
    'https://boutique-de-boxe.fr/gants-de-boxe/?page=2',
    host,
  );
}
const apex = await hostRequest('/robots.txt', 'boutique-de-boxe.fr');
assert.equal(apex.status, 200, 'No apex redirect loop');
console.log(
  'PASS: 4 SSR cookie states, no-JS fallback markup, .fr canonical, 2 permanent redirects retaining path/query, apex without loop. Local requests only.',
);
