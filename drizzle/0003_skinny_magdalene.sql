CREATE TABLE `demo_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`enrollment_id` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`method` text NOT NULL,
	`paid_date` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`cancelled_at` text,
	`cancel_reason` text,
	`student_name` text NOT NULL,
	`course_name` text NOT NULL,
	`enrollment_code` text NOT NULL,
	`note` text NOT NULL,
	FOREIGN KEY (`enrollment_id`) REFERENCES `demo_enrollments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_payments_request_id_unique` ON `demo_payments` (`request_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`enrollment_id` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`method` text NOT NULL,
	`paid_date` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`cancelled_at` text,
	`cancel_reason` text,
	`student_name` text NOT NULL,
	`course_name` text NOT NULL,
	`enrollment_code` text NOT NULL,
	`note` text NOT NULL,
	FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_request_id_unique` ON `payments` (`request_id`);--> statement-breakpoint
ALTER TABLE `courses` ADD `fee_cents` integer;--> statement-breakpoint
ALTER TABLE `demo_courses` ADD `fee_cents` integer;--> statement-breakpoint
ALTER TABLE `demo_enrollments` ADD `fee_cents` integer;--> statement-breakpoint
ALTER TABLE `demo_enrollments` ADD `payment_write_token` text;--> statement-breakpoint
ALTER TABLE `enrollments` ADD `fee_cents` integer;--> statement-breakpoint
ALTER TABLE `enrollments` ADD `payment_write_token` text;