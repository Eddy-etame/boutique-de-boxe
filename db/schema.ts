import {
  index,
  pgTable,
  text,
  integer,
  bigint,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Colonnes et noms identiques à l’ancien schéma D1 : le code applicatif
// interroge ces tables en SQL brut via l’adaptateur de db/index.ts.
export const alerts = pgTable(
  'alerts',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    productId: text('product_id').notNull(),
    variant: text('variant').notNull().default(''),
    createdAt: text('created_at').notNull(),
    consentVersion: text('consent_version').notNull(),
    unsubscribeToken: text('unsubscribe_token').notNull(),
  },
  (t) => [
    uniqueIndex('alerts_email_product_variant').on(
      t.email,
      t.productId,
      t.variant,
    ),
    uniqueIndex('alerts_unsubscribe_token').on(t.unsubscribeToken),
  ],
);
export const contacts = pgTable('contacts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  message: text('message').notNull(),
  createdAt: text('created_at').notNull(),
  requestKey: text('request_key').unique(),
  relayToken: text('relay_token'),
  relayStatus: text('relay_status').notNull().default('pending'),
});
export const productOverrides = pgTable('product_overrides', {
  productId: text('product_id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  priceCents: integer('price_cents').notNull(),
  internalStock: integer('internal_stock').notNull().default(0),
  plannedDiscount: integer('planned_discount').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
  updatedBy: text('updated_by').notNull(),
});
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  hits: integer('hits').notNull(),
  expires: bigint('expires', { mode: 'number' }).notNull(),
});

export const catalogEntries = pgTable('catalog_entries', {
  id: text('id').primaryKey(),
  payload: text('payload').notNull(),
  archived: integer('archived').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});

export const carts = pgTable('carts', {
  id: text('id').primaryKey(),
  payload: text('payload').notNull(),
  updatedAt: text('updated_at').notNull(),
  expiresAt: bigint('expires_at', { mode: 'number' }).notNull(),
  revision: integer('revision').notNull().default(0),
});
export const simulationOrders = pgTable(
  'simulation_orders',
  {
    id: text('id').primaryKey(),
    cartId: text('cart_id').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    fingerprint: text('fingerprint').notNull(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    lines: text('lines').notNull(),
    subtotal: integer('subtotal').notNull(),
    shipping: integer('shipping').notNull(),
    total: integer('total').notNull(),
    delivery: text('delivery').notNull(),
    status: text('status').notNull(),
    createdAt: text('created_at').notNull(),
    emailStatus: text('email_status').notNull().default('pending'),
    emailAttempts: integer('email_attempts').notNull().default(0),
    emailError: text('email_error'),
    emailClaimedAt: text('email_claimed_at'),
    phone: text('phone').notNull().default(''),
    optin: integer('optin').notNull().default(0),
    address1: text('address1').notNull().default(''),
    address2: text('address2').notNull().default(''),
    postcode: text('postcode').notNull().default(''),
    city: text('city').notNull().default(''),
  },
  (t) => [
    uniqueIndex('orders_cart_idempotency').on(t.cartId, t.idempotencyKey),
    index('orders_email').on(t.email),
    index('orders_created').on(t.createdAt),
  ],
);

export const paymentAttempts = pgTable(
  'payment_attempts',
  {
    id: text('id').primaryKey(),
    cartId: text('cart_id').notNull(),
    requestKey: text('request_key').notNull(),
    fingerprint: text('fingerprint').notNull(),
    cartRevision: integer('cart_revision').notNull(),
    mode: text('mode').notNull(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    billing: text('billing').notNull(),
    lines: text('lines').notNull(),
    subtotal: integer('subtotal').notNull(),
    shipping: integer('shipping').notNull(),
    total: integer('total').notNull(),
    delivery: text('delivery').notNull(),
    providerId: text('provider_id').unique(),
    paymentUrl: text('payment_url'),
    status: text('status').notNull(),
    error: text('error'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    paidAt: text('paid_at'),
    refundedCents: integer('refunded_cents').notNull().default(0),
  },
  (t) => [
    uniqueIndex('payplug_cart_request').on(t.cartId, t.requestKey),
    uniqueIndex('payplug_cart_revision').on(t.cartId, t.cartRevision),
  ],
);

/** Mesure d’audience maison : un événement par page vue, sortie, clic, ajout, recherche. Aucune adresse IP. */
export const events = pgTable(
  'events',
  {
    id: text('id').primaryKey(),
    vid: text('vid').notNull(),
    sid: text('sid').notNull(),
    type: text('type').notNull(),
    path: text('path').notNull(),
    referrer: text('referrer').notNull().default(''),
    data: text('data').notNull().default('{}'),
    device: text('device').notNull().default(''),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('events_created').on(t.createdAt), index('events_sid').on(t.sid), index('events_path_type').on(t.path, t.type)],
);
