-- Add discount columns to all document tables
-- Migration: 018_add_discounts
-- Date: 2026-04-16

-- 1. invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_value DECIMAL(12, 2) DEFAULT 0;

-- 2. estimates
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage'));
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS discount_value DECIMAL(12, 2) DEFAULT 0;

-- 3. delivery_notes
ALTER TABLE delivery_notes ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage'));
ALTER TABLE delivery_notes ADD COLUMN IF NOT EXISTS discount_value DECIMAL(12, 2) DEFAULT 0;

-- 4. credit_notes
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage'));
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS discount_value DECIMAL(12, 2) DEFAULT 0;

-- 5. purchase_orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage'));
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS discount_value DECIMAL(12, 2) DEFAULT 0;

-- 6. purchase_invoices
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage'));
ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS discount_value DECIMAL(12, 2) DEFAULT 0;
