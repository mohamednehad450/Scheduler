CREATE TABLE `sequences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`last_run` text,
	`active` text DEFAULT ('deactivated') NOT NULL
);
