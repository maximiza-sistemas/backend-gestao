"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    host: '147.93.13.174',
    port: 5432,
    database: 'admin',
    user: 'alphatech',
    password: 'T1fpOr8Kw7KQEpU781gm9NWy7#',
    ssl: false
});
const seedData = async () => {
    try {
        console.log('🌱 Iniciando seed do banco de dados...');
        console.log('📊 Testando conexão com o banco de dados...');
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Conexão com PostgreSQL estabelecida com sucesso!');
        console.log('🕒 Timestamp do servidor:', result.rows[0].now);
        console.log('👥 Criando usuários...');
        const users = [
            {
                name: 'Administrador Geral',
                email: 'admin@sisgas.com',
                password: 'admin123',
                role: 'Administrador',
                status: 'Ativo'
            },
            {
                name: 'Gerente de Vendas',
                email: 'gerente@sisgas.com',
                password: 'gerente123',
                role: 'Gerente',
                status: 'Ativo'
            },
            {
                name: 'Vendedor Matriz',
                email: 'vendedor1@sisgas.com',
                password: 'vendedor123',
                role: 'Vendedor',
                status: 'Ativo'
            },
            {
                name: 'Vendedor Filial',
                email: 'vendedor2@sisgas.com',
                password: 'vendedor123',
                role: 'Vendedor',
                status: 'Ativo'
            }
        ];
        for (const user of users) {
            const checkQuery = 'SELECT id FROM users WHERE email = $1';
            const existing = await pool.query(checkQuery, [user.email]);
            if (existing.rows.length === 0) {
                const passwordHash = await bcryptjs_1.default.hash(user.password, 12);
                const insertQuery = `
          INSERT INTO users (name, email, password_hash, role, status) 
          VALUES ($1, $2, $3, $4, $5)
        `;
                await pool.query(insertQuery, [
                    user.name, user.email, passwordHash, user.role, user.status
                ]);
                console.log(`✅ Usuário criado: ${user.name} (${user.email})`);
            }
            else {
                console.log(`⚠️  Usuário já existe: ${user.email}`);
            }
        }
        console.log('🏢 Criando locais...');
        const locations = [
            {
                name: 'Matriz',
                address: 'Rua Principal, 1000',
                city: 'São Paulo',
                state: 'SP',
                zip_code: '01000-000',
                phone: '(11) 3000-0000',
                status: 'Ativo'
            },
            {
                name: 'Filial Norte',
                address: 'Av. Norte, 500',
                city: 'Guarulhos',
                state: 'SP',
                zip_code: '07000-000',
                phone: '(11) 3000-0001',
                status: 'Ativo'
            },
            {
                name: 'Filial Sul',
                address: 'Rua Sul, 250',
                city: 'Santo André',
                state: 'SP',
                zip_code: '09000-000',
                phone: '(11) 3000-0002',
                status: 'Ativo'
            }
        ];
        for (const location of locations) {
            const checkQuery = 'SELECT id FROM locations WHERE name = $1';
            const existing = await pool.query(checkQuery, [location.name]);
            if (existing.rows.length === 0) {
                const insertQuery = `
          INSERT INTO locations (name, address, city, state, zip_code, phone, status) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
                await pool.query(insertQuery, [
                    location.name, location.address, location.city,
                    location.state, location.zip_code, location.phone, location.status
                ]);
                console.log(`✅ Local criado: ${location.name}`);
            }
            else {
                console.log(`⚠️  Local já existe: ${location.name}`);
            }
        }
        console.log('🛢️  Criando produtos...');
        const products = [
            {
                name: 'P13',
                description: 'Botijão de gás 13kg',
                weight_kg: 13.0,
                price_sell: 110.00,
                price_buy: 85.00,
                status: 'Ativo'
            },
            {
                name: 'P45',
                description: 'Botijão de gás 45kg',
                weight_kg: 45.0,
                price_sell: 350.00,
                price_buy: 280.00,
                status: 'Ativo'
            },
            {
                name: 'P90',
                description: 'Botijão de gás 90kg',
                weight_kg: 90.0,
                price_sell: 650.00,
                price_buy: 520.00,
                status: 'Ativo'
            }
        ];
        for (const product of products) {
            const checkQuery = 'SELECT id FROM products WHERE name = $1';
            const existing = await pool.query(checkQuery, [product.name]);
            if (existing.rows.length === 0) {
                const insertQuery = `
          INSERT INTO products (name, description, weight_kg, price_sell, price_buy, status) 
          VALUES ($1, $2, $3, $4, $5, $6)
        `;
                await pool.query(insertQuery, [
                    product.name, product.description, product.weight_kg,
                    product.price_sell, product.price_buy, product.status
                ]);
                console.log(`✅ Produto criado: ${product.name}`);
            }
            else {
                console.log(`⚠️  Produto já existe: ${product.name}`);
            }
        }
        console.log('👥 Criando clientes...');
        const clients = [
            {
                name: 'João da Silva',
                type: 'Residencial',
                contact: '(11) 98765-4321',
                email: 'joao.silva@email.com',
                address: 'Rua das Flores, 123',
                city: 'São Paulo',
                state: 'SP',
                zip_code: '01234-567',
                cpf_cnpj: '123.456.789-00',
                status: 'Ativo',
                credit_limit: 500.00
            },
            {
                name: 'Padaria Pão Quente Ltda',
                type: 'Comercial',
                contact: '(11) 91234-5678',
                email: 'contato@padariapao.com',
                address: 'Av. Principal, 456',
                city: 'São Paulo',
                state: 'SP',
                zip_code: '01234-568',
                cpf_cnpj: '12.345.678/0001-99',
                status: 'Ativo',
                credit_limit: 2000.00
            },
            {
                name: 'Indústria Metalúrgica S.A.',
                type: 'Industrial',
                contact: '(11) 3333-4444',
                email: 'compras@metalurgica.com',
                address: 'Rod. dos Bandeirantes, km 30',
                city: 'Jundiaí',
                state: 'SP',
                zip_code: '13200-000',
                cpf_cnpj: '98.765.432/0001-11',
                status: 'Ativo',
                credit_limit: 10000.00
            },
            {
                name: 'Maria Oliveira',
                type: 'Residencial',
                contact: '(11) 9999-8888',
                email: 'maria.oliveira@email.com',
                address: 'Travessa das Pedras, 789',
                city: 'São Paulo',
                state: 'SP',
                zip_code: '01234-569',
                cpf_cnpj: '987.654.321-00',
                status: 'Ativo',
                credit_limit: 300.00
            },
            {
                name: 'Restaurante Sabor Divino',
                type: 'Comercial',
                contact: '(11) 8877-6655',
                email: 'contato@sabordivino.com',
                address: 'Praça da Matriz, 10',
                city: 'São Paulo',
                state: 'SP',
                zip_code: '01234-570',
                cpf_cnpj: '11.222.333/0001-44',
                status: 'Ativo',
                credit_limit: 1500.00
            }
        ];
        for (const client of clients) {
            const checkQuery = 'SELECT id FROM clients WHERE cpf_cnpj = $1';
            const existing = await pool.query(checkQuery, [client.cpf_cnpj]);
            if (existing.rows.length === 0) {
                const insertQuery = `
          INSERT INTO clients (name, type, contact, email, address, city, state, zip_code, cpf_cnpj, status, credit_limit) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;
                await pool.query(insertQuery, [
                    client.name, client.type, client.contact, client.email,
                    client.address, client.city, client.state, client.zip_code,
                    client.cpf_cnpj, client.status, client.credit_limit
                ]);
                console.log(`✅ Cliente criado: ${client.name}`);
            }
            else {
                console.log(`⚠️  Cliente já existe: ${client.name}`);
            }
        }
        console.log('🏭 Criando fornecedores...');
        const suppliers = [
            {
                name: 'Distribuidora de Gás Central',
                category: 'Gás',
                contact: '(11) 5555-1234',
                email: 'vendas@gascentral.com',
                address: 'Av. Industrial, 1000',
                city: 'São Paulo',
                state: 'SP',
                zip_code: '03000-000',
                cnpj: '10.111.222/0001-33',
                status: 'Ativo'
            },
            {
                name: 'Transportadora Rápida Ltda',
                category: 'Logística',
                contact: '(11) 4444-5678',
                email: 'contato@rapidatrans.com',
                address: 'Rua dos Transportes, 500',
                city: 'Guarulhos',
                state: 'SP',
                zip_code: '07000-000',
                cnpj: '20.333.444/0001-55',
                status: 'Ativo'
            },
            {
                name: 'TechSoft Sistemas Ltda',
                category: 'Tecnologia',
                contact: '(11) 3333-8888',
                email: 'suporte@techsoft.com',
                address: 'Av. Tecnologia, 200',
                city: 'São Paulo',
                state: 'SP',
                zip_code: '04000-000',
                cnpj: '30.555.666/0001-77',
                status: 'Ativo'
            },
            {
                name: 'Oficina Mecânica Diesel',
                category: 'Manutenção',
                contact: '(11) 2222-9999',
                email: 'contato@oficinadiesel.com',
                address: 'Rua da Manutenção, 150',
                city: 'São Paulo',
                state: 'SP',
                zip_code: '05000-000',
                cnpj: '40.777.888/0001-99',
                status: 'Ativo'
            }
        ];
        for (const supplier of suppliers) {
            const checkQuery = 'SELECT id FROM suppliers WHERE cnpj = $1';
            const existing = await pool.query(checkQuery, [supplier.cnpj]);
            if (existing.rows.length === 0) {
                const insertQuery = `
          INSERT INTO suppliers (name, category, contact, email, address, city, state, zip_code, cnpj, status) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
                await pool.query(insertQuery, [
                    supplier.name, supplier.category, supplier.contact, supplier.email,
                    supplier.address, supplier.city, supplier.state, supplier.zip_code,
                    supplier.cnpj, supplier.status
                ]);
                console.log(`✅ Fornecedor criado: ${supplier.name}`);
            }
            else {
                console.log(`⚠️  Fornecedor já existe: ${supplier.name}`);
            }
        }
        console.log('📦 Criando estoque inicial...');
        const productsResult = await pool.query('SELECT id, name FROM products ORDER BY id');
        const locationsResult = await pool.query('SELECT id, name FROM locations ORDER BY id');
        const productsMap = new Map(productsResult.rows.map(p => [p.name, p.id]));
        const locationsMap = new Map(locationsResult.rows.map(l => [l.name, l.id]));
        const stockData = [
            { product: 'P13', location: 'Matriz', full: 1200, empty: 350, maintenance: 50, min_level: 100, max_level: 2000 },
            { product: 'P45', location: 'Matriz', full: 800, empty: 150, maintenance: 25, min_level: 50, max_level: 1200 },
            { product: 'P90', location: 'Matriz', full: 450, empty: 80, maintenance: 10, min_level: 30, max_level: 600 },
            { product: 'P13', location: 'Filial Norte', full: 750, empty: 200, maintenance: 30, min_level: 80, max_level: 1500 },
            { product: 'P45', location: 'Filial Norte', full: 500, empty: 100, maintenance: 15, min_level: 40, max_level: 800 },
            { product: 'P90', location: 'Filial Norte', full: 200, empty: 40, maintenance: 5, min_level: 20, max_level: 400 },
            { product: 'P13', location: 'Filial Sul', full: 600, empty: 150, maintenance: 20, min_level: 60, max_level: 1000 },
            { product: 'P45', location: 'Filial Sul', full: 300, empty: 80, maintenance: 10, min_level: 30, max_level: 500 },
            { product: 'P90', location: 'Filial Sul', full: 150, empty: 30, maintenance: 5, min_level: 15, max_level: 300 }
        ];
        for (const stock of stockData) {
            const productId = productsMap.get(stock.product);
            const locationId = locationsMap.get(stock.location);
            if (productId && locationId) {
                const checkQuery = 'SELECT id FROM stock WHERE product_id = $1 AND location_id = $2';
                const existing = await pool.query(checkQuery, [productId, locationId]);
                if (existing.rows.length === 0) {
                    const insertQuery = `
            INSERT INTO stock (product_id, location_id, full_quantity, empty_quantity, maintenance_quantity, min_stock_level, max_stock_level) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `;
                    await pool.query(insertQuery, [
                        productId, locationId, stock.full, stock.empty,
                        stock.maintenance, stock.min_level, stock.max_level
                    ]);
                    console.log(`✅ Estoque criado: ${stock.product} em ${stock.location}`);
                }
                else {
                    console.log(`⚠️  Estoque já existe: ${stock.product} em ${stock.location}`);
                }
            }
        }
        console.log('🚛 Criando veículos...');
        const vehicles = [
            {
                plate: 'BRA2E19',
                model: 'VW Delivery Express',
                brand: 'Volkswagen',
                year: 2020,
                driver_name: 'Carlos Souza',
                driver_license: '12345678901',
                capacity_kg: 3500.00,
                status: 'Disponível',
                next_maintenance: '2024-02-15',
                location_id: locationsMap.get('Matriz')
            },
            {
                plate: 'XYZ1234',
                model: 'Iveco Daily',
                brand: 'Iveco',
                year: 2019,
                driver_name: 'Marcos Andrade',
                driver_license: '98765432109',
                capacity_kg: 4000.00,
                status: 'Disponível',
                next_maintenance: '2024-03-01',
                location_id: locationsMap.get('Filial Norte')
            },
            {
                plate: 'QWE5678',
                model: 'Mercedes Sprinter',
                brand: 'Mercedes-Benz',
                year: 2021,
                driver_name: 'Ana Pereira',
                driver_license: '11223344556',
                capacity_kg: 2800.00,
                status: 'Disponível',
                next_maintenance: '2024-02-25',
                location_id: locationsMap.get('Filial Sul')
            }
        ];
        for (const vehicle of vehicles) {
            const checkQuery = 'SELECT id FROM vehicles WHERE plate = $1';
            const existing = await pool.query(checkQuery, [vehicle.plate]);
            if (existing.rows.length === 0) {
                const insertQuery = `
          INSERT INTO vehicles (plate, model, brand, year, driver_name, driver_license, capacity_kg, status, next_maintenance, location_id) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
                await pool.query(insertQuery, [
                    vehicle.plate, vehicle.model, vehicle.brand, vehicle.year,
                    vehicle.driver_name, vehicle.driver_license, vehicle.capacity_kg,
                    vehicle.status, vehicle.next_maintenance, vehicle.location_id
                ]);
                console.log(`✅ Veículo criado: ${vehicle.plate} - ${vehicle.model}`);
            }
            else {
                console.log(`⚠️  Veículo já existe: ${vehicle.plate}`);
            }
        }
        console.log('✅ Seed concluído com sucesso!');
        console.log('\n📋 Dados criados:');
        console.log('   👥 Usuários: 4 (admin@sisgas.com / admin123)');
        console.log('   🏢 Locais: 3 (Matriz, Filial Norte, Filial Sul)');
        console.log('   🛢️  Produtos: 3 (P13, P45, P90)');
        console.log('   👥 Clientes: 5');
        console.log('   🏭 Fornecedores: 4');
        console.log('   📦 Estoque: 9 registros');
        console.log('   🚛 Veículos: 3');
    }
    catch (error) {
        console.error('❌ Erro durante o seed:', error);
        throw error;
    }
};
if (require.main === module) {
    seedData()
        .then(() => {
        console.log('🎉 Seed finalizado!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Falha no seed:', error);
        process.exit(1);
    });
}
exports.default = seedData;
//# sourceMappingURL=seed.js.map