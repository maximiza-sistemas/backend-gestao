-- ====================================
-- MIGRATION: Adiciona tabela de empréstimos de recipientes
-- ====================================

-- Tabela de empréstimos de recipientes
CREATE TABLE IF NOT EXISTS container_loans (
    id SERIAL PRIMARY KEY,
    loan_type VARCHAR(20) NOT NULL CHECK (loan_type IN ('Empréstimo', 'Comodato')),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('Saída', 'Entrada')),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('Empresa', 'Pessoa Física')),
    entity_name VARCHAR(150) NOT NULL,
    entity_contact VARCHAR(50),
    entity_address TEXT,
    loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_return_date DATE,
    actual_return_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Devolvido', 'Cancelado')),
    notes TEXT,
    location_id INTEGER REFERENCES locations(id),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_container_loans_status ON container_loans(status);
CREATE INDEX IF NOT EXISTS idx_container_loans_entity ON container_loans(entity_name);
CREATE INDEX IF NOT EXISTS idx_container_loans_direction ON container_loans(direction);
CREATE INDEX IF NOT EXISTS idx_container_loans_product ON container_loans(product_id);

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_container_loans_updated_at ON container_loans;
CREATE TRIGGER update_container_loans_updated_at 
    BEFORE UPDATE ON container_loans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar estoque quando empréstimo é criado
CREATE OR REPLACE FUNCTION update_stock_on_loan()
RETURNS TRIGGER AS $$
BEGIN
    -- Empréstimo de SAÍDA: decrementar estoque (enviando recipientes para terceiros)
    IF NEW.direction = 'Saída' THEN
        UPDATE stock 
        SET empty_quantity = empty_quantity - NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = NEW.product_id AND location_id = NEW.location_id;
    -- Empréstimo de ENTRADA: incrementar estoque (recebendo recipientes de terceiros)
    ELSIF NEW.direction = 'Entrada' THEN
        UPDATE stock 
        SET empty_quantity = empty_quantity + NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = NEW.product_id AND location_id = NEW.location_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_stock_on_loan_trigger ON container_loans;
CREATE TRIGGER update_stock_on_loan_trigger
    AFTER INSERT ON container_loans
    FOR EACH ROW EXECUTE FUNCTION update_stock_on_loan();

-- Trigger para reverter estoque quando empréstimo é devolvido
CREATE OR REPLACE FUNCTION revert_stock_on_loan_return()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'Ativo' AND NEW.status = 'Devolvido' THEN
        -- Devolução de empréstimo SAÍDA: recipientes voltam (incrementar)
        IF NEW.direction = 'Saída' THEN
            UPDATE stock 
            SET empty_quantity = empty_quantity + NEW.quantity,
                updated_at = CURRENT_TIMESTAMP
            WHERE product_id = NEW.product_id AND location_id = NEW.location_id;
        -- Devolução de empréstimo ENTRADA: recipientes devolvidos (decrementar)
        ELSIF NEW.direction = 'Entrada' THEN
            UPDATE stock 
            SET empty_quantity = empty_quantity - NEW.quantity,
                updated_at = CURRENT_TIMESTAMP
            WHERE product_id = NEW.product_id AND location_id = NEW.location_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS revert_stock_on_loan_return_trigger ON container_loans;
CREATE TRIGGER revert_stock_on_loan_return_trigger
    AFTER UPDATE ON container_loans
    FOR EACH ROW EXECUTE FUNCTION revert_stock_on_loan_return();
