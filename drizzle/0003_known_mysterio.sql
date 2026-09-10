ALTER TABLE `contacts` ADD `request_key` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `relay_token` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `relay_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_request_key_unique` ON `contacts` (`request_key`);