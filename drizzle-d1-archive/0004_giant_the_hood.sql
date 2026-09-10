CREATE TABLE `payment_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`cart_id` text NOT NULL,
	`request_key` text NOT NULL,
	`fingerprint` text NOT NULL,
	`cart_revision` integer NOT NULL,
	`mode` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`billing` text NOT NULL,
	`lines` text NOT NULL,
	`subtotal` integer NOT NULL,
	`shipping` integer NOT NULL,
	`total` integer NOT NULL,
	`delivery` text NOT NULL,
	`provider_id` text,
	`payment_url` text,
	`status` text NOT NULL,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`paid_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_attempts_provider_id_unique` ON `payment_attempts` (`provider_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payplug_cart_request` ON `payment_attempts` (`cart_id`,`request_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `payplug_cart_revision` ON `payment_attempts` (`cart_id`,`cart_revision`);--> statement-breakpoint
ALTER TABLE `simulation_orders` ADD `email_claimed_at` text;