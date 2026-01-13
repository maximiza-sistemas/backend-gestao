import { Router, Request, Response } from 'express';
import { RouteModel } from '../models/RouteModel';
import { requireAuth } from '../middleware/auth';
import { validatePagination } from '../middleware/validation';
import { createLimiter, updateLimiter } from '../middleware/rateLimit';
import { activityLogger } from '../middleware/logger';

const router = Router();
const routeModel = new RouteModel();

// GET /delivery-routes - Listar rotas
router.get('/',
  requireAuth,
  validatePagination,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await routeModel.findAllWithDetails(req.query);
      res.json(result);
    } catch (error) {
      console.error('Erro ao listar rotas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /delivery-routes/stats - Estatísticas de rotas
router.get('/stats',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await routeModel.getStats();
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de rotas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /delivery-routes/:id - Buscar rota por ID
router.get('/:id',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
        return;
      }

      const result = await routeModel.findByIdWithStops(id);

      if (result.success && result.data) {
        res.json(result);
      } else {
        res.status(404).json({
          success: false,
          error: 'Rota não encontrada'
        });
      }
    } catch (error) {
      console.error('Erro ao buscar rota:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /delivery-routes - Criar rota
router.post('/',
  requireAuth,
  createLimiter,
  activityLogger('create', 'delivery_route'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { route, stops } = req.body;

      if (!route || !route.route_name) {
        res.status(400).json({
          success: false,
          error: 'Nome da rota é obrigatório'
        });
        return;
      }

      // Gerar código da rota se não fornecido
      if (!route.route_code) {
        route.route_code = `RT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      }

      const result = await routeModel.createWithStops(route, stops || [], req.user!.id);
      res.status(201).json(result);
    } catch (error) {
      console.error('Erro ao criar rota:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// PUT /delivery-routes/:id - Atualizar rota
router.put('/:id',
  requireAuth,
  updateLimiter,
  activityLogger('update', 'delivery_route'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
        return;
      }

      const updateData: any = {};
      const allowedFields = [
        'route_name', 'route_date', 'vehicle_plate', 'driver_name',
        'status', 'notes', 'total_distance_km', 'total_duration_minutes'
      ];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      const result = await routeModel.update(id, updateData);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Erro ao atualizar rota:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// PUT /delivery-routes/:id/status - Atualizar status da rota
router.put('/:id/status',
  requireAuth,
  updateLimiter,
  activityLogger('update_status', 'delivery_route'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
        return;
      }

      if (!status) {
        res.status(400).json({
          success: false,
          error: 'Status é obrigatório'
        });
        return;
      }

      const validStatuses = ['Planejada', 'Em Andamento', 'Concluída', 'Cancelada'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Status inválido'
        });
        return;
      }

      const result = await routeModel.updateStatus(id, status, req.user!.id);
      res.json(result);
    } catch (error) {
      console.error('Erro ao atualizar status da rota:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// PUT /delivery-routes/stops/:stopId - Atualizar parada
router.put('/stops/:stopId',
  requireAuth,
  updateLimiter,
  activityLogger('update', 'delivery_route_stop'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const stopId = parseInt(req.params.stopId);

      if (isNaN(stopId)) {
        res.status(400).json({
          success: false,
          error: 'ID da parada inválido'
        });
        return;
      }

      const result = await routeModel.updateStop(stopId, req.body);
      res.json(result);
    } catch (error) {
      console.error('Erro ao atualizar parada:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// DELETE /delivery-routes/:id - Excluir rota
router.delete('/:id',
  requireAuth,
  activityLogger('delete', 'delivery_route'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
        return;
      }

      const result = await routeModel.delete(id);

      if (result.success) {
        res.json({
          success: true,
          message: 'Rota excluída com sucesso'
        });
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Erro ao excluir rota:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

export default router;
