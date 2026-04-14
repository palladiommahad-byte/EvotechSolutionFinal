-- Migration: 016_invoice_bl_workflow
-- Objective: Refactor invoice creation to be intentional, support grouped BL→Invoice
-- Date: 2026-04-09

-- ============================================================
-- 1. Add billing_status to delivery_notes
-- ============================================================
ALTER TABLE delivery_notes
  ADD COLUMN IF NOT EXISTS billing_status VARCHAR(20) NOT NULL DEFAULT 'not_invoiced'
    CHECK (billing_status IN ('not_invoiced', 'invoiced'));

-- Index for fast filtering by billing status
CREATE INDEX IF NOT EXISTS idx_delivery_notes_billing_status 
  ON delivery_notes(billing_status);

-- ============================================================
-- 2. Add invoice_id FK to delivery_notes (for direct link)
-- ============================================================
ALTER TABLE delivery_notes
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_notes_invoice_id
  ON delivery_notes(invoice_id);

-- ============================================================
-- 3. Create invoice_bls pivot table (for grouped BL → Invoice)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_bls (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  bl_id       UUID NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(invoice_id, bl_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_bls_invoice ON invoice_bls(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_bls_bl      ON invoice_bls(bl_id);

-- ============================================================
-- 4. Create document_sequences table for safe invoice numbering
-- ============================================================
CREATE TABLE IF NOT EXISTS document_sequences (
  doc_type        VARCHAR(50) PRIMARY KEY,
  prefix          VARCHAR(10) NOT NULL,
  last_month_year VARCHAR(5)  NOT NULL DEFAULT '00/00',
  last_seq        INTEGER     NOT NULL DEFAULT 0
);

-- Seed initial row for invoices
INSERT INTO document_sequences (doc_type, prefix, last_month_year, last_seq)
VALUES ('invoice', 'FC', '00/00', 0)
ON CONFLICT (doc_type) DO NOTHING;

-- ============================================================
-- 5. Backfill: mark existing BLs that already have a linked
--    invoice (via old invoices.delivery_note_id) as 'invoiced'
-- ============================================================
UPDATE delivery_notes dn
SET 
  billing_status = 'invoiced',
  invoice_id     = i.id
FROM invoices i
WHERE i.delivery_note_id = dn.id
  AND dn.billing_status = 'not_invoiced';

-- ============================================================
-- 6. Backfill: populate invoice_bls pivot from existing links
-- ============================================================
INSERT INTO invoice_bls (invoice_id, bl_id)
SELECT i.id, i.delivery_note_id
FROM invoices i
WHERE i.delivery_note_id IS NOT NULL
ON CONFLICT (invoice_id, bl_id) DO NOTHING;

-- ============================================================
-- 7. Add tax_enabled column to delivery_notes (for TVA validation)
-- ============================================================
ALTER TABLE delivery_notes
  ADD COLUMN IF NOT EXISTS tax_enabled BOOLEAN NOT NULL DEFAULT FALSE;
