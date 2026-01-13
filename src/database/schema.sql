-- ====================================
-- SCHEMA COMPLETO PARA DISTRIBUIDORA DE GÁS
-- ====================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================
-- TABELA DE USUÁRIOS
-- ====================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Administrador', 'Gerente', 'Vendedor')),
    status VARCHAR(10) NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- TABELA DE CLIENTES
-- ====================================
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(15) NOT NULL CHECK (type IN ('Residencial', 'Comercial', 'Industrial')),
    contact VARCHAR(20),
    email VARCHAR(150),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    cpf_cnpj VARCHAR(20),
    status VARCHAR(10) NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    credit_limit DECIMAL(10,2) DEFAULT 0.00,
    contract_url TEXT,
    contract_uploaded_at TIMESTAMP,
    contract_filename VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- TABELA DE FORNECEDORES
-- ====================================
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50),
    contact VARCHAR(20),
    email VARCHAR(150),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    cnpj VARCHAR(20),
    status VARCHAR(10) NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- TABELA DE PRODUTOS/BOTIJÕES
-- ====================================
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL, -- P13, P45, P90, etc.
    description TEXT,
    weight_kg DECIMAL(5,2),
    price_sell DECIMAL(10,2) NOT NULL,
    price_buy DECIMAL(10,2),
    status VARCHAR(10) NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- TABELA DE LOCAIS/FILIAIS
-- ====================================
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- Matriz, Filial, etc.
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    phone VARCHAR(20),
    status VARCHAR(10) NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- TABELA DE ESTOQUE
-- ====================================
CREATE TABLE IF NOT EXISTS stock (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    full_quantity INTEGER NOT NULL DEFAULT 0,
    empty_quantity INTEGER NOT NULL DEFAULT 0,
    maintenance_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, location_id)
);

-- ====================================
-- TABELA DE VEÍCULOS
-- ====================================
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    plate VARCHAR(10) NOT NULL UNIQUE,
    model VARCHAR(100),
    brand VARCHAR(50),
    year INTEGER,
    driver_name VARCHAR(100),
    driver_license VARCHAR(20),
    capacity_kg DECIMAL(8,2),
    status VARCHAR(20) NOT NULL DEFAULT 'Disponível' CHECK (status IN ('Disponível', 'Em Rota', 'Em Manutenção')),
    last_maintenance DATE,
    next_maintenance DATE,
    location_id INTEGER REFERENCES locations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- TABELA DE ROTAS DE ENTREGA
