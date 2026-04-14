-- Add auto_number_documents to company_settings
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS auto_number_documents BOOLEAN DEFAULT true;
