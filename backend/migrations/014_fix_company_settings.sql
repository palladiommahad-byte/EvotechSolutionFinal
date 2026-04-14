-- Migration: 014_fix_company_settings
-- Date: 2026-02-14
-- Description: Add missing patente column and clear default example values

-- Add patente column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'patente') THEN
        ALTER TABLE company_settings ADD COLUMN patente VARCHAR(50);
    END IF;
END $$;

-- Clear default example values
UPDATE company_settings 
SET 
    ice = CASE WHEN ice LIKE '00123456%' THEN '' ELSE ice END,
    if_number = CASE WHEN if_number = '12345678' THEN '' ELSE if_number END,
    rc = CASE WHEN rc LIKE '123456 - Marrakech%' THEN '' ELSE rc END,
    tp = CASE WHEN tp = '12345678' THEN '' ELSE tp END,
    cnss = CASE WHEN cnss = '1234567' THEN '' ELSE cnss END,
    patente = CASE WHEN patente = '12345678' THEN '' ELSE patente END;
