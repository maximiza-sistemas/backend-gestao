const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: '147.93.13.174',
  port: 5432,
  database: 'admin',
  user: 'alphatech',
  password: 'T1fpOr8Kw7KQEpU781gm9NWy7#',
});

async function createAdmin() {
  try {
    // Verificar se já existe um usuário admin
    const checkResult = await pool.query(
      "SELECT id, name, email FROM users WHERE email = 'admin@sisgas.com' LIMIT 1"
    );

    if (checkResult.rows.length > 0) {
      console.log('✅ Usuário admin já existe:');
      console.log(checkResult.rows[0]);
      await pool.end();
      return;
    }

    // Criar hash da senha
    const passwordHash = await bcrypt.hash('admin123', 10);

    // Criar usuário admin
    const insertResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role`,
      ['Administrador Geral', 'admin@sisgas.com', passwordHash, 'Administrador', 'Ativo']
    );

    console.log('✅ Usuário admin criado com sucesso:');
    console.log(insertResult.rows[0]);
    console.log('\n📧 Email: admin@sisgas.com');
    console.log('🔑 Senha: admin123');

    await pool.end();
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createAdmin();
