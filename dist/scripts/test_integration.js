"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const OrderModel_1 = require("../models/OrderModel");
const FinancialModel_1 = require("../models/FinancialModel");
const ClientModel_1 = require("../models/ClientModel");
const database_1 = require("../config/database");
async function testOrderFinanceIntegration() {
    const orderModel = new OrderModel_1.OrderModel();
    const clientModel = new ClientModel_1.ClientModel();
    try {
        console.log('--- Iniciando Teste de Integração Vendas-Financeiro ---');
        console.log('1. Criando cliente de teste...');
        const clientResult = await clientModel.create({
            name: 'Cliente Teste Integração',
            type: 'Residencial',
            contact: '999999999',
            address: 'Rua Teste, 123',
            status: 'Ativo'
        });
        if (!clientResult.success || !clientResult.data) {
            throw new Error('Falha ao criar cliente');
        }
        const client = clientResult.data;
        console.log('Cliente criado:', client.id);
        console.log('2. Criando pedido (À Vista)...');
        const orderData = {
            client_id: client.id,
            items: [
                { product_id: 1, quantity: 1, unit_price: 100 }
            ],
            total_value: 100,
            payment_method: 'Dinheiro',
            payment_status: 'Pago',
            status: 'Pendente'
        };
        const products = await database_1.pool.query('SELECT id FROM products LIMIT 1');
        let productId = 1;
        if (products.rows.length > 0) {
            productId = products.rows[0].id;
            orderData.items[0].product_id = productId;
        }
        else {
            console.log('AVISO: Nenhum produto encontrado. Pulando teste de criação de pedido via model.');
            return;
        }
        const orderResult = await orderModel.createWithItems(orderData);
        if (!orderResult.success || !orderResult.data) {
            throw new Error('Falha ao criar pedido');
        }
        const order = orderResult.data;
        console.log('Pedido criado:', order.id);
        console.log("3. Atualizando status para 'Entregue'...");
        await orderModel.updateStatus(order.id, 'Entregue');
        console.log('Status atualizado.');
        console.log('4. Verificando transação financeira...');
        const transactions = await FinancialModel_1.FinancialModel.findAllTransactions({
            date_from: new Date(new Date().setHours(0, 0, 0, 0)),
            date_to: new Date(new Date().setHours(23, 59, 59, 999))
        });
        const transaction = transactions.find((t) => t.order_id === order.id);
        if (transaction) {
            console.log('SUCESSO: Transação financeira encontrada!');
            console.log('ID:', transaction.id);
            console.log('Valor:', transaction.amount);
            console.log('Conta:', transaction.account_name);
            console.log('Categoria:', transaction.category_name);
        }
        else {
            console.error('FALHA: Transação financeira NÃO encontrada.');
        }
    }
    catch (error) {
        console.error('Erro no teste:', error);
    }
    finally {
        await database_1.pool.end();
    }
}
testOrderFinanceIntegration();
//# sourceMappingURL=test_integration.js.map