import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const alerts = sqliteTable(
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
export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  message: text('message').notNull(),
  createdAt: text('created_at').notNull(),
  requestKey: text('request_key').unique(),
  relayToken: text('relay_token'),
  relayStatus: text('relay_status').notNull().default('pending'),
});
export const productOverrides = sqliteTable('product_overrides', {
  productId: text('product_id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  priceCents: integer('price_cents').notNull(),
  internalStock: integer('internal_stock').notNull().default(0),
  plannedDiscount: integer('planned_discount').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
  updatedBy: text('updated_by').notNull(),
});
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  hits: integer('hits').notNull(),
  expires: integer('expires').notNull(),
});

export const catalogEntries = sqliteTable('catalog_entries', {
  id: text('id').primaryKey(),
  payload: text('payload').notNull(),
  archived: integer('archived').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});

export const carts = sqliteTable('carts', {
  id: text('id').primaryKey(),
  payload: text('payload').notNull(),
  updatedAt: text('updated_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
  revision: integer('revision').notNull().default(0),
});
export const simulationOrders = sqliteTable(
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
  },
  (t) => [
    uniqueIndex('orders_cart_idempotency').on(t.cartId, t.idempotencyKey),
  ],
);

export const paymentAttempts = sqliteTable(
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
