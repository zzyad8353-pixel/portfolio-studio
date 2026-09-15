CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerName` varchar(120) NOT NULL,
	`phone` varchar(40) NOT NULL,
	`deviceId` int NOT NULL,
	`deviceName` varchar(120) NOT NULL,
	`playMode` enum('single','multi','quad') NOT NULL,
	`bookingDate` varchar(20) NOT NULL,
	`startTime` varchar(10) NOT NULL,
	`hours` int NOT NULL,
	`totalPrice` int NOT NULL,
	`status` enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`category` varchar(80) NOT NULL DEFAULT 'PlayStation 5',
	`status` enum('available','busy','maintenance') NOT NULL DEFAULT 'available',
	`singlePrice` int NOT NULL DEFAULT 80,
	`multiPrice` int NOT NULL DEFAULT 120,
	`quadPrice` int NOT NULL DEFAULT 160,
	`description` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `venue_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandName` varchar(120) NOT NULL DEFAULT 'PlayStation R2',
	`tagline` varchar(180) NOT NULL DEFAULT 'اللعب الحقيقي يبدأ من هنا',
	`heroTitle` varchar(220) NOT NULL DEFAULT 'ارفع مستوى لعبك',
	`heroText` text NOT NULL,
	`phone` varchar(40) NOT NULL DEFAULT '010 0000 0000',
	`location` varchar(180) NOT NULL DEFAULT 'القاهرة الجديدة · مفتوح يوميًا',
	`neonColor` varchar(20) NOT NULL DEFAULT '#E3293F',
	`aboutText` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `venue_settings_id` PRIMARY KEY(`id`)
);
