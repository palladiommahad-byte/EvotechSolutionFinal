-- Migration: 015_add_delivery_note_id_to_purchase_invoices
-- Objective: Link Purchase Invoices to Delivery Notes (BL) to prevent duplicates
-- Date: 2026-02-14

-- 1. Add column to link Purchase Invoice back to Delivery Note
ALTER TABLE purchase_invoices 
ADD COLUMN IF NOT EXISTS delivery_note_id UUID REFERENCES delivery_notes(id);

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_delivery_note ON purchase_invoices(delivery_note_id);
