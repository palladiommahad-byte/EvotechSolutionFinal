-- Add unit column to invoice_items and estimate_items tables
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
ALTER TABLE estimate_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
