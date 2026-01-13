import { Router, Request, Response } from 'express';
import { ClientModel } from '../models/ClientModel';
import { requireAuth } from '../middleware/auth';
import { validate, clientSchemas, validateId, validatePagination } from '../middleware/validation';
import { createLimiter, updateLimiter } from '../middleware/rateLimit';
import { activityLogger } from '../middleware/logger';

const router = Router();
const clientModel = new ClientModel();

// GET /clients - Listar clientes
router.get('/',
  requireAuth,
  validatePagination,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await clientModel.findAllWithLastPurchase(req.query);
      res.json(result);
    } catch (error) {
      console.error('Erro ao listar clientes:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /clients/active - Listar clientes ativos
router.get('/active',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await clientModel.findActive();
      res.json(result);
    } catch (error) {
      console.error('Erro ao listar clientes ativos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /clients/type/:type - Listar clientes por tipo
router.get('/type/:type',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { type } = req.params;

      if (!['Residencial', 'Comercial', 'Industrial'].includes(type)) {
        res.status(400).json({
          success: false,
          error: 'Tipo inválido'
        });
        return;
      }

      const result = await clientModel.findByType(type);
      res.json(result);
    } catch (error) {
      console.error('Erro ao listar clientes por tipo:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /clients/stats - Estatísticas de clientes
router.get('/stats',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await clientModel.getStats();
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de clientes:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /clients/top-clients - Top clientes por valor gasto
router.get('/top-clients',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await clientModel.getTopClientsBySpent(limit);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar top clientes:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /clients/inactive - Clientes inativos (sem compras recentes)
router.get('/inactive',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const days = parseInt(req.query.days as string) || 90;
      const result = await clientModel.getInactiveClients(days);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar clientes inativos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /clients/credit-limit - Clientes com limite de crédito
router.get('/credit-limit',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await clientModel.findWithCreditLimit();
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar clientes com limite de crédito:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);



// GET /clients/:id/history - Histórico de compras do cliente
router.get('/:id/history',
  requireAuth,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const result = await clientModel.getPurchaseHistory(id);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar histórico de compras:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /clients/:id - Buscar cliente por ID
router.get('/:id',
  requireAuth,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const result = await clientModel.findById(id);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /clients/cpf-cnpj/:cpfCnpj - Buscar cliente por CPF/CNPJ
router.get('/cpf-cnpj/:cpfCnpj',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { cpfCnpj } = req.params;
      const result = await clientModel.findByCpfCnpj(cpfCnpj);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar cliente por CPF/CNPJ:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /clients - Criar cliente
router.post('/',
  requireAuth,
  createLimiter,
  validate(clientSchemas.create),
  activityLogger('Criou cliente', 'clients'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await clientModel.create(req.body);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// PUT /clients/:id - Atualizar cliente
router.put('/:id',
  requireAuth,
  validateId,
  updateLimiter,
  validate(clientSchemas.update),
  activityLogger('Atualizou cliente', 'clients'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const result = await clientModel.update(id, req.body);
      res.json(result);
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// DELETE /clients/:id - Deletar cliente
router.delete('/:id',
  requireAuth,
  validateId,
  activityLogger('Deletou cliente', 'clients'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const result = await clientModel.delete(id);
      res.json(result);
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// PATCH /clients/:id/status - Alterar status do cliente
router.patch('/:id/status',
  requireAuth,
  validateId,
  activityLogger('Alterou status do cliente', 'clients'),
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

      const result = await clientModel.update(id, { status });
      res.json(result);
    } catch (error) {
      console.error('Erro ao alterar status do cliente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// PATCH /clients/:id/credit-limit - Alterar limite de crédito
router.patch('/:id/credit-limit',
  requireAuth,
  validateId,
  activityLogger('Alterou limite de crédito do cliente', 'clients'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { credit_limit } = req.body;

      if (typeof credit_limit !== 'number' || credit_limit < 0) {
        res.status(400).json({
          success: false,
          error: 'Limite de crédito deve ser um número maior ou igual a zero'
        });
        return;
      }

      const result = await clientModel.update(id, { credit_limit });
      res.json(result);
    } catch (error) {
      console.error('Erro ao alterar limite de crédito:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

export default router;
