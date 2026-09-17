-- Boutique de Boxe — schéma complet à coller dans Supabase > SQL Editor > Run.
-- Idempotent : peut être rejoué sans casser une base déjà initialisée.

CREATE TABLE IF NOT EXISTS "alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"product_id" text NOT NULL,
	"variant" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	"consent_version" text NOT NULL,
	"unsubscribe_token" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "carts" (
	"id" text PRIMARY KEY NOT NULL,
	"payload" text NOT NULL,
	"updated_at" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "catalog_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"payload" text NOT NULL,
	"archived" integer DEFAULT 0 NOT NULL,
	"updated_at" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"created_at" text NOT NULL,
	"request_key" text,
	"relay_token" text,
	"relay_status" text DEFAULT 'pending' NOT NULL,
	CONSTRAINT "contacts_request_key_unique" UNIQUE("request_key")
);

CREATE TABLE IF NOT EXISTS "payment_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"cart_id" text NOT NULL,
	"request_key" text NOT NULL,
	"fingerprint" text NOT NULL,
	"cart_revision" integer NOT NULL,
	"mode" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"billing" text NOT NULL,
	"lines" text NOT NULL,
	"subtotal" integer NOT NULL,
	"shipping" integer NOT NULL,
	"total" integer NOT NULL,
	"delivery" text NOT NULL,
	"provider_id" text,
	"payment_url" text,
	"status" text NOT NULL,
	"error" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"paid_at" text,
	"refunded_cents" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "payment_attempts_provider_id_unique" UNIQUE("provider_id")
);

CREATE TABLE IF NOT EXISTS "product_overrides" (
	"product_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price_cents" integer NOT NULL,
	"internal_stock" integer DEFAULT 0 NOT NULL,
	"planned_discount" integer DEFAULT 0 NOT NULL,
	"updated_at" text NOT NULL,
	"updated_by" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"hits" integer NOT NULL,
	"expires" bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS "simulation_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"cart_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"fingerprint" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"lines" text NOT NULL,
	"subtotal" integer NOT NULL,
	"shipping" integer NOT NULL,
	"total" integer NOT NULL,
	"delivery" text NOT NULL,
	"status" text NOT NULL,
	"created_at" text NOT NULL,
	"email_status" text DEFAULT 'pending' NOT NULL,
	"email_attempts" integer DEFAULT 0 NOT NULL,
	"email_error" text,
	"email_claimed_at" text
);

CREATE UNIQUE INDEX IF NOT EXISTS "alerts_email_product_variant" ON "alerts" USING btree ("email","product_id","variant");
CREATE UNIQUE INDEX IF NOT EXISTS "alerts_unsubscribe_token" ON "alerts" USING btree ("unsubscribe_token");
CREATE UNIQUE INDEX IF NOT EXISTS "payplug_cart_request" ON "payment_attempts" USING btree ("cart_id","request_key");
CREATE UNIQUE INDEX IF NOT EXISTS "payplug_cart_revision" ON "payment_attempts" USING btree ("cart_id","cart_revision");
CREATE UNIQUE INDEX IF NOT EXISTS "orders_cart_idempotency" ON "simulation_orders" USING btree ("cart_id","idempotency_key");
-- Les tables ne sont lues que par le serveur (connexion Postgres). Verrouillage de l'API publique Supabase.
ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_overrides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "catalog_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "carts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "simulation_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_attempts" ENABLE ROW LEVEL SECURITY;

-- Mesure d'audience maison (11 septembre 2026)
CREATE TABLE IF NOT EXISTS "events" (
	"id" text PRIMARY KEY NOT NULL,
	"vid" text NOT NULL,
	"sid" text NOT NULL,
	"type" text NOT NULL,
	"path" text NOT NULL,
	"referrer" text DEFAULT '' NOT NULL,
	"data" text DEFAULT '{}' NOT NULL,
	"device" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL
);
CREATE INDEX IF NOT EXISTS "events_created" ON "events" ("created_at");
CREATE INDEX IF NOT EXISTS "events_sid" ON "events" ("sid");
CREATE INDEX IF NOT EXISTS "events_path_type" ON "events" ("path","type");
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;

-- 0003: buyer contact on simulated orders (phone, opt-in, indexes)
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "phone" text DEFAULT '' NOT NULL;
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "optin" integer DEFAULT 0 NOT NULL;
CREATE INDEX IF NOT EXISTS "orders_email" ON "simulation_orders" USING btree ("email");
CREATE INDEX IF NOT EXISTS "orders_created" ON "simulation_orders" USING btree ("created_at");

-- 0004: delivery address on simulated orders
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "address1" text DEFAULT '' NOT NULL;
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "address2" text DEFAULT '' NOT NULL;
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "postcode" text DEFAULT '' NOT NULL;
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "city" text DEFAULT '' NOT NULL;

-- 0005 : alertes d'ouverture, mobile facultatif, accord SMS, endroit de l'inscription
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "phone" text DEFAULT '' NOT NULL;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "sms_consent" integer DEFAULT 0 NOT NULL;
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "source" text DEFAULT '' NOT NULL;
