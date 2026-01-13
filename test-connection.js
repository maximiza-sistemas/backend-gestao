const { Pool } = require('pg');

// Teste de conexão simples
const pool = new Pool({
  host: '147.93.13.174',
  port: 5432,
  database: 'admin',
  user: 'alphatech',
  password: 'T1fpOr8Kw7KQEpU781gm9NWy7#',
  ssl: false
});

async function testConnection() {
  try {
    console.log('🔄 Testando conexão com PostgreSQL...');
    console.log('Host:', '147.93.13.174');
    console.log('Database:', 'admin');
    console.log('User:', 'alphatech');
    
    const client = await pool.connect();
    console.log('✅ Conexão estabelecida!');
    
    const result = await client.query('SELECT NOW(), version()');
    console.log('🕒 Timestamp:', result.rows[0].now);
    console.log('📋 Versão:', result.rows[0].version);
    
    client.release();
    await pool.end();
    
    console.log('🎉 Teste concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    console.error('Código do erro:', error.code);
    process.exit(1);
  }
}

testConnection();
