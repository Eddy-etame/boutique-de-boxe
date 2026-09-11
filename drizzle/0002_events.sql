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
