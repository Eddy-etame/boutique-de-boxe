import assert from 'node:assert/strict';
const base = 'http://localhost:3000';
const runIP = '203.0.113.' + (10 + Math.floor(Math.random() * 200));
const admin = { Cookie: '__sites_local_auth=1' };
async function request(path, data, headers = {}) {
  return fetch(base + '/api/' + path, {
    method: data ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      Origin: base,
      'cf-connecting-ip': runIP,
      'x-forwarded-for': runIP,
      ...headers,
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
}
const results = [];
async function check(name, fn) {
  await fn();
  results.push(name);
  console.log('PASS ' + name);
}
await check('Anonymous administration denied', async () =>
  assert.equal((await request('admin')).status, 403),
);
await check('Forged identity headers denied', async () =>
  assert.equal(
    (
      await request('admin', undefined, {
        'oai-authenticated-user-id': 'visitor',
        'oai-authenticated-user-email': 'visitor@example.invalid',
      })
    ).status,
    403,
  ),
);
await check('Local owner authorized', async () =>
  assert.equal((await request('admin', undefined, admin)).status, 200),
);
await check('Invalid origin rejected', async () =>
  assert.ok(
    [400, 403].includes(
      (
        await request(
          'alerts',
          {
            email: 'qa@example.invalid',
            productId: 'launch',
            variant: '',
            consent: true,
          },
          { Origin: 'https://unrelated.example' },
        )
      ).status,
    ),
  ),
);
await check('Consent required', async () =>
  assert.equal(
    (
      await request('alerts', {
        email: 'qa@example.invalid',
        productId: 'launch',
        variant: '',
        consent: false,
      })
    ).status,
    400,
  ),
);
await check('Invalid variant rejected', async () =>
  assert.equal(
    (
      await request('alerts', {
        email: 'qa@example.invalid',
        productId: 'mat-blade-gold',
        variant: 'madeup',
        consent: true,
      })
    ).status,
    400,
  ),
);
const email = 'boutique-qa-' + Date.now() + '@example.invalid';
await check('Alert stored and duplicate prevented', async () => {
  const body = {
    email,
    productId: 'mat-blade-gold',
    variant: '12 oz',
    consent: true,
  };
  assert.equal((await request('alerts', body)).status, 201);
  assert.equal((await request('alerts', body)).status, 201);
  const data = await (await request('admin', undefined, admin)).json();
  assert.equal(data.alerts.filter((a) => a.email === email).length, 1);
});
await check('Optional phone step: one-time reference, consent, normalised number, first write wins', async () => {
  const mail = 'boutique-qa-tel-' + Date.now() + '@example.invalid';
  const first = await request('alerts', { email: mail, productId: 'launch', variant: '', consent: true, source: 'test-api' });
  const { ref } = await first.json();
  assert.equal(first.status, 201);
  assert.match(ref, /^[0-9a-f-]{36}$/);
  // Une adresse déjà inscrite ne rend aucune référence : rien à détourner.
  const again = await (await request('alerts', { email: mail, productId: 'launch', variant: '', consent: true })).json();
  assert.equal(again.already, true);
  assert.equal(again.ref, undefined);
  assert.equal((await request('alerts', { email: mail, ref, phone: '12345', smsConsent: true })).status, 400);
  assert.equal((await request('alerts', { email: mail, ref, phone: '06 12 34 56 78' })).status, 400);
  assert.equal((await request('alerts', { email: 'autre-' + mail, ref, phone: '06 12 34 56 78', smsConsent: true })).status, 404);
  assert.equal((await request('alerts', { email: mail, ref, phone: '06 12 34 56 78', smsConsent: true })).status, 200);
  assert.equal((await request('alerts', { email: mail, ref, phone: '07 00 00 00 00', smsConsent: true })).status, 404);
  const row = (await (await request('admin', undefined, admin)).json()).alerts.find((a) => a.email === mail);
  assert.equal(row.phone, '+33612345678');
  assert.equal(Number(row.sms_consent), 1);
  assert.equal(row.source, 'test-api');
  await request('admin-delete', { kind: 'alerts', id: row.id }, admin);
});
await check('Contact stored', async () => {
  assert.equal(
    (
      await request('contact', {
        name: 'Test boutique QA',
        email,
        message:
          'Demande synthétique de validation. Ne pas envoyer de réponse.',
      })
    ).status,
    201,
  );
  const data = await (await request('admin', undefined, admin)).json();
  assert.equal(data.contacts.filter((a) => a.email === email).length, 1);
});
await check('Admin edit persists and public page uses it', async () => {
  const data = await (await request('admin', undefined, admin)).json();
  // Une référence hors club : les treize références « mat- » suivent le prix de la boutique du club.
  const p = data.products.find((x) => !x.id.startsWith('mat-'));
  const old = data.overrides.find((o) => o.product_id === p.id);
  const payload = {
    productId: p.id,
    name: p.name,
    description: p.description,
    priceCents: p.price,
    internalStock: old?.internal_stock || 0,
    plannedDiscount: old?.planned_discount || 0,
  };
  try {
    assert.equal(
      (
        await request(
          'admin',
          { ...payload, name: p.name + ' QA', priceCents: 1881 },
          admin,
        )
      ).status,
      200,
    );
    const publicData = await (await request('catalog')).json();
    assert.equal(publicData.products.find((x) => x.id === p.id).price, 1881);
    const html = await (await fetch(base + '/produits/' + p.slug + '/')).text();
    assert.ok(html.includes(p.name + ' QA'));
    assert.ok(!JSON.stringify(publicData).includes('internal_stock'));
  } finally {
    assert.equal((await request('admin', payload, admin)).status, 200);
  }
});
await check('Club products follow the club shop price, even after an Atelier edit', async () => {
  const data = await (await request('admin', undefined, admin)).json();
  const p = data.products.find((x) => x.id === 'mat-blade-gold');
  const old = data.overrides.find((o) => o.product_id === p.id);
  const payload = { productId: p.id, name: p.name, description: p.description, priceCents: p.price, internalStock: old?.internal_stock || 0, plannedDiscount: old?.planned_discount || 0 };
  let club = null;
  try {
    const live = await (await fetch('https://boutique.boxingcenter.fr/api/materiel', { signal: AbortSignal.timeout(10000) })).json();
    club = live.products.find((x) => x.id === p.id)?.price_cents ?? null;
  } catch {}
  try {
    assert.equal((await request('admin', { ...payload, priceCents: 1881 }, admin)).status, 200);
    const seen = (await (await request('catalog')).json()).products.find((x) => x.id === p.id).price;
    // Boutique du club joignable : son prix gagne. Injoignable : le prix saisi reste, rien n’est inventé.
    assert.ok(club === null ? [1881, p.price].includes(seen) : seen === club, `prix public ${seen}, club ${club}`);
  } finally {
    assert.equal((await request('admin', payload, admin)).status, 200);
  }
});
await check('Unsubscribe removes only matching alert', async () => {
  const d = await (await request('admin', undefined, admin)).json();
  const row = d.alerts.find((a) => a.email === email);
  assert.equal(
    (await request('unsubscribe', { token: row.unsubscribe_token })).status,
    200,
  );
  const after = await (await request('admin', undefined, admin)).json();
  assert.equal(after.alerts.filter((a) => a.email === email).length, 0);
});
await check('Contact deletion', async () => {
  const d = await (await request('admin', undefined, admin)).json();
  for (const row of d.contacts.filter((a) => a.email === email))
    assert.equal(
      (await request('admin-delete', { kind: 'contacts', id: row.id }, admin))
        .status,
      200,
    );
});
await check('Oversized body rejected', async () =>
  assert.equal(
    (
      await request('contact', {
        name: 'QA',
        email,
        message: 'x'.repeat(17000),
      })
    ).status,
    400,
  ),
);
console.log(
  JSON.stringify({ passed: results.length, date: new Date().toISOString() }),
);

await check('Forged administrator headers denied', async () =>
  assert.equal(
    (
      await request('admin', undefined, {
        'oai-authenticated-user-id': 'fake-owner',
        'oai-authenticated-user-email': 'seedy@sites.test',
      })
    ).status,
    403,
  ),
);
await check('Catalogue add, metadata update, archive', async () => {
  const all = await (await request('catalog')).json();
  const original = all.products[0];
  const reference = 'qa-reference-' + Date.now();
  const product = {
    ...original,
    id: reference,
    slug: reference,
    name: 'Référence de test catalogue',
    short: 'Référence synthétique pour le contrôle local du catalogue.',
  };
  try {
    assert.equal(
      (await request('admin-catalog', { product }, admin)).status,
      201,
    );
    assert.equal(
      (await fetch(base + '/produits/' + reference + '/')).status,
      200,
    );
    assert.ok(
      (await (await fetch(base + '/sitemap.xml')).text()).includes(
        '/produits/' + reference + '/',
      ),
    );
    assert.equal(
      (
        await request(
          'admin-catalog',
          {
            product: {
              ...product,
              images: [{ src: 'javascript:alert(1)', alt: 'Test' }],
            },
            replace: true,
          },
          admin,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          'admin-catalog',
          {
            product: {
              ...product,
              short: 'Description de test mise à jour dans les métadonnées.',
            },
            replace: true,
          },
          admin,
        )
      ).status,
      201,
    );
    assert.equal(
      (
        await request('alerts', {
          email,
          productId: product.id,
          variant: '',
          consent: true,
        })
      ).status,
      201,
    );
    const html = await (
      await fetch(base + '/produits/' + reference + '/')
    ).text();
    assert.ok(
      html.includes('Description de test mise à jour dans les métadonnées.'),
    );
  } finally {
    assert.equal(
      (await request('admin-archive', { id: product.id }, admin)).status,
      200,
    );
  }
  assert.equal(
    (await fetch(base + '/produits/' + reference + '/')).status,
    404,
  );
  assert.equal(
    (await request('admin-catalog', { product }, admin)).status,
    409,
  );
  assert.equal(
    (
      await request(
        'admin-catalog',
        { product: { ...product, id: reference + '-other' } },
        admin,
      )
    ).status,
    409,
  );
  const after = await (await request('admin', undefined, admin)).json();
  const alert = after.alerts.find(
    (a) => a.email === email && a.product_id === product.id,
  );
  assert.equal(alert.product_name, product.name);
  assert.equal(alert.product_archived, 1);
  assert.equal(
    (await request('unsubscribe', { token: alert.unsubscribe_token })).status,
    200,
  );
});
await check('Rate limit enforced', async () => {
  let status;
  for (let i = 0; i < 21; i++)
    status = (
      await request(
        'alerts',
        { email: 'invalid', productId: 'launch', variant: '', consent: true },
        {
          'cf-connecting-ip':
            '198.51.100.' + (10 + Number(runIP.split('.').pop())),
          'x-forwarded-for':
            '198.51.100.' + (10 + Number(runIP.split('.').pop())),
        },
      )
    ).status;
  assert.equal(status, 429);
});

console.log(
  JSON.stringify({ passed: results.length, date: new Date().toISOString() }),
);

await check('Native form works without client JavaScript', async () => {
  const email = 'native-form-qa@example.invalid';
  const r = await fetch(base + '/api/contact', {
    method: 'POST',
    headers: {
      Origin: base,
      'Content-Type': 'application/x-www-form-urlencoded',
      'cf-connecting-ip': '192.0.2.99',
      'x-forwarded-for': '192.0.2.99',
    },
    body: new URLSearchParams({
      name: 'Test formulaire natif',
      email,
      message: 'Test local sans JavaScript. Ne pas envoyer de message.',
    }),
    redirect: 'manual',
  });
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), '/confirmation/?objet=contact');
  const d = await (await request('admin', undefined, admin)).json();
  const rows = d.contacts.filter((c) => c.email === email);
  assert.equal(rows.length, 1);
  for (const row of rows)
    assert.equal(
      (await request('admin-delete', { kind: 'contacts', id: row.id }, admin))
        .status,
      200,
    );
});
console.log(
  JSON.stringify({ passed: results.length, date: new Date().toISOString() }),
);

