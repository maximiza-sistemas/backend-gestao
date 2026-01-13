-- ====================================
-- MIGRAÇÃO: Adicionar sistema de rotas de entrega
-- Data: 2025-10-02
-- ====================================

-- Criar tabela de rotas de entrega
CREATE TABLE IF NOT EXISTS delivery_routes (
    id SERIAL PRIMARY KEY,
    route_code VARCHAR(20) UNIQUE NOT NULL,
    route_name VARCHAR(100) NOT NULL,
    vehicle_id INTEGER REFERENCES vehicles(id),
    vehicle_plate VARCHAR(20),
    driver_id INTEGER REFERENCES users(id),
    driver_name VARCHAR(100),
    route_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIME,
    end_time TIME,
    status VARCHAR(20) NOT NULL DEFAULT 'Planejada' CHECK (status IN ('Planejada', 'Em Andamento', 'Concluída', 'Cancelada')),
    total_distance_km DECIMAL(8,2),
    total_duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de pontos de entrega
CREATE TABLE IF NOT EXISTS delivery_route_stops (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES delivery_routes(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id),
    stop_order INTEGER NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    status VARCHAR(20) DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Andamento', 'Concluído', 'Falhado')),
    delivered_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar campo de rota nos pedidos
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS route_id INTEGER REFERENCES delivery_routes(id),
ADD COLUMN IF NOT EXISTS route_stop_id INTEGER REFERENCES delivery_route_stops(id);

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_routes_date ON delivery_routes(route_date);
CREATE INDEX IF NOT EXISTS idx_routes_status ON delivery_routes(status);
CREATE INDEX IF NOT EXISTS idx_routes_vehicle ON delivery_routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_stops_route ON delivery_route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_stops_order ON delivery_route_stops(order_id);

-- Triggers para atualização automática
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON delivery_routes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stops_updated_at BEFORE UPDATE ON delivery_route_stops
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE delivery_routes IS 'Rotas de entrega planejadas e executadas';
COMMENT ON TABLE delivery_route_stops IS 'Pontos de parada/entrega em cada rota';
COMMENT ON COLUMN delivery_routes.route_code IS 'Código único da rota (ex: RT-2024-001)';
COMMENT ON COLUMN delivery_route_stops.stop_order IS 'Ordem de parada na rota (1, 2, 3...)';
