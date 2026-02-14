-- Migration: 013_make_contact_name_optional
-- Date: 2026-02-14
-- Description: Make name column optional in contacts table

ALTER TABLE contacts ALTER COLUMN name DROP NOT NULL;
