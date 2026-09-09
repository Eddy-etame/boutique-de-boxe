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
