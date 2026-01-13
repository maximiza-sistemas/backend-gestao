import { pool } from '../config/database';

const syncStock = async () => {
    const client = await pool.connect();
    try {
        console.log('🔄 Sincronizando estoque com produtos...');

        // Buscar todos os produtos ativos
        const productsResult = await client.query(
            'SELECT id, name FROM products WHERE status = $1',
            ['Ativo']
        );

        console.log('📦 Produtos ativos encontrados:', productsResult.rows.length);

        // Buscar todas as localizações ativas
        let locationsResult = await client.query(
            'SELECT id, name FROM locations WHERE status = $1',
            ['Ativo']
        );

        // Se não houver localizações, criar uma padrão
        if (locationsResult.rows.length === 0) {
            const newLocation = await client.query(
                `INSERT INTO locations (name, status) VALUES ($1, $2) RETURNING id, name`,
                ['Matriz', 'Ativo']
            );
            locationsResult.rows.push(newLocation.rows[0]);
            console.log('📍 Localização Matriz criada');
        }

        console.log('📍 Localizações ativas:', locationsResult.rows.map((l: any) => l.name).join(', '));

        let syncedCount = 0;

        // Para cada produto, criar registros de estoque em todas as localizações
        for (const product of productsResult.rows) {
            for (const location of locationsResult.rows) {
                const insertResult = await client.query(
                    `INSERT INTO stock (product_id, location_id, full_quantity, empty_quantity, maintenance_quantity, min_stock_level, max_stock_level)
                     VALUES ($1, $2, 0, 0, 0, 10, 100)
                     ON CONFLICT (product_id, location_id) DO NOTHING
                     RETURNING id`,
                    [product.id, location.id]
                );

                if (insertResult.rows.length > 0) {
                    syncedCount++;
                    console.log('  ✅ Criado estoque para', product.name, 'em', location.name);
                }
            }
        }

        console.log('');
        console.log('✅ Sincronização concluída!');
        console.log('📊 Resumo:');
        console.log('   - Produtos:', productsResult.rows.length);
        console.log('   - Localizações:', locationsResult.rows.length);
        console.log('   - Novos registros de estoque:', syncedCount);

        if (syncedCount === 0) {
            console.log('   ℹ️  Todos os produtos já possuem registros de estoque');
        }
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        client.release();
        process.exit();
    }
};

syncStock();
