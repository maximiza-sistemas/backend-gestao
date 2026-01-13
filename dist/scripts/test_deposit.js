"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FinancialModel_1 = require("../models/FinancialModel");
const database_1 = require("../config/database");
async function testDeposit() {
    try {
        console.log('Iniciando teste de Depósito...');
        let caixa = (await FinancialModel_1.FinancialModel.findAllAccounts()).find(a => a.name === 'Caixa Gaveta Teste');
        if (!caixa) {
            caixa = await FinancialModel_1.FinancialModel.createAccount({
                name: 'Caixa Gaveta Teste',
                type: 'Caixa',
                initial_balance: 1000,
                current_balance: 1000
            });
            console.log('Conta Caixa criada:', caixa);
        }
        else {
            await database_1.pool.query('UPDATE financial_accounts SET current_balance = 1000 WHERE id = $1', [caixa.id]);
            caixa.current_balance = 1000;
            console.log('Conta Caixa resetada:', caixa);
        }
        let banco = (await FinancialModel_1.FinancialModel.findAllAccounts()).find(a => a.name === 'Banco Teste');
        if (!banco) {
            banco = await FinancialModel_1.FinancialModel.createAccount({
                name: 'Banco Teste',
                type: 'Banco',
                initial_balance: 0,
                current_balance: 0
            });
            console.log('Conta Banco criada:', banco);
        }
        else {
            await database_1.pool.query('UPDATE financial_accounts SET current_balance = 0 WHERE id = $1', [banco.id]);
            banco.current_balance = 0;
            console.log('Conta Banco resetada:', banco);
        }
        const depositAmount = 200;
        console.log(`Criando depósito de R$ ${depositAmount} de Caixa para Banco...`);
        const transaction = await FinancialModel_1.FinancialModel.createTransaction({
            type: 'Depósito',
            account_id: caixa.id,
            destination_account_id: banco.id,
            amount: depositAmount,
            description: 'Depósito Teste',
            transaction_date: new Date(),
            status: 'Pago',
            payment_method: 'Dinheiro'
        }, 1);
        console.log('Transação criada:', transaction);
        const updatedCaixa = await FinancialModel_1.FinancialModel.findAccountById(caixa.id);
        const updatedBanco = await FinancialModel_1.FinancialModel.findAccountById(banco.id);
        console.log('Saldo Caixa (Esperado: 800):', updatedCaixa?.current_balance);
        console.log('Saldo Banco (Esperado: 200):', updatedBanco?.current_balance);
        if (Number(updatedCaixa?.current_balance) === 800 && Number(updatedBanco?.current_balance) === 200) {
            console.log('SUCESSO: Saldos atualizados corretamente!');
        }
        else {
            console.error('FALHA: Saldos incorretos.');
        }
    }
    catch (error) {
        console.error('Erro no teste:', error);
    }
    finally {
        await database_1.pool.end();
    }
}
testDeposit();
//# sourceMappingURL=test_deposit.js.map