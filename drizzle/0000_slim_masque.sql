CREATE TABLE "alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"product_id" text NOT NULL,
	"variant" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	"consent_version" text NOT NULL,
	"unsubscribe_token" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" text PRIMARY KEY NOT NULL,
	"payload" text NOT NULL,
	"updated_at" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"payload" text NOT NULL,
	"archived" integer DEFAULT 0 NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
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
CREATE TABLE "payment_attempts" (
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
CREATE TABLE "product_overrides" (
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
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"hits" integer NOT NULL,
	"expires" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulation_orders" (
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
CREATE UNIQUE INDEX "alerts_email_product_variant" ON "alerts" USING btree ("email","product_id","variant");--> statement-breakpoint
CREATE UNIQUE INDEX "alerts_unsubscribe_token" ON "alerts" USING btree ("unsubscribe_token");--> statement-breakpoint
CREATE UNIQUE INDEX "payplug_cart_request" ON "payment_attempts" USING btree ("cart_id","request_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payplug_cart_revision" ON "payment_attempts" USING btree ("cart_id","cart_revision");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_cart_idempotency" ON "simulation_orders" USING btree ("cart_id","idempotency_key");