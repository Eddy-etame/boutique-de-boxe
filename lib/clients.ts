import { db, readCatalog } from '@/lib/database';
import { categoryFor } from '@/lib/catalog';
import { parseRelay, relayLabel } from '@/lib/boxtal';

/**
 * Clients et ventes de la boutique, lus depuis les commandes d’essai approuvées
 * et les paiements PayPlug confirmés. Sert l’onglet « Clients & ventes » de
 * l’atelier et les exports CSV. Aucun chiffre ici n’est un encaissement tant
 * que la boutique reste en simulation.
 */
type OrderRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  optin: number | null;
  address1: string | null;
  address2: string | null;
  postcode: string | null;
  city: string | null;
  lines: string;
  subtotal: number;
  shipping: number;
  total: number;
  delivery: string;
  relay_point?: string | null;
  status: string;
  created_at: string;
  source: 'essai' | 'payplug';
};
type Line = { productId: string; variant?: string; quantity: number; price: number; name?: string };

let columnsReady = false;
/** Les colonnes de contact arrivent sans migration manuelle : ajoutées au premier passage si elles manquent. */
export async function ensureBuyerColumns() {
  if (columnsReady) return;
  const database = await db();
  await database.prepare("ALTER TABLE simulation_orders ADD COLUMN IF NOT EXISTS phone text DEFAULT '' NOT NULL").run();
  await database.prepare('ALTER TABLE simulation_orders ADD COLUMN IF NOT EXISTS optin integer DEFAULT 0 NOT NULL').run();
  for (const column of ['address1', 'address2', 'postcode', 'city', 'relay_point'])
    await database.prepare(`ALTER TABLE simulation_orders ADD COLUMN IF NOT EXISTS ${column} text DEFAULT '' NOT NULL`).run();
  await database.prepare('CREATE INDEX IF NOT EXISTS orders_email ON simulation_orders (email)').run();
  await database.prepare('CREATE INDEX IF NOT EXISTS orders_created ON simulation_orders (created_at)').run();
  columnsReady = true;
}

