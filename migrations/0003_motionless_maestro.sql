CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`channel` integer NOT NULL,
	`duration` integer NOT NULL,
	`offset` integer NOT NULL,
	`sequence_id` integer NOT NULL,
	FOREIGN KEY (`channel`) REFERENCES `pins`(`channel`),
	FOREIGN KEY (`sequence_id`) REFERENCES `sequences`(`id`)
);