// Mesure d'audience maison : consentement, nettoyage, acces reserve.
const sid = 'qa-session-' + Math.random().toString(36).slice(2, 10);
const vid = 'qa-visitor-' + Math.random().toString(36).slice(2, 10);
const ev = (t, p, d) => ({ t, p, d, sid, vid });
await check('Analytics ignored without consent', async () => {
  const r = await request('analytics', { events: [ev('view', '/')] });
  assert.equal(r.status, 202);
  assert.equal((await r.json()).ok, false);
});
await check('Analytics stored with consent, private paths and junk dropped', async () => {
  const r = await request('analytics', {
    events: [
      ev('view', '/gants-de-boxe/', { w: 1440, evil: '<script>', dwell: 'x' }),
      ev('view', '/admin/'),
      ev('nope', '/'),
      ev('leave', '/gants-de-boxe/', { dwell: 12000, depth: 70 }),
    ],
  }, { Cookie: 'bdb_consent=accepted; bdb_vid=' + vid });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).stored, 2);
});
await check('Analytics report denied to visitors', async () =>
  assert.equal((await request('analytics?days=7')).status, 403),
);
await check('Analytics report aggregates the session', async () => {
  const d = await (await request('analytics?days=7', undefined, admin)).json();
  assert.ok(d.totals.views >= 1);
  const page = d.pages.find((p) => p.path === '/gants-de-boxe/');
  assert.ok(page && page.views >= 1 && page.name === 'Gants de boxe');
  assert.ok(!d.pages.some((p) => p.path === '/admin/' || p.path === '/atelier/'));
});
console.log(
  JSON.stringify({ passed: results.length, date: new Date().toISOString() }),
);


