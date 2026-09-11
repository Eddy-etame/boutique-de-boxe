-- Delivery address on simulated orders, captured at checkout so exports are shipping-ready.
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "address1" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "address2" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "postcode" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "simulation_orders" ADD COLUMN IF NOT EXISTS "city" text DEFAULT '' NOT NULL;
