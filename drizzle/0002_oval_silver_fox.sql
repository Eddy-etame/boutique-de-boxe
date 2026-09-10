CREATE TABLE `carts` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `simulation_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`cart_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`fingerprint` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`lines` text NOT NULL,
	`subtotal` integer NOT NULL,
	`shipping` integer NOT NULL,
	`total` integer NOT NULL,
	`delivery` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`email_status` text DEFAULT 'pending' NOT NULL,
	`email_attempts` integer DEFAULT 0 NOT NULL,
	`email_error` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_cart_idempotency` ON `simulation_orders` (`cart_id`,`idempotency_key`);