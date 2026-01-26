-- Add is_backlog column to headings table
ALTER TABLE `headings` ADD COLUMN `is_backlog` integer DEFAULT false NOT NULL;
--> statement-breakpoint
-- Create backlog headings for all existing projects
-- Uses SQLite's randomblob to generate UUID-like IDs
INSERT INTO `headings` (`id`, `user_id`, `title`, `position`, `is_backlog`, `project_id`, `created_at`, `updated_at`)
SELECT 
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
  `user_id`,
  'Backlog',
  9999,
  true,
  `id`,
  unixepoch() * 1000,
  0
FROM `projects`
WHERE `deleted_at` IS NULL;
--> statement-breakpoint
-- Update existing someday tasks to point to their project's backlog heading
UPDATE `tasks`
SET `heading_id` = (
  SELECT `h`.`id` 
  FROM `headings` `h` 
  WHERE `h`.`project_id` = `tasks`.`project_id` 
    AND `h`.`is_backlog` = true
    AND `h`.`deleted_at` IS NULL
  LIMIT 1
)
WHERE `status` = 'someday' 
  AND `project_id` IS NOT NULL
  AND `deleted_at` IS NULL;
