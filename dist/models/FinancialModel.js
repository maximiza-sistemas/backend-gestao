"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialModel = void 0;
const database_1 = require("../config/database");
class FinancialModel {
    static async query(text, params) {
        return database_1.pool.query(text, params);
    }
    static async findAllCategories(type) {
        let query = 'SELECT * FROM financial_categories WHERE is_active = true';
        const params = [];
        if (type) {
            query += ' AND type = $1';
            params.push(type);
        }
        query += ' ORDER BY type, name';
        const result = await this.query(query, params);
        return result.rows;
    }
    static async createCategory(data) {
        const result = await this.query(`INSERT INTO financial_categories (name, type, description, color, icon)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`, [data.name, data.type, data.description, data.color, data.icon]);
        return result.rows[0];
    }
    static async findAllAccounts() {
        const result = await this.query('SELECT * FROM financial_accounts WHERE is_active = true ORDER BY name');
        return result.rows;
    }
    static async findAccountById(id) {
        const result = await this.query('SELECT * FROM financial_accounts WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    static async createAccount(data) {
        const result = await this.query(`INSERT INTO financial_accounts (name, type, bank_name, account_number, agency, initial_balance, current_balance)
             VALUES ($1, $2, $3, $4, $5, $6, $6)
             RETURNING *`, [data.name, data.type, data.bank_name, data.account_number, data.agency, data.initial_balance || 0]);
        return result.rows[0];
    }
    static async updateAccountBalance(id, amount) {
        await this.query('UPDATE financial_accounts SET current_balance = current_balance + $1 WHERE id = $2', [amount, id]);
    }
    static async findAllTransactions(filters) {
        let query = `
            SELECT 
                t.*,
                c.name as category_name,
                c.color as category_color,
                c.icon as category_icon,
                a.name as account_name,
                a.type as account_type,
                da.name as destination_account_name,
                cl.name as client_name,
                u.name as user_name
            FROM financial_transactions t
            LEFT JOIN financial_categories c ON t.category_id = c.id
            LEFT JOIN financial_accounts a ON t.account_id = a.id
            LEFT JOIN financial_accounts da ON t.destination_account_id = da.id
            LEFT JOIN clients cl ON t.client_id = cl.id
            LEFT JOIN users u ON t.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        if (filters) {
            if (filters.type) {
                query += ` AND t.type = $${paramIndex}`;
                params.push(filters.type);
                paramIndex++;
            }
            if (filters.status) {
                query += ` AND t.status = $${paramIndex}`;
                params.push(filters.status);
                paramIndex++;
            }
            if (filters.category_id) {
                query += ` AND t.category_id = $${paramIndex}`;
                params.push(filters.category_id);
                paramIndex++;
            }
            if (filters.account_id) {
                query += ` AND t.account_id = $${paramIndex}`;
                params.push(filters.account_id);
                paramIndex++;
            }
            if (filters.client_id) {
                query += ` AND t.client_id = $${paramIndex}`;
                params.push(filters.client_id);
                paramIndex++;
            }
            if (filters.date_from) {
                query += ` AND t.transaction_date::date >= $${paramIndex}`;
                params.push(filters.date_from);
                paramIndex++;
            }
            if (filters.date_to) {
                query += ` AND t.transaction_date::date <= $${paramIndex}`;
                params.push(filters.date_to);
                paramIndex++;
            }
        }
        query += ' ORDER BY t.transaction_date DESC, t.created_at DESC';
        const result = await this.query(query, params);
        return result.rows.map((row) => ({
            ...row,
            category: row.category_id ? {
                id: row.category_id,
                name: row.category_name,
                color: row.category_color,
                icon: row.category_icon
            } : undefined,
            account: {
                id: row.account_id,
                name: row.account_name,
                type: row.account_type
            },
            destination_account: row.destination_account_id ? {
                id: row.destination_account_id,
                name: row.destination_account_name
            } : undefined,
            client: row.client_id ? {
                id: row.client_id,
                name: row.client_name
            } : undefined,
            user: row.user_id ? {
                id: row.user_id,
                name: row.user_name
            } : undefined
        }));
    }
    static async findTransactionById(id) {
        const result = await this.query(`SELECT 
                t.*,
                c.name as category_name,
                c.color as category_color,
                c.icon as category_icon,
                a.name as account_name,
                a.type as account_type,
                da.name as destination_account_name,
                cl.name as client_name,
                u.name as user_name
            FROM financial_transactions t
            LEFT JOIN financial_categories c ON t.category_id = c.id
            LEFT JOIN financial_accounts a ON t.account_id = a.id
            LEFT JOIN financial_accounts da ON t.destination_account_id = da.id
            LEFT JOIN clients cl ON t.client_id = cl.id
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.id = $1`, [id]);
        if (result.rows.length === 0)
            return null;
        const row = result.rows[0];
        return {
            ...row,
            category: row.category_id ? {
                id: row.category_id,
                name: row.category_name,
                color: row.category_color,
                icon: row.category_icon
            } : undefined,
            account: {
                id: row.account_id,
                name: row.account_name,
                type: row.account_type
            },
            destination_account: row.destination_account_id ? {
                id: row.destination_account_id,
                name: row.destination_account_name
            } : undefined,
            client: row.client_id ? {
                id: row.client_id,
                name: row.client_name
            } : undefined,
            user: row.user_id ? {
                id: row.user_id,
                name: row.user_name
            } : undefined
        };
    }
    static async createTransaction(data, userId) {
        const transactionCode = `TRN${Date.now()}`;
        const client = await database_1.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await client.query(`INSERT INTO financial_transactions (
                    transaction_code, type, category_id, account_id, destination_account_id,
                    order_id, client_id, supplier_id, description, amount, payment_method,
                    transaction_date, due_date, payment_date, status, installment_number,
                    total_installments, parent_transaction_id, reference_number, notes,
                    attachment_url, user_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
                RETURNING *`, [
                transactionCode,
                data.type,
                data.category_id,
                data.account_id,
                data.destination_account_id,
                data.order_id,
                data.client_id,
                data.supplier_id,
                data.description,
                data.amount,
                data.payment_method,
                data.transaction_date,
                data.due_date,
                data.payment_date,
                data.status || 'Pendente',
                data.installment_number,
                data.total_installments,
                data.parent_transaction_id,
                data.reference_number,
                data.notes,
                data.attachment_url,
                userId
            ]);
            const transaction = result.rows[0];
            if (transaction.status === 'Pago') {
                if (transaction.type === 'Receita') {
                    await client.query('UPDATE financial_accounts SET current_balance = current_balance + $1 WHERE id = $2', [transaction.amount, transaction.account_id]);
                }
                else if (transaction.type === 'Despesa') {
                    await client.query('UPDATE financial_accounts SET current_balance = current_balance - $1 WHERE id = $2', [transaction.amount, transaction.account_id]);
                }
                else if (transaction.type === 'Transferência' || transaction.type === 'Depósito') {
                    await client.query('UPDATE financial_accounts SET current_balance = current_balance - $1 WHERE id = $2', [transaction.amount, transaction.account_id]);
                    if (transaction.destination_account_id) {
                        await client.query('UPDATE financial_accounts SET current_balance = current_balance + $1 WHERE id = $2', [transaction.amount, transaction.destination_account_id]);
                    }
                }
            }
            await client.query('COMMIT');
            return this.findTransactionById(transaction.id);
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    static async updateTransaction(id, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        const updateableFields = [
            'type', 'category_id', 'account_id', 'destination_account_id',
            'description', 'amount', 'payment_method', 'transaction_date',
            'due_date', 'payment_date', 'status', 'reference_number', 'notes'
        ];
        for (const field of updateableFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = $${paramIndex}`);
                values.push(data[field]);
                paramIndex++;
            }
        }
        if (fields.length === 0) {
            throw new Error('Nenhum campo para atualizar');
        }
        values.push(id);
        await this.query(`UPDATE financial_transactions SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
        return this.findTransactionById(id);
    }
    static async deleteTransaction(id) {
        await this.query('DELETE FROM financial_transactions WHERE id = $1', [id]);
    }
    static async updateTransactionStatus(id, status, paymentDate) {
        const client = await database_1.pool.connect();
        try {
            await client.query('BEGIN');
            const currentTransactionResult = await client.query('SELECT * FROM financial_transactions WHERE id = $1', [id]);
            if (currentTransactionResult.rows.length === 0) {
                throw new Error('Transação não encontrada');
            }
            const transaction = currentTransactionResult.rows[0];
            const oldStatus = transaction.status;
            const query = paymentDate
                ? 'UPDATE financial_transactions SET status = $1, payment_date = $2 WHERE id = $3'
                : 'UPDATE financial_transactions SET status = $1 WHERE id = $2';
            const params = paymentDate ? [status, paymentDate, id] : [status, id];
            await client.query(query, params);
            if (oldStatus !== 'Pago' && status === 'Pago') {
                if (transaction.type === 'Receita') {
                    await client.query('UPDATE financial_accounts SET current_balance = current_balance + $1 WHERE id = $2', [transaction.amount, transaction.account_id]);
                }
                else if (transaction.type === 'Despesa') {
                    await client.query('UPDATE financial_accounts SET current_balance = current_balance - $1 WHERE id = $2', [transaction.amount, transaction.account_id]);
                }
                else if (transaction.type === 'Transferência' || transaction.type === 'Depósito') {
                    await client.query('UPDATE financial_accounts SET current_balance = current_balance - $1 WHERE id = $2', [transaction.amount, transaction.account_id]);
                    if (transaction.destination_account_id) {
                        await client.query('UPDATE financial_accounts SET current_balance = current_balance + $1 WHERE id = $2', [transaction.amount, transaction.destination_account_id]);
                    }
                }
            }
            else if (oldStatus === 'Pago' && status !== 'Pago') {
                if (transaction.type === 'Receita') {
                    await client.query('UPDATE financial_accounts SET current_balance = current_balance - $1 WHERE id = $2', [transaction.amount, transaction.account_id]);
                }
                else if (transaction.type === 'Despesa') {
                    await client.query('UPDATE financial_accounts SET current_balance = current_balance + $1 WHERE id = $2', [transaction.amount, transaction.account_id]);
                }
                else if (transaction.type === 'Transferência' || transaction.type === 'Depósito') {
                    await client.query('UPDATE financial_accounts SET current_balance = current_balance + $1 WHERE id = $2', [transaction.amount, transaction.account_id]);
                    if (transaction.destination_account_id) {
                        await client.query('UPDATE financial_accounts SET current_balance = current_balance - $1 WHERE id = $2', [transaction.amount, transaction.destination_account_id]);
                    }
                }
            }
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    static async getFinancialSummary(filters) {
        let periodWhere = 'WHERE 1=1';
        const periodParams = [];
        let periodParamIndex = 1;
        if (filters) {
            if (filters.date_from) {
                periodWhere += ` AND transaction_date::date >= $${periodParamIndex}`;
                periodParams.push(filters.date_from);
                periodParamIndex++;
            }
            if (filters.date_to) {
                periodWhere += ` AND transaction_date::date <= $${periodParamIndex}`;
                periodParams.push(filters.date_to);
                periodParamIndex++;
            }
            if (filters.account_id) {
                periodWhere += ` AND account_id = $${periodParamIndex}`;
                periodParams.push(filters.account_id);
                periodParamIndex++;
            }
        }
        const periodQuery = `
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'Receita' AND status = 'Pago' THEN amount ELSE 0 END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN type = 'Despesa' AND status = 'Pago' THEN amount ELSE 0 END), 0) as total_expenses
            FROM financial_transactions
            ${periodWhere}
        `;
        let balanceWhere = '';
        const balanceParams = [];
        if (filters?.account_id) {
            balanceWhere = 'WHERE id = $1';
            balanceParams.push(filters.account_id);
        }
        const balanceQuery = `SELECT COALESCE(SUM(current_balance), 0) as total_balance FROM financial_accounts ${balanceWhere}`;
        let pendingWhere = 'WHERE 1=1';
        const pendingParams = [];
        let pendingParamIndex = 1;
        if (filters?.account_id) {
            pendingWhere += ` AND account_id = $${pendingParamIndex}`;
            pendingParams.push(filters.account_id);
            pendingParamIndex++;
        }
        const pendingQuery = `
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'Receita' AND status = 'Pendente' THEN amount ELSE 0 END), 0) as pending_revenue,
                COALESCE(SUM(CASE WHEN type = 'Despesa' AND status = 'Pendente' THEN amount ELSE 0 END), 0) as pending_expenses,
                COALESCE(SUM(CASE WHEN status = 'Vencido' THEN amount ELSE 0 END), 0) as overdue_amount
            FROM financial_transactions
            ${pendingWhere}
        `;
        const [periodResult, balanceResult, pendingResult] = await Promise.all([
            this.query(periodQuery, periodParams),
            this.query(balanceQuery, balanceParams),
            this.query(pendingQuery, pendingParams)
        ]);
        const periodRow = periodResult.rows[0];
        const balanceRow = balanceResult.rows[0];
        const pendingRow = pendingResult.rows[0];
        return {
            total_revenue: parseFloat(periodRow.total_revenue),
            total_expenses: parseFloat(periodRow.total_expenses),
            balance: parseFloat(balanceRow.total_balance),
            pending_revenue: parseFloat(pendingRow.pending_revenue),
            pending_expenses: parseFloat(pendingRow.pending_expenses),
            overdue_amount: parseFloat(pendingRow.overdue_amount)
        };
    }
    static async getCashFlow(startDate, endDate) {
        const query = `
            SELECT 
                DATE(transaction_date) as date,
                SUM(CASE WHEN type = 'Receita' AND status = 'Pago' THEN amount ELSE 0 END) as revenue,
                SUM(CASE WHEN type = 'Despesa' AND status = 'Pago' THEN amount ELSE 0 END) as expenses
            FROM financial_transactions
            WHERE transaction_date::date BETWEEN $1 AND $2
            GROUP BY DATE(transaction_date)
            ORDER BY date
        `;
        const result = await this.query(query, [startDate, endDate]);
        return result.rows.map((row) => ({
            date: row.date,
            revenue: parseFloat(row.revenue),
            expenses: parseFloat(row.expenses),
            balance: parseFloat(row.revenue) - parseFloat(row.expenses)
        }));
    }
    static async getCategoryBreakdown(type, startDate, endDate) {
        let query = `
            SELECT 
                c.id,
                c.name,
                c.color,
                c.icon,
                COALESCE(SUM(t.amount), 0) as total,
                COUNT(t.id) as count
            FROM financial_categories c
            LEFT JOIN financial_transactions t ON c.id = t.category_id AND t.status = 'Pago'
            WHERE c.type = $1 AND c.is_active = true
        `;
        const params = [type];
        let paramIndex = 2;
        if (startDate) {
            query += ` AND (t.transaction_date::date >= $${paramIndex} OR t.transaction_date IS NULL)`;
            params.push(startDate);
            paramIndex++;
        }
        if (endDate) {
            query += ` AND (t.transaction_date::date <= $${paramIndex} OR t.transaction_date IS NULL)`;
            params.push(endDate);
            paramIndex++;
        }
        query += ' GROUP BY c.id, c.name, c.color, c.icon ORDER BY total DESC';
        const result = await this.query(query, params);
        return result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            color: row.color,
            icon: row.icon,
            total: parseFloat(row.total),
            count: parseInt(row.count)
        }));
    }
}
exports.FinancialModel = FinancialModel;
//# sourceMappingURL=FinancialModel.js.map