// Clients et ventes : le telephone et l'accord sont enregistres, l'atelier les lit, l'export CSV les rend.
const buyer = 'client-qa-' + Math.random().toString(36).slice(2, 8) + '@example.invalid';
await check('Checkout stores phone and opt-in, clients report and CSV expose them', async () => {
  const jar = {};
  const keep = (r) => {
    const c = r.headers.get('set-cookie');
    if (c) jar.Cookie = c.split(';')[0];
  };
  let r = await request('commerce/cart', { action: 'add', productId: 'mat-blade-gold', variant: '12 oz', quantity: 1 }, jar);
  keep(r);
  assert.equal(r.status, 200);
  const cart = await (await request('commerce/cart', undefined, jar)).json();
  r = await request('commerce/checkout', {
    idempotencyKey: crypto.randomUUID(), name: 'Client QA', email: buyer, phone: '06 12 34 56 78', optin: true,
    address1: '12 rue du Ring', address2: 'Bât. B', postcode: '31000', city: 'Toulouse',
    delivery: 'home', paymentOutcome: 'approved', consent: true, quotedTotal: cart.subtotal + 890, quotedRevision: cart.revision, website: '',
  }, jar);
  assert.equal(r.status, 201, 'checkout ' + r.status + ' ' + (await r.text()));
  const report = await (await request('commerce/admin-clients?days=7', undefined, admin)).json();
  const c = report.clients.find((x) => x.email === buyer);
  assert.ok(c && c.optin === true && c.phone === '06 12 34 56 78' && c.approved === 1 && c.address === '12 rue du Ring, Bât. B, 31000 Toulouse', JSON.stringify(c));
  assert.ok(report.totals.approved >= 1 && report.products.length >= 1);
  const csv = await request('commerce/admin-export?kind=clients&days=7', undefined, admin);
  assert.equal(csv.status, 200);
  assert.ok((csv.headers.get('content-type') || '').includes('text/csv'));
  const bytes = new Uint8Array(await csv.arrayBuffer());
  assert.deepEqual(Array.from(bytes.slice(0, 3)), [0xef, 0xbb, 0xbf], 'BOM for Excel');
  const text = new TextDecoder().decode(bytes);
  assert.ok(text.startsWith('Nom;E-mail;T') && text.includes(buyer) && text.includes('06 12 34 56 78') && text.includes('31000 Toulouse'));
});
await check('Client anonymisation erases contact, keeps the order for the books', async () => {
  assert.equal((await request('commerce/admin-client-anonymise', { email: buyer })).status, 403);
  const r = await request('commerce/admin-client-anonymise', { email: buyer }, admin);
  const body = await r.text();
  assert.equal(r.status, 200, body);
  const d = JSON.parse(body);
  assert.ok(d.orders >= 1, JSON.stringify(d));
  const report = await (await request('commerce/admin-clients?days=7', undefined, admin)).json();
  assert.ok(!report.clients.some((x) => x.email === buyer), 'buyer still listed');
  const erased = report.clients.find((x) => x.name === 'Client supprimé' && x.email.endsWith('@anonymise.invalid'));
  assert.ok(erased && erased.phone === '' && erased.address === '' && erased.approved >= 1, JSON.stringify(erased));
  assert.equal((await request('commerce/admin-client-anonymise', { email: 'nope' }, admin)).status, 400);
});
await check('Clients report and export denied to visitors', async () => {
  assert.equal((await request('commerce/admin-clients')).status, 403);
  assert.equal((await request('commerce/admin-export?kind=ventes')).status, 403);
});
await check('Checkout rejects a malformed phone', async () => {
  const jar = {};
  let r = await request('commerce/cart', { action: 'add', productId: 'mat-blade-gold', variant: '12 oz', quantity: 1 }, jar);
  const c = r.headers.get('set-cookie');
  if (c) jar.Cookie = c.split(';')[0];
  const cart = await (await request('commerce/cart', undefined, jar)).json();
  r = await request('commerce/checkout', {
    idempotencyKey: crypto.randomUUID(), name: 'Client QA', email: buyer, phone: 'call me <script>', optin: 'yes',
    address1: '12 rue du Ring', postcode: '31000', city: 'Toulouse',
    delivery: 'home', paymentOutcome: 'approved', consent: true, quotedTotal: cart.subtotal + 890, quotedRevision: cart.revision, website: '',
  }, jar);
  assert.equal(r.status, 400);
  r = await request('commerce/checkout', {
    idempotencyKey: crypto.randomUUID(), name: 'Client QA', email: buyer, phone: '', optin: false,
    address1: '12 rue du Ring', postcode: '3100', city: 'Toulouse',
    delivery: 'home', paymentOutcome: 'approved', consent: true, quotedTotal: cart.subtotal + 890, quotedRevision: cart.revision, website: '',
  }, jar);
  assert.equal(r.status, 400, 'postcode must be five digits');
});
await check('Long-tail listings answer for glove weights and brand-by-family scopes', async () => {
  for (const scope of ['gants-de-boxe-16-oz', 'marque-fairtex--gants-de-boxe']) {
    const r = await fetch(base + '/api/catalog-list?scope=' + scope);
    assert.equal(r.status, 200, scope);
    const body = await r.json();
    assert.ok(body.items.length >= 6, scope + ' has at least six models');
  }
  assert.equal((await fetch(base + '/api/catalog-list?scope=gants-de-boxe-20-oz')).status, 404, 'a weight under six models has no page');
});

