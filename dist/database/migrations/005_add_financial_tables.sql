-- ====================================
-- MIGRAÇÃO: Adicionar módulo financeiro
-- Data: 2025-11-15
-- ====================================

-- Criar tabela de contas a receber
CREATE TABLE IF NOT EXISTS receivables (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    client_name VARCHAR(255) NOT NULL,
    order_id INTEGER REFERENCES orders(id),
    invoice_id VARCHAR(50) UNIQUE NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'A Vencer' CHECK (status IN ('Pago', 'A Vencer', 'Vencido')),
    payment_date DATE,
    payment_method VARCHAR(50),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de contas a pagar
CREATE TABLE IF NOT EXISTS payables (
    id SERIAL PRIMARY KEY,
    supplier VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    due_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'A Pagar' CHECK (status IN ('Pago', 'A Pagar', 'Vencido')),
    payment_date DATE,
    payment_method VARCHAR(50),
    document_number VARCHAR(100),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_receivables_client ON receivables(client_id);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status);
CREATE INDEX IF NOT EXISTS idx_receivables_due_date ON receivables(due_date);
CREATE INDEX IF NOT EXISTS idx_receivables_invoice ON receivables(invoice_id);

CREATE INDEX IF NOT EXISTS idx_payables_supplier ON payables(supplier);
CREATE INDEX IF NOT EXISTS idx_payables_status ON payables(status);
CREATE INDEX IF NOT EXISTS idx_payables_due_date ON payables(due_date);
CREATE INDEX IF NOT EXISTS idx_payables_category ON payables(category);

-- Triggers para atualização automática
CREATE TRIGGER update_receivables_updated_at BEFORE UPDATE ON receivables
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payables_updated_at BEFORE UPDATE ON payables
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE receivables IS 'Contas a receber - valores que clientes devem à empresa';
COMMENT ON TABLE payables IS 'Contas a pagar - valores que a empresa deve a fornecedores';
COMMENT ON COLUMN receivables.invoice_id IS 'Número único da fatura/nota fiscal';
COMMENT ON COLUMN receivables.status IS 'Status do recebimento: Pago, A Vencer, Vencido';
COMMENT ON COLUMN payables.status IS 'Status do pagamento: Pago, A Pagar, Vencido';
