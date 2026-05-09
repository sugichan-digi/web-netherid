-- NetherID Custom Backend Database Initialization
-- Note: Kratos data is managed separately in the `db_user` database.
-- This script creates the tables for the custom backend.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------
-- Table `users`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kratos_identity_id` CHAR(36) NOT NULL COMMENT 'Kratosで発行されたIdentityのUUID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_kratos_identity_id` (`kratos_identity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ユーザーマッピング';

-- -----------------------------------------------------
-- Table `notifications`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL COMMENT 'お知らせタイトル',
  `content` TEXT COMMENT 'お知らせ詳細・本文',
  `url` VARCHAR(255) DEFAULT NULL COMMENT '詳細リンク先',
  `published_at` DATETIME NOT NULL COMMENT '掲載日時',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ダッシュボードお知らせ';

-- -----------------------------------------------------
-- Table `services`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `services` (
  `id` VARCHAR(50) NOT NULL COMMENT 'サービスの一意な識別子 (例: nether_blog)',
  `name` VARCHAR(100) NOT NULL COMMENT 'サービス表示名',
  `description` VARCHAR(255) DEFAULT NULL COMMENT '説明文',
  `sso_url` VARCHAR(255) NOT NULL COMMENT 'SSOログイン用エンドポイント',
  `icon_url` VARCHAR(255) DEFAULT NULL COMMENT 'アイコンパス',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '有効/無効フラグ',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='連携サービスマスタ';

-- -----------------------------------------------------
-- Table `user_linked_services`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_linked_services` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `service_id` VARCHAR(50) NOT NULL,
  `linked_at` DATETIME NOT NULL COMMENT '連携を実施した日時',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_service` (`user_id`, `service_id`),
  CONSTRAINT `fk_user_linked_services_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_linked_services_service_id` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ユーザー連携状態';

-- -----------------------------------------------------
-- Table `inquiries`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `inquiries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'ログインユーザーの場合のID',
  `email` VARCHAR(255) NOT NULL COMMENT '返信用メールアドレス',
  `type` VARCHAR(50) NOT NULL COMMENT 'お問い合わせ種別 (例: account, payment, other)',
  `subject` VARCHAR(255) NOT NULL COMMENT '件名',
  `body` TEXT NOT NULL COMMENT '本文',
  `status` VARCHAR(20) NOT NULL DEFAULT 'open' COMMENT 'ステータス (open, in_progress, closed)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_inquiries_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='お問い合わせ履歴';

SET FOREIGN_KEY_CHECKS = 1;
