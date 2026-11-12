CREATE TABLE `subscription_history` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`plan_key` varchar(40) NOT NULL,
	`previous_plan_key` varchar(40),
	`previous_status` varchar(20),
	`status` varchar(20) NOT NULL,
	`action` varchar(40) NOT NULL,
	`billing_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`currency` varchar(3) NOT NULL DEFAULT 'GHS',
	`effective_at` timestamp NOT NULL DEFAULT (now()),
	`period_end` timestamp,
	`actor_user_id` varchar(36),
	`actor_name` varchar(120),
	`notes` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscription_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_payments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`subscription_id` varchar(36),
	`plan_key` varchar(40) NOT NULL,
	`provider` varchar(30) NOT NULL DEFAULT 'paystack',
	`reference` varchar(120) NOT NULL,
	`provider_reference` varchar(120),
	`amount` decimal(12,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'GHS',
	`status` enum('pending','success','failed','abandoned') NOT NULL DEFAULT 'pending',
	`paid_at` timestamp,
	`failure_reason` varchar(255),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscription_payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_payments_reference_uq` UNIQUE(`reference`)
);
--> statement-breakpoint
ALTER TABLE `notification_preferences` MODIFY COLUMN `sms_low_stock` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `notification_preferences` MODIFY COLUMN `sms_out_of_stock` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `notification_preferences` MODIFY COLUMN `sms_daily_summary` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD `sms_stock_adjustment` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_preferences` MODIFY COLUMN `sms_stock_adjustment` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `subscription_plans` MODIFY COLUMN `max_products` int;--> statement-breakpoint
ALTER TABLE `subscriptions` MODIFY COLUMN `status` enum('trial','active','pending_payment','past_due','suspended','expired','cancelled') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `subscription_plans` ADD `currency` varchar(3) DEFAULT 'GHS' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `billing_amount` decimal(12,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `currency` varchar(3) DEFAULT 'GHS' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `payment_reference` varchar(120);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `suspended_at` timestamp;--> statement-breakpoint
ALTER TABLE `subscription_history` ADD CONSTRAINT `subscription_history_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_payments` ADD CONSTRAINT `subscription_payments_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `subscription_history_tenant_idx` ON `subscription_history` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `subscription_history_plan_idx` ON `subscription_history` (`plan_key`);--> statement-breakpoint
CREATE INDEX `subscription_payments_tenant_idx` ON `subscription_payments` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `subscription_payments_status_idx` ON `subscription_payments` (`status`);--> statement-breakpoint
CREATE INDEX `branches_tenant_status_idx` ON `branches` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `invitations_tenant_type_status_idx` ON `invitations` (`tenant_id`,`type`,`status`);--> statement-breakpoint
CREATE INDEX `subscriptions_period_end_idx` ON `subscriptions` (`current_period_end`);--> statement-breakpoint
CREATE INDEX `memberships_tenant_status_idx` ON `tenant_memberships` (`tenant_id`,`status`);