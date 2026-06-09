-- RH (Ressources Humaines) Module Migration
-- Migration: 022_rh_module
-- Creates: employees, payroll, leaves, tax_config tables + seeds 2025 tax rates

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- EMPLOYEES
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    cin VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    email VARCHAR(255),
    hire_date DATE NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    contract_type VARCHAR(20) NOT NULL CHECK (contract_type IN ('CDI', 'CDD', 'Intérim')),
    status VARCHAR(20) NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'suspendu', 'terminé')),
    base_salary DECIMAL(10,2) NOT NULL,
    cnss_number VARCHAR(50) NOT NULL,
    nb_dependents INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_cin ON employees(cin);

-- ============================================
-- PAYROLL
-- ============================================
CREATE TABLE IF NOT EXISTS payroll (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    base_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
    days_worked INTEGER NOT NULL DEFAULT 26,
    overtime_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
    overtime_type VARCHAR(20) NOT NULL DEFAULT 'weekday_25' CHECK (overtime_type IN ('weekday_25','weekday_50','restday_100','restday_150')),
    prime_transport DECIMAL(10,2) NOT NULL DEFAULT 0,
    prime_rendement DECIMAL(10,2) NOT NULL DEFAULT 0,
    prime_anciennete DECIMAL(10,2) NOT NULL DEFAULT 0,
    other_bonus DECIMAL(10,2) NOT NULL DEFAULT 0,
    advance_deduction DECIMAL(10,2) NOT NULL DEFAULT 0,
    unjustified_absence_days INTEGER NOT NULL DEFAULT 0,
    -- Calculated fields
    daily_rate DECIMAL(10,4),
    absence_deduction DECIMAL(10,2),
    adjusted_base DECIMAL(10,2),
    overtime_pay DECIMAL(10,2),
    brut DECIMAL(10,2),
    cnss_employee DECIMAL(10,2),
    amo_employee DECIMAL(10,2),
    frais_pro_raw DECIMAL(10,2),
    frais_professionnels DECIMAL(10,2),
    net_imposable DECIMAL(10,2),
    igr_raw DECIMAL(10,2),
    charge_relief DECIMAL(10,2),
    igr DECIMAL(10,2),
    net_a_payer DECIMAL(10,2),
    -- Employer cost (not on bulletin)
    cnss_employer DECIMAL(10,2),
    prestations_familiales DECIMAL(10,2),
    taxe_formation DECIMAL(10,2),
    amo_employer DECIMAL(10,2),
    total_employer_cost DECIMAL(10,2),
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon','validé','payé')),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month_year ON payroll(month, year);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(status);

-- ============================================
-- LEAVES
-- ============================================
CREATE TABLE IF NOT EXISTS leaves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('congé annuel','maladie','sans solde','autre')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'en attente' CHECK (status IN ('en attente','approuvé','refusé')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaves_employee_id ON leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);

-- ============================================
-- TAX CONFIG
-- ============================================
CREATE TABLE IF NOT EXISTS tax_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER UNIQUE NOT NULL,
    cnss_employee_rate DECIMAL(6,4) NOT NULL DEFAULT 0.0448,
    cnss_employer_rate DECIMAL(6,4) NOT NULL DEFAULT 0.0898,
    cnss_ceiling DECIMAL(10,2) NOT NULL DEFAULT 6000.00,
    prestations_familiales_rate DECIMAL(6,4) NOT NULL DEFAULT 0.0640,
    taxe_formation_rate DECIMAL(6,4) NOT NULL DEFAULT 0.0160,
    amo_employee_rate DECIMAL(6,4) NOT NULL DEFAULT 0.0226,
    amo_employer_rate DECIMAL(6,4) NOT NULL DEFAULT 0.0411,
    frais_pro_rate DECIMAL(6,4) NOT NULL DEFAULT 0.2000,
    frais_pro_ceiling_monthly DECIMAL(10,2) NOT NULL DEFAULT 2500.00,
    igr_brackets JSONB NOT NULL DEFAULT '[]',
    charge_deduction_per_dependent DECIMAL(10,2) NOT NULL DEFAULT 30.00,
    max_dependents INTEGER NOT NULL DEFAULT 6,
    smig_monthly DECIMAL(10,2) NOT NULL DEFAULT 3111.39,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed 2025 tax configuration (Moroccan tax rates)
INSERT INTO tax_config (
    year, cnss_employee_rate, cnss_employer_rate, cnss_ceiling,
    prestations_familiales_rate, taxe_formation_rate,
    amo_employee_rate, amo_employer_rate,
    frais_pro_rate, frais_pro_ceiling_monthly,
    smig_monthly, charge_deduction_per_dependent, max_dependents,
    igr_brackets
) VALUES (
    2025, 0.0448, 0.0898, 6000.00,
    0.0640, 0.0160,
    0.0226, 0.0411,
    0.2000, 2500.00,
    3111.39, 30.00, 6,
    '[
        {"min": 0,     "max": 2916,  "rate": 0.00, "deduction": 0},
        {"min": 2917,  "max": 5000,  "rate": 0.10, "deduction": 291.67},
        {"min": 5001,  "max": 6666,  "rate": 0.20, "deduction": 791.67},
        {"min": 6667,  "max": 8333,  "rate": 0.30, "deduction": 1458.33},
        {"min": 8334,  "max": 15000, "rate": 0.34, "deduction": 1791.67},
        {"min": 15001, "max": null,  "rate": 0.38, "deduction": 2391.67}
    ]'::jsonb
) ON CONFLICT (year) DO NOTHING;
