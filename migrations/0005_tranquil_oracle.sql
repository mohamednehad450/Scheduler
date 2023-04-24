CREATE TABLE `cron_sequence` (
	`cron_id` integer NOT NULL,
	`sequence_id` integer NOT NULL,
	FOREIGN KEY (`cron_id`) REFERENCES `crons`(`id`),
	FOREIGN KEY (`sequence_id`) REFERENCES `sequences`(`id`)
);
