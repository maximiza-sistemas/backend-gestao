"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanOldLogs = exports.getActivityLogs = exports.errorLogger = exports.activityLogger = exports.httpLogger = void 0;
const morgan_1 = __importDefault(require("morgan"));
const database_1 = require("../config/database");
exports.httpLogger = (0, morgan_1.default)('combined', {
    skip: (req, res) => process.env.NODE_ENV === 'test'
});
const activityLogger = (action, tableName) => {
    return async (req, res, next) => {
        const originalJson = res.json;
        res.json = function (body) {
            if (body.success && req.user) {
                setImmediate(async () => {
                    try {
                        const recordId = body.data?.id || null;
                        const userAgent = req.get('User-Agent') || null;
                        const ipAddress = req.ip || req.connection.remoteAddress || null;
                        await (0, database_1.query)(`INSERT INTO activity_logs (user_id, action, table_name, record_id, ip_address, user_agent) 
               VALUES ($1, $2, $3, $4, $5, $6)`, [req.user.id, action, tableName, recordId, ipAddress, userAgent]);
                    }
                    catch (error) {
                        console.error('Erro ao salvar log de atividade:', error);
                    }
                });
            }
            return originalJson.call(this, body);
        };
        next();
    };
};
exports.activityLogger = activityLogger;
const errorLogger = (err, req, res, next) => {
    console.error('Erro na aplicação:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        user: req.user ? `${req.user.id} (${req.user.email})` : 'Não autenticado',
        timestamp: new Date().toISOString()
    });
    if (req.user) {
        setImmediate(async () => {
            try {
                await (0, database_1.query)(`INSERT INTO activity_logs (user_id, action, ip_address, user_agent) 
           VALUES ($1, $2, $3, $4)`, [
                    req.user.id,
                    `Erro: ${err.message}`,
                    req.ip || req.connection.remoteAddress,
                    req.get('User-Agent')
                ]);
            }
            catch (logError) {
                console.error('Erro ao salvar log de erro:', logError);
            }
        });
    }
    next(err);
};
exports.errorLogger = errorLogger;
const getActivityLogs = async (options) => {
    try {
        const { userId, page = 1, limit = 50, dateFrom, dateTo } = options;
        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (userId) {
            whereClause += ` AND al.user_id = $${paramIndex}`;
            params.push(userId);
            paramIndex++;
        }
        if (dateFrom) {
            whereClause += ` AND al.created_at >= $${paramIndex}`;
            params.push(dateFrom);
            paramIndex++;
        }
        if (dateTo) {
            whereClause += ` AND al.created_at <= $${paramIndex}`;
            params.push(dateTo);
            paramIndex++;
        }
        const countQuery = `SELECT COUNT(*) as total FROM activity_logs al ${whereClause}`;
        const countResult = await (0, database_1.query)(countQuery, params);
        const total = parseInt(countResult.rows[0].total);
        const offset = (page - 1) * limit;
        const dataQuery = `
      SELECT 
        al.*,
        u.name as user_name,
        u.email as user_email
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        params.push(limit, offset);
        const dataResult = await (0, database_1.query)(dataQuery, params);
        return {
            success: true,
            data: dataResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    catch (error) {
        console.error('Erro ao buscar logs de atividade:', error);
        return {
            success: false,
            error: 'Erro interno do servidor'
        };
    }
};
exports.getActivityLogs = getActivityLogs;
const cleanOldLogs = async (daysToKeep = 90) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const result = await (0, database_1.query)('DELETE FROM activity_logs WHERE created_at < $1', [cutoffDate]);
        console.log(`Limpeza de logs: ${result.rowCount} registros removidos`);
    }
    catch (error) {
        console.error('Erro ao limpar logs antigos:', error);
    }
};
exports.cleanOldLogs = cleanOldLogs;
//# sourceMappingURL=logger.js.map