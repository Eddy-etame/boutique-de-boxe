-- Buyer contact on simulated orders: optional phone, marketing opt-in, lookup indexes.
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "phone" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "optin" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_email" ON "simulation_orders" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_created" ON "simulation_orders" USING btree ("created_at");