await check('Observatory feeds are public, dated and consistent', async () => {
  const json = await (await fetch(base + '/observatoire-des-prix.json')).json();
  assert.ok(json.products > 500 && json.families.length >= 6 && json.weights.length >= 6, 'series present');
  assert.ok(json.summary.length >= 3, 'citable sentences');
  const g = json.families.find((r) => r.key === 'gants-de-boxe');
  assert.ok(g.min <= g.median && g.median <= g.max, 'ordered statistics');
  const csv = await (await fetch(base + '/observatoire-des-prix.csv')).text();
  assert.ok(csv.includes('serie;cle;libelle') && csv.split('\n').length > 20, 'csv rows');
});

const rpc = async (name, args) => {
  const r = await fetch(base + '/api/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) });
  return { status: r.status, body: await r.json() };
};

await check('MCP: glove weight, observatory and consenting sign-up', async () => {
  const weight = await rpc('recommend_glove_weight', { usage: 'partenaire', bodyWeightKg: 70 });
  assert.equal(weight.body.result?.structuredContent?.recommended, '16 oz');
  assert.ok(String(weight.body.result?.structuredContent?.calculator).includes('/outils/poids-de-gants/?usage=partenaire&poids=70'));
  const obs = await rpc('get_price_observatory', { series: 'gloveWeights' });
  assert.ok(obs.body.result?.structuredContent?.gloveWeights?.length >= 6);
  assert.ok(!('families' in obs.body.result.structuredContent), 'only the asked series');
  const refused = await rpc('subscribe_opening_alert', { email: 'mcp-test@example.invalid', consent: false });
  assert.ok(refused.body.error, 'no sign-up without explicit consent');
  const unknown = await rpc('subscribe_opening_alert', { email: 'mcp-test@example.invalid', consent: true, slug: 'modele-inexistant' });
  assert.ok(unknown.body.error, 'unknown model refused');
  const email = 'mcp-' + Date.now() + '@example.invalid';
  const first = await rpc('subscribe_opening_alert', { email, consent: true });
  assert.equal(first.body.result?.structuredContent?.registered, true, JSON.stringify(first.body));
  const again = await rpc('subscribe_opening_alert', { email, consent: true });
  assert.equal(again.body.result?.structuredContent?.registered, false, 'a second call reveals nothing and adds nothing');
});

console.log(
  JSON.stringify({ passed: results.length, date: new Date().toISOString() }),
);