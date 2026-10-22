-- ========================================================
-- Migration: 005_student_calendar_quantity.sql
-- Feature: Student-Selectable Calendar Quantity Option
-- System: Markaz Student Registration & Calendar Distribution
-- ========================================================

USE `markaz_calendar`;

-- 1. Add calendars_requested and additional_calendars columns
ALTER TABLE `registrations`
  ADD COLUMN `calendars_requested` INT NOT NULL DEFAULT 100 COMMENT 'Quantity requested by student upon registration' AFTER `registration_type`,
  ADD COLUMN `additional_calendars` INT NOT NULL DEFAULT 0 COMMENT 'Additional calendars granted by administrator beyond requested' AFTER `calendars_requested`;

-- 2. Backfill existing records
UPDATE `registrations`
SET `calendars_requested` = 100,
    `additional_calendars` = GREATEST(0, `calendars_allotted` - 100);
