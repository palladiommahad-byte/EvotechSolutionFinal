-- Add auto_number_documents column if missing
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS auto_number_documents BOOLEAN DEFAULT TRUE;
