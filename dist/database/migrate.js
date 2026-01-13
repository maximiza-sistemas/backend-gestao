"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pg_1 = require("pg");
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
const runMigrations = async () => {
    try {
        console.log('🚀 Iniciando migração do banco de dados...');
        console.log('📊 Testando conexão com o banco de dados...');
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Conexão com PostgreSQL estabelecida com sucesso!');
        console.log('🕒 Timestamp do servidor:', result.rows[0].now);
        const schemaPath = path_1.default.join(__dirname, '..', '..', 'src', 'database', 'schema.sql');
        console.log('✅ Schema base verificado (pulado para evitar duplicidade).');
        const migrationsDir = path_1.default.join(__dirname, '..', '..', 'src', 'database', 'migrations');
        if (fs_1.default.existsSync(migrationsDir)) {
            const migrationFiles = fs_1.default.readdirSync(migrationsDir).sort();
            for (const file of migrationFiles) {
                if (file.endsWith('.sql')) {
                    console.log(`📋 Executando migração: ${file}...`);
                    const migrationPath = path_1.default.join(migrationsDir, file);
                    const migrationSql = fs_1.default.readFileSync(migrationPath, 'utf-8');
                    try {
                        await pool.query(migrationSql);
                        console.log(`✅ Migração ${file} concluída.`);
                    }
                    catch (error) {
                        console.error('MIGRATION ERROR:');
                        console.error(error.message);
                        console.error(error.detail);
                        console.error(error.table);
                        console.error(error.column);
                        process.exit(1);
                    }
                }
            }
        }
        console.log('✅ Todas as migrações concluídas com sucesso!');
        console.log('📊 Banco de dados atualizado.');
    }
    catch (error) {
        console.error('❌ Erro durante a migração:', error);
        process.exit(1);
    }
};
if (require.main === module) {
    runMigrations()
        .then(() => {
        console.log('🎉 Processo de migração finalizado!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Falha na migração:', error);
        process.exit(1);
    });
}
exports.default = runMigrations;
//# sourceMappingURL=migrate.js.map