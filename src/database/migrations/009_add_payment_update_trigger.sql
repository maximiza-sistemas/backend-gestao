-- Migration: Adicionar trigger de UPDATE para pagamentos de pedidos
-- Criado em: 2026-02-07

-- ====================================
-- TRIGGER APÓS UPDATE EM ORDER_PAYMENTS
-- ====================================
-- A função update_order_payment_totals() já existe (migration 008)
-- e usa COALESCE(NEW.order_id, OLD.order_id), então funciona para UPDATE.
-- Basta criar o trigger para o evento UPDATE.

DROP TRIGGER IF EXISTS trigger_payment_update ON order_payments;
CREATE TRIGGER trigger_payment_update
    AFTER UPDATE ON order_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_order_payment_totals();

-- ====================================
-- EXPANDIR CHECK CONSTRAINT DO PAYMENT_METHOD
-- ====================================
-- A migration 008 só permite 'Dinheiro', 'Pix', 'Cartão'.
-- Precisamos permitir também 'Transferência' e 'Depósito'.
ALTER TABLE order_payments DROP CONSTRAINT IF EXISTS order_payments_payment_method_check;
ALTER TABLE order_payments ADD CONSTRAINT order_payments_payment_method_check 
    CHECK (payment_method IN ('Dinheiro', 'Pix', 'Cartão', 'Transferência', 'Depósito'));
