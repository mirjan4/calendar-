-- Markaz Student Registration & Calendar Distribution System
-- Database Schema for MySQL 8.x / MariaDB 10.4+

CREATE DATABASE IF NOT EXISTS `markaz_calendar` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `markaz_calendar`;

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `role` ENUM('super_admin', 'admin', 'operator') NOT NULL DEFAULT 'admin',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Students Master Table
CREATE TABLE IF NOT EXISTS `students` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `class_name` VARCHAR(50) NOT NULL,
  `hajer_no` VARCHAR(50) NULL COMMENT ,
  `reg_no` VARCHAR(50) NOT NULL UNIQUE,
  `admission_no` VARCHAR(50) NULL,
  `candidate_name` VARCHAR(150) NOT NULL,
  `place` VARCHAR(150) NULL,
  `mobile` VARCHAR(20) NULL DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_reg_no (`reg_no`),
  INDEX idx_admission_no (`admission_no`),
  INDEX idx_class (`class_name`),
  INDEX idx_mobile (`mobile`)
) ENGINE=InnoDB;

-- 3. Districts (Inside Kerala)
CREATE TABLE IF NOT EXISTS `districts` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. Zones (Inside Kerala)
CREATE TABLE IF NOT EXISTS `zones` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `district_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON DELETE RESTRICT,
  UNIQUE KEY uq_district_zone (`district_id`, `name`),
  INDEX idx_district_id (`district_id`)
) ENGINE=InnoDB;

-- 5. Circles (Inside Kerala)
CREATE TABLE IF NOT EXISTS `circles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `zone_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON DELETE RESTRICT,
  UNIQUE KEY uq_zone_circle (`zone_id`, `name`),
  INDEX idx_zone_id (`zone_id`)
) ENGINE=InnoDB;

-- 6. Units (Inside Kerala)
CREATE TABLE IF NOT EXISTS `units` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `circle_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON DELETE RESTRICT,
  UNIQUE KEY uq_circle_unit (`circle_id`, `name`),
  INDEX idx_circle_id (`circle_id`)
) ENGINE=InnoDB;

-- 7. Registrations
CREATE TABLE IF NOT EXISTS `registrations` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `registration_code` VARCHAR(50) NOT NULL UNIQUE,
  `student_id` INT UNSIGNED NOT NULL,
  `registration_type` ENUM('inside_kerala', 'outside_kerala') NOT NULL,
  `calendars_requested` INT NOT NULL DEFAULT 100 COMMENT 'Quantity requested by student upon registration',
  `additional_calendars` INT NOT NULL DEFAULT 0 COMMENT 'Additional calendars granted by administrator',
  `calendars_allotted` INT NOT NULL DEFAULT 100 COMMENT 'Final approved quantity (requested + additional)',
  -- Inside Kerala relational fields
  `district_id` INT UNSIGNED NULL,
  `zone_id` INT UNSIGNED NULL,
  `circle_id` INT UNSIGNED NULL,
  `unit_id` INT UNSIGNED NULL,
  -- Outside Kerala text fields
  `state_name` VARCHAR(100) NULL,
  `outside_district` VARCHAR(100) NULL,
  `outside_zone` VARCHAR(100) NULL,
  `outside_circle` VARCHAR(100) NULL,
  `outside_unit` VARCHAR(100) NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'approved',
  `rejection_reason` VARCHAR(255) NULL,
  `active_inside_unit_id` INT AS (IF(`registration_type` = 'inside_kerala' AND `status` IN ('approved', 'pending'), `unit_id`, NULL)) VIRTUAL,
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE RESTRICT,
  UNIQUE KEY uq_active_inside_unit (`active_inside_unit_id`),
  INDEX idx_student_id (`student_id`),
  INDEX idx_reg_type (`registration_type`),
  INDEX idx_status (`status`)
) ENGINE=InnoDB;

-- 8. Unit Assignments
CREATE TABLE IF NOT EXISTS `unit_assignments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `unit_id` INT UNSIGNED NOT NULL,
  `student_id` INT UNSIGNED NOT NULL,
  `registration_id` INT UNSIGNED NOT NULL,
  `status` ENUM('active', 'released') NOT NULL DEFAULT 'active',
  `active_unit_id` INT AS (IF(`status` = 'active', `unit_id`, NULL)) VIRTUAL,
  `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `released_at` DATETIME NULL,
  `release_reason` TEXT NULL,
  `released_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`released_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL,
  UNIQUE KEY uq_active_unit (`active_unit_id`),
  INDEX idx_unit_status (`unit_id`, `status`),
  INDEX idx_student (`student_id`)
) ENGINE=InnoDB;

-- 9. Student Import History
CREATE TABLE IF NOT EXISTS `student_import_history` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `file_name` VARCHAR(255) NOT NULL,
  `import_mode` ENUM('insert_only', 'update_only', 'insert_and_update') NOT NULL,
  `total_rows` INT UNSIGNED NOT NULL DEFAULT 0,
  `imported_rows` INT UNSIGNED NOT NULL DEFAULT 0,
  `updated_rows` INT UNSIGNED NOT NULL DEFAULT 0,
  `skipped_rows` INT UNSIGNED NOT NULL DEFAULT 0,
  `failed_rows` INT UNSIGNED NOT NULL DEFAULT 0,
  `status` ENUM('completed', 'failed', 'partial') NOT NULL DEFAULT 'completed',
  `uploaded_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`uploaded_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 10. Student Import Errors
CREATE TABLE IF NOT EXISTS `student_import_errors` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `import_id` INT UNSIGNED NOT NULL,
  `row_number` INT UNSIGNED NOT NULL,
  `raw_data` JSON NOT NULL,
  `error_reason` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`import_id`) REFERENCES `student_import_history`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- FUTURE EXTENSION BLUEPRINT: 11. Calendar Fund & Fee Collection Management
-- (To be activated when Collection Module is deployed; zero breaking changes to existing schema)
-- ============================================================================
/*
CREATE TABLE IF NOT EXISTS `collections` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `registration_id` INT UNSIGNED NOT NULL,
  `student_id` INT UNSIGNED NOT NULL,
  `unit_id` INT UNSIGNED NULL,
  `receipt_no` VARCHAR(50) NOT NULL UNIQUE,
  `amount_received` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `calendars_distributed` INT NOT NULL DEFAULT 0,
  `calendars_returned` INT NOT NULL DEFAULT 0,
  `payment_mode` ENUM('cash', 'upi', 'bank_transfer', 'cheque') NOT NULL DEFAULT 'cash',
  `transaction_ref` VARCHAR(100) NULL,
  `collected_by` INT UNSIGNED NULL,
  `collection_date` DATE NOT NULL,
  `notes` TEXT NULL,
  `status` ENUM('partial', 'completed', 'verified') NOT NULL DEFAULT 'partial',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`collected_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL,
  INDEX idx_collection_reg (`registration_id`),
  INDEX idx_collection_student (`student_id`),
  INDEX idx_collection_date (`collection_date`)
) ENGINE=InnoDB;
*/
