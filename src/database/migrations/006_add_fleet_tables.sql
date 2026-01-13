-- Dropar tabelas se existirem para garantir schema limpo
DROP TABLE IF EXISTS vehicle_expenses CASCADE;
DROP TABLE IF EXISTS vehicle_trips CASCADE;
DROP TABLE IF EXISTS vehicle_fueling CASCADE;
DROP TABLE IF EXISTS vehicle_maintenance CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;

-- Tabela de veículos
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    plate VARCHAR(8) UNIQUE NOT NULL,
    model VARCHAR(50) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Caminhão', 'Moto', 'Carro', 'Van', 'Utilitário')),
    fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('Gasolina', 'Etanol', 'Diesel', 'Flex', 'GNV', 'Elétrico')),
    capacity_kg DECIMAL(10,2),
    capacity_units INTEGER, -- Capacidade em botijões P13
    mileage DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'Disponível' CHECK (status IN ('Disponível', 'Em Rota', 'Manutenção', 'Inativo')),
    insurance_expiry DATE,
    license_expiry DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de manutenção de veículos
CREATE TABLE vehicle_maintenance (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('Preventiva', 'Corretiva', 'Preditiva')),
    description TEXT NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Agendada' CHECK (status IN ('Agendada', 'Em Andamento', 'Concluída', 'Cancelada')),
    mechanic_shop VARCHAR(100),
    invoice_number VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de motoristas
CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    cnh_number VARCHAR(20) UNIQUE NOT NULL,
    cnh_category VARCHAR(5) NOT NULL,
    cnh_expiry DATE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    hire_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Férias', 'Afastado', 'Inativo')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de abastecimentos
CREATE TABLE vehicle_fueling (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id),
    driver_id INTEGER REFERENCES drivers(id),
    fuel_type VARCHAR(20) NOT NULL,
    liters DECIMAL(10,2) NOT NULL,
    price_per_liter DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    mileage DECIMAL(12,2) NOT NULL,
    fueling_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    station_name VARCHAR(100),
    invoice_number VARCHAR(50),
    full_tank BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de viagens/rotas realizadas
CREATE TABLE vehicle_trips (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id),
    driver_id INTEGER REFERENCES drivers(id),
    route_id INTEGER REFERENCES delivery_routes(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    start_mileage DECIMAL(12,2) NOT NULL,
    end_mileage DECIMAL(12,2),
    status VARCHAR(20) NOT NULL DEFAULT 'Em Andamento' CHECK (status IN ('Em Andamento', 'Concluída', 'Cancelada')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de despesas de veículos (multas, pedágios, etc)
CREATE TABLE vehicle_expenses (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id),
    driver_id INTEGER REFERENCES drivers(id),
    type VARCHAR(30) NOT NULL CHECK (type IN ('Multa', 'Pedágio', 'Estacionamento', 'Lavagem', 'Outros')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    invoice_number VARCHAR(50),
    is_paid BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON vehicle_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON vehicle_maintenance(start_date);
CREATE INDEX IF NOT EXISTS idx_fueling_vehicle ON vehicle_fueling(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fueling_date ON vehicle_fueling(fueling_date);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON vehicle_trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON vehicle_trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_date ON vehicle_trips(start_time);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle ON vehicle_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON vehicle_expenses(expense_date);

-- Inserir veículos de exemplo
INSERT INTO vehicles (plate, model, brand, year, type, fuel_type, capacity_kg, capacity_units, mileage, status, insurance_expiry, license_expiry) VALUES
    ('ABC-1234', 'Accelo 815', 'Mercedes-Benz', 2020, 'Caminhão', 'Diesel', 3000, 150, 45000, 'Disponível', '2025-06-30', '2025-03-31'),
    ('DEF-5678', 'Daily 35S14', 'Iveco', 2021, 'Van', 'Diesel', 1500, 75, 32000, 'Em Rota', '2025-08-31', '2025-04-30'),
    ('GHI-9012', 'Saveiro Robust', 'Volkswagen', 2022, 'Utilitário', 'Flex', 700, 35, 18000, 'Disponível', '2025-07-31', '2025-05-31'),
    ('JKL-3456', 'HR 2.5', 'Hyundai', 2019, 'Caminhão', 'Diesel', 2000, 100, 67000, 'Manutenção', '2025-05-31', '2025-02-28'),
    ('MNO-7890', 'Fiorino', 'Fiat', 2023, 'Utilitário', 'Flex', 650, 32, 8000, 'Disponível', '2025-09-30', '2025-06-30')
ON CONFLICT DO NOTHING;

-- Inserir motoristas de exemplo
INSERT INTO drivers (name, cpf, cnh_number, cnh_category, cnh_expiry, phone, hire_date, status) VALUES
    ('João Silva', '123.456.789-00', '12345678900', 'C', '2026-12-31', '(11) 98765-4321', '2020-01-15', 'Ativo'),
    ('Maria Santos', '987.654.321-00', '98765432100', 'D', '2025-06-30', '(11) 91234-5678', '2019-03-20', 'Ativo'),
    ('Pedro Oliveira', '456.789.123-00', '45678912300', 'C', '2026-03-31', '(11) 94567-8901', '2021-06-10', 'Ativo'),
    ('Ana Costa', '789.123.456-00', '78912345600', 'B', '2025-09-30', '(11) 97890-1234', '2022-02-01', 'Férias'),
    ('Carlos Ferreira', '321.654.987-00', '32165498700', 'D', '2026-08-31', '(11) 93216-5498', '2018-11-05', 'Ativo')
ON CONFLICT DO NOTHING;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_fleet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_fleet_updated_at();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_fleet_updated_at();

DROP TRIGGER IF EXISTS update_maintenance_updated_at ON vehicle_maintenance;
CREATE TRIGGER update_maintenance_updated_at
    BEFORE UPDATE ON vehicle_maintenance
    FOR EACH ROW
    EXECUTE FUNCTION update_fleet_updated_at();

DROP TRIGGER IF EXISTS update_fueling_updated_at ON vehicle_fueling;
CREATE TRIGGER update_fueling_updated_at
    BEFORE UPDATE ON vehicle_fueling
    FOR EACH ROW
    EXECUTE FUNCTION update_fleet_updated_at();

DROP TRIGGER IF EXISTS update_trips_updated_at ON vehicle_trips;
CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON vehicle_trips
    FOR EACH ROW
    EXECUTE FUNCTION update_fleet_updated_at();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON vehicle_expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON vehicle_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_fleet_updated_at();
