CREATE TABLE `auth_limits` (
	`bucket` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`attempts` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`credential_key` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `demo_courses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_courses_name_key_unique` ON `demo_courses` (`name_key`);--> statement-breakpoint
CREATE TABLE `demo_enrollments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` text NOT NULL,
	`course_id` text NOT NULL,
	`course_name` text NOT NULL,
	`enrollment_date` text NOT NULL,
	`last_name` text NOT NULL,
	`first_name` text NOT NULL,
	`sex` text NOT NULL,
	`address` text NOT NULL,
	`locality` text NOT NULL,
	`registered_at` text NOT NULL,
	`province_id` text,
	`province_name` text,
	`locality_id` text,
	`search_key` text,
	`updated_at` text,
	`deleted_at` text,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_enrollments_request_id_unique` ON `demo_enrollments` (`request_id`);