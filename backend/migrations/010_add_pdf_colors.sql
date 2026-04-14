-- Add PDF color customization columns to company_settings
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS pdf_primary_color VARCHAR(7) DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS pdf_title_color VARCHAR(7) DEFAULT '#3b82f6';
