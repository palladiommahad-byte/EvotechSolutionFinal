-- Migration 017: Add client_po_number field to delivery_notes
-- Stores the client's purchase order reference (Bon de commande client)
ALTER TABLE delivery_notes
  ADD COLUMN IF NOT EXISTS client_po_number VARCHAR(100);
