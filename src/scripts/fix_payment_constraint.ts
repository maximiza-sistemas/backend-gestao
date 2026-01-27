import { pool } from '../config/database';

async function fixPaymentConstraint() {
    try {
        console.log('=== Corrigindo Constraint payment_method ===\n');

        // 1. Remover constraint antiga
        console.log('1. Removendo constraint antiga...');
        await pool.query(`
      ALTER TABLE financial_transactions 
      DROP CONSTRAINT IF EXISTS financial_transactions_payment_method_check
    `);
        console.log('   ✅ Constraint removida');

        // 2. Adicionar nova constraint com todos os métodos
        console.log('\n2. Adicionando nova constraint...');
        await pool.query(`
      ALTER TABLE financial_transactions 
      ADD CONSTRAINT financial_transactions_payment_method_check 
      CHECK (payment_method IN ('Dinheiro', 'Pix', 'Transferência', 'Boleto', 'Cartão', 'Cheque', 'Prazo', 'Misto'))
    `);
        console.log('   ✅ Nova constraint criada com: Dinheiro, Pix, Transferência, Boleto, Cartão, Cheque, Prazo, Misto');

        // 3. Verificar nova constraint
        console.log('\n3. Verificando nova constraint:');
        const newConstraint = await pool.query(`
      SELECT pg_get_constraintdef(c.oid) as definition
      FROM pg_constraint c
      JOIN pg_class r ON c.conrelid = r.oid
      WHERE r.relname = 'financial_transactions' 
        AND c.conname = 'financial_transactions_payment_method_check'
    `);

        if (newConstraint.rows.length > 0) {
            console.log(`   ${newConstraint.rows[0].definition}`);
        }

        console.log('\n=== Correção Concluída! ===');

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

fixPaymentConstraint();
