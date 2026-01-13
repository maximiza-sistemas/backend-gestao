"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const database_1 = require("../config/database");
async function syncSales() {
    const client = await database_1.pool.connect();
    try {
        console.log('Iniciando sincronização de vendas...');
        const query = `
      SELECT o.* 
      FROM orders o
      LEFT JOIN financial_transactions ft ON o.id = ft.order_id
      WHERE o.status = 'Entregue' 
      AND ft.id IS NULL
    `;
        const result = await client.query(query);
        console.log(`Encontrados ${result.rows.length} pedidos entregues sem transação financeira.`);
        if (result.rows.length === 0) {
            console.log('Nenhuma sincronização necessária.');
            return;
        }
        let accountId;
        const accountResult = await client.query("SELECT id FROM financial_accounts WHERE name = 'Caixa Gaveta' LIMIT 1");
        if (accountResult.rows.length > 0) {
            accountId = accountResult.rows[0].id;
        }
        else {
            const newAccount = await client.query(`INSERT INTO financial_accounts (name, type, initial_balance, current_balance, is_active)
         VALUES ('Caixa Gaveta', 'Caixa', 0, 0, true)
         RETURNING id`);
            accountId = newAccount.rows[0].id;
        }
        let categoryId;
        const categoryResult = await client.query("SELECT id FROM financial_categories WHERE name = 'Vendas' AND type = 'Receita' LIMIT 1");
        if (categoryResult.rows.length > 0) {
            categoryId = categoryResult.rows[0].id;
        }
        else {
            const newCategory = await client.query(`INSERT INTO financial_categories (name, type, description, color, icon, is_active)
         VALUES ('Vendas', 'Receita', 'Receita de Vendas', '#10B981', 'fas fa-shopping-cart', true)
         RETURNING id`);
            categoryId = newCategory.rows[0].id;
        }
        for (const order of result.rows) {
            const isPaid = order.payment_status !== 'Pendente';
            const transactionStatus = isPaid ? 'Pago' : 'Pendente';
            const paymentDate = isPaid ? new Date() : null;
            const transactionCode = `TRN${Date.now()}_${order.id}`;
            await client.query(`INSERT INTO financial_transactions (
          transaction_code, type, category_id, account_id,
          order_id, client_id, description, amount, payment_method,
          transaction_date, due_date, payment_date, status, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [
                transactionCode,
                'Receita',
                categoryId,
                accountId,
                order.id,
                order.client_id,
                `Venda - Pedido #${order.id}`,
                order.total_value,
                order.payment_method,
                order.order_date,
                order.order_date,
                paymentDate,
                transactionStatus,
                order.user_id || null
            ]);
            if (isPaid) {
                await client.query(`UPDATE financial_accounts 
           SET current_balance = current_balance + $1 
           WHERE id = $2`, [order.total_value, accountId]);
            }
            console.log(`Transação criada para pedido #${order.id} (${transactionStatus})`);
        }
        console.log('Sincronização concluída com sucesso!');
    }
    catch (error) {
        console.error('Erro ao sincronizar vendas:', error);
    }
    finally {
        client.release();
    }
}
syncSales();
//# sourceMappingURL=sync_sales.js.map