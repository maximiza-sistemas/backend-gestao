"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transaction = exports.query = exports.testConnection = exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dbConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: false
};
exports.pool = new pg_1.Pool(dbConfig);
const testConnection = async () => {
    try {
        const client = await exports.pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Conexão com PostgreSQL estabelecida com sucesso!');
        console.log('🕒 Timestamp do servidor:', result.rows[0].now);
        return true;
    }
    catch (error) {
        console.error('❌ Erro ao conectar com PostgreSQL:', error);
        return false;
    }
};
exports.testConnection = testConnection;
const query = async (text, params) => {
    const client = await exports.pool.connect();
    try {
        const result = await client.query(text, params);
        return result;
    }
    finally {
        client.release();
    }
};
exports.query = query;
const transaction = async (callback) => {
    const client = await exports.pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
};
exports.transaction = transaction;
process.on('SIGINT', async () => {
    console.log('\n🔄 Fechando pool de conexões PostgreSQL...');
    await exports.pool.end();
    console.log('✅ Pool de conexões fechado com sucesso!');
    process.exit(0);
});
//# sourceMappingURL=database.js.map