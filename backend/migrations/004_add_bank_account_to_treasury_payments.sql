-- Add bank_account_id to treasury_payments
ALTER TABLE treasury_payments 
ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES treasury_bank_accounts(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_treasury_payments_bank_account_id ON treasury_payments(bank_account_id);
