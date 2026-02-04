-- Migration: 006_create_prelevements
-- Date: 2026-02-02
-- Description: Create tables for Prélèvement module

-- ============================================
-- PRELEVEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS prelevements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES contacts(id),
    date DATE NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'cancelled')),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prelevements_client ON prelevements(client_id);
CREATE INDEX IF NOT EXISTS idx_prelevements_date ON prelevements(date);
CREATE INDEX IF NOT EXISTS idx_prelevements_status ON prelevements(status);

CREATE TABLE IF NOT EXISTS prelevement_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prelevement_id UUID NOT NULL REFERENCES prelevements(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(12, 3) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prelevement_items_prelevement ON prelevement_items(prelevement_id);
