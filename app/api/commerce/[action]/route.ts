import { clientIp } from '@/lib/request';
import { clientsReport, clientsCsv, ensureBuyerColumns } from '@/lib/clients';
import { db, isAdmin, readCatalog } from '@/lib/database';
import {
  cartToken,
  resolveCart,
  shippingFor,
  receiptHtml,
  sendReceipt,
  recoverStaleEmailClaims,
  uuid,
  type CartItem,
  type Order,
} from '@/lib/commerce';
export const dynamic = 'force-dynamic';
const reply = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
      ...headers,
    },
  });
type Context = { params: Promise<{ action: string }> };
async function ownedOrder(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!uuid(id)) return null;
  const order = await (
    await db()
  )
    .prepare('SELECT * FROM simulation_orders WHERE id=?')
    .bind(id)
    .first<Order>();
  const active =
    cartToken(request) === order?.cart_id &&
    (await (
      await db()
    )
      .prepare('SELECT id FROM carts WHERE id=? AND expires_at>?')
      .bind(order!.cart_id, Date.now())
      .first());
  return order && (active || (await isAdmin())) ? order : null;
}
export async function GET(request: Request, context: Context) {
  try {
    const { action } = await context.params;
    if (action === 'cart') {
      const token = cartToken(request);
      return reply(
        token
          ? await resolveCart(token)
          : { items: [], subtotal: 0, notices: [], revision: 0 },
      );
    }
    if (action === 'receipt') {
      const order = await ownedOrder(request);
      if (!order || order.status !== 'simulated_paid')
        return reply({ error: 'Reçu introuvable ou accès expiré.' }, 404);
      if (new URL(request.url).searchParams.get('download') === '1')
        return new Response(receiptHtml(order), {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Robots-Tag': 'noindex, nofollow',
            'Content-Disposition': `attachment; filename="recu-simulation-${order.id.slice(0, 8)}.html"`,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy':
              "default-src 'none'; style-src 'unsafe-inline'",
            'Referrer-Policy': 'no-referrer',
          },
        });
      const {
        cart_id: _cart,
        idempotency_key: _key,
        fingerprint: _fingerprint,
        ...safe
      } = order;
      return reply(
        { order: { ...safe, lines: JSON.parse(order.lines) } },
        200,
        { 'X-Robots-Tag': 'noindex, nofollow' },
      );
    }
    if (action === 'admin-clients') {
      if (!(await isAdmin())) return reply({ error: 'Accès réservé.' }, 403);
      const days = Math.min(Math.max(Number(new URL(request.url).searchParams.get('days')) || 90, 1), 730);
      return reply(await clientsReport(days));
    }
    if (action === 'admin-export') {
      if (!(await isAdmin())) return reply({ error: 'Accès réservé.' }, 403);
      const url = new URL(request.url);
      const kind = url.searchParams.get('kind') === 'ventes' ? 'ventes' : 'clients';
      const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 365, 1), 3650);
      return new Response(await clientsCsv(kind, days), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${kind}-boutique-de-boxe-${new Date().toISOString().slice(0, 10)}.csv"`,
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex',
        },
      });
    }
    if (action === 'admin-orders') {
      if (!(await isAdmin())) return reply({ error: 'Accès réservé.' }, 403);
      await recoverStaleEmailClaims();
      const rows = await (
        await db()
      )
        .prepare(
          'SELECT id,name,email,total,delivery,status,created_at,email_status,email_attempts,email_error FROM simulation_orders ORDER BY created_at DESC LIMIT 300',
        )
        .all();
      return reply({ orders: rows.results });
    }
    return reply({ error: 'Ressource introuvable.' }, 404);
  } catch (error) {
    console.error('commerce GET', (error as { code?: string }).code || (error as Error).name, (error as Error).message);
    return reply(
      {
        error:
          'Le service est temporairement indisponible. Votre panier reste enregistré.',
      },
      503,
    );
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const { action } = await context.params;
    if (
      request.headers.get('origin') !== new URL(request.url).origin ||
      !request.headers.get('content-type')?.includes('application/json')
    )
      return reply({ error: 'Origine ou format invalide.' }, 400);
    if (action.startsWith('admin') && !(await isAdmin()))
      return reply({ error: 'Accès réservé.' }, 403);
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: 'Demande vide.' }, 400);
    let raw = '';
    let bytes = 0;
    const decoder = new TextDecoder();
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.length;
      if (bytes > 12000) {
        await reader.cancel();
        return reply({ error: 'Demande trop longue.' }, 413);
      }
      raw += decoder.decode(chunk.value, { stream: true });
    }
    raw += decoder.decode();
    const data = JSON.parse(raw);
    if (
      !data ||
      typeof data !== 'object' ||
      Array.isArray(data) ||
      data.website
    )
      return reply({ error: 'Demande invalide.' }, 400);
    const database = await db();
    const bucket = Math.floor(Date.now() / 3600000);
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(
        `${clientIp(request)}:${bucket}:commerce:${action}`,
      ),
    );
    const key = Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
    const hits = await database
      .prepare(
        'INSERT INTO rate_limits(key,hits,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=rate_limits.hits+1 RETURNING hits',
      )
      .bind(key, (bucket + 2) * 3600000)
      .first<number>('hits');
    if ((hits || 0) > (action === 'cart' ? 120 : 20))
      return reply({ error: 'Trop de demandes. Réessayez plus tard.' }, 429);
    if (action === 'admin-client-anonymise') {
      // Droit à l’effacement : les commandes restent pour les comptes, le client disparaît.
      const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
      if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return reply({ error: 'Adresse invalide.' }, 400);
      await ensureBuyerColumns();
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email));
      const anonymous = 'supprime-' + Array.from(new Uint8Array(digest).slice(0, 6), (b) => b.toString(16).padStart(2, '0')).join('') + '@anonymise.invalid';
      const now = new Date().toISOString();
      const orders = await database
        .prepare("UPDATE simulation_orders SET name='Client supprimé', email=?, phone='', optin=0, address1='', address2='', postcode='', city='' WHERE lower(email)=? RETURNING id")
        .bind(anonymous, email)
        .all();
      const attempts = await database
        .prepare("UPDATE payment_attempts SET name='Client supprimé', email=?, billing='{}', updated_at=? WHERE lower(email)=? RETURNING id")
        .bind(anonymous, now, email)
        .all();
      const alerts = await database.prepare('DELETE FROM alerts WHERE lower(email)=? RETURNING id').bind(email).all();
      return reply({ ok: true, orders: orders.results.length, attempts: attempts.results.length, alerts: alerts.results.length });
    }
    if (action === 'admin-email') {
      if (!uuid(data.id)) return reply({ error: 'Référence invalide.' }, 400);
      const order = await database
        .prepare('SELECT * FROM simulation_orders WHERE id=?')
        .bind(data.id)
        .first<Order>();
      if (!order) return reply({ error: 'Commande introuvable.' }, 404);
      await sendReceipt(order);
      return reply({ ok: true });
    }
    const candidateToken = cartToken(request);
    const existingToken =
      candidateToken &&
      (await database
        .prepare('SELECT id FROM carts WHERE id=? AND expires_at>?')
        .bind(candidateToken, Date.now())
        .first())
        ? candidateToken
        : null;
    const token = existingToken || crypto.randomUUID();
    const cookie = {
      'Set-Cookie': `bd_cart=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`,
    };
    if (action === 'cart') {
      const products = await readCatalog();
      const cart = await resolveCart(token, products);
      let items: CartItem[] = cart.items.map(
        ({ productId, variant, quantity }) => ({
          productId,
          variant,
          quantity,
        }),
      );
      if (data.action === 'clear') items = [];
      else {
        const product = products.find((p) => p.id === data.productId);
        if (
          !product ||
          typeof data.variant !== 'string' ||
          (product.sizes.length
            ? !product.sizes.includes(data.variant)
            : data.variant !== '') ||
          !Number.isInteger(data.quantity) ||
          data.quantity < (data.action === 'update' ? 0 : 1) ||
          data.quantity > 10 ||
          !['add', 'update'].includes(data.action)
        )
          return reply(
            {
              error:
                'Vérifiez le produit, la déclinaison et la quantité (1 à 10).',
            },
            400,
          );
        const current = items.find(
          (i) => i.productId === product.id && i.variant === data.variant,
        );
        const quantity =
          data.action === 'add'
            ? (current?.quantity || 0) + data.quantity
            : data.quantity;
        if (quantity > 10)
          return reply(
            {
              error:
                'Le panier d’essai est limité à 10 exemplaires par déclinaison.',
            },
            400,
          );
        items = items.filter((i) => i !== current);
        if (quantity)
          items.push({
            productId: product.id,
            variant: data.variant,
            quantity,
          });
        if (items.length > 30)
          return reply(
            { error: 'Le panier d’essai est limité à 30 déclinaisons.' },
            400,
          );
      }
      const changed = await database
        .prepare(
          'INSERT INTO carts(id,payload,updated_at,expires_at,revision) VALUES (?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at,expires_at=excluded.expires_at,revision=carts.revision+1 WHERE carts.revision=? RETURNING id',
        )
        .bind(
          token,
          JSON.stringify(items),
          new Date().toISOString(),
          Date.now() + 30 * 86400000,
          cart.revision,
        )
        .first();
      if (!changed)
        return reply(
          {
            error:
              'Le panier a été modifié dans une autre fenêtre. Rechargez-le avant de réessayer.',
          },
          409,
        );
      return reply(await resolveCart(token, products), 200, cookie);
    }
    if (action !== 'checkout')
      return reply({ error: 'Ressource introuvable.' }, 404);
    if (
      !existingToken ||
      !uuid(data.idempotencyKey) ||
      typeof data.name !== 'string' ||
      data.name.trim().length < 2 ||
      data.name.length > 100 ||
      typeof data.email !== 'string' ||
      data.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ||
      !['relay', 'home'].includes(data.delivery) ||
      !['approved', 'declined'].includes(data.paymentOutcome) ||
      data.consent !== true ||
      !Number.isInteger(data.quotedTotal) ||
      (data.phone !== undefined && (typeof data.phone !== 'string' || data.phone.length > 30 || !/^[+0-9 ().-]*$/.test(data.phone))) ||
      (data.optin !== undefined && typeof data.optin !== 'boolean') ||
      typeof data.address1 !== 'string' ||
      data.address1.trim().length < 3 ||
      data.address1.length > 150 ||
      (data.address2 !== undefined && (typeof data.address2 !== 'string' || data.address2.length > 150)) ||
      typeof data.postcode !== 'string' ||
      !/^\d{5}$/.test(data.postcode.trim()) ||
      typeof data.city !== 'string' ||
      data.city.trim().length < 2 ||
      data.city.length > 100
    )
      return reply(
        {
          error:
            'Vérifiez vos coordonnées et confirmez le caractère simulé du paiement.',
        },
        400,
      );
    if (!Number.isInteger(data.quotedRevision) || data.quotedRevision < 1)
      return reply({ error: 'Rechargez le panier avant de confirmer.' }, 400);
    const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
    const optin = data.optin === true ? 1 : 0;
    const address = {
      address1: data.address1.trim(),
      address2: typeof data.address2 === 'string' ? data.address2.trim() : '',
      postcode: data.postcode.trim(),
      city: data.city.trim(),
    };
    const fingerprint = JSON.stringify([
      data.name.trim(),
      data.email.trim().toLowerCase(),
      data.delivery,
      data.paymentOutcome,
      data.quotedTotal,
      data.quotedRevision,
      phone,
      optin,
      address,
    ]);
    await ensureBuyerColumns();
    const previous = await database
      .prepare(
        'SELECT * FROM simulation_orders WHERE cart_id=? AND idempotency_key=?',
      )
      .bind(token, data.idempotencyKey)
      .first<Order>();
    if (previous)
      return previous.fingerprint === fingerprint
        ? reply(
            {
              id: previous.id,
              status: previous.status,
              emailStatus: previous.email_status,
            },
            200,
          )
        : reply(
            {
              error:
                'Cette tentative a déjà été utilisée avec un autre contenu. Rechargez le panier.',
            },
            409,
          );
    const cart = await resolveCart(token);
    if (!cart.items.length)
      return reply({ error: 'Votre panier est vide.' }, 400);
    const shipping = shippingFor(cart.subtotal, data.delivery);
    const total = cart.subtotal + shipping;
    if (
      data.quotedTotal !== total ||
      data.quotedRevision !== cart.revision ||
      cart.notices.length
    )
      return reply(
        {
          error:
            'Le catalogue ou le panier a changé. Rechargez le panier pour vérifier le montant.',
        },
        409,
      );
    const id = crypto.randomUUID();
    const status =
      data.paymentOutcome === 'approved'
        ? 'simulated_paid'
        : 'simulated_declined';
    const statements = [
      // Verrouille la ligne du panier pour la durée de la transaction : deux
      // validations simultanées du même panier sont sérialisées côté Postgres.
      database.prepare('SELECT revision FROM carts WHERE id=? FOR UPDATE').bind(token),
      database
        .prepare(
          'INSERT INTO simulation_orders(id,cart_id,idempotency_key,fingerprint,name,email,lines,subtotal,shipping,total,delivery,status,created_at,email_status,phone,optin,address1,address2,postcode,city) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? FROM carts WHERE id=? AND revision=? AND expires_at>?',
        )
        .bind(
          id,
          token,
          data.idempotencyKey,
          fingerprint,
          data.name.trim(),
          data.email.trim().toLowerCase(),
          JSON.stringify(cart.items),
          cart.subtotal,
          shipping,
          total,
          data.delivery,
          status,
          new Date().toISOString(),
          status === 'simulated_paid' ? 'pending' : 'not_applicable',
          phone,
          optin,
          address.address1,
          address.address2,
          address.postcode,
          address.city,
          token,
          cart.revision,
          Date.now(),
        ),
    ];
    if (status === 'simulated_paid')
      statements.push(
        database
          .prepare(
            "UPDATE carts SET payload='[]',updated_at=?,revision=revision+1 WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM simulation_orders WHERE id=?)",
          )
          .bind(new Date().toISOString(), token, cart.revision, id),
      );
    try {
      await database.batch(statements);
    } catch (error) {
      const race = await database
        .prepare(
          'SELECT id,status,email_status,fingerprint FROM simulation_orders WHERE cart_id=? AND idempotency_key=?',
        )
        .bind(token, data.idempotencyKey)
        .first<Order>();
      if (race && race.fingerprint === fingerprint)
        return reply({
          id: race.id,
          status: race.status,
          emailStatus: race.email_status,
        });
      throw error;
    }
    const order = await database
      .prepare('SELECT * FROM simulation_orders WHERE id=?')
      .bind(id)
      .first<Order>();
    if (!order) {
      const replay = await database
        .prepare(
          'SELECT * FROM simulation_orders WHERE cart_id=? AND idempotency_key=?',
        )
        .bind(token, data.idempotencyKey)
        .first<Order>();
      if (replay?.fingerprint === fingerprint)
        return reply({
          id: replay.id,
          status: replay.status,
          emailStatus: replay.email_status,
        });
      return reply(
        {
          error: 'Une autre tentative a déjà modifié ce panier. Rechargez-le.',
        },
        409,
      );
    }
    if (order) {
      try {
        await sendReceipt(order);
      } catch {
        /* The saved order remains valid when the mail service fails. */
      }
    }
    const emailStatus = await database
      .prepare('SELECT email_status FROM simulation_orders WHERE id=?')
      .bind(id)
      .first<string>('email_status');
    return reply({ id, status, emailStatus }, 201, cookie);
  } catch (error) {
    if (error instanceof SyntaxError)
      return reply({ error: 'Demande illisible.' }, 400);
    console.error('commerce POST', (error as { code?: string }).code || (error as Error).name, (error as Error).message);
    return reply(
      {
        error:
          'Le service est temporairement indisponible. Votre panier est conservé ; réessayez la même tentative.',
      },
      503,
    );
  }
}
