-- Migration: Add contract_file column to container_loans table
-- Run this migration to enable contract PDF upload functionality

ALTER TABLE container_loans ADD COLUMN IF NOT EXISTS contract_file VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_container_loans_contract_file ON container_loans(contract_file) WHERE contract_file IS NOT NULL;

COMMENT ON COLUMN container_loans.contract_file IS 'Nome do arquivo PDF do contrato associado ao empréstimo';
