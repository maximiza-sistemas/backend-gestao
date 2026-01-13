-- Tabela de categorias financeiras
CREATE TABLE IF NOT EXISTS financial_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Receita', 'Despesa')),
    description TEXT,
    color VARCHAR(7), -- Cor em hexadecimal para visualização
    icon VARCHAR(50), -- Classe do ícone FontAwesome
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de contas bancárias/caixas
CREATE TABLE IF NOT EXISTS financial_accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Banco', 'Caixa', 'Carteira Digital')),
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    agency VARCHAR(20),
    initial_balance DECIMAL(10,2) DEFAULT 0.00,
    current_balance DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de transações financeiras
CREATE TABLE IF NOT EXISTS financial_transactions (
    id SERIAL PRIMARY KEY,
    transaction_code VARCHAR(20) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Receita', 'Despesa', 'Transferência')),
    category_id INTEGER REFERENCES financial_categories(id),
    account_id INTEGER REFERENCES financial_accounts(id),
    destination_account_id INTEGER REFERENCES financial_accounts(id), -- Para transferências
    order_id INTEGER REFERENCES orders(id), -- Vinculo com pedidos
    client_id INTEGER REFERENCES clients(id), -- Vinculo com clientes
    supplier_id INTEGER REFERENCES suppliers(id), -- Vinculo com fornecedores
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(30) CHECK (payment_method IN ('Dinheiro', 'Pix', 'Cartão Débito', 'Cartão Crédito', 'Boleto', 'Transferência', 'Cheque')),
    transaction_date DATE NOT NULL,
    due_date DATE,
    payment_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Pago', 'Cancelado', 'Vencido')),
    installment_number INTEGER, -- Número da parcela atual
    total_installments INTEGER, -- Total de parcelas
    parent_transaction_id INTEGER REFERENCES financial_transactions(id), -- Para parcelas
    reference_number VARCHAR(100), -- Número de referência externa (NF, boleto, etc)
    notes TEXT,
    attachment_url TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status ON financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON financial_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_account ON financial_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_client ON financial_transactions(client_id);

-- Inserir categorias padrão
INSERT INTO financial_categories (name, type, description, color, icon) VALUES
    ('Vendas de Gás', 'Receita', 'Receitas provenientes de vendas de gás', '#10b981', 'fa-fire'),
    ('Vendas de Produtos', 'Receita', 'Receitas de outros produtos', '#3b82f6', 'fa-box'),
    ('Serviços', 'Receita', 'Receitas de serviços prestados', '#8b5cf6', 'fa-tools'),
    ('Outras Receitas', 'Receita', 'Outras fontes de receita', '#06b6d4', 'fa-plus-circle'),
    ('Fornecedores', 'Despesa', 'Pagamentos a fornecedores', '#ef4444', 'fa-truck'),
    ('Salários', 'Despesa', 'Pagamento de salários e benefícios', '#f59e0b', 'fa-users'),
    ('Combustível', 'Despesa', 'Gastos com combustível da frota', '#ec4899', 'fa-gas-pump'),
    ('Manutenção', 'Despesa', 'Manutenção de equipamentos e veículos', '#f97316', 'fa-wrench'),
    ('Aluguel', 'Despesa', 'Aluguel de imóveis e equipamentos', '#84cc16', 'fa-home'),
    ('Impostos', 'Despesa', 'Pagamento de impostos e taxas', '#dc2626', 'fa-file-invoice-dollar'),
    ('Utilidades', 'Despesa', 'Água, luz, telefone, internet', '#0891b2', 'fa-bolt'),
    ('Marketing', 'Despesa', 'Gastos com publicidade e marketing', '#7c3aed', 'fa-bullhorn'),
    ('Outras Despesas', 'Despesa', 'Outras despesas operacionais', '#64748b', 'fa-minus-circle')
ON CONFLICT DO NOTHING;

-- Inserir contas padrão
INSERT INTO financial_accounts (name, type, bank_name, initial_balance, current_balance) VALUES
    ('Caixa Principal', 'Caixa', NULL, 0.00, 0.00),
    ('Conta Corrente - Banco do Brasil', 'Banco', 'Banco do Brasil', 0.00, 0.00),
    ('Pix Empresarial', 'Carteira Digital', NULL, 0.00, 0.00)
ON CONFLICT DO NOTHING;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_financial_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_financial_categories_updated_at ON financial_categories;
CREATE TRIGGER update_financial_categories_updated_at
    BEFORE UPDATE ON financial_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_updated_at();

DROP TRIGGER IF EXISTS update_financial_accounts_updated_at ON financial_accounts;
CREATE TRIGGER update_financial_accounts_updated_at
    BEFORE UPDATE ON financial_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_updated_at();

DROP TRIGGER IF EXISTS update_financial_transactions_updated_at ON financial_transactions;
CREATE TRIGGER update_financial_transactions_updated_at
    BEFORE UPDATE ON financial_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_updated_at();

-- Função para atualizar saldo da conta após transação
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Atualizar saldo baseado no tipo de transação
        IF NEW.type = 'Receita' AND NEW.status = 'Pago' THEN
            UPDATE financial_accounts 
            SET current_balance = current_balance + NEW.amount 
            WHERE id = NEW.account_id;
        ELSIF NEW.type = 'Despesa' AND NEW.status = 'Pago' THEN
            UPDATE financial_accounts 
            SET current_balance = current_balance - NEW.amount 
            WHERE id = NEW.account_id;
        ELSIF NEW.type = 'Transferência' AND NEW.status = 'Pago' THEN
            -- Debitar da conta origem
            UPDATE financial_accounts 
            SET current_balance = current_balance - NEW.amount 
            WHERE id = NEW.account_id;
            -- Creditar na conta destino
            UPDATE financial_accounts 
            SET current_balance = current_balance + NEW.amount 
            WHERE id = NEW.destination_account_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Reverter transação antiga se estava paga
        IF OLD.status = 'Pago' THEN
            IF OLD.type = 'Receita' THEN
                UPDATE financial_accounts 
                SET current_balance = current_balance - OLD.amount 
                WHERE id = OLD.account_id;
            ELSIF OLD.type = 'Despesa' THEN
                UPDATE financial_accounts 
                SET current_balance = current_balance + OLD.amount 
                WHERE id = OLD.account_id;
            ELSIF OLD.type = 'Transferência' THEN
                UPDATE financial_accounts 
                SET current_balance = current_balance + OLD.amount 
                WHERE id = OLD.account_id;
                UPDATE financial_accounts 
                SET current_balance = current_balance - OLD.amount 
                WHERE id = OLD.destination_account_id;
            END IF;
        END IF;
        
        -- Aplicar nova transação se está paga
        IF NEW.status = 'Pago' THEN
            IF NEW.type = 'Receita' THEN
                UPDATE financial_accounts 
                SET current_balance = current_balance + NEW.amount 
                WHERE id = NEW.account_id;
            ELSIF NEW.type = 'Despesa' THEN
                UPDATE financial_accounts 
                SET current_balance = current_balance - NEW.amount 
                WHERE id = NEW.account_id;
            ELSIF NEW.type = 'Transferência' THEN
                UPDATE financial_accounts 
                SET current_balance = current_balance - NEW.amount 
                WHERE id = NEW.account_id;
                UPDATE financial_accounts 
                SET current_balance = current_balance + NEW.amount 
                WHERE id = NEW.destination_account_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_balance_after_transaction ON financial_transactions;
CREATE TRIGGER update_balance_after_transaction
    AFTER INSERT OR UPDATE ON financial_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance();