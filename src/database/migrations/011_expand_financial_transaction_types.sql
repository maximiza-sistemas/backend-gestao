-- Migration: Expand financial_transactions.type to support new frontend types
-- Criado em: 2026-04-13
--
-- Frontend (Financeiro.tsx) passou a enviar tipos adicionais:
--   'Receita', 'Despesas Diversas', 'Transferência', 'Contas a Receber',
--   'Retirada pelo Proprietário', 'Venda no Vale', 'Venda no Cartão', 'Venda no Pix'
--
-- Antes:
--   - type VARCHAR(20) NOT NULL CHECK (type IN ('Receita','Despesa','Transferência'))
--   - 'Retirada pelo Proprietário' (26 chars) estourava VARCHAR(20)
--   - 'Despesas Diversas', 'Contas a Receber', 'Venda no ...' quebravam o CHECK
-- O trigger update_account_balance também precisa conhecer os novos tipos
-- para debitar/creditar a conta corretamente.

-- ====================================
-- 1. EXPANDIR COLUNA TYPE
-- ====================================
ALTER TABLE financial_transactions
    ALTER COLUMN type TYPE VARCHAR(40);

ALTER TABLE financial_categories
    ALTER COLUMN type TYPE VARCHAR(40);

-- ====================================
-- 2. ATUALIZAR CHECK CONSTRAINT DE TYPE
-- ====================================
ALTER TABLE financial_transactions
    DROP CONSTRAINT IF EXISTS financial_transactions_type_check;

ALTER TABLE financial_transactions
    ADD CONSTRAINT financial_transactions_type_check
    CHECK (type IN (
        'Receita',
        'Despesa',
        'Despesas Diversas',
        'Transferência',
        'Depósito',
        'Contas a Receber',
        'Retirada pelo Proprietário',
        'Venda no Vale',
        'Venda no Cartão',
        'Venda no Pix'
    ));

-- financial_categories também precisa aceitar os novos rótulos
ALTER TABLE financial_categories
    DROP CONSTRAINT IF EXISTS financial_categories_type_check;

ALTER TABLE financial_categories
    ADD CONSTRAINT financial_categories_type_check
    CHECK (type IN (
        'Receita',
        'Despesa',
        'Despesas Diversas',
        'Transferência',
        'Contas a Receber',
        'Retirada pelo Proprietário',
        'Venda no Vale',
        'Venda no Cartão',
        'Venda no Pix'
    ));

-- ====================================
-- 3. ATUALIZAR TRIGGER DE SALDO
-- ====================================
-- Precisamos classificar os novos tipos como entrada/saída/transferência
-- para que o saldo da conta seja atualizado corretamente.
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    income_types TEXT[] := ARRAY[
        'Receita',
        'Contas a Receber',
        'Venda no Vale',
        'Venda no Cartão',
        'Venda no Pix',
        'Depósito'
    ];
    expense_types TEXT[] := ARRAY[
        'Despesa',
        'Despesas Diversas',
        'Retirada pelo Proprietário'
    ];
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'Pago' THEN
            IF NEW.type = ANY(income_types) THEN
                UPDATE financial_accounts
                SET current_balance = current_balance + NEW.amount
                WHERE id = NEW.account_id;
            ELSIF NEW.type = ANY(expense_types) THEN
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
    ELSIF TG_OP = 'UPDATE' THEN
        -- Reverter transação antiga se estava paga
        IF OLD.status = 'Pago' THEN
            IF OLD.type = ANY(income_types) THEN
                UPDATE financial_accounts
                SET current_balance = current_balance - OLD.amount
                WHERE id = OLD.account_id;
            ELSIF OLD.type = ANY(expense_types) THEN
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
            IF NEW.type = ANY(income_types) THEN
                UPDATE financial_accounts
                SET current_balance = current_balance + NEW.amount
                WHERE id = NEW.account_id;
            ELSIF NEW.type = ANY(expense_types) THEN
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
