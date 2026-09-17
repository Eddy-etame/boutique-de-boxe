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
  'PASS: 4 SSR cookie states, no-JS fallback markup, .com canonical, no host redirect (www, alias, apex all serve), robots on apex. Local requests only.',
);