-- ====================================
CREATE TABLE IF NOT EXISTS delivery_routes (
    id SERIAL PRIMARY KEY,
    route_code VARCHAR(20) UNIQUE NOT NULL,
    route_name VARCHAR(100) NOT NULL,
    vehicle_id INTEGER REFERENCES vehicles(id),
    driver_id INTEGER REFERENCES users(id),
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

-- ====================================
-- TABELA DE PONTOS DE ENTREGA DA ROTA
-- ====================================
CREATE TABLE IF NOT EXISTS route_stops (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES delivery_routes(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id),
    client_id INTEGER REFERENCES clients(id),
    stop_sequence INTEGER NOT NULL,
    delivery_address TEXT NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    estimated_arrival TIME,
    actual_arrival TIME,
    estimated_departure TIME,
    actual_departure TIME,
    delivery_status VARCHAR(20) DEFAULT 'Pendente' CHECK (delivery_status IN ('Pendente', 'Em Andamento', 'Entregue', 'Não Entregue', 'Parcial')),
    delivery_notes TEXT,
    signature_url TEXT,
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- TABELA DE PEDIDOS/VENDAS
-- ====================================
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    location_id INTEGER REFERENCES locations(id),
    vehicle_id INTEGER REFERENCES vehicles(id),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date DATE,
    delivery_address TEXT,
    total_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(15) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Rota', 'Entregue', 'Cancelado')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('Dinheiro', 'Pix', 'Prazo', 'Misto')),
    payment_status VARCHAR(15) DEFAULT 'Pendente' CHECK (payment_status IN ('Pendente', 'Pago', 'Parcial', 'Vencido')),
    payment_cash_amount DECIMAL(10,2) DEFAULT 0.00,
    payment_term_amount DECIMAL(10,2) DEFAULT 0.00,
    payment_installments INTEGER DEFAULT 1,
    payment_due_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- TABELA DE ITENS DO PEDIDO
-- ====================================
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- TABELA DE CONTAS A RECEBER
-- ====================================
CREATE TABLE IF NOT EXISTS receivables (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id),
    invoice_id VARCHAR(20) UNIQUE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(15) NOT NULL DEFAULT 'A Vencer' CHECK (status IN ('A Vencer', 'Vencido', 'Pago', 'Parcial')),
    payment_date DATE,
    payment_method VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- TABELA DE CONTAS A PAGAR
-- ====================================
CREATE TABLE IF NOT EXISTS payables (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    category VARCHAR(50),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(15) NOT NULL DEFAULT 'A Pagar' CHECK (status IN ('A Pagar', 'Vencido', 'Pago', 'Parcial')),
    payment_date DATE,
    payment_method VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- TABELA DE MOVIMENTAÇÕES DE ESTOQUE
-- ====================================
CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id),
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('Entrada', 'Saída', 'Transferência', 'Ajuste', 'Manutenção')),
    bottle_type VARCHAR(20) NOT NULL CHECK (bottle_type IN ('Cheio', 'Vazio', 'Manutenção')),
    quantity INTEGER NOT NULL,
    reason TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- TABELA DE MANUTENÇÕES DE PRODUTOS
-- ====================================
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

-- ====================================
-- TABELA DE LOG DE ATIVIDADES
-- ====================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- TABELA DE CONFIGURAÇÕES DO SISTEMA
-- ====================================
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    category VARCHAR(50),
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- ÍNDICES PARA OTIMIZAÇÃO
-- ====================================

-- Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(type);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_receivables_due_date ON receivables(due_date);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status);
CREATE INDEX IF NOT EXISTS idx_payables_due_date ON payables(due_date);
CREATE INDEX IF NOT EXISTS idx_payables_status ON payables(status);
CREATE INDEX IF NOT EXISTS idx_stock_product_location ON stock(product_id, location_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(created_at);

-- ====================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- ====================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_receivables_updated_at ON receivables;
CREATE TRIGGER update_receivables_updated_at BEFORE UPDATE ON receivables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payables_updated_at ON payables;
CREATE TRIGGER update_payables_updated_at BEFORE UPDATE ON payables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar estoque automaticamente
CREATE OR REPLACE FUNCTION update_stock_on_movement()
RETURNS TRIGGER AS $$
BEGIN
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

DROP TRIGGER IF EXISTS update_stock_on_movement_trigger ON stock_movements;
CREATE TRIGGER update_stock_on_movement_trigger 
    AFTER INSERT ON stock_movements 
    FOR EACH ROW EXECUTE FUNCTION update_stock_on_movement();

-- ====================================
-- VIEWS ÚTEIS PARA RELATÓRIOS
-- ====================================

-- View para estoque consolidado
CREATE OR REPLACE VIEW v_stock_consolidated AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    SUM(s.full_quantity) as total_full,
    SUM(s.empty_quantity) as total_empty,
    SUM(s.maintenance_quantity) as total_maintenance,
    SUM(s.full_quantity + s.empty_quantity + s.maintenance_quantity) as total_quantity
FROM products p
LEFT JOIN stock s ON p.id = s.product_id
GROUP BY p.id, p.name;

-- View para vendas mensais
CREATE OR REPLACE VIEW v_monthly_sales AS
SELECT 
    DATE_TRUNC('month', o.order_date) as month,
    l.name as location,
    COUNT(o.id) as total_orders,
    SUM(o.total_value) as total_revenue,
    AVG(o.total_value) as avg_order_value
FROM orders o
LEFT JOIN locations l ON o.location_id = l.id
WHERE o.status = 'Entregue'
GROUP BY DATE_TRUNC('month', o.order_date), l.name
ORDER BY month DESC, l.name;

-- View para contas em atraso
CREATE OR REPLACE VIEW v_overdue_accounts AS
SELECT 
    'Receber' as type,
    r.id,
    c.name as client_supplier,
    r.invoice_id as reference,
    r.due_date,
    r.amount,
    (CURRENT_DATE - r.due_date) as days_overdue
FROM receivables r
JOIN clients c ON r.client_id = c.id
WHERE r.status IN ('Vencido', 'A Vencer') AND r.due_date < CURRENT_DATE
UNION ALL
SELECT 
    'Pagar' as type,
    p.id,
    s.name as client_supplier,
    p.description as reference,
    p.due_date,
    p.amount,
    (CURRENT_DATE - p.due_date) as days_overdue
FROM payables p
JOIN suppliers s ON p.supplier_id = s.id
WHERE p.status IN ('Vencido', 'A Pagar') AND p.due_date < CURRENT_DATE
ORDER BY days_overdue DESC;
