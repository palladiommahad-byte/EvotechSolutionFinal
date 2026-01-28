-- Migration: 003_add_bank_account_to_invoices
-- Description: Add bank account tracking to invoices and purchase invoices
-- Date: 2026-01-28

-- Add bank_account_id to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES treasury_bank_accounts(id) ON DELETE SET NULL;

-- Add bank_account_id to purchase_invoices table
ALTER TABLE purchase_invoices 
ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES treasury_bank_accounts(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_bank_account ON invoices(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_bank_account ON purchase_invoices(bank_account_id);

-- Add comment to document the purpose
COMMENT ON COLUMN invoices.bank_account_id IS 'Reference to the bank account that will receive payment for this invoice';
COMMENT ON COLUMN purchase_invoices.bank_account_id IS 'Reference to the bank account used to pay this purchase invoice';
