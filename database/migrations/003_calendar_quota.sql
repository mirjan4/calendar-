-- ========================================================
-- Migration: 003_calendar_quota.sql
-- Feature: Calendar Quota Management
-- System: Markaz Student Registration & Calendar Distribution
-- ========================================================

USE `markaz_calendar`;

-- 1. Ensure calendars_allotted column has DEFAULT 100 and NOT NULL constraint
ALTER TABLE `registrations` 
MODIFY COLUMN `calendars_allotted` INT NOT NULL DEFAULT 100 COMMENT 'Assigned calendar quota (default: 100)';

-- 2. Normalize any legacy registrations with NULL quota to the default of 100
UPDATE `registrations` 
SET `calendars_allotted` = 100 
WHERE `calendars_allotted` IS NULL;
