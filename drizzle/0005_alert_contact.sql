-- Alertes d'ouverture : mobile facultatif, accord SMS, endroit de l'inscription.
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "phone" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "sms_consent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "source" text DEFAULT '' NOT NULL;
