import { Router, Request, Response } from 'express';
import { ProductModel } from '../models/ProductModel';
import { ProductSupplierCostModel } from '../models/ProductSupplierCostModel';
import { ProductPurchaseModel } from '../models/ProductPurchaseModel';

import { requireAuth } from '../middleware/auth';
import { validateId, validatePagination } from '../middleware/validation';
import { createLimiter, updateLimiter } from '../middleware/rateLimit';
import { activityLogger } from '../middleware/logger';
import { query } from '../config/database';

const router = Router();
const productModel = new ProductModel();

// GET /products - Listar produtos
router.get('/',
  requireAuth,
  validatePagination,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await productModel.findAll(req.query);
      res.json(result);
    } catch (error) {
      console.error('Erro ao listar produtos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /products/active - Listar produtos ativos
router.get('/active',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await productModel.findActive();
      res.json(result);
    } catch (error) {
      console.error('Erro ao listar produtos ativos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /products/with-stock - Listar produtos com estoque
router.get('/with-stock',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await productModel.findWithStock();
      res.json(result);
    } catch (error) {
      console.error('Erro ao listar produtos com estoque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /products/stats - Estatísticas de produtos
router.get('/stats',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await productModel.getStats();
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de produtos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /products/most-sold - Produtos mais vendidos
router.get('/most-sold',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const result = await productModel.getMostSold(limit);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar produtos mais vendidos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /products/low-stock - Produtos com baixo estoque
router.get('/low-stock',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await productModel.getLowStock();
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar produtos com baixo estoque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /products/profitability - Relatório de rentabilidade
router.get('/profitability',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await productModel.getProfitabilityReport();
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar relatório de rentabilidade:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /products/:id - Buscar produto por ID
router.get('/:id',
  requireAuth,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const result = await productModel.findById(id);

      if (result.success && result.data) {
        res.json(result);
      } else {
        res.status(404).json({
          success: false,
          error: 'Produto não encontrado'
        });
      }
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /products/:id/price-history - Histórico de preços
router.get('/:id/price-history',
  requireAuth,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const result = await productModel.getPriceHistory(id);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar histórico de preços:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /products - Criar produto
router.post('/',
  requireAuth,
  createLimiter,
  activityLogger('create', 'product'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        name,
        description,
        weight_kg,
        status,
        // Campo de localização (filial selecionada)
        location_id,
        // Campos de estoque inicial
        initial_full_quantity,
        initial_empty_quantity,
        initial_maintenance_quantity,
        min_stock_level,
        max_stock_level
      } = req.body;

      // Validações básicas
      if (!name) {
        res.status(400).json({
          success: false,
          error: 'Nome do produto é obrigatório'
        });
        return;
      }

      const productData = {
        name: name.trim(),
        description: description?.trim() || null,
        weight_kg: weight_kg ? parseFloat(weight_kg) : null,
        price_sell: 0, // Preço agora é gerenciado via página de Preços
        price_buy: null,
        status: status || 'Ativo'
      };

      const result = await productModel.create(productData);

      if (result.success && result.data) {
        // Criar registro de estoque apenas para a localização selecionada
        try {
          const productId = result.data.id;

          // Preparar valores de estoque inicial
          const fullQty = initial_full_quantity ? parseInt(initial_full_quantity) : 0;
          const emptyQty = initial_empty_quantity ? parseInt(initial_empty_quantity) : 0;
          const maintenanceQty = initial_maintenance_quantity ? parseInt(initial_maintenance_quantity) : 0;
          const minStock = min_stock_level ? parseInt(min_stock_level) : 10;
          const maxStock = max_stock_level ? parseInt(max_stock_level) : 100;

          let targetLocationId: number | null = null;

          // Se location_id foi fornecido, usar essa localização específica
          if (location_id) {
            targetLocationId = parseInt(location_id);
          } else {
            // Se não foi fornecido, buscar a primeira localização ativa (Matriz)
            const locationsResult = await query(
              'SELECT id FROM locations WHERE status = $1 ORDER BY id LIMIT 1',
              ['Ativo']
            );

            if (locationsResult.rows.length === 0) {
              // Se não houver localizações, criar uma padrão
              const newLocation = await query(
                `INSERT INTO locations (name, status) VALUES ($1, $2) RETURNING id`,
                ['Matriz', 'Ativo']
              );
              targetLocationId = newLocation.rows[0].id;
            } else {
              targetLocationId = locationsResult.rows[0].id;
            }
          }

          // Criar registro de estoque APENAS para a localização selecionada
          await query(
            `INSERT INTO stock (product_id, location_id, full_quantity, empty_quantity, maintenance_quantity, min_stock_level, max_stock_level)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (product_id, location_id) DO NOTHING`,
            [
              productId,
              targetLocationId,
              fullQty,
              emptyQty,
              maintenanceQty,
              minStock,
              maxStock
            ]
          );

          console.log(`Registro de estoque criado para produto ${productId} na localização ${targetLocationId}. Estoque inicial: ${fullQty} cheios, ${emptyQty} vazios, ${maintenanceQty} manutenção.`);
        } catch (stockError) {
          console.error('Erro ao criar registro de estoque:', stockError);
          // Não falha a criação do produto, apenas loga o erro
        }

        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// PUT /products/:id - Atualizar produto
router.put('/:id',
  requireAuth,
  validateId,
  updateLimiter,
  activityLogger('update', 'product'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, weight_kg, price_sell, price_buy, status } = req.body;

      // Validações básicas
      if (name && name.trim() === '') {
        res.status(400).json({
          success: false,
          error: 'Nome não pode ser vazio'
        });
        return;
      }

      if (price_sell !== undefined && price_sell <= 0) {
        res.status(400).json({
          success: false,
          error: 'Preço de venda deve ser maior que zero'
        });
        return;
      }

      if (price_buy !== undefined && price_buy < 0) {
        res.status(400).json({
          success: false,
          error: 'Preço de compra não pode ser negativo'
        });
        return;
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (weight_kg !== undefined) updateData.weight_kg = weight_kg ? parseFloat(weight_kg) : null;
      if (price_sell !== undefined) updateData.price_sell = parseFloat(price_sell);
      if (price_buy !== undefined) updateData.price_buy = price_buy ? parseFloat(price_buy) : null;
      if (status !== undefined) updateData.status = status;

      const result = await productModel.update(id, updateData);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// DELETE /products/:id - Excluir produto (soft delete - muda status para Inativo)
router.delete('/:id',
  requireAuth,
  validateId,
  activityLogger('delete', 'product'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      // Soft delete - apenas muda o status para Inativo
      const result = await productModel.update(id, { status: 'Inativo' });

      if (result.success) {
        res.json({
          success: true,
          message: 'Produto desativado com sucesso'
        });
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /products/sync-stock - Sincronizar produtos existentes com estoque
router.post('/sync-stock',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Buscar todos os produtos ativos
      const productsResult = await query(
        'SELECT id FROM products WHERE status = $1',
        ['Ativo']
      );

      // Buscar todas as localizações ativas
      let locationsResult = await query(
        'SELECT id FROM locations WHERE status = $1',
        ['Ativo']
      );

      // Se não houver localizações, criar uma padrão
      if (locationsResult.rows.length === 0) {
        const newLocation = await query(
          `INSERT INTO locations (name, status) VALUES ($1, $2) RETURNING id`,
          ['Matriz', 'Ativo']
        );
        locationsResult.rows.push(newLocation.rows[0]);
      }

      let syncedCount = 0;

      // Para cada produto, criar registros de estoque em todas as localizações
      for (const product of productsResult.rows) {
        for (const location of locationsResult.rows) {
          const insertResult = await query(
            `INSERT INTO stock (product_id, location_id, full_quantity, empty_quantity, maintenance_quantity, min_stock_level, max_stock_level)
             VALUES ($1, $2, 0, 0, 0, 10, 100)
             ON CONFLICT (product_id, location_id) DO NOTHING
             RETURNING id`,
            [product.id, location.id]
          );

          if (insertResult.rows.length > 0) {
            syncedCount++;
          }
        }
      }

      res.json({
        success: true,
        message: `${syncedCount} registros de estoque sincronizados`,
        data: {
          products: productsResult.rows.length,
          locations: locationsResult.rows.length,
          synced: syncedCount
        }
      });
    } catch (error) {
      console.error('Erro ao sincronizar estoque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /products/:id/costs - Listar custos por fornecedor
router.get('/:id/costs',
  requireAuth,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const costs = await ProductSupplierCostModel.getByProduct(id);
      res.json({
        success: true,
        data: costs
      });
    } catch (error) {
      console.error('Erro ao buscar custos do produto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /products/:id/costs - Adicionar/Atualizar custo de fornecedor
router.post('/:id/costs',
  requireAuth,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { supplier_id, cost_price, is_default } = req.body;

      if (!supplier_id || cost_price === undefined) {
        res.status(400).json({
          success: false,
          error: 'Fornecedor e preço de custo são obrigatórios'
        });
        return;
      }

      const cost = await ProductSupplierCostModel.upsert(
        id,
        parseInt(supplier_id),
        parseFloat(cost_price),
        is_default
      );

      res.json({
        success: true,
        data: cost
      });
    } catch (error) {
      console.error('Erro ao salvar custo do produto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// DELETE /products/:id/costs/:supplierId - Remover custo de fornecedor
router.delete('/:id/costs/:supplierId',
  requireAuth,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const supplierId = parseInt(req.params.supplierId);

      await ProductSupplierCostModel.delete(id, supplierId);

      res.json({
        success: true,
        message: 'Custo removido com sucesso'
      });
    } catch (error) {
      console.error('Erro ao remover custo do produto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// ====================================
// COMPRAS DE PRODUTOS
// ====================================

// GET /products/:id/purchases - Listar compras do produto
router.get('/:id/purchases',
  requireAuth,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const purchases = await ProductPurchaseModel.getByProduct(id);
      res.json({
        success: true,
        data: purchases
      });
    } catch (error) {
      console.error('Erro ao buscar compras do produto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /products/:id/purchases - Registrar nova compra
router.post('/:id/purchases',
  requireAuth,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { unit_price, quantity, purchase_date, is_term, payment_date, notes } = req.body;

      if (!unit_price || unit_price <= 0) {
        res.status(400).json({
          success: false,
          error: 'Preço unitário é obrigatório e deve ser maior que zero'
        });
        return;
      }

      if (!quantity || quantity <= 0) {
        res.status(400).json({
          success: false,
          error: 'Quantidade é obrigatória e deve ser maior que zero'
        });
        return;
      }

      const purchase = await ProductPurchaseModel.create({
        product_id: id,
        unit_price: parseFloat(unit_price),
        quantity: parseInt(quantity),
        purchase_date,
        is_term: is_term || false,
        payment_date: payment_date || null,
        notes
      });

      res.status(201).json({
        success: true,
        data: purchase
      });
    } catch (error) {
      console.error('Erro ao registrar compra:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /products/:id/purchases/:purchaseId/installments - Listar parcelas
router.get('/:id/purchases/:purchaseId/installments',
  requireAuth,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const purchaseId = parseInt(req.params.purchaseId);
      const installments = await ProductPurchaseModel.getInstallments(purchaseId);
      res.json({
        success: true,
        data: installments
      });
    } catch (error) {
      console.error('Erro ao buscar parcelas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// PUT /products/:id/purchases/:purchaseId/installments/:installmentId - Atualizar parcela
router.put('/:id/purchases/:purchaseId/installments/:installmentId',
  requireAuth,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const installmentId = parseInt(req.params.installmentId);
      const { paid_amount, paid_date } = req.body;

      if (paid_amount === undefined || !paid_date) {
        res.status(400).json({
          success: false,
          error: 'Valor pago e data de pagamento são obrigatórios'
        });
        return;
      }

      const installment = await ProductPurchaseModel.updateInstallment(installmentId, {
        paid_amount: parseFloat(paid_amount),
        paid_date
      });

      res.json({
        success: true,
        data: installment
      });
    } catch (error) {
      console.error('Erro ao atualizar parcela:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// DELETE /products/:id/purchases/:purchaseId - Excluir compra
router.delete('/:id/purchases/:purchaseId',
  requireAuth,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const purchaseId = parseInt(req.params.purchaseId);
      await ProductPurchaseModel.delete(purchaseId);
      res.json({
        success: true,
        message: 'Compra removida com sucesso'
      });
    } catch (error) {
      console.error('Erro ao excluir compra:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

export default router;

