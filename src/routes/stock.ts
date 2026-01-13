import { Router, Request, Response } from 'express';
import { StockModel } from '../models/StockModel';
import { requireAuth } from '../middleware/auth';
import { validate, stockSchemas, validateId, validatePagination } from '../middleware/validation';
import { updateLimiter, createLimiter } from '../middleware/rateLimit';
import { activityLogger } from '../middleware/logger';

const router = Router();
const stockModel = new StockModel();

// GET /stock - Listar estoque
router.get('/',
  requireAuth,
  validatePagination,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await stockModel.findAllWithDetails(req.query);
      res.json(result);
    } catch (error) {
      console.error('Erro ao listar estoque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /stock/consolidated - Estoque consolidado (soma de todos os locais)
router.get('/consolidated',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await stockModel.findConsolidated();
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar estoque consolidado:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /stock/low-stock - Produtos com estoque baixo
router.get('/low-stock',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await stockModel.getLowStockReport();
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar produtos com estoque baixo:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /stock/stats - Estatísticas do estoque
router.get('/stats',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await stockModel.getStats();
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar estatísticas do estoque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /stock/product/:productId/location/:locationId - Estoque específico
router.get('/product/:productId/location/:locationId',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = parseInt(req.params.productId);
      const locationId = parseInt(req.params.locationId);

      if (isNaN(productId) || isNaN(locationId)) {
        res.status(400).json({
          success: false,
          error: 'IDs de produto e local devem ser números válidos'
        });
        return;
      }

      const result = await stockModel.findByProductAndLocation(productId, locationId);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar estoque específico:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /stock/movements - Movimentações de estoque
router.get('/movements',
  requireAuth,
  validatePagination,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await stockModel.getMovements(req.query);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar movimentações de estoque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// PUT /stock/product/:productId/location/:locationId - Atualizar estoque
router.put('/product/:productId/location/:locationId',
  requireAuth,
  updateLimiter,
  validate(stockSchemas.update),
  activityLogger('Atualizou estoque', 'stock'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = parseInt(req.params.productId);
      const locationId = parseInt(req.params.locationId);

      if (isNaN(productId) || isNaN(locationId)) {
        res.status(400).json({
          success: false,
          error: 'IDs de produto e local devem ser números válidos'
        });
        return;
      }

      const result = await stockModel.updateStock(
        productId,
        locationId,
        req.body,
        req.user!.id
      );
      res.json(result);
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /stock/movements - Criar movimentação de estoque
router.post('/movements',
  requireAuth,
  createLimiter,
  validate(stockSchemas.movement),
  activityLogger('Criou movimentação de estoque', 'stock_movements'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Adicionar o ID do usuário logado à movimentação
      const movementData = {
        ...req.body,
        user_id: req.user!.id
      };

      const result = await stockModel.createMovement(movementData);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      console.error('Erro ao criar movimentação de estoque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /stock/movements/product/:productId - Movimentações de um produto
router.get('/movements/product/:productId',
  requireAuth,
  validatePagination,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = parseInt(req.params.productId);

      if (isNaN(productId)) {
        res.status(400).json({
          success: false,
          error: 'ID do produto deve ser um número válido'
        });
        return;
      }

      const options = {
        ...req.query,
        product_id: productId
      };

      const result = await stockModel.getMovements(options);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar movimentações do produto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /stock/movements/location/:locationId - Movimentações de um local
router.get('/movements/location/:locationId',
  requireAuth,
  validatePagination,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const locationId = parseInt(req.params.locationId);

      if (isNaN(locationId)) {
        res.status(400).json({
          success: false,
          error: 'ID do local deve ser um número válido'
        });
        return;
      }

      const options = {
        ...req.query,
        location_id: locationId
      };

      const result = await stockModel.getMovements(options);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar movimentações do local:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /stock/adjust - Ajuste de estoque (entrada/saída manual)
router.post('/adjust',
  requireAuth,
  createLimiter,
  activityLogger('Realizou ajuste de estoque', 'stock_movements'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        product_id,
        location_id,
        bottle_type,
        quantity,
        reason,
        adjustment_type // 'add', 'subtract' ou 'set'
      } = req.body;

      // Validações básicas
      if (!product_id || !location_id || !bottle_type || !quantity || !adjustment_type) {
        res.status(400).json({
          success: false,
          error: 'Todos os campos são obrigatórios: product_id, location_id, bottle_type, quantity, adjustment_type'
        });
        return;
      }

      if (!['Cheio', 'Vazio', 'Manutenção'].includes(bottle_type)) {
        res.status(400).json({
          success: false,
          error: 'Tipo de botijão deve ser: Cheio, Vazio ou Manutenção'
        });
        return;
      }

      if (!['add', 'subtract', 'set'].includes(adjustment_type)) {
        res.status(400).json({
          success: false,
          error: 'Tipo de ajuste deve ser: add, subtract ou set'
        });
        return;
      }

      if (typeof quantity !== 'number' || quantity < 0) {
        res.status(400).json({
          success: false,
          error: 'Quantidade deve ser um número não-negativo'
        });
        return;
      }

      // Se for 'set', precisamos calcular a diferença
      let finalAdjustmentType: 'add' | 'subtract' = 'add';
      let finalQuantity = quantity;

      if (adjustment_type === 'set') {
        // Buscar quantidade atual
        const currentStock = await stockModel.findByProductAndLocation(product_id, location_id);
        if (currentStock.success && currentStock.data && currentStock.data.length > 0) {
          const stock = currentStock.data[0];
          const currentQty = bottle_type === 'Cheio'
            ? stock.full_quantity
            : bottle_type === 'Vazio'
              ? stock.empty_quantity
              : stock.maintenance_quantity;

          const difference = quantity - currentQty;
          if (difference > 0) {
            finalAdjustmentType = 'add';
            finalQuantity = difference;
          } else if (difference < 0) {
            finalAdjustmentType = 'subtract';
            finalQuantity = Math.abs(difference);
          } else {
            // Não há diferença, retornar sucesso sem fazer nada
            res.json({
              success: true,
              message: 'Nenhum ajuste necessário'
            });
            return;
          }
        }
      } else {
        finalAdjustmentType = adjustment_type;
      }

      // Criar movimentação de ajuste
      const movementData = {
        product_id,
        location_id,
        movement_type: finalAdjustmentType === 'add' ? 'Entrada' as const : 'Saída' as const,
        bottle_type,
        quantity: finalQuantity,
        reason: reason || `Ajuste ${adjustment_type === 'set' ? 'de definição' : finalAdjustmentType === 'add' ? 'positivo' : 'negativo'} de estoque`,
        user_id: req.user!.id
      };

      const result = await stockModel.createMovement(movementData);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      console.error('Erro ao realizar ajuste de estoque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /stock/transfer - Transferência entre locais
router.post('/transfer',
  requireAuth,
  createLimiter,
  activityLogger('Realizou transferência de estoque', 'stock_movements'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        product_id,
        from_location_id,
        to_location_id,
        bottle_type,
        quantity,
        reason
      } = req.body;

      // Validações básicas
      if (!product_id || !from_location_id || !to_location_id || !bottle_type || !quantity) {
        res.status(400).json({
          success: false,
          error: 'Todos os campos são obrigatórios: product_id, from_location_id, to_location_id, bottle_type, quantity'
        });
        return;
      }

      if (from_location_id === to_location_id) {
        res.status(400).json({
          success: false,
          error: 'Local de origem e destino devem ser diferentes'
        });
        return;
      }

      if (!['Cheio', 'Vazio', 'Manutenção'].includes(bottle_type)) {
        res.status(400).json({
          success: false,
          error: 'Tipo de botijão deve ser: Cheio, Vazio ou Manutenção'
        });
        return;
      }

      if (typeof quantity !== 'number' || quantity <= 0) {
        res.status(400).json({
          success: false,
          error: 'Quantidade deve ser um número positivo'
        });
        return;
      }

      // Criar duas movimentações: saída do local origem e entrada no local destino
      const movementReason = reason || `Transferência entre locais`;

      // Saída do local origem
      const outMovement = {
        product_id,
        location_id: from_location_id,
        movement_type: 'Transferência' as const,
        bottle_type,
        quantity: -quantity, // Negativo para saída
        reason: `${movementReason} (Saída)`,
        user_id: req.user!.id
      };

      // Entrada no local destino
      const inMovement = {
        product_id,
        location_id: to_location_id,
        movement_type: 'Transferência' as const,
        bottle_type,
        quantity: quantity, // Positivo para entrada
        reason: `${movementReason} (Entrada)`,
        user_id: req.user!.id
      };

      // Executar as duas movimentações
      const outResult = await stockModel.createMovement(outMovement);
      if (!outResult.success) {
        res.status(400).json(outResult);
        return;
      }

      const inResult = await stockModel.createMovement(inMovement);
      if (!inResult.success) {
        res.status(400).json(inResult);
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Transferência realizada com sucesso',
        data: {
          out_movement: outResult.data,
          in_movement: inResult.data
        }
      });
    } catch (error) {
      console.error('Erro ao realizar transferência de estoque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// DELETE /stock/product/:productId/location/:locationId - Excluir estoque
router.delete('/product/:productId/location/:locationId',
  requireAuth,
  createLimiter,
  activityLogger('Excluiu registro de estoque', 'stock'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const productId = parseInt(req.params.productId);
      const locationId = parseInt(req.params.locationId);

      if (isNaN(productId) || isNaN(locationId)) {
        res.status(400).json({
          success: false,
          error: 'IDs de produto e local devem ser números válidos'
        });
        return;
      }

      const result = await stockModel.deleteStock(productId, locationId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      console.error('Erro ao excluir estoque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

export default router;
