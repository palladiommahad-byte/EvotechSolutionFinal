-- EvoTech Solution Database Schema
-- Migration: 007_add_partial_payments
-- Date: 2026-02-06
-- Description: Add partial payment support to invoices

-- Add amount_paid column to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- Update the status CHECK constraint to include 'partially_paid'
ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices 
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'));

-- Add index on amount_paid for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_invoices_amount_paid ON invoices(amount_paid);

-- Add comment for documentation
COMMENT ON COLUMN invoices.amount_paid IS 'Amount already paid by the client. When amount_paid < total, status should be partially_paid. When amount_paid >= total, status should be paid.';
