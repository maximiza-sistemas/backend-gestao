import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Criar pool direto com as credenciais
const pool = new Pool({
  host: '147.93.13.174',
  port: 5432,
  database: 'admin',
  user: 'alphatech',
  password: 'T1fpOr8Kw7KQEpU781gm9NWy7#',
  ssl: false
});

const runMigrations = async (): Promise<void> => {
  try {
    console.log('🚀 Iniciando migração do banco de dados...');

    // Testa a conexão primeiro
    console.log('📊 Testando conexão com o banco de dados...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Conexão com PostgreSQL estabelecida com sucesso!');
    console.log('🕒 Timestamp do servidor:', result.rows[0].now);

    // Lê o arquivo de schema
    const schemaPath = path.join(__dirname, '..', '..', 'src', 'database', 'schema.sql');

    // Executa o schema base (comentado para evitar duplicidade se já existir)
    // const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    // console.log('📋 Executando schema SQL...');
    // await pool.query(schemaSql);
    console.log('✅ Schema base verificado (pulado para evitar duplicidade).');

    // Executa migrações adicionais
    const migrationsDir = path.join(__dirname, '..', '..', 'src', 'database', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir).sort();

      for (const file of migrationFiles) {
        if (file.endsWith('.sql')) {
          console.log(`📋 Executando migração: ${file}...`);
          const migrationPath = path.join(migrationsDir, file);
          const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
          try {
            await pool.query(migrationSql);
            console.log(`✅ Migração ${file} concluída.`);
          } catch (error: any) {
            console.error('MIGRATION ERROR:');
            console.error(error.message);
            console.error(error.detail);
            console.error(error.table);
            console.error(error.column);
            process.exit(1);
          }
        }
      }
    }

    console.log('✅ Todas as migrações concluídas com sucesso!');
    console.log('📊 Banco de dados atualizado.');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    process.exit(1);
  }
};

// Executa as migrações se o script for chamado diretamente
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('🎉 Processo de migração finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha na migração:', error);
      process.exit(1);
    });
}

export default runMigrations;
