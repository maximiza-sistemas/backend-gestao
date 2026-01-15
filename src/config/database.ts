import { Pool, PoolConfig, types } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configurar node-postgres para retornar datas como strings (evita problemas de timezone)
// Tipo 1082 = DATE, Tipo 1114 = TIMESTAMP WITHOUT TIME ZONE, Tipo 1184 = TIMESTAMP WITH TIME ZONE
types.setTypeParser(1082, (val: string) => val); // DATE - retorna como string YYYY-MM-DD
types.setTypeParser(1114, (val: string) => val); // TIMESTAMP WITHOUT TIMEZONE
types.setTypeParser(1184, (val: string) => val); // TIMESTAMP WITH TIMEZONE

const dbConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // máximo de conexões no pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: false // desabilitado conforme a connection string
};

// Pool de conexões
export const pool = new Pool(dbConfig);

// Configurar timezone para cada nova conexão
pool.on('connect', (client) => {
  client.query("SET timezone = 'America/Sao_Paulo'");
});

// Função para testar a conexão
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Conexão com PostgreSQL estabelecida com sucesso!');
    console.log('🕒 Timestamp do servidor:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com PostgreSQL:', error);
    return false;
  }
};

// Função para executar queries
export const query = async (text: string, params?: any[]): Promise<any> => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// Função para executar transações
export const transaction = async (callback: (client: any) => Promise<any>): Promise<any> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Fechando pool de conexões PostgreSQL...');
  await pool.end();
  console.log('✅ Pool de conexões fechado com sucesso!');
  process.exit(0);
});
