CREATE TABLE `catalog_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
