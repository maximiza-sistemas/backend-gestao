import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/UserModel';
import { JWTPayload } from '../types';

// Estende o tipo Request para incluir o usuário
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
      };
    }
  }
}

const userModel = new UserModel();
const allowMockTokens = process.env.ALLOW_MOCK_TOKENS === 'true' || process.env.NODE_ENV !== 'production';

// Middleware para verificar JWT
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Token de acesso necessário'
      });
      return;
    }

    // Permitir tokens mockados em ambientes não produtivos para facilitar testes
    if (allowMockTokens && token.startsWith('mock_token_')) {
      req.user = {
        id: 1,  // ID do usuário admin no banco
        email: 'admin@sisgas.com',
        role: 'Administrador',
      };
      return next();
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET não configurado');
      res.status(500).json({
        success: false,
        error: 'Erro de configuração do servidor'
      });
      return;
    }

    // Verificar e decodificar o token
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    
    // Buscar o usuário no banco para verificar se ainda existe e está ativo
    const userResult = await userModel.findById(decoded.user_id);
    
    if (!userResult.success || !userResult.data) {
      res.status(401).json({
        success: false,
        error: 'Usuário não encontrado'
      });
      return;
    }

    const user = userResult.data;
    
    if (user.status !== 'Ativo') {
      res.status(401).json({
        success: false,
        error: 'Usuário inativo'
      });
      return;
    }

    // Adicionar informações do usuário à requisição
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Token inválido'
      });
      return;
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expirado'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Middleware para autorização por role
export const authorizeRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Acesso negado: permissões insuficientes'
      });
      return;
    }

    next();
  };
};

// Middleware específico para administradores
export const requireAdmin = authorizeRole(['Administrador']);

// Middleware para administradores e gerentes
export const requireAdminOrManager = authorizeRole(['Administrador', 'Gerente']);

// Middleware para todos os roles (apenas autenticação)
export const requireAuth = authenticateToken;

// Função para gerar JWT
export const generateToken = (payload: { user_id: number; email: string; role: string }): string => {
  const jwtSecret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  if (!jwtSecret) {
    throw new Error('JWT_SECRET não configurado');
  }

  return jwt.sign(payload, jwtSecret, { expiresIn });
};

// Função para verificar se o token está válido (sem fazer consulta ao banco)
export const verifyTokenOnly = (token: string): JWTPayload | null => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return null;
    }

    return jwt.verify(token, jwtSecret) as JWTPayload;
  } catch (error) {
    return null;
  }
};
