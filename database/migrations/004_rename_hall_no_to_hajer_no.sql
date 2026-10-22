-- Migration: 004_rename_hall_no_to_hajer_no.sql
-- Description: Renames column hall_no to hajer_no in students table

USE `markaz_calendar`;

ALTER TABLE `students` CHANGE COLUMN `hall_no` `hajer_no` VARCHAR(50) NULL COMMENT 'Hajer No (HN)';
