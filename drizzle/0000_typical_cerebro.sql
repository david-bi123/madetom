CREATE TABLE `audit_logs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36),
	`actor_user_id` varchar(36),
	`actor_name` varchar(120) NOT NULL,
	`action` varchar(80) NOT NULL,
	`entity_type` varchar(60),
	`entity_id` varchar(36),
	`summary` varchar(255) NOT NULL,
	`metadata` json,
	`ip` varchar(64),
	`user_agent` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branches` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`code` varchar(16) NOT NULL,
	`address` varchar(255),
	`phone` varchar(40),
	`is_default` boolean NOT NULL DEFAULT false,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `branches_tenant_code_uq` UNIQUE(`tenant_id`,`code`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`phone` varchar(40),
	`email` varchar(160),
	`address` varchar(255),
	`notes` text,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_sequences` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`key` varchar(60) NOT NULL,
	`prefix` varchar(20) NOT NULL,
	`next_number` int NOT NULL DEFAULT 1,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_sequences_id` PRIMARY KEY(`id`),
	CONSTRAINT `doc_seq_tenant_key_uq` UNIQUE(`tenant_id`,`key`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`branch_id` varchar(36) NOT NULL,
	`category` varchar(80) NOT NULL,
	`description` varchar(255) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`expense_date` date NOT NULL,
	`payment_method` enum('cash','momo','bank','card','other') NOT NULL DEFAULT 'cash',
	`reference` varchar(120),
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`type` enum('owner','staff') NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(160),
	`phone` varchar(40) NOT NULL,
	`role_key` varchar(40) NOT NULL,
	`branch_id` varchar(36),
	`token_hash` varchar(64) NOT NULL,
	`status` enum('pending','accepted','revoked','expired') NOT NULL DEFAULT 'pending',
	`delivery_status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`expires_at` timestamp NOT NULL,
	`last_sent_at` timestamp,
	`send_count` int NOT NULL DEFAULT 0,
	`accepted_at` timestamp,
	`revoked_at` timestamp,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_token_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`low_stock` boolean NOT NULL DEFAULT true,
	`out_of_stock` boolean NOT NULL DEFAULT true,
	`daily_summary` boolean NOT NULL DEFAULT false,
	`stock_adjustments` boolean NOT NULL DEFAULT true,
	`sms_low_stock` boolean NOT NULL DEFAULT false,
	`sms_out_of_stock` boolean NOT NULL DEFAULT false,
	`sms_daily_summary` boolean NOT NULL DEFAULT false,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_prefs_user_uq` UNIQUE(`tenant_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`type` varchar(60) NOT NULL,
	`title` varchar(160) NOT NULL,
	`body` text NOT NULL,
	`level` enum('info','warning','critical','success') NOT NULL DEFAULT 'info',
	`entity_type` varchar(40),
	`entity_id` varchar(36),
	`condition_key` varchar(120),
	`read_at` timestamp,
	`resolved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`code_hash` varchar(64) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`sale_id` varchar(36),
	`purchase_id` varchar(36),
	`method` enum('cash','momo','bank','card','credit') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`reference` varchar(120),
	`note` varchar(255),
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`key` varchar(80) NOT NULL,
	`label` varchar(120) NOT NULL,
	`group_name` varchar(60) NOT NULL,
	`sensitive` boolean NOT NULL DEFAULT false,
	CONSTRAINT `permissions_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`key` varchar(80) NOT NULL,
	`value` json,
	`updated_by` varchar(36),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platform_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `product_categories` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_tenant_name_uq` UNIQUE(`tenant_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `product_stock` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`branch_id` varchar(36) NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`reorder_level` int NOT NULL DEFAULT 5,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_stock_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_product_branch_uq` UNIQUE(`product_id`,`branch_id`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`sku` varchar(64) NOT NULL,
	`barcode` varchar(64),
	`attributes` json,
	`cost_price` decimal(12,2) NOT NULL,
	`selling_price` decimal(12,2) NOT NULL,
	`reorder_level` int NOT NULL DEFAULT 5,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`),
	CONSTRAINT `variants_tenant_sku_uq` UNIQUE(`tenant_id`,`sku`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`category_id` varchar(36),
	`supplier_id` varchar(36),
	`name` varchar(160) NOT NULL,
	`sku` varchar(64) NOT NULL,
	`barcode` varchar(64),
	`description` text,
	`image_url` text,
	`image_public_id` varchar(120),
	`cost_price` decimal(12,2) NOT NULL DEFAULT '0.00',
	`selling_price` decimal(12,2) NOT NULL DEFAULT '0.00',
	`reorder_level` int NOT NULL DEFAULT 5,
	`unit` varchar(24) NOT NULL DEFAULT 'piece',
	`tax_rate` decimal(6,3),
	`has_variants` boolean NOT NULL DEFAULT false,
	`track_inventory` boolean NOT NULL DEFAULT true,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_tenant_sku_uq` UNIQUE(`tenant_id`,`sku`)
);
--> statement-breakpoint
CREATE TABLE `purchase_items` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`purchase_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`variant_id` varchar(36),
	`name_snapshot` varchar(180) NOT NULL,
	`quantity` int NOT NULL,
	`unit_cost` decimal(12,2) NOT NULL,
	`line_total` decimal(12,2) NOT NULL,
	CONSTRAINT `purchase_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`branch_id` varchar(36) NOT NULL,
	`supplier_id` varchar(36) NOT NULL,
	`reference` varchar(40) NOT NULL,
	`status` enum('draft','received','cancelled') NOT NULL DEFAULT 'draft',
	`subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
	`tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`total` decimal(12,2) NOT NULL DEFAULT '0.00',
	`amount_paid` decimal(12,2) NOT NULL DEFAULT '0.00',
	`notes` text,
	`received_at` timestamp,
	`received_by` varchar(36),
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchases_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchases_tenant_ref_uq` UNIQUE(`tenant_id`,`reference`)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` varchar(191) NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`window_start` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `rate_limits_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_key` varchar(40) NOT NULL,
	`permission_key` varchar(80) NOT NULL,
	CONSTRAINT `role_permissions_role_key_permission_key_pk` PRIMARY KEY(`role_key`,`permission_key`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`key` varchar(40) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` varchar(255),
	CONSTRAINT `roles_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`sale_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`variant_id` varchar(36),
	`name_snapshot` varchar(180) NOT NULL,
	`sku_snapshot` varchar(64),
	`unit_price` decimal(12,2) NOT NULL,
	`unit_cost` decimal(12,2) NOT NULL,
	`quantity` int NOT NULL,
	`discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`line_total` decimal(12,2) NOT NULL,
	CONSTRAINT `sale_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`branch_id` varchar(36) NOT NULL,
	`receipt_number` varchar(40) NOT NULL,
	`customer_id` varchar(36),
	`cashier_id` varchar(36) NOT NULL,
	`status` enum('completed','refunded') NOT NULL DEFAULT 'completed',
	`subtotal` decimal(12,2) NOT NULL,
	`discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`total` decimal(12,2) NOT NULL,
	`amount_paid` decimal(12,2) NOT NULL,
	`change_due` decimal(12,2) NOT NULL DEFAULT '0.00',
	`payment_status` enum('paid','partial') NOT NULL DEFAULT 'paid',
	`notes` text,
	`refunded_at` timestamp,
	`refunded_by` varchar(36),
	`refund_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_tenant_receipt_uq` UNIQUE(`tenant_id`,`receipt_number`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`ip` varchar(64),
	`user_agent` varchar(255),
	`expires_at` timestamp NOT NULL,
	`last_used_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `sms_logs` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36),
	`phone` varchar(40) NOT NULL,
	`message` text NOT NULL,
	`purpose` varchar(60) NOT NULL,
	`provider` varchar(40) NOT NULL,
	`status` enum('queued','sent','failed') NOT NULL DEFAULT 'queued',
	`provider_message_id` varchar(120),
	`error` varchar(255),
	`credits_used` int NOT NULL DEFAULT 0,
	`related_type` varchar(40),
	`related_id` varchar(36),
	`attempts` int NOT NULL DEFAULT 1,
	`sent_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sms_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sms_transactions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`type` enum('credit','debit') NOT NULL,
	`credits` int NOT NULL,
	`balance_after` int NOT NULL,
	`reference` varchar(120),
	`description` varchar(255) NOT NULL,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sms_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sms_wallets` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`credits` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sms_wallets_id` PRIMARY KEY(`id`),
	CONSTRAINT `sms_wallets_tenant_uq` UNIQUE(`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `stock_adjustments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`branch_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`variant_id` varchar(36),
	`reference` varchar(40) NOT NULL,
	`type` enum('increase','decrease','set') NOT NULL,
	`quantity_before` int NOT NULL,
	`quantity_after` int NOT NULL,
	`reason` varchar(120) NOT NULL,
	`notes` varchar(255),
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_adjustments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`branch_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`variant_id` varchar(36),
	`type` enum('sale','refund','purchase','adjustment','transfer_in','transfer_out','initial','import') NOT NULL,
	`quantity_delta` int NOT NULL,
	`balance_after` int NOT NULL,
	`reference_type` varchar(40),
	`reference_id` varchar(36),
	`reference_label` varchar(64),
	`note` varchar(255),
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_transfers` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`from_branch_id` varchar(36) NOT NULL,
	`to_branch_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`variant_id` varchar(36),
	`reference` varchar(40) NOT NULL,
	`quantity` int NOT NULL,
	`notes` varchar(255),
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_transfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`key` varchar(40) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` varchar(255),
	`price_monthly` decimal(12,2) NOT NULL DEFAULT '0.00',
	`price_yearly` decimal(12,2) NOT NULL DEFAULT '0.00',
	`max_employees` int NOT NULL,
	`max_branches` int NOT NULL,
	`max_products` int NOT NULL,
	`max_transactions_per_month` int NOT NULL,
	`sms_credits` int NOT NULL DEFAULT 0,
	`features` json,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscription_plans_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`plan_key` varchar(40) NOT NULL,
	`status` enum('trial','active','past_due','cancelled') NOT NULL DEFAULT 'trial',
	`billing_cycle` enum('monthly','yearly') NOT NULL DEFAULT 'monthly',
	`trial_ends_at` timestamp,
	`current_period_start` timestamp NOT NULL DEFAULT (now()),
	`current_period_end` timestamp,
	`cancelled_at` timestamp,
	`notes` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_tenant_uq` UNIQUE(`tenant_id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`contact_name` varchar(120),
	`phone` varchar(40),
	`email` varchar(160),
	`address` varchar(255),
	`notes` text,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_memberships` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role_key` varchar(40) NOT NULL,
	`default_branch_id` varchar(36),
	`status` enum('active','suspended') NOT NULL DEFAULT 'active',
	`permissions_override` json,
	`invited_by` varchar(36),
	`joined_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenant_memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `memberships_tenant_user_uq` UNIQUE(`tenant_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`business_type` varchar(80) NOT NULL,
	`country` varchar(80) NOT NULL DEFAULT 'Ghana',
	`region` varchar(80),
	`location` varchar(255),
	`phone` varchar(40),
	`email` varchar(160),
	`logo_url` text,
	`currency` varchar(3) NOT NULL DEFAULT 'GHS',
	`timezone` varchar(64) NOT NULL DEFAULT 'Africa/Accra',
	`tax_rate` decimal(6,3) NOT NULL DEFAULT '0.000',
	`prices_include_tax` boolean NOT NULL DEFAULT true,
	`allow_partial_payments` boolean NOT NULL DEFAULT true,
	`status` enum('pending','active','suspended') NOT NULL DEFAULT 'pending',
	`onboarding_completed_at` timestamp,
	`suspended_reason` text,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(160) NOT NULL,
	`phone` varchar(40),
	`password_hash` varchar(255),
	`is_super_admin` boolean NOT NULL DEFAULT false,
	`status` enum('invited','active','suspended') NOT NULL DEFAULT 'invited',
	`last_login_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `variant_stock` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`variant_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`branch_id` varchar(36) NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`reorder_level` int NOT NULL DEFAULT 5,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `variant_stock_id` PRIMARY KEY(`id`),
	CONSTRAINT `vstock_variant_branch_uq` UNIQUE(`variant_id`,`branch_id`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `branches` ADD CONSTRAINT `branches_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_sequences` ADD CONSTRAINT `document_sequences_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD CONSTRAINT `notification_preferences_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD CONSTRAINT `notification_preferences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_sale_id_sales_id_fk` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_purchase_id_purchases_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_stock` ADD CONSTRAINT `product_stock_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_stock` ADD CONSTRAINT `product_stock_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_stock` ADD CONSTRAINT `product_stock_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_product_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_purchase_id_purchases_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_key_roles_key_fk` FOREIGN KEY (`role_key`) REFERENCES `roles`(`key`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_key_permissions_key_fk` FOREIGN KEY (`permission_key`) REFERENCES `permissions`(`key`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_sale_id_sales_id_fk` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sms_logs` ADD CONSTRAINT `sms_logs_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sms_transactions` ADD CONSTRAINT `sms_transactions_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sms_wallets` ADD CONSTRAINT `sms_wallets_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_adjustments` ADD CONSTRAINT `stock_adjustments_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_plan_key_subscription_plans_key_fk` FOREIGN KEY (`plan_key`) REFERENCES `subscription_plans`(`key`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenant_memberships` ADD CONSTRAINT `tenant_memberships_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenant_memberships` ADD CONSTRAINT `tenant_memberships_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenant_memberships` ADD CONSTRAINT `tenant_memberships_role_key_roles_key_fk` FOREIGN KEY (`role_key`) REFERENCES `roles`(`key`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenant_memberships` ADD CONSTRAINT `tenant_memberships_default_branch_id_branches_id_fk` FOREIGN KEY (`default_branch_id`) REFERENCES `branches`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_stock` ADD CONSTRAINT `variant_stock_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_stock` ADD CONSTRAINT `variant_stock_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_stock` ADD CONSTRAINT `variant_stock_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_tenant_idx` ON `audit_logs` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `branches_tenant_idx` ON `branches` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `customers_tenant_idx` ON `customers` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `customers_phone_idx` ON `customers` (`tenant_id`,`phone`);--> statement-breakpoint
CREATE INDEX `expenses_tenant_date_idx` ON `expenses` (`tenant_id`,`expense_date`);--> statement-breakpoint
CREATE INDEX `invitations_tenant_idx` ON `invitations` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `invitations_status_idx` ON `invitations` (`status`);--> statement-breakpoint
CREATE INDEX `notifications_tenant_idx` ON `notifications` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_condition_idx` ON `notifications` (`tenant_id`,`condition_key`);--> statement-breakpoint
CREATE INDEX `password_reset_user_idx` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `payments_sale_idx` ON `payments` (`sale_id`);--> statement-breakpoint
CREATE INDEX `payments_purchase_idx` ON `payments` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `payments_tenant_created_idx` ON `payments` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `categories_tenant_idx` ON `product_categories` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `stock_tenant_branch_idx` ON `product_stock` (`tenant_id`,`branch_id`);--> statement-breakpoint
CREATE INDEX `variants_product_idx` ON `product_variants` (`product_id`);--> statement-breakpoint
CREATE INDEX `products_tenant_status_idx` ON `products` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `products_tenant_barcode_idx` ON `products` (`tenant_id`,`barcode`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `purchase_items_purchase_idx` ON `purchase_items` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `purchases_tenant_idx` ON `purchases` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `purchases_supplier_idx` ON `purchases` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `sale_items_sale_idx` ON `sale_items` (`sale_id`);--> statement-breakpoint
CREATE INDEX `sale_items_product_idx` ON `sale_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `sales_tenant_created_idx` ON `sales` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `sales_branch_created_idx` ON `sales` (`branch_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `sales_customer_idx` ON `sales` (`customer_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `sms_logs_tenant_idx` ON `sms_logs` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `sms_logs_status_idx` ON `sms_logs` (`status`);--> statement-breakpoint
CREATE INDEX `sms_tx_tenant_idx` ON `sms_transactions` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `adjustments_tenant_idx` ON `stock_adjustments` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `movements_tenant_created_idx` ON `stock_movements` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `movements_product_idx` ON `stock_movements` (`product_id`);--> statement-breakpoint
CREATE INDEX `movements_branch_idx` ON `stock_movements` (`branch_id`);--> statement-breakpoint
CREATE INDEX `transfers_tenant_idx` ON `stock_transfers` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_idx` ON `subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `suppliers_tenant_idx` ON `suppliers` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `memberships_user_idx` ON `tenant_memberships` (`user_id`);--> statement-breakpoint
CREATE INDEX `memberships_tenant_idx` ON `tenant_memberships` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `tenants_status_idx` ON `tenants` (`status`);--> statement-breakpoint
CREATE INDEX `users_super_idx` ON `users` (`is_super_admin`);--> statement-breakpoint
CREATE INDEX `vstock_tenant_branch_idx` ON `variant_stock` (`tenant_id`,`branch_id`);