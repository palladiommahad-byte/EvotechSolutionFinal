-- Migration: 005_auto_invoice_logic
-- Objective: Link Invoices to Delivery Notes and automate creation
-- Date: 2026-01-31

-- 1. Add column to link Invoice back to Delivery Note
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS delivery_note_id UUID REFERENCES delivery_notes(id);

CREATE INDEX IF NOT EXISTS idx_invoices_delivery_note ON invoices(delivery_note_id);

-- 2. Create Function to Auto-Generate Invoice from BL
CREATE OR REPLACE FUNCTION create_invoice_from_bl(bl_uuid UUID)
RETURNS UUID AS $$
DECLARE
    v_bl RECORD;
    v_new_invoice_id UUID;
    v_new_document_id VARCHAR;
    v_item RECORD;
BEGIN
    -- Get BL details
    SELECT * INTO v_bl FROM delivery_notes WHERE id = bl_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delivery Note not found';
    END IF;

    -- Generate new Invoice Document ID (Simple increment logic for example, ideally use a sequence or separate generator)
    -- This assumes a basic format FC-YYYYMMDD-XXXX
    v_new_document_id := 'FC-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substring(uuid_generate_v4()::text from 1 for 4);

    -- Insert Invoice
    INSERT INTO invoices (
        client_id, 
        date, 
        due_date, 
        subtotal, 
        vat_rate, 
        vat_amount, 
        total, 
        status, 
        note, 
        delivery_note_id, -- Link to BL
        document_id
    ) VALUES (
        v_bl.client_id,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days', -- Default due date
        v_bl.subtotal,
        20.00, -- Default VAT
        (v_bl.subtotal * 0.20), -- Calculated VAT
        (v_bl.subtotal * 1.20), -- Total with VAT
        'draft',
        'Auto-generated from Delivery Note ' || v_bl.document_id,
        v_bl.id,
        v_new_document_id
    ) RETURNING id INTO v_new_invoice_id;

    -- Copy Items
    FOR v_item IN SELECT * FROM delivery_note_items WHERE delivery_note_id = bl_uuid
    LOOP
        INSERT INTO invoice_items (
            invoice_id,
            product_id,
            description,
            quantity,
            unit_price,
            total
        ) VALUES (
            v_new_invoice_id,
            v_item.product_id,
            v_item.description,
            v_item.quantity,
            v_item.unit_price,
            v_item.total
        );
    END LOOP;

    RETURN v_new_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Optional: Trigger to run it automatically (Commented out to allow manual control via API if preferred)
/*
CREATE OR REPLACE FUNCTION trigger_auto_invoice()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.client_id IS NOT NULL THEN -- Only for Sales BLs
        PERFORM create_invoice_from_bl(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_bl_insert
AFTER INSERT ON delivery_notes
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_invoice();
*/
