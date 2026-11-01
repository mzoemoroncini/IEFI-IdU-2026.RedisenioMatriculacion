CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_name_key_unique` ON `courses` (`name_key`);--> statement-breakpoint
ALTER TABLE `enrollments` ADD `province_id` text;--> statement-breakpoint
ALTER TABLE `enrollments` ADD `province_name` text;--> statement-breakpoint
ALTER TABLE `enrollments` ADD `locality_id` text;--> statement-breakpoint
ALTER TABLE `enrollments` ADD `search_key` text;--> statement-breakpoint
ALTER TABLE `enrollments` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `enrollments` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `enrollments` ADD `version` integer DEFAULT 1 NOT NULL;