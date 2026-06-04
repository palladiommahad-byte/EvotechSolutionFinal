-- Migration 018: Link purchase BLs (delivery_notes with supplier_id) to purchase invoices
-- Mirrors migration 016 which does the same for sales invoices.

-- 1. Add purchase_invoice_id to delivery_notes so a purchase BL can reference its FA
ALTER TABLE delivery_notes
  ADD COLUMN IF NOT EXISTS purchase_invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE SET NULL;

-- 2. Pivot table: purchase invoice ↔ delivery notes (many-to-many)
CREATE TABLE IF NOT EXISTS purchase_invoice_bls (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  bl_id               UUID NOT NULL REFERENCES delivery_notes(id)    ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (purchase_invoice_id, bl_id)
);

CREATE INDEX IF NOT EXISTS idx_pib_invoice ON purchase_invoice_bls(purchase_invoice_id);
CREATE INDEX IF NOT EXISTS idx_pib_bl      ON purchase_invoice_bls(bl_id);
