import bcrypt from 'bcryptjs';
import { BaseModel } from './BaseModel';
import { User, CreateUserRequest, ApiResponse } from '../types';

export class UserModel extends BaseModel {
  constructor() {
    super('users');
  }

  // Buscar usuário por email
  async findByEmail(email: string): Promise<ApiResponse<User>> {
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
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Criar usuário com hash da senha
  async create(userData: CreateUserRequest): Promise<ApiResponse<User>> {
    try {
      // Hash da senha
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      const userToCreate = {
        name: userData.name,
        email: userData.email,
        password_hash: passwordHash,
        role: userData.role,
        status: userData.status || 'Ativo'
      };

      return await super.create(userToCreate);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Atualizar usuário (com tratamento especial para senha)
  async update(id: number, userData: Partial<CreateUserRequest>): Promise<ApiResponse<User>> {
    try {
      const updateData: any = { ...userData };

      // Se foi fornecida nova senha, faz o hash
      if (userData.password) {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
        updateData.password_hash = await bcrypt.hash(userData.password, saltRounds);
        delete updateData.password;
      }

      return await super.update(id, updateData);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Verificar senha
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      return false;
    }
  }

  // Buscar usuários ativos
  async findActive(): Promise<ApiResponse<User[]>> {
    return await this.customQuery('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE status = $1 ORDER BY name', ['Ativo']);
  }

  // Buscar usuários por role
  async findByRole(role: string): Promise<ApiResponse<User[]>> {
    return await this.customQuery('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE role = $1 ORDER BY name', [role]);
  }

  // Override do findAll para não retornar password_hash
  async findAll(options: any = {}): Promise<ApiResponse> {
    try {
      const result = await super.findAll(options);
      
      if (result.success && result.data) {
        // Remove password_hash de todos os usuários
        result.data = result.data.map((user: any) => {
          const { password_hash, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });
      }

      return result;
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Override do findById para não retornar password_hash
  async findById(id: number): Promise<ApiResponse> {
    try {
      const result = await super.findById(id);
      
      if (result.success && result.data) {
        const { password_hash, ...userWithoutPassword } = result.data;
        result.data = userWithoutPassword;
      }

      return result;
    } catch (error) {
      console.error('Erro ao buscar usuário por ID:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }
}
