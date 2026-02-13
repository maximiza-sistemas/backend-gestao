
import { pool } from '../config/database';
import * as fs from 'fs';

async function main() {
    const lines: string[] = [];
    try {
        const report = await pool.query(`
            SELECT o.id as order_id, c.name, p.name as product, oi.quantity, oi.total_price, o.order_date
            FROM orders o JOIN clients c ON c.id = o.client_id
            JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id
            WHERE LOWER(c.name) LIKE '%mousinho%' AND o.order_date BETWEEN '2026-02-01' AND '2026-02-10'
            ORDER BY o.order_date
        `);
        lines.push('=== REPORT ROWS (order IDs) ===');
        for (const r of report.rows) {
            lines.push(`ORDER_ID=${r.order_id} product=${r.product} qty=${r.quantity} total=${r.total_price} date=${r.order_date}`);
        }

        const op = await pool.query(`
            SELECT op.id, op.order_id, op.amount, op.payment_date
            FROM order_payments op JOIN orders o ON o.id = op.order_id
            JOIN clients c ON c.id = o.client_id WHERE LOWER(c.name) LIKE '%mousinho%'
        `);
        lines.push('\n=== ORDER_PAYMENTS ===');
        for (const r of op.rows) {
            lines.push(`PAY id=${r.id} order_id=${r.order_id} amount=${r.amount} date=${r.payment_date}`);
        }

        const recv = await pool.query(`
            SELECT r.id, r.order_id, r.amount, r.paid_amount, r.issue_date
            FROM receivables r JOIN clients c ON c.id = r.client_id
            WHERE LOWER(c.name) LIKE '%mousinho%'
        `);
        lines.push('\n=== RECEIVABLES ===');
        for (const r of recv.rows) {
            lines.push(`RECV id=${r.id} order_id=${r.order_id} amount=${r.amount} paid=${r.paid_amount} date=${r.issue_date}`);
        }

        const orderIds = report.rows.map((r: any) => r.order_id);
        lines.push('\n=== MATCH CHECK ===');
        lines.push('Report order IDs: ' + orderIds.join(', '));
        const payOrderIds = op.rows.map((r: any) => r.order_id);
        lines.push('Payment order IDs: ' + payOrderIds.join(', '));
        const match = payOrderIds.filter((id: number) => orderIds.includes(id));
        lines.push('Matching IDs: ' + (match.length > 0 ? match.join(', ') : 'NONE'));

    } catch (error) {
        lines.push('ERROR: ' + error);
    } finally {
        await pool.end();
        fs.writeFileSync('check_paid_output.txt', lines.join('\n'));
        console.log('Output written to check_paid_output.txt');
    }
}

main();
