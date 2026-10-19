-- Boutique de Boxe — schéma complet du service (19/10/2026, audit D14).
--
-- Jusqu'ici, une partie du schéma naissait pendant le service : CREATE TABLE et ALTER TABLE lancés au
-- premier passage (paiement, IPN, atelier, e-mails, mesure d'audience), avec un verrou exclusif en
-- plein trafic. Ce fichier rassemble TOUT le schéma : celui de supabase-init.sql (migrations 0000 à
-- 0005) et ce que le code créait lui-même. Il est idempotent : il se rejoue sans rien casser sur la
-- base de production, déjà initialisée.
--
-- À passer une fois par le propriétaire, de préférence en heure creuse :
--   Supabase > SQL Editor > coller ce fichier > Run   (ou pnpm db:migrate sur la connexion directe, port 5432)
-- lock_timeout : derrière une lecture longue, une instruction abandonne au bout de 5 s au lieu de bloquer
-- la boutique ; il suffit alors de relancer le fichier.
--
-- Le code garde une vérification sans verrou (lib/database.ts, ensureSchema) : une fois ce fichier
-- passé, aucun ALTER TABLE ne part plus pendant le service.

SET lock_timeout = '5s';--> statement-breakpoint

-- === Schéma de base (supabase-init.sql, migrations 0000 à 0005) ===

CREATE TABLE IF NOT EXISTS "alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"product_id" text NOT NULL,
	"variant" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	"consent_version" text NOT NULL,
	"unsubscribe_token" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "carts" (
	"id" text PRIMARY KEY NOT NULL,
	"payload" text NOT NULL,
	"updated_at" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "catalog_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"payload" text NOT NULL,
	"archived" integer DEFAULT 0 NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"hits" integer NOT NULL,
	"expires" bigint NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
-- Les tables ne sont lues que par le serveur (connexion Postgres). Verrouillage de l'API publique Supabase.
CREATE UNIQUE INDEX IF NOT EXISTS "alerts_email_product_variant" ON "alerts" USING btree ("email","product_id","variant");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "alerts_unsubscribe_token" ON "alerts" USING btree ("unsubscribe_token");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payplug_cart_request" ON "payment_attempts" USING btree ("cart_id","request_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payplug_cart_revision" ON "payment_attempts" USING btree ("cart_id","cart_revision");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "orders_cart_idempotency" ON "simulation_orders" USING btree ("cart_id","idempotency_key");
--> statement-breakpoint
ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "product_overrides" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "catalog_entries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "carts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "simulation_orders" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "payment_attempts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
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
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_created" ON "events" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_sid" ON "events" ("sid");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_path_type" ON "events" ("path","type");
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- 0003: buyer contact on simulated orders (phone, opt-in, indexes)
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "phone" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "optin" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_email" ON "simulation_orders" USING btree ("email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_created" ON "simulation_orders" USING btree ("created_at");
--> statement-breakpoint
-- 0004: delivery address on simulated orders
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "address1" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "address2" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "postcode" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "city" text DEFAULT '' NOT NULL;
--> statement-breakpoint
-- 0005 : alertes d'ouverture, mobile facultatif, accord SMS, endroit de l'inscription
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "phone" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "sms_consent" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "source" text DEFAULT '' NOT NULL;
--> statement-breakpoint

-- === Ce que le service créait lui-même ===
--> statement-breakpoint
-- Commandes payées (lib/payplug-orders.ts) : e-mails envoyés une seule fois, réservés et datés.
ALTER TABLE "payment_attempts" ADD COLUMN IF NOT EXISTS "notified_at" text;
--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD COLUMN IF NOT EXISTS "notify_error" text;
--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD COLUMN IF NOT EXISTS "notify_claim" text;
--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD COLUMN IF NOT EXISTS "client_sent_at" text;
--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD COLUMN IF NOT EXISTS "shop_sent_at" text;
--> statement-breakpoint
-- Commandes d'essai (lib/clients.ts) : point relais choisi.
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "relay_point" text DEFAULT '' NOT NULL;
--> statement-breakpoint
-- Paniers enregistrés comme choix (lib/alerts.ts).
CREATE TABLE IF NOT EXISTS "choices" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"sms_consent" integer DEFAULT 0 NOT NULL,
	"postcode" text DEFAULT '' NOT NULL,
	"items" text NOT NULL,
	"subtotal" integer NOT NULL,
	"created_at" text NOT NULL,
	"cart_id" text NOT NULL,
	"consent_version" text NOT NULL
);
--> statement-breakpoint
-- Équipe de l'atelier (lib/team.ts).
CREATE TABLE IF NOT EXISTS "admin_members" (
	"email" text PRIMARY KEY NOT NULL,
	"added_by" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_links" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"used_at" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" bigint NOT NULL,
	"last_seen" bigint NOT NULL,
	"expires_at" bigint NOT NULL,
	"agent" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
-- Lettre d'information (lib/newsletter.ts).
CREATE TABLE IF NOT EXISTS "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"test_sent_at" text,
	"started_at" text,
	"finished_at" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaign_sends" (
	"campaign_id" text NOT NULL,
	"email" text NOT NULL,
	"status" text NOT NULL,
	"account" text,
	"error" text,
	"sent_at" text NOT NULL,
	PRIMARY KEY ("campaign_id", "email")
);
--> statement-breakpoint
-- Quota d'envoi des e-mails par compte et par jour (lib/mailer.ts).
CREATE TABLE IF NOT EXISTS "mail_quota" (
	"account" text NOT NULL,
	"day" text NOT NULL,
	"sent" integer DEFAULT 0 NOT NULL,
	PRIMARY KEY ("account", "day")
);
--> statement-breakpoint
-- Relevé de la boutique du club, partagé par toutes les instances (lib/club-sync.ts, audit D12).
CREATE TABLE IF NOT EXISTS "club_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"payload" text NOT NULL,
	"synced_at" text DEFAULT '' NOT NULL,
	"read_at" bigint NOT NULL
);
--> statement-breakpoint
-- Toutes ces tables ne sont lues que par le serveur : API publique de Supabase fermée (audit D4).
ALTER TABLE "choices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "admin_members" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "admin_links" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "admin_sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "campaigns" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "campaign_sends" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "mail_quota" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "club_snapshot" ENABLE ROW LEVEL SECURITY;
