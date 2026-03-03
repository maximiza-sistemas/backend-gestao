/**
 * Script de Migração Retroativa - Compras → Estoque
 * 
 * Gera movimentações de estoque (Entrada/Cheio) para todas as compras
 * existentes que ainda não possuem movimentação associada.
 * 
 * Uso: npx ts-node src/scripts/migrate_purchase_stock.ts
 */

import { pool } from '../config/database';

async function migratePurchaseStock() {
    const client = await pool.connect();
    try {
        console.log('=== MIGRAÇÃO RETROATIVA: Compras → Estoque ===\n');

        // Buscar todas as compras existentes
        const purchasesResult = await client.query(`
            SELECT 
                pp.id,
                pp.product_id,
                pp.quantity,
                pp.location_id,
                pp.purchase_date,
                p.name as product_name,
                l.name as location_name
            FROM product_purchases pp
            JOIN products p ON pp.product_id = p.id
            LEFT JOIN locations l ON pp.location_id = l.id
            ORDER BY pp.purchase_date, pp.id
        `);

        const purchases = purchasesResult.rows;
        console.log(`Total de compras encontradas: ${purchases.length}\n`);

        if (purchases.length === 0) {
            console.log('Nenhuma compra para migrar.');
            return;
        }

        // Buscar movimentações existentes com reason contendo "Compra #"
        // para evitar duplicatas
        const existingMovements = await client.query(`
            SELECT reason FROM stock_movements 
            WHERE reason LIKE 'Compra #%' AND movement_type = 'Entrada'
        `);
        const existingPurchaseIds = new Set(
            existingMovements.rows
                .map(r => {
                    const match = r.reason.match(/Compra #(\d+)/);
                    return match ? parseInt(match[1]) : null;
                })
                .filter(Boolean)
        );

        console.log(`Movimentações de compra já existentes: ${existingPurchaseIds.size}`);

        // Buscar primeira localização ativa para fallback
        const defaultLocationResult = await client.query(
            "SELECT id, name FROM locations WHERE status = 'Ativo' ORDER BY id LIMIT 1"
        );
        const defaultLocation = defaultLocationResult.rows[0] || null;

        if (!defaultLocation) {
            console.error('ERRO: Nenhuma localização ativa encontrada. Impossível migrar.');
            return;
        }

        console.log(`Localização padrão (fallback): ${defaultLocation.name} (ID: ${defaultLocation.id})\n`);

        await client.query('BEGIN');

        let migrated = 0;
        let skipped = 0;
        let errors = 0;

        for (const purchase of purchases) {
            // Pular se já tem movimentação
            if (existingPurchaseIds.has(purchase.id)) {
                skipped++;
                continue;
            }

            const locationId = purchase.location_id || defaultLocation.id;

            try {
                await client.query(`
                    INSERT INTO stock_movements 
                    (product_id, location_id, movement_type, bottle_type, quantity, reason, created_at)
                    VALUES ($1, $2, 'Entrada', 'Cheio', $3, $4, $5)
                `, [
                    purchase.product_id,
                    locationId,
                    parseInt(purchase.quantity),
                    `Compra #${purchase.id} - Entrada de estoque (migração retroativa)`,
                    purchase.purchase_date // Usar a data original da compra
                ]);

                migrated++;
                console.log(
                    `  ✅ Compra #${purchase.id} | ${purchase.product_name} | ` +
                    `Qtd: ${purchase.quantity} | Local: ${purchase.location_name || defaultLocation.name}`
                );
            } catch (err: any) {
                errors++;
                console.error(`  ❌ Compra #${purchase.id}: ${err.message}`);
            }
        }

        await client.query('COMMIT');

        console.log('\n=== RESULTADO ===');
        console.log(`  Migradas:  ${migrated}`);
        console.log(`  Puladas:   ${skipped} (já tinham movimentação)`);
        console.log(`  Erros:     ${errors}`);
        console.log(`  Total:     ${purchases.length}`);
        console.log('\nMigração concluída com sucesso!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('ERRO na migração:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

migratePurchaseStock();
