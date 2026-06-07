-- Add PDF Design Studio columns to company_settings
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS pdf_font_size INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS pdf_font_family VARCHAR(20) DEFAULT 'Helvetica',
ADD COLUMN IF NOT EXISTS pdf_body_text_color VARCHAR(7) DEFAULT '#374151',
ADD COLUMN IF NOT EXISTS pdf_border_color VARCHAR(7) DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS pdf_logo_size VARCHAR(10) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS pdf_logo_position VARCHAR(5) DEFAULT 'left',
ADD COLUMN IF NOT EXISTS pdf_table_spacing VARCHAR(10) DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS pdf_show_borders BOOLEAN DEFAULT TRUE;
