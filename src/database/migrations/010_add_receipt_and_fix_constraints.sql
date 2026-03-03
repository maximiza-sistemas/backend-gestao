-- Migration: Adicionar coluna receipt_file e corrigir CHECK constraint de payment_method
-- Criado em: 2026-03-03

-- ====================================
-- GARANTIR COLUNA RECEIPT_FILE
-- ====================================
-- A coluna pode já existir se migration_payment_receipt.ts foi executada.
-- Usar DO block para idempotência segura.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_payments' AND column_name = 'receipt_file'
    ) THEN
        ALTER TABLE order_payments ADD COLUMN receipt_file VARCHAR(255);
        RAISE NOTICE 'Coluna receipt_file adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna receipt_file já existe';
    END IF;
END
$$;

-- ====================================
-- CORRIGIR CHECK CONSTRAINT DE PAYMENT_METHOD
-- ====================================
-- Adicionar 'Entrada' como método válido para pagamentos parciais (entrada em vendas a prazo)
ALTER TABLE order_payments DROP CONSTRAINT IF EXISTS order_payments_payment_method_check;
ALTER TABLE order_payments ADD CONSTRAINT order_payments_payment_method_check 
    CHECK (payment_method IN ('Dinheiro', 'Pix', 'Cartão', 'Transferência', 'Depósito', 'Entrada'));
