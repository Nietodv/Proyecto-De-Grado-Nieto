CREATE TABLE `authorized_person` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`child_id` integer NOT NULL,
	`full_name` text NOT NULL,
	`id_number` text,
	`relationship` text NOT NULL,
	`phone` text,
	`can_pick_up` integer DEFAULT false NOT NULL,
	`is_emergency_contact` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `child`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bank` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bank_name_unique` ON `bank` (`name`);--> statement-breakpoint
CREATE TABLE `bcv_rate` (
	`date` text PRIMARY KEY NOT NULL,
	`rate` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `charge` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`enrollment_id` integer NOT NULL,
	`concept_id` integer NOT NULL,
	`payment_id` integer,
	`source_charge_id` integer,
	`period` text,
	`amount_usd` integer NOT NULL,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`enrollment_id`) REFERENCES `enrollment`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`concept_id`) REFERENCES `concept`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_id`) REFERENCES `payment`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_charge_id`) REFERENCES `charge`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "charge_status_check" CHECK(status in ('pending', 'paid', 'void')),
	CONSTRAINT "charge_amount_check" CHECK(amount_usd >= 0),
	CONSTRAINT "charge_paid_has_payment_check" CHECK((status = 'paid') = (payment_id is not null))
);
--> statement-breakpoint
CREATE TABLE `child` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_names` text NOT NULL,
	`last_names` text NOT NULL,
	`birth_date` text NOT NULL,
	`sex` text NOT NULL,
	`school_id_number` text,
	`medication_allergy` text,
	`food_allergy` text,
	`diagnosis` text,
	`notes` text,
	`pickup` text,
	CONSTRAINT "child_sex_check" CHECK(sex in ('M', 'F')),
	CONSTRAINT "child_pickup_check" CHECK(pickup is null or pickup in ('mother', 'father', 'both'))
);
--> statement-breakpoint
CREATE TABLE `child_guardian` (
	`child_id` integer NOT NULL,
	`guardian_id` integer NOT NULL,
	`relationship` text NOT NULL,
	`is_representative` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`child_id`, `guardian_id`),
	FOREIGN KEY (`child_id`) REFERENCES `child`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guardian_id`) REFERENCES `guardian`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `child_guardian_single_representative` ON `child_guardian` (`child_id`) WHERE is_representative = 1;--> statement-breakpoint
CREATE TABLE `concept` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`charged_on_enrollment` integer DEFAULT false NOT NULL,
	`charged_on_promotion` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	CONSTRAINT "concept_type_check" CHECK(type in ('one_time', 'monthly', 'late_fee'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `concept_name_unique` ON `concept` (`name`);--> statement-breakpoint
CREATE TABLE `enrollment` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`child_id` integer NOT NULL,
	`school_year_id` integer NOT NULL,
	`level_id` integer NOT NULL,
	`shift` text NOT NULL,
	`enrollment_date` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`withdrawal_date` text,
	FOREIGN KEY (`child_id`) REFERENCES `child`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`school_year_id`) REFERENCES `school_year`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`level_id`) REFERENCES `level`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "enrollment_shift_check" CHECK(shift in ('half', 'full')),
	CONSTRAINT "enrollment_status_check" CHECK(status in ('active', 'withdrawn', 'completed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_child_school_year` ON `enrollment` (`child_id`,`school_year_id`);--> statement-breakpoint
CREATE TABLE `fee` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`school_year_id` integer NOT NULL,
	`concept_id` integer NOT NULL,
	`level_id` integer,
	`shift` text,
	`amount_usd` integer NOT NULL,
	FOREIGN KEY (`school_year_id`) REFERENCES `school_year`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`concept_id`) REFERENCES `concept`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`level_id`) REFERENCES `level`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "fee_shift_check" CHECK(shift is null or shift in ('half', 'full')),
	CONSTRAINT "fee_amount_check" CHECK(amount_usd >= 0)
);
--> statement-breakpoint
CREATE TABLE `guardian` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id_number` text NOT NULL,
	`first_names` text NOT NULL,
	`last_names` text NOT NULL,
	`mobile_phone` text,
	`home_phone` text,
	`address` text,
	`email` text,
	`occupation` text,
	`workplace` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guardian_id_number_unique` ON `guardian` (`id_number`);--> statement-breakpoint
CREATE TABLE `level` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `level_name_unique` ON `level` (`name`);--> statement-breakpoint
CREATE TABLE `payment` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`payment_method_id` integer NOT NULL,
	`bank_id` integer,
	`payment_date` text NOT NULL,
	`amount_usd` integer NOT NULL,
	`bcv_rate` real NOT NULL,
	`amount_bs` integer NOT NULL,
	`reference` text,
	`note` text,
	`recorded_at` text NOT NULL,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bank_id`) REFERENCES `bank`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "payment_amount_check" CHECK(amount_usd > 0 and amount_bs > 0 and bcv_rate > 0)
);
--> statement-breakpoint
CREATE TABLE `payment_method` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`currency` text NOT NULL,
	`requires_reference` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	CONSTRAINT "payment_method_currency_check" CHECK(currency in ('USD', 'BS'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_method_name_unique` ON `payment_method` (`name`);--> statement-breakpoint
CREATE TABLE `school_year` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	CONSTRAINT "school_year_status_check" CHECK(status in ('active', 'closed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `school_year_name_unique` ON `school_year` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `school_year_single_active` ON `school_year` (status) WHERE status = 'active';--> statement-breakpoint
CREATE TABLE `setting` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);