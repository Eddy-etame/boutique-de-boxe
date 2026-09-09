CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`product_id` text NOT NULL,
	`variant` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`consent_version` text NOT NULL,
	`unsubscribe_token` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `alerts_email_product_variant` ON `alerts` (`email`,`product_id`,`variant`);--> statement-breakpoint
CREATE UNIQUE INDEX `alerts_unsubscribe_token` ON `alerts` (`unsubscribe_token`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_overrides` (
	`product_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`price_cents` integer NOT NULL,
	`internal_stock` integer DEFAULT 0 NOT NULL,
	`planned_discount` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires` integer NOT NULL
);
