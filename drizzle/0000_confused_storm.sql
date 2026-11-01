CREATE TABLE `enrollments` (
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
	`registered_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollments_request_id_unique` ON `enrollments` (`request_id`);