import { pool } from '../config/database';

const migrateLocations = async () => {
    const client = await pool.connect();
    try {
        console.log('🔄 Iniciando migração de filiais...');

        // Adicionar colunas que faltam na tabela locations
        const columnsToAdd = [
            { name: 'cnpj', type: 'VARCHAR(20)' },
            { name: 'address', type: 'VARCHAR(255)' },
            { name: 'city', type: 'VARCHAR(100)' },
            { name: 'state', type: 'VARCHAR(2)' },
            { name: 'phone', type: 'VARCHAR(20)' }
        ];

        for (const col of columnsToAdd) {
            try {
                await client.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
                console.log(`  ✅ Coluna ${col.name} verificada/adicionada`);
            } catch (e: any) {
                if (e.code !== '42701') throw e; // Ignora se coluna já existe
                console.log(`  ℹ️  Coluna ${col.name} já existe`);
            }
        }

        // Verificar se coluna updated_at existe
        try {
            await client.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
            console.log('  ✅ Coluna updated_at verificada/adicionada');
        } catch (e: any) {
            if (e.code !== '42701') throw e;
        }

        console.log('');
        console.log('✅ Migração de filiais concluída!');
    } catch (error) {
        console.error('❌ Erro na migração:', error);
    } finally {
        client.release();
        process.exit();
    }
};

migrateLocations();
