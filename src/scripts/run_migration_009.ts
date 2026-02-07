import { pool } from '../config/database';
import fs from 'fs';
import path from 'path';

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, '../database/migrations/009_add_payment_update_trigger.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await pool.query(sql);
        console.log('✅ Migration 009 executada com sucesso!');
    } catch (error: any) {
        console.error('❌ Erro ao executar migration:', error.message);
    } finally {
        await pool.end();
    }
}

runMigration();
