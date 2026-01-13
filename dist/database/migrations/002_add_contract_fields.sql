-- ====================================
-- MIGRAÇÃO: Adicionar campos de contrato aos clientes
-- Data: 2025-10-02
-- ====================================

-- Adicionar novas colunas na tabela clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS contract_url TEXT,
ADD COLUMN IF NOT EXISTS contract_uploaded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS contract_filename VARCHAR(255);

-- Comentários para documentação
COMMENT ON COLUMN clients.contract_url IS 'URL ou caminho do arquivo de contrato assinado';
COMMENT ON COLUMN clients.contract_uploaded_at IS 'Data e hora do upload do contrato';
COMMENT ON COLUMN clients.contract_filename IS 'Nome original do arquivo de contrato';
