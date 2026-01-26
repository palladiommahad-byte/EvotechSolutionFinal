-- Migration: 002_create_tax_reports
-- Date: 2026-01-26

CREATE TABLE IF NOT EXISTS tax_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER NOT NULL,
    quarter VARCHAR(10) NOT NULL CHECK (quarter IN ('q1', 'q2', 'q3', 'q4', 'annual')),
    data JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'filed', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(year, quarter)
);

CREATE INDEX IF NOT EXISTS idx_tax_reports_year ON tax_reports(year);
CREATE INDEX IF NOT EXISTS idx_tax_reports_quarter ON tax_reports(quarter);
