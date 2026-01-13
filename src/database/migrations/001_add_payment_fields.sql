-- ====================================
-- MIGRAÇÃO: Adicionar campos de pagamento detalhados
-- Data: 2025-10-02
-- ====================================

-- Adicionar novas colunas na tabela orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_cash_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payment_term_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payment_installments INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS payment_due_date DATE;

-- Atualizar a constraint do payment_method para incluir os novos valores
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method IN ('Dinheiro', 'Pix', 'Prazo', 'Misto'));

-- Atualizar pedidos existentes com valores padrão
UPDATE orders 
SET payment_cash_amount = total_value,
    payment_term_amount = 0,
    payment_installments = 1
WHERE payment_method IS NULL OR payment_method IN ('Dinheiro', 'Pix');

UPDATE orders 
SET payment_cash_amount = 0,
    payment_term_amount = total_value,
    payment_installments = 1
WHERE payment_method = 'Prazo';

-- Comentário para documentação
COMMENT ON COLUMN orders.payment_cash_amount IS 'Valor pago à vista (Dinheiro ou Pix)';
COMMENT ON COLUMN orders.payment_term_amount IS 'Valor pago a prazo (parcelado)';
COMMENT ON COLUMN orders.payment_installments IS 'Número de parcelas para pagamento a prazo';
COMMENT ON COLUMN orders.payment_due_date IS 'Data de vencimento da primeira parcela';
