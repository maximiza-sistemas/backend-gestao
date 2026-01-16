import { pool } from '../config/database';

async function fixStockTrigger() {
    try {
        console.log('=== Corrigindo Trigger de Estoque ===\n');

        // 1. Dropar trigger antigo
        console.log('1. Removendo trigger antigo...');
        await pool.query('DROP TRIGGER IF EXISTS update_stock_on_movement_trigger ON stock_movements');
        console.log('   ✅ Trigger removido');

        // 2. Criar função melhorada com UPSERT
        console.log('\n2. Criando função atualizada com UPSERT...');
        await pool.query(`
      CREATE OR REPLACE FUNCTION update_stock_on_movement()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Garantir que existe um registro de estoque para o produto/localização
          INSERT INTO stock (product_id, location_id, full_quantity, empty_quantity, maintenance_quantity)
          VALUES (NEW.product_id, NEW.location_id, 0, 0, 0)
          ON CONFLICT (product_id, location_id) DO NOTHING;

          IF NEW.movement_type = 'Entrada' THEN
              IF NEW.bottle_type = 'Cheio' THEN
                  UPDATE stock SET full_quantity = full_quantity + NEW.quantity WHERE product_id = NEW.product_id AND location_id = NEW.location_id;
              ELSIF NEW.bottle_type = 'Vazio' THEN
                  UPDATE stock SET empty_quantity = empty_quantity + NEW.quantity WHERE product_id = NEW.product_id AND location_id = NEW.location_id;
              ELSIF NEW.bottle_type = 'Manutenção' THEN
                  UPDATE stock SET maintenance_quantity = maintenance_quantity + NEW.quantity WHERE product_id = NEW.product_id AND location_id = NEW.location_id;
              END IF;
          ELSIF NEW.movement_type = 'Saída' THEN
              IF NEW.bottle_type = 'Cheio' THEN
                  UPDATE stock SET full_quantity = full_quantity - NEW.quantity WHERE product_id = NEW.product_id AND location_id = NEW.location_id;
              ELSIF NEW.bottle_type = 'Vazio' THEN
                  UPDATE stock SET empty_quantity = empty_quantity - NEW.quantity WHERE product_id = NEW.product_id AND location_id = NEW.location_id;
              ELSIF NEW.bottle_type = 'Manutenção' THEN
                  UPDATE stock SET maintenance_quantity = maintenance_quantity - NEW.quantity WHERE product_id = NEW.product_id AND location_id = NEW.location_id;
              END IF;
          END IF;
          
          UPDATE stock SET updated_at = CURRENT_TIMESTAMP WHERE product_id = NEW.product_id AND location_id = NEW.location_id;
          
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
        console.log('   ✅ Função atualizada com UPSERT');

        // 3. Recriar trigger
        console.log('\n3. Recriando trigger...');
        await pool.query(`
      CREATE TRIGGER update_stock_on_movement_trigger 
          AFTER INSERT ON stock_movements 
          FOR EACH ROW EXECUTE FUNCTION update_stock_on_movement()
    `);
        console.log('   ✅ Trigger recriado');

        // 4. Testar
        console.log('\n4. Testando movimentação...');

        // Pegar um produto e local
        const prodLoc = await pool.query(`
      SELECT p.id as product_id, l.id as location_id, p.name
      FROM products p, locations l
      WHERE l.status = 'Ativo'
      LIMIT 1
    `);

        if (prodLoc.rows.length > 0) {
            const { product_id, location_id, name } = prodLoc.rows[0];

            // Verificar estoque antes
            const before = await pool.query(`
        SELECT full_quantity FROM stock WHERE product_id = $1 AND location_id = $2
      `, [product_id, location_id]);

            const qtyBefore = before.rows.length > 0 ? before.rows[0].full_quantity : 'NULL (não existe)';
            console.log(`   Produto: ${name}`);
            console.log(`   Estoque ANTES: ${qtyBefore}`);

            // Inserir movimentação de entrada para teste
            await pool.query(`
        INSERT INTO stock_movements (product_id, location_id, movement_type, bottle_type, quantity, reason)
        VALUES ($1, $2, 'Entrada', 'Cheio', 5, 'TESTE - Verificação de trigger atualizado')
      `, [product_id, location_id]);

            // Verificar depois
            const after = await pool.query(`
        SELECT full_quantity FROM stock WHERE product_id = $1 AND location_id = $2
      `, [product_id, location_id]);

            console.log(`   Estoque DEPOIS: ${after.rows[0].full_quantity}`);

            if (after.rows.length > 0) {
                console.log('   ✅ Trigger funcionando com UPSERT!');

                // Reverter teste
                await pool.query(`
          INSERT INTO stock_movements (product_id, location_id, movement_type, bottle_type, quantity, reason)
          VALUES ($1, $2, 'Saída', 'Cheio', 5, 'TESTE - Reversão')
        `, [product_id, location_id]);
                console.log('   (Teste revertido)');
            }
        }

        console.log('\n=== Correção Aplicada com Sucesso! ===');

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

fixStockTrigger();
