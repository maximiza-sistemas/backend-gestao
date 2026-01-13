-- Migration: Adicionar sistema de pagamentos parciais para pedidos
-- Criado em: 2026-01-06

-- ====================================
-- TABELA DE PAGAMENTOS DE PEDIDOS
-- ====================================
CREATE TABLE IF NOT EXISTS order_payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('Dinheiro', 'Pix', 'Cartão')),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_payment_date ON order_payments(payment_date);

-- ====================================
-- ADICIONAR COLUNAS NA TABELA ORDERS
-- ====================================
ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS pending_amount DECIMAL(10,2) DEFAULT 0.00;

-- ====================================
-- TRIGGER PARA ATUALIZAR VALORES DE PAGAMENTO
-- ====================================
CREATE OR REPLACE FUNCTION update_order_payment_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(10,2);
    v_order_total DECIMAL(10,2);
    v_discount DECIMAL(10,2);
BEGIN
    -- Calcular total de pagamentos
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid 
    FROM order_payments 
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    -- Buscar valor total do pedido
    SELECT total_value, COALESCE(discount, 0) INTO v_order_total, v_discount 
    FROM orders 
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    -- Atualizar pedido com valores calculados
    UPDATE orders SET 
        paid_amount = v_total_paid,
        pending_amount = GREATEST(0, (v_order_total - v_discount) - v_total_paid),
        payment_status = CASE 
            WHEN v_total_paid >= (v_order_total - v_discount) THEN 'Pago'
            WHEN v_total_paid > 0 THEN 'Parcial'
            ELSE 'Pendente'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger após INSERT
DROP TRIGGER IF EXISTS trigger_payment_insert ON order_payments;
CREATE TRIGGER trigger_payment_insert
    AFTER INSERT ON order_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_order_payment_totals();

-- Trigger após DELETE
DROP TRIGGER IF EXISTS trigger_payment_delete ON order_payments;
CREATE TRIGGER trigger_payment_delete
    AFTER DELETE ON order_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_order_payment_totals();

-- ====================================
-- ATUALIZAR PEDIDOS EXISTENTES
-- ====================================
-- Inicializar pending_amount para pedidos existentes
UPDATE orders SET 
    pending_amount = GREATEST(0, (total_value - COALESCE(discount, 0)) - COALESCE(paid_amount, 0))
WHERE pending_amount IS NULL OR pending_amount = 0;
