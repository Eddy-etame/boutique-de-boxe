import { db, runtime, readCatalog } from './database';
import { money, shop, variantPrice, type Product } from './catalog';

export type CartItem = { productId: string; variant: string; quantity: number };
export type CartLine = CartItem & {
  name: string;
  slug: string;
  image: string;
  price: number;
  sizes: string[];
};
export type Cart = {
  items: CartLine[];
  subtotal: number;
  notices: string[];
  revision: number;
};
export type Order = {
  id: string;
  cart_id: string;
  idempotency_key: string;
  fingerprint: string;
  name: string;
  email: string;
  lines: string;
  subtotal: number;
  shipping: number;
  total: number;
  delivery: string;
  status: string;
  created_at: string;
  email_status: string;
  email_attempts: number;
  email_error: string | null;
};
export const uuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
    v,
  );
export function cartToken(request: Request) {
  const value = request.headers
    .get('cookie')
    ?.split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith('bd_cart='))
    ?.slice(8);
  return uuid(value) ? value : null;
}
/** Compose le panier à partir des lignes brutes et du catalogue, sans accès base :
 *  réutilisable après une écriture pour éviter de relire ce qu’on vient d’écrire. */
export function buildCart(
  raw: CartItem[],
  products: Product[],
  revision: number,
): Cart {
  const notices: string[] = [];
  const items: CartLine[] = [];
  for (const line of raw) {
    const p = products.find((p) => p.id === line.productId);
    if (
      !p ||
      (p.sizes.length ? !p.sizes.includes(line.variant) : line.variant !== '')
    ) {
      notices.push(
        'Une référence ou une déclinaison n’est plus présentée. Elle a été retirée du calcul.',
      );
      continue;
    }
    items.push({
      ...line,
      name: p.name,
      slug: p.slug,
      image: p.cut?.small ?? p.images[0].small,
      price: variantPrice(p, line.variant),
      sizes: p.sizes,
    });
  }
  return {
    items,
    subtotal: items.reduce((sum, line) => sum + line.price * line.quantity, 0),
    notices,
    revision,
  };
}

export async function resolveCart(
  id: string,
  catalog?: Product[],
): Promise<Cart> {
  // La lecture du panier et le chargement du catalogue sont indépendants : en parallèle.
  const database = await db();
  const [stored, products] = await Promise.all([
    database
      .prepare('SELECT payload,revision,expires_at FROM carts WHERE id=?')
      .bind(id)
      .first<{ payload: string; revision: number; expires_at: number }>(),
    catalog ? Promise.resolve(catalog) : readCatalog(),
  ]);
  const raw: CartItem[] =
    stored && stored.expires_at > Date.now() ? JSON.parse(stored.payload) : [];
  return buildCart(raw, products, stored?.revision || 0);
}
export function shippingFor(subtotal: number, delivery: string) {
  return delivery === 'home' ? 890 : subtotal >= 6900 ? 0 : 690;
}
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
export function receiptHtml(order: Order) {
  const lines = JSON.parse(order.lines) as CartLine[];
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Reçu de simulation ${escape(order.id.slice(0, 8))}</title><style>body{margin:0;background:#efeee8;color:#1c211e;font:15px/1.6 Arial,sans-serif}.paper{max-width:660px;margin:40px auto;padding:40px;background:white}h1{font-size:42px;line-height:1.05}table{width:100%;border-collapse:collapse}td,th{padding:14px 0;border-bottom:1px solid #ddd;text-align:left}td:last-child,th:last-child{text-align:right}.tag{background:#e9ef5b;padding:10px;font-weight:bold}.total{font-size:24px;text-align:right}.small{font-size:12px;color:#596059}@media print{body{background:white}.paper{margin:0;padding:0}}</style></head><body><main class="paper"><p><b>BOUTIQUE<br>DE BOXE.</b></p><p class="tag">SIMULATION — AUCUN DÉBIT — AUCUNE EXPÉDITION</p><h1>Votre séance<br>prend forme.</h1><p>Bonjour ${escape(order.name)}, voici le récapitulatif de votre commande d’essai.</p><p class="small">Référence ${escape(order.id)}<br>${escape(new Date(order.created_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }))} · EUR</p><table><thead><tr><th>Équipement</th><th>Montant simulé</th></tr></thead><tbody>${lines.map((l) => `<tr><td>${escape(l.name)}<br><span class="small">${escape(l.variant || 'Sans déclinaison')} · ${l.quantity} × ${money(l.price)}</span></td><td>${money(l.price * l.quantity)}</td></tr>`).join('')}<tr><td>Livraison ${order.delivery === 'home' ? 'à domicile' : 'en point relais'} (simulation)</td><td>${money(order.shipping)}</td></tr></tbody></table><p class="total"><b>Total simulé ${money(order.total)}</b></p><p>Le paiement d’essai est approuvé. Aucun moyen de paiement réel n’a été demandé. Ce document n’est ni une facture ni une preuve d’achat.</p><p class="small">Tarifs indicatifs, y compris pour le matériel lourd ; transporteur, stock et conditions réelles restent à confirmer à l’ouverture.</p><hr><p class="small">${shop.entity} · SIREN ${shop.siren}<br>${shop.address}<br>${shop.email}</p></main></body></html>`;
}
export async function sendReceipt(order: Order) {
  if (
    order.status !== 'simulated_paid' ||
    !['pending', 'unconfigured', 'failed'].includes(order.email_status)
  )
    return;
  const database = await db();
  const env = await runtime();
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
    await database
      .prepare(
        "UPDATE simulation_orders SET email_status='unconfigured',email_error='Service d’envoi à configurer' WHERE id=? AND email_status IN ('pending','unconfigured','failed')",
      )
      .bind(order.id)
      .run();
    return;
  }
  // A claim prevents two simultaneous retries from sending the same receipt.
  const claim = await database
    .prepare(
      "UPDATE simulation_orders SET email_status='sending',email_attempts=email_attempts+1,email_claimed_at=? WHERE id=? AND email_status IN ('pending','unconfigured','failed') RETURNING id",
    )
    .bind(new Date().toISOString(), order.id)
    .first();
  if (!claim) return;
  let status = 'unconfirmed';
  let message =
    'Réponse du service non confirmée. Vérifier son journal avant de renvoyer.';
  try {
    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(12000),
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `simulation-receipt/${order.id}`,
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [order.email],
        subject: `[Simulation] Votre reçu Boutique de Boxe · ${order.id.slice(0, 8)}`,
        html: receiptHtml(order),
        reply_to: shop.email,
      }),
    });
    if (result.ok) {
      status = 'accepted';
      message = '';
    } else if (result.status < 500 && result.status !== 408) {
      status = 'failed';
      message = `Service e-mail : refus ${result.status}`;
    }
  } catch {
    /* An uncertain response must never become a delivered claim or blind retry. */
  }
  await database
    .prepare(
      'UPDATE simulation_orders SET email_status=?,email_error=? WHERE id=?',
    )
    .bind(status, message, order.id)
    .run();
}

export async function recoverStaleEmailClaims() {
  await (
    await db()
  )
    .prepare(
      "UPDATE simulation_orders SET email_status='unconfirmed',email_error='Envoi interrompu : vérifier le journal du prestataire avant toute nouvelle tentative.' WHERE email_status='sending' AND (email_claimed_at IS NULL OR email_claimed_at < ?)",
    )
    .bind(new Date(Date.now() - 120000).toISOString())
    .run();
}
