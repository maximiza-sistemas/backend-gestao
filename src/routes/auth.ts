import { Router, Request, Response } from 'express';
import { UserModel } from '../models/UserModel';
import { generateToken, requireAuth } from '../middleware/auth';
import { validate, userSchemas } from '../middleware/validation';
import { loginLimiter } from '../middleware/rateLimit';
import { activityLogger } from '../middleware/logger';
import { AuthRequest, AuthResponse } from '../types';

const router = Router();
const userModel = new UserModel();

// POST /auth/login - Login do usuário
router.post('/login', 
  loginLimiter,
  validate(userSchemas.login),
  activityLogger('Login realizado'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password }: AuthRequest = req.body;

      // Buscar usuário por email
      const userResult = await userModel.findByEmail(email);
      
      if (!userResult.success || !userResult.data) {
        res.status(401).json({
          success: false,
          error: 'Credenciais inválidas'
        });
        return;
      }

      const user = userResult.data;

      // Verificar se o usuário está ativo
      if (user.status !== 'Ativo') {
        res.status(401).json({
          success: false,
          error: 'Usuário inativo'
        });
        return;
      }

      // Verificar senha
      const isPasswordValid = await userModel.verifyPassword(password, user.password_hash!);
      
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Credenciais inválidas'
        });
        return;
      }

      // Gerar token JWT
      const token = generateToken({
        user_id: user.id,
        email: user.email,
        role: user.role
      });

      // Remover senha do objeto de usuário
      const { password_hash, ...userWithoutPassword } = user;

      const response: AuthResponse = {
        token,
        user: userWithoutPassword,
        expires_in: 7 * 24 * 60 * 60 // 7 dias em segundos
      };

      res.json({
        success: true,
        data: response,
        message: 'Login realizado com sucesso'
      });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /auth/logout - Logout do usuário (apenas para log)
router.post('/logout',
  activityLogger('Logout realizado'),
  async (req: Request, res: Response): Promise<void> => {
    // Note: Com JWT stateless, o logout é feito no frontend removendo o token
    // Este endpoint é apenas para registrar a atividade de logout
    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  }
);

// GET /auth/me - Informações do usuário autenticado
router.get('/me',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Se chegou até aqui, o middleware de auth já validou o token
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        });
        return;
      }

      // Buscar dados completos do usuário
      const userResult = await userModel.findById(req.user.id);
      
      if (!userResult.success || !userResult.data) {
        res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: userResult.data
      });
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /auth/refresh - Renovar token (implementação simples)
router.post('/refresh',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        });
        return;
      }

      // Gerar novo token
      const token = generateToken({
        user_id: req.user.id,
        email: req.user.email,
        role: req.user.role
      });

      res.json({
        success: true,
        data: {
          token,
          expires_in: 7 * 24 * 60 * 60
        },
        message: 'Token renovado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

export default router;
