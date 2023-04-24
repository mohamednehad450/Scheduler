CREATE TABLE `sequences_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`sequence_id` integer NOT NULL,
	`event_type` text NOT NULL,
	FOREIGN KEY (`sequence_id`) REFERENCES `sequences`(`id`)
);
