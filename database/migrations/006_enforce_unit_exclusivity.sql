-- Migration 006: Enforce Strict Inside Kerala Unit Exclusivity at Storage Engine Level
-- Prevents duplicate assignments and duplicate approved/pending registrations for the same unit.

-- 1. Enforce unique active unit in unit_assignments:
-- Uses a virtual generated column active_unit_id that is equal to unit_id when status = 'active', and NULL otherwise.
-- Because MySQL/MariaDB permits multiple NULLs in unique indexes, this strictly prevents duplicate 'active' assignments for any unit.
ALTER TABLE unit_assignments 
  ADD COLUMN IF NOT EXISTS active_unit_id INT AS (IF(status = 'active', unit_id, NULL)) VIRTUAL,
  ADD UNIQUE KEY IF NOT EXISTS uq_active_unit (active_unit_id);

-- 2. Enforce unique active inside_kerala unit in registrations:
-- Uses a virtual generated column active_inside_unit_id that is equal to unit_id when registration_type = 'inside_kerala' and status IN ('approved', 'pending'), and NULL otherwise.
-- This ensures at the database engine level that no two approved/pending registrations can ever claim the same unit.
ALTER TABLE registrations 
  ADD COLUMN IF NOT EXISTS active_inside_unit_id INT AS (IF(registration_type = 'inside_kerala' AND status IN ('approved', 'pending'), unit_id, NULL)) VIRTUAL,
  ADD UNIQUE KEY IF NOT EXISTS uq_active_inside_unit (active_inside_unit_id);
