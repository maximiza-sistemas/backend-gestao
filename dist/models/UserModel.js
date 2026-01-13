"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const BaseModel_1 = require("./BaseModel");
class UserModel extends BaseModel_1.BaseModel {
    constructor() {
        super('users');
    }
    async findByEmail(email) {
        try {
            const result = await this.customQuery('SELECT * FROM users WHERE email = $1', [email]);
            if (!result.success || result.data.length === 0) {
                return {
                    success: false,
                    error: 'Usuário não encontrado'
                };
            }
            return {
                success: true,
                data: result.data[0]
            };
        }
        catch (error) {
            console.error('Erro ao buscar usuário por email:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async create(userData) {
        try {
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
            const passwordHash = await bcryptjs_1.default.hash(userData.password, saltRounds);
            const userToCreate = {
                name: userData.name,
                email: userData.email,
                password_hash: passwordHash,
                role: userData.role,
                status: userData.status || 'Ativo'
            };
            return await super.create(userToCreate);
        }
        catch (error) {
            console.error('Erro ao criar usuário:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async update(id, userData) {
        try {
            const updateData = { ...userData };
            if (userData.password) {
                const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
                updateData.password_hash = await bcryptjs_1.default.hash(userData.password, saltRounds);
                delete updateData.password;
            }
            return await super.update(id, updateData);
        }
        catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async verifyPassword(plainPassword, hashedPassword) {
        try {
            return await bcryptjs_1.default.compare(plainPassword, hashedPassword);
        }
        catch (error) {
            console.error('Erro ao verificar senha:', error);
            return false;
        }
    }
    async findActive() {
        return await this.customQuery('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE status = $1 ORDER BY name', ['Ativo']);
    }
    async findByRole(role) {
        return await this.customQuery('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE role = $1 ORDER BY name', [role]);
    }
    async findAll(options = {}) {
        try {
            const result = await super.findAll(options);
            if (result.success && result.data) {
                result.data = result.data.map((user) => {
                    const { password_hash, ...userWithoutPassword } = user;
                    return userWithoutPassword;
                });
            }
            return result;
        }
        catch (error) {
            console.error('Erro ao buscar usuários:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
    async findById(id) {
        try {
            const result = await super.findById(id);
            if (result.success && result.data) {
                const { password_hash, ...userWithoutPassword } = result.data;
                result.data = userWithoutPassword;
            }
            return result;
        }
        catch (error) {
            console.error('Erro ao buscar usuário por ID:', error);
            return {
                success: false,
                error: 'Erro interno do servidor'
            };
        }
    }
}
exports.UserModel = UserModel;
//# sourceMappingURL=UserModel.js.map