async function orders(days: number): Promise<OrderRow[]> {
  await ensureBuyerColumns();
  const database = await db();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const essais = (
    await database
      .prepare(
        'SELECT id,name,email,phone,optin,address1,address2,postcode,city,relay_point,lines,subtotal,shipping,total,delivery,status,created_at FROM simulation_orders WHERE created_at>=? ORDER BY created_at DESC LIMIT 5000',
      )
      .bind(since)
      .all<Omit<OrderRow, 'source'>>()
  ).results.map((o) => ({ ...o, source: 'essai' as const }));
  const payplug = (
    await database
      .prepare(
        "SELECT id,name,email,billing,lines,subtotal,shipping,total,delivery,status,created_at FROM payment_attempts WHERE status='paid' AND created_at>=? ORDER BY created_at DESC LIMIT 5000",
      )
      .bind(since)
      .all<Omit<OrderRow, 'source' | 'phone' | 'optin' | 'address1' | 'address2' | 'postcode' | 'city'> & { billing: string }>()
  ).results.map((o) => {
    // L’adresse de facturation PayPlug sert d’adresse de livraison faute de mieux.
    let b: Record<string, unknown> = {};
    try { b = JSON.parse(o.billing || '{}'); } catch { /* facturation illisible */ }
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    return { ...o, phone: str(b.mobile_phone_number), optin: 0, address1: str(b.address1), address2: str(b.address2), postcode: str(b.postcode), city: str(b.city), source: 'payplug' as const, status: 'paid' };
  });
  return [...essais, ...payplug].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

const approved = (o: OrderRow) => o.status === 'simulated_paid' || o.status === 'paid';
const parseLines = (o: OrderRow): Line[] => {
  try {
    const v = JSON.parse(o.lines);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

export async function clientsReport(days: number) {
  const [rows, products] = await Promise.all([orders(days), readCatalog()]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const nameOf = (id: string, fallback?: string) => byId.get(id)?.name || fallback || id;
  const familyOf = (id: string) => {
    const p = byId.get(id);
    return p ? categoryFor(p.category)?.name || p.category : 'inconnue';
  };
  const brandOf = (id: string) => byId.get(id)?.brand || 'inconnue';

  // Clients : une ligne par adresse e-mail, avec ses commandes et ce qu’elle a acheté.
  const clients = new Map<
    string,
    { name: string; email: string; phone: string; optin: boolean; address: string; orders: number; approved: number; declined: number; total: number; first: string; last: string; items: string[]; sources: Set<string> }
  >();
  for (const o of rows) {
    const key = o.email.toLowerCase();
    const c = clients.get(key) || { name: o.name, email: key, phone: '', optin: false, address: '', orders: 0, approved: 0, declined: 0, total: 0, first: o.created_at, last: o.created_at, items: [], sources: new Set<string>() };
    c.orders++;
    if (approved(o)) {
      c.approved++;
      c.total += o.total;
    } else c.declined++;
    if (o.phone && !c.phone) c.phone = o.phone;
    const address = [o.address1, o.address2, [o.postcode, o.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    if (address && (!c.address || o.created_at >= c.last)) c.address = address;
    if (o.optin) c.optin = true;
    if (o.created_at < c.first) c.first = o.created_at;
    if (o.created_at > c.last) {
      c.last = o.created_at;
      c.name = o.name;
    }
    for (const l of parseLines(o)) {
      const label = nameOf(l.productId, l.name) + (l.variant ? ' · ' + l.variant : '');
      if (!c.items.includes(label)) c.items.push(label);
    }
    c.sources.add(o.source);
    clients.set(key, c);
  }

  // Ventes : par jour, par modèle, par famille, par marque, par mode de livraison.
  const paid = rows.filter(approved);
  const byDay = new Map<string, { orders: number; revenue: number }>();
  const byProduct = new Map<string, { name: string; quantity: number; revenue: number; orders: number }>();
  const byFamily = new Map<string, { quantity: number; revenue: number }>();
  const byBrand = new Map<string, { quantity: number; revenue: number }>();
  const byDelivery = new Map<string, number>();
  for (const o of paid) {
    const day = o.created_at.slice(0, 10);
    const d = byDay.get(day) || { orders: 0, revenue: 0 };
    d.orders++;
    d.revenue += o.total;
    byDay.set(day, d);
    byDelivery.set(o.delivery, (byDelivery.get(o.delivery) || 0) + 1);
    for (const l of parseLines(o)) {
      const amount = l.price * l.quantity;
      const p = byProduct.get(l.productId) || { name: nameOf(l.productId, l.name), quantity: 0, revenue: 0, orders: 0 };
      p.quantity += l.quantity;
      p.revenue += amount;
      p.orders++;
      byProduct.set(l.productId, p);
      const f = byFamily.get(familyOf(l.productId)) || { quantity: 0, revenue: 0 };
      f.quantity += l.quantity;
      f.revenue += amount;
      byFamily.set(familyOf(l.productId), f);
      const b = byBrand.get(brandOf(l.productId)) || { quantity: 0, revenue: 0 };
      b.quantity += l.quantity;
      b.revenue += amount;
      byBrand.set(brandOf(l.productId), b);
    }
  }
  const revenue = paid.reduce((n, o) => n + o.total, 0);

  // Entonnoir : fiches vues et ajouts au panier mesurés (visiteurs consentants), commandes approuvées.
  let funnel = { productViews: 0, adds: 0, orders: paid.length, sessionsWithAdd: 0 };
  try {
    const database = await db();
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const f = await database
      .prepare(
        "SELECT (SELECT count(*)::int FROM events WHERE type='view' AND path LIKE '/produits/%' AND created_at>=?) AS product_views, (SELECT count(*)::int FROM events WHERE type='add_to_cart' AND created_at>=?) AS adds, (SELECT count(DISTINCT sid)::int FROM events WHERE type='add_to_cart' AND created_at>=?) AS sessions_with_add",
      )
      .bind(since, since, since)
      .first<{ product_views: number; adds: number; sessions_with_add: number }>();
    if (f) funnel = { productViews: f.product_views, adds: f.adds, orders: paid.length, sessionsWithAdd: f.sessions_with_add };
  } catch {
    /* la table des événements n’existe pas encore : l’entonnoir reste partiel */
  }

  const list = [...clients.values()].map((c) => ({ ...c, sources: [...c.sources] })).sort((a, b) => (a.last < b.last ? 1 : -1));
  return {
    days,
    totals: {
      clients: list.length,
      optin: list.filter((c) => c.optin).length,
      withPhone: list.filter((c) => c.phone).length,
      orders: rows.length,
      approved: paid.length,
      declined: rows.length - paid.length,
      revenue,
      averageBasket: paid.length ? Math.round(revenue / paid.length) : 0,
      repeatClients: list.filter((c) => c.approved > 1).length,
    },
    clients: list,
    byDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v })),
    products: [...byProduct.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 25),
    families: [...byFamily.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue),
    brands: [...byBrand.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 15),
    deliveries: [...byDelivery.entries()].map(([mode, n]) => ({ mode, n })),
    funnel,
    recent: rows.slice(0, 50).map((o) => ({ id: o.id, name: o.name, email: o.email, phone: o.phone || '', address: [o.address1, o.address2, [o.postcode, o.city].filter(Boolean).join(' ')].filter(Boolean).join(', '), delivery: o.delivery + (parseRelay(o.relay_point) ? ' · ' + relayLabel(parseRelay(o.relay_point)!) : ''), total: o.total, status: o.status, source: o.source, createdAt: o.created_at, items: parseLines(o).map((l) => nameOf(l.productId, l.name) + (l.variant ? ' · ' + l.variant : '') + ' × ' + l.quantity) })),
  };
}

const cell = (v: string | number | null | undefined) => {
  const s = v == null ? '' : String(v);
  // Neutralise l’injection de formule Excel : un champ commençant par = + - @ (ou tab) est préfixé d’une apostrophe.
  const g = /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
  return /[";\n\r]/.test(g) ? '"' + g.replace(/"/g, '""') + '"' : g;
};
const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

/** CSV lisible par Excel en France : UTF-8 avec BOM, point-virgule, montants en euros à virgule. */
/** Les inscrits à l’ouverture : e-mail, mobile et accord SMS, modèle suivi, endroit de l’inscription. */
export async function alertsCsv() {
  const products = await readCatalog();
  const rows = (
    await (await db())
      .prepare('SELECT email, phone, sms_consent, product_id, variant, source, created_at FROM alerts ORDER BY created_at DESC')
      .all<{ email: string; phone: string; sms_consent: number; product_id: string; variant: string; source: string; created_at: string }>()
  ).results;
  const lines = [['E-mail', 'Mobile', 'Accord SMS', 'Modèle', 'Taille', 'Inscription depuis', 'Date'].join(';')];
  for (const a of rows) {
    const p = products.find((x) => x.id === a.product_id);
    lines.push([a.email, a.phone || '', a.sms_consent ? 'oui' : 'non', a.product_id === 'launch' ? 'Ouverture de la boutique' : p?.name || a.product_id, a.variant || '', a.source || '', a.created_at.slice(0, 19).replace('T', ' ')].map(cell).join(';'));
  }
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

export async function clientsCsv(kind: 'clients' | 'ventes', days: number) {
  const r = await clientsReport(days);
  const lines: string[] = [];
  if (kind === 'clients') {
    lines.push(['Nom', 'E-mail', 'Téléphone', 'Adresse', 'Accord e-mail', 'Commandes', 'Approuvées', 'Refusées', 'Total (€)', 'Première commande', 'Dernière commande', 'Modèles', 'Origine'].join(';'));
    for (const c of r.clients)
      lines.push([c.name, c.email, c.phone, c.address, c.optin ? 'oui' : 'non', c.orders, c.approved, c.declined, euros(c.total), c.first.slice(0, 10), c.last.slice(0, 10), c.items.join(' | '), c.sources.join(' | ')].map(cell).join(';'));
  } else {
    lines.push(['Date', 'Référence', 'Client', 'E-mail', 'Téléphone', 'Adresse', 'Livraison', 'Statut', 'Origine', 'Total (€)', 'Articles'].join(';'));
    for (const o of r.recent)
      lines.push([o.createdAt.slice(0, 19).replace('T', ' '), o.id, o.name, o.email, o.phone, o.address, o.delivery, o.status, o.source, euros(o.total), o.items.join(' | ')].map(cell).join(';'));
  }
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}
