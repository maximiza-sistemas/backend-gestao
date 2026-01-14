import { Router, Request, Response } from 'express';
import { UserModel } from '../models/UserModel';
import { requireAuth, requireAdmin, requireAdminOrManager } from '../middleware/auth';
import { validate, userSchemas, validateId, validatePagination } from '../middleware/validation';
import { createLimiter, updateLimiter } from '../middleware/rateLimit';
import { activityLogger } from '../middleware/logger';

const router = Router();
const userModel = new UserModel();

// GET /users - Listar usuários
router.get('/',
  requireAuth,
  requireAdminOrManager,
  validatePagination,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await userModel.findAll(req.query);
      res.json(result);
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /users/active - Listar usuários ativos
router.get('/active',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await userModel.findActive();
      res.json(result);
    } catch (error) {
      console.error('Erro ao listar usuários ativos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /users/role/:role - Listar usuários por role
router.get('/role/:role',
  requireAuth,
  requireAdminOrManager,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { role } = req.params;

      if (!['Administrador', 'Gerente', 'Vendedor'].includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Role inválido'
        });
        return;
      }

      const result = await userModel.findByRole(role);
      res.json(result);
    } catch (error) {
      console.error('Erro ao listar usuários por role:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /users/activity-logs - Listar logs de atividade
router.get('/activity-logs',
  requireAuth,
  requireAdminOrManager,
  validatePagination,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const logsQuery = `
        SELECT
          al.id,
          al.action,
          al.table_name,
          al.record_id,
          al.ip_address,
          al.created_at,
          u.name as user_name,
          u.email as user_email
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const countQuery = `SELECT COUNT(*) FROM activity_logs`;

      const { query } = await import('../config/database');

      const [logsResult, countResult] = await Promise.all([
        query(logsQuery, [limit, offset]),
        query(countQuery)
      ]);

      const total = parseInt(countResult.rows[0].count);

      res.json({
        success: true,
        data: logsResult.rows,
        pagination: {
          total,
          limit,
          offset,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Erro ao buscar logs de atividade:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /users/:id - Buscar usuário por ID
router.get('/:id',
  requireAuth,
  requireAdminOrManager,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const result = await userModel.findById(id);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /users - Criar usuário
router.post('/',
  requireAuth,
  requireAdmin,
  createLimiter,
  validate(userSchemas.create),
  activityLogger('Criou usuário', 'users'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await userModel.create(req.body);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// PUT /users/:id - Atualizar usuário
router.put('/:id',
  requireAuth,
  requireAdmin,
  validateId,
  updateLimiter,
  validate(userSchemas.update),
  activityLogger('Atualizou usuário', 'users'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      // Não permitir que o usuário desative a si mesmo
      if (id === req.user!.id && req.body.status === 'Inativo') {
        res.status(400).json({
          success: false,
          error: 'Você não pode desativar sua própria conta'
        });
        return;
      }

      const result = await userModel.update(id, req.body);
      res.json(result);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// DELETE /users/:id - Deletar usuário
router.delete('/:id',
  requireAuth,
  requireAdmin,
  validateId,
  activityLogger('Deletou usuário', 'users'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      // Não permitir que o usuário delete a si mesmo
      if (id === req.user!.id) {
        res.status(400).json({
          success: false,
          error: 'Você não pode deletar sua própria conta'
        });
        return;
      }

      const result = await userModel.delete(id);
      res.json(result);
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// PATCH /users/:id/status - Alterar status do usuário
router.patch('/:id/status',
  requireAuth,
  requireAdmin,
  validateId,
  activityLogger('Alterou status do usuário', 'users'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (!['Ativo', 'Inativo'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Status deve ser "Ativo" ou "Inativo"'
        });
        return;
      }

      // Não permitir que o usuário desative a si mesmo
      if (id === req.user!.id && status === 'Inativo') {
        res.status(400).json({
          success: false,
          error: 'Você não pode desativar sua própria conta'
        });
        return;
      }

      const result = await userModel.update(id, { status });
      res.json(result);
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// PUT /users/:id/password - Alterar senha
router.put('/:id/password',
  requireAuth,
  validateId,
  updateLimiter,
  activityLogger('Alterou senha', 'users'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { current_password, new_password } = req.body;

      // Validar dados
      if (!current_password || !new_password) {
        res.status(400).json({
          success: false,
          error: 'Senha atual e nova senha são obrigatórias'
        });
        return;
      }

      if (new_password.length < 6) {
        res.status(400).json({
          success: false,
          error: 'Nova senha deve ter pelo menos 6 caracteres'
        });
        return;
      }

      // Verificar se é o próprio usuário ou um admin
      if (id !== req.user!.id && req.user!.role !== 'Administrador') {
        res.status(403).json({
          success: false,
          error: 'Você só pode alterar sua própria senha'
        });
        return;
      }

      // Buscar usuário atual
      const userResult = await userModel.findByEmail(req.user!.email);
      if (!userResult.success || !userResult.data) {
        res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
        return;
      }

      // Verificar senha atual (apenas se não for admin alterando senha de outro)
      if (id === req.user!.id) {
        const isCurrentPasswordValid = await userModel.verifyPassword(
          current_password,
          userResult.data.password_hash!
        );

        if (!isCurrentPasswordValid) {
          res.status(400).json({
            success: false,
            error: 'Senha atual incorreta'
          });
          return;
        }
      }

      // Atualizar senha
      const result = await userModel.update(id, { password: new_password });

      if (result.success) {
        res.json({
          success: true,
          message: 'Senha alterada com sucesso'
        });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// PUT /users/:id/reset-password - Admin resetar senha de usuário
router.put('/:id/reset-password',
  requireAuth,
  requireAdmin,
  validateId,
  activityLogger('Redefiniu senha do usuário', 'users'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { new_password } = req.body;

      // Validar nova senha
      if (!new_password) {
        res.status(400).json({
          success: false,
          error: 'Nova senha é obrigatória'
        });
        return;
      }

      if (new_password.length < 6) {
        res.status(400).json({
          success: false,
          error: 'Senha deve ter pelo menos 6 caracteres'
        });
        return;
      }

      // Verificar se usuário existe
      const userCheck = await userModel.findById(id);
      if (!userCheck.success || !userCheck.data) {
        res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
        return;
      }

      // Atualizar senha
      const result = await userModel.update(id, { password: new_password });

      if (result.success) {
        res.json({
          success: true,
          message: 'Senha redefinida com sucesso'
        });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

export default router;
