import { query } from '../config/database';
import bcrypt from 'bcryptjs';

async function resetPassword() {
    const email = 'luiz@sisgas.com';
    const newPassword = '123456';

    try {
        // 1. Verificar se o usuário existe
        const userResult = await query('SELECT id, email, name, status, password_hash FROM users WHERE email = $1', [email]);

        if (userResult.rows.length === 0) {
            console.log(`❌ Usuário com email ${email} NÃO encontrado no banco.`);
            console.log('\n📋 Listando todos os usuários:');
            const allUsers = await query('SELECT id, email, name, status FROM users');
            allUsers.rows.forEach((u: any) => {
                console.log(`   ID: ${u.id} | Email: ${u.email} | Nome: ${u.name} | Status: ${u.status}`);
            });
            process.exit(1);
        }

        const user = userResult.rows[0];
        console.log(`✅ Usuário encontrado:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Nome: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   Hash atual: ${user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'NULL'}`);

        // 2. Testar a senha atual
        if (user.password_hash) {
            const isValid = await bcrypt.compare(newPassword, user.password_hash);
            console.log(`\n🔐 Senha "${newPassword}" é válida? ${isValid ? '✅ SIM' : '❌ NÃO'}`);

            if (isValid) {
                console.log('\n⚠️  A senha já está correta! O problema pode ser outro.');
                console.log('   Verifique: status do usuário, rate limiting, ou conexão com o banco em produção.');
                process.exit(0);
            }
        } else {
            console.log('\n⚠️  password_hash está NULL!');
        }

        // 3. Gerar novo hash e atualizar
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        await query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email]);

        // 4. Verificar se atualizou corretamente
        const verify = await query('SELECT password_hash FROM users WHERE email = $1', [email]);
        const newValid = await bcrypt.compare(newPassword, verify.rows[0].password_hash);

        console.log(`\n✅ Senha resetada com sucesso!`);
        console.log(`   Novo hash: ${hash.substring(0, 20)}...`);
        console.log(`   Verificação: ${newValid ? '✅ OK' : '❌ FALHOU'}`);

    } catch (error) {
        console.error('❌ Erro:', error);
    }

    process.exit(0);
}

resetPassword();
