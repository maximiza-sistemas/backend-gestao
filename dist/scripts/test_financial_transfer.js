"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FinancialModel_1 = require("../models/FinancialModel");
const database_1 = require("../config/database");
async function testTransfer() {
    console.log('--- Iniciando Teste de Transferência ---');
    try {
        console.log('1. Criando contas de teste...');
        const sourceAccount = await FinancialModel_1.FinancialModel.createAccount({
            name: 'Conta Origem Teste',
            type: 'Banco',
            initial_balance: 1000
        });
        console.log('Conta Origem criada:', sourceAccount.id, 'Saldo:', sourceAccount.current_balance);
        const destAccount = await FinancialModel_1.FinancialModel.createAccount({
            name: 'Conta Destino Teste',
            type: 'Banco',
            initial_balance: 0
        });
        console.log('Conta Destino criada:', destAccount.id, 'Saldo:', destAccount.current_balance);
        console.log('\n2. Criando Transferência de R$ 100.00...');
        const transfer = await FinancialModel_1.FinancialModel.createTransaction({
            type: 'Transferência',
            account_id: sourceAccount.id,
            destination_account_id: destAccount.id,
            amount: 100,
            description: 'Teste Transferência',
            transaction_date: new Date(),
            due_date: new Date(),
            payment_date: new Date(),
            status: 'Pago',
            payment_method: 'Transferência'
        }, 1);
        console.log('Transação criada:', transfer.id, 'Status:', transfer.status);
        console.log('\n3. Verificando saldos após transferência...');
        const sourceAfter = await FinancialModel_1.FinancialModel.findAccountById(sourceAccount.id);
        const destAfter = await FinancialModel_1.FinancialModel.findAccountById(destAccount.id);
        console.log('Saldo Origem (Esperado 900):', sourceAfter?.current_balance);
        console.log('Saldo Destino (Esperado 100):', destAfter?.current_balance);
        if (Number(sourceAfter?.current_balance) === 900 && Number(destAfter?.current_balance) === 100) {
            console.log('✅ Saldos atualizados corretamente!');
        }
        else {
            console.error('❌ Erro na atualização de saldos!');
            process.exit(1);
        }
        console.log('\n4. Estornando (Mudando para Pendente)...');
        await FinancialModel_1.FinancialModel.updateTransactionStatus(transfer.id, 'Pendente');
        const sourceReverted = await FinancialModel_1.FinancialModel.findAccountById(sourceAccount.id);
        const destReverted = await FinancialModel_1.FinancialModel.findAccountById(destAccount.id);
        console.log('Saldo Origem (Esperado 1000):', sourceReverted?.current_balance);
        console.log('Saldo Destino (Esperado 0):', destReverted?.current_balance);
        if (Number(sourceReverted?.current_balance) === 1000 && Number(destReverted?.current_balance) === 0) {
            console.log('✅ Saldos estornados corretamente!');
        }
        else {
            console.error('❌ Erro no estorno de saldos!');
            process.exit(1);
        }
    }
    catch (error) {
        console.error('Erro no teste:', error);
        process.exit(1);
    }
    finally {
        await database_1.pool.end();
    }
}
testTransfer();
//# sourceMappingURL=test_financial_transfer.js.map