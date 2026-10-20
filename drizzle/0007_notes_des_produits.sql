-- Boutique de Boxe — notes des produits (20/10/2026).
--
-- Une note, ce sont des étoiles de 1 à 5 laissées par un visiteur sur une fiche, sans texte ni compte ;
-- une seule par appareil et par modèle (index unique product_id + device_hash : le même appareil met sa
-- note à jour). Ni l'adresse IP ni l'identifiant de l'appareil ne sont gardés en clair : seulement leurs
-- empreintes salées (HMAC). Une note retirée par l'atelier garde son motif (robot, doublon, abus,
-- autre), sa précision, sa date et son auteur ; elle peut être rétablie.
--
-- Le service crée lui-même cette table au premier usage (lib/notes-stockage.ts, ensureSchema : une
-- lecture du catalogue système par instance, CREATE seulement si quelque chose manque). Ce fichier
-- permet au propriétaire de la créer d'avance, en heure creuse, une seule fois :
--   Supabase > SQL Editor > coller ce fichier > Run   (ou pnpm db:migrate sur la connexion directe, port 5432)
-- Il est idempotent : le rejouer ne change rien.

SET lock_timeout = '5s';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_ratings" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"stars" integer NOT NULL CHECK ("stars" BETWEEN 1 AND 5),
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"ip_hash" text NOT NULL,
	"device_hash" text NOT NULL,
	"status" text DEFAULT 'visible' NOT NULL CHECK ("status" IN ('visible', 'retiree')),
	"removed_reason" text CHECK ("removed_reason" IS NULL OR "removed_reason" IN ('robot', 'doublon', 'abus', 'autre')),
	"removed_detail" text,
	"removed_at" text,
	"removed_by" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_ratings_appareil" ON "product_ratings" USING btree ("product_id","device_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_ratings_connexion" ON "product_ratings" USING btree ("product_id","ip_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_ratings_date" ON "product_ratings" USING btree ("updated_at");
--> statement-breakpoint
-- Comme toutes les tables : lue et écrite par le serveur seul, API publique de Supabase fermée.
ALTER TABLE "product_ratings" ENABLE ROW LEVEL SECURITY;
