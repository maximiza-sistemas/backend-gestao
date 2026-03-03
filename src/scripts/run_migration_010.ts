import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

const runMigration = async () => {
    const client = await pool.connect();
    try {
        const sqlPath = path.join(__dirname, '..', 'database', 'migrations', '010_add_receipt_and_fix_constraints.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🔄 Executando migração 010_add_receipt_and_fix_constraints...');
        await client.query(sql);
        console.log('✅ Migração executada com sucesso!');
    } catch (error) {
        console.error('❌ Erro na migração:', error);
    } finally {
        client.release();
        process.exit();
    }
};

runMigration();
