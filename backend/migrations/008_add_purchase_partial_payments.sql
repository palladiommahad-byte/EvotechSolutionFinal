-- Migration: 008_add_purchase_partial_payments
-- Description: Add partial payment support to purchase_invoices table
-- Date: 2026-02-06

-- Add amount_paid column to purchase_invoices
ALTER TABLE purchase_invoices 
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- Update status CHECK constraint to include 'partially_paid'
ALTER TABLE purchase_invoices 
DROP CONSTRAINT IF EXISTS purchase_invoices_status_check;

ALTER TABLE purchase_invoices 
ADD CONSTRAINT purchase_invoices_status_check 
CHECK (status IN ('draft', 'received', 'paid', 'partially_paid', 'overdue', 'cancelled'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_amount_paid 
ON purchase_invoices(amount_paid);

-- Add comment
COMMENT ON COLUMN purchase_invoices.amount_paid IS 'Amount already paid for this purchase invoice';
