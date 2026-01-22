CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`id_token` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`scope` text NOT NULL,
	`last_used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `areas` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `checklist_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	`task_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `headings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	`project_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'active' NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	`area_id` text,
	`completed_at` integer,
	`trashed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `repeating_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`rrule` text NOT NULL,
	`next_occurrence` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`project_id` text,
	`heading_id` text,
	`area_id` text,
	`checklist_template` text,
	`tags_template` text,
	`created_at` integer NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`heading_id`) REFERENCES `headings`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`color` text,
	`position` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `task_orderings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`context_type` text NOT NULL,
	`context_id` text,
	`task_id` text NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `task_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`task_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'inbox' NOT NULL,
	`type` text DEFAULT 'task' NOT NULL,
	`scheduled_date` text,
	`deadline` text,
	`is_evening` integer DEFAULT false NOT NULL,
	`position` real DEFAULT 0 NOT NULL,
	`project_id` text,
	`heading_id` text,
	`area_id` text,
	`repeating_rule_id` text,
	`completed_at` integer,
	`canceled_at` integer,
	`trashed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`heading_id`) REFERENCES `headings`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
