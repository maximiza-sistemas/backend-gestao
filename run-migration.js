const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'gas_distributor',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

console.log('🔐 Conectando ao banco de dados:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER
});

async function runMigration() {
  const migrationPath = path.join(__dirname, 'src/database/migrations/003_add_delivery_routes.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    console.log('🔄 Executando migração de rotas de entrega...');
    await pool.query(sql);
    console.log('✅ Migração executada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
