
import { OrderModel } from '../models/OrderModel';
import { FinancialModel } from '../models/FinancialModel';
import { ClientModel } from '../models/ClientModel';
import { pool } from '../config/database';

async function testOrderFinanceIntegration() {
    const orderModel = new OrderModel();
    const clientModel = new ClientModel();

    try {
        console.log('--- Iniciando Teste de Integração Vendas-Financeiro ---');

        // 1. Criar um cliente de teste
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

        // 2. Criar um pedido (Pagamento À Vista/Dinheiro)
        console.log('2. Criando pedido (À Vista)...');
        const orderData = {
            client_id: client.id,
            items: [
                { product_id: 1, quantity: 1, unit_price: 100 }
            ],
            total_value: 100,
            payment_method: 'Dinheiro',
            payment_status: 'Pago', // Já pago
            status: 'Pendente'
        };

        // Mocking createWithItems since we don't want to deal with full item creation complexity here if possible, 
        // but OrderModel.createWithItems is complex. Let's use a direct insert for simplicity or try to use the model if products exist.
        // Assuming product_id 1 exists. If not, this might fail. Let's check products first.
        const products = await pool.query('SELECT id FROM products LIMIT 1');
        let productId = 1;
        if (products.rows.length > 0) {
            productId = products.rows[0].id;
            orderData.items[0].product_id = productId;
        } else {
            console.log('AVISO: Nenhum produto encontrado. Pulando teste de criação de pedido via model.');
            return;
        }

        const orderResult = await orderModel.createWithItems(orderData as any);
        if (!orderResult.success || !orderResult.data) {
            throw new Error('Falha ao criar pedido');
        }
        const order = orderResult.data;
        console.log('Pedido criado:', order.id);

        // 3. Atualizar status para 'Entregue'
        console.log("3. Atualizando status para 'Entregue'...");
        await orderModel.updateStatus(order.id, 'Entregue');
        console.log('Status atualizado.');

        // 4. Verificar se a transação financeira foi criada
        console.log('4. Verificando transação financeira...');
        const transactions = await FinancialModel.findAllTransactions({
            date_from: new Date(new Date().setHours(0, 0, 0, 0)), // Hoje
            date_to: new Date(new Date().setHours(23, 59, 59, 999))
        });

        const transaction = transactions.find((t: any) => t.order_id === order.id);

        if (transaction) {
            console.log('SUCESSO: Transação financeira encontrada!');
            console.log('ID:', transaction.id);
            console.log('Valor:', transaction.amount);
            console.log('Conta:', transaction.account_name);
            console.log('Categoria:', transaction.category_name);
        } else {
            console.error('FALHA: Transação financeira NÃO encontrada.');
        }

        // Limpeza (Opcional, mas bom para não sujar muito o banco)
        // await pool.query('DELETE FROM orders WHERE id = $1', [order.id]);
        // await pool.query('DELETE FROM clients WHERE id = $1', [client.id]);

    } catch (error) {
        console.error('Erro no teste:', error);
    } finally {
        await pool.end();
    }
}

testOrderFinanceIntegration();
