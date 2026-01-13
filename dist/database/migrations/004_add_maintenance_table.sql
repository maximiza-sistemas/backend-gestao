-- ====================================
-- MIGRAÇÃO: Adicionar sistema de manutenção de produtos
-- Data: 2025-10-02
-- ====================================

-- Criar tabela de manutenções de produtos
CREATE TABLE IF NOT EXISTS product_maintenance (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id),
    client_order_id INTEGER REFERENCES orders(id),
    maintenance_type VARCHAR(50) NOT NULL CHECK (maintenance_type IN ('Vazamento', 'Válvula Danificada', 'Amassado', 'Ferrugem', 'Pintura', 'Outro')),
    damage_description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Manutenção', 'Concluído', 'Descartado')),
    maintenance_cost DECIMAL(10,2),
    charge_client BOOLEAN DEFAULT false,
    maintenance_date DATE,
    completion_date DATE,
    technician_notes TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_maintenance_product ON product_maintenance(product_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_client ON product_maintenance(client_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON product_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON product_maintenance(maintenance_date);

-- Trigger para atualização automática
CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON product_maintenance 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE product_maintenance IS 'Registro de manutenções de produtos danificados';
COMMENT ON COLUMN product_maintenance.client_id IS 'Cliente responsável pelo dano (quando aplicável)';
COMMENT ON COLUMN product_maintenance.client_order_id IS 'Pedido relacionado ao dano (quando aplicável)';
COMMENT ON COLUMN product_maintenance.maintenance_type IS 'Tipo de dano/manutenção necessária';
COMMENT ON COLUMN product_maintenance.charge_client IS 'Se o custo será cobrado do cliente';
COMMENT ON COLUMN product_maintenance.maintenance_cost IS 'Custo estimado ou real da manutenção';
