import { Router, Request, Response } from 'express';
import { OrderModel } from '../models/OrderModel';
import { OrderPaymentModel } from '../models/OrderPaymentModel';
import { requireAuth } from '../middleware/auth';
import { validate, orderSchemas, validateId, validatePagination } from '../middleware/validation';
import { createLimiter, updateLimiter } from '../middleware/rateLimit';
import { activityLogger } from '../middleware/logger';
import { uploadReceipt, getReceiptPath } from '../middleware/upload';
import path from 'path';

const router = Router();
const orderModel = new OrderModel();
const orderPaymentModel = new OrderPaymentModel();

// GET /orders - Listar pedidos
router.get('/',
  requireAuth,
  validatePagination,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await orderModel.findAllWithDetails(req.query);
      res.json(result);
    } catch (error) {
      console.error('Erro ao listar pedidos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /orders/stats - Estatísticas de pedidos
router.get('/stats',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await orderModel.getStats();
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de pedidos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /orders/sales-by-period - Vendas por período
router.get('/sales-by-period',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        res.status(400).json({
          success: false,
          error: 'Datas de início e fim são obrigatórias'
        });
        return;
      }

      const startDate = new Date(start_date as string);
      const endDate = new Date(end_date as string);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Formato de data inválido'
        });
        return;
      }

      const result = await orderModel.getSalesByPeriod(startDate, endDate);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar vendas por período:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /orders/sales-by-location - Vendas por local
router.get('/sales-by-location',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await orderModel.getSalesByLocation();
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar vendas por local:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /orders/client/:clientId - Pedidos de um cliente específico
router.get('/client/:clientId',
  requireAuth,
  validatePagination,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const clientId = parseInt(req.params.clientId);

      if (isNaN(clientId)) {
        res.status(400).json({
          success: false,
          error: 'ID do cliente inválido'
        });
        return;
      }

      const options = {
        ...req.query,
        client_id: clientId
      };

      const result = await orderModel.findAllWithDetails(options);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar pedidos do cliente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /orders/:id - Buscar pedido por ID com itens
router.get('/:id',
  requireAuth,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const result = await orderModel.findByIdWithItems(id);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /orders - Criar pedido
router.post('/',
  requireAuth,
  createLimiter,
  validate(orderSchemas.create),
  activityLogger('Criou pedido', 'orders'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Adicionar o ID do usuário logado ao pedido
      const orderData = {
        ...req.body,
        user_id: req.user!.id
      };

      const result = await orderModel.createWithItems(orderData);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// PUT /orders/:id - Atualizar pedido
router.put('/:id',
  requireAuth,
  validateId,
  updateLimiter,
  activityLogger('Atualizou pedido', 'orders'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      // Por enquanto, não permitimos atualização completa do pedido
      // Apenas campos específicos podem ser atualizados
      const allowedFields = [
        'delivery_date',
        'delivery_address',
        'payment_method',
        'notes'
      ];

      const updateData: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          error: 'Nenhum campo válido para atualização fornecido'
        });
        return;
      }

      const result = await orderModel.update(id, updateData);
      res.json(result);
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// PATCH /orders/:id/status - Atualizar status do pedido
router.patch('/:id/status',
  requireAuth,
  validateId,
  validate(orderSchemas.updateStatus),
  activityLogger('Alterou status do pedido', 'orders'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      const result = await orderModel.updateStatus(id, status, req.user!.id);
      res.json(result);
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// PATCH /orders/:id/payment-status - Atualizar status de pagamento
router.patch('/:id/payment-status',
  requireAuth,
  validateId,
  activityLogger('Alterou status de pagamento do pedido', 'orders'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { payment_status } = req.body;

      if (!['Pendente', 'Pago', 'Parcial', 'Vencido'].includes(payment_status)) {
        res.status(400).json({
          success: false,
          error: 'Status de pagamento inválido'
        });
        return;
      }

      const result = await orderModel.updatePaymentStatus(id, payment_status, req.user!.id);
      res.json(result);
    } catch (error) {
      console.error('Erro ao atualizar status de pagamento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// DELETE /orders/:id - Deletar pedido (apenas se status for Pendente)
router.delete('/:id',
  requireAuth,
  validateId,
  activityLogger('Deletou pedido', 'orders'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      // Verificar se o pedido pode ser deletado
      const orderResult = await orderModel.findById(id);
      if (!orderResult.success || !orderResult.data) {
        res.status(404).json({
          success: false,
          error: 'Pedido não encontrado'
        });
        return;
      }

      const order = orderResult.data;
      if (order.status !== 'Pendente') {
        res.status(400).json({
          success: false,
          error: 'Apenas pedidos pendentes podem ser deletados'
        });
        return;
      }

      const result = await orderModel.delete(id);
      res.json(result);
    } catch (error) {
      console.error('Erro ao deletar pedido:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /orders/:id/items - Buscar itens do pedido
router.get('/:id/items',
  requireAuth,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const result = await orderModel.findByIdWithItems(id);

      if (result.success && result.data) {
        res.json({
          success: true,
          data: result.data.items || []
        });
      } else {
        res.json(result);
      }
    } catch (error) {
      console.error('Erro ao buscar itens do pedido:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// ====================================
// ROTAS DE PAGAMENTOS
// ====================================

// GET /orders/:id/payments - Listar pagamentos do pedido
router.get('/:id/payments',
  requireAuth,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orderId = parseInt(req.params.id);
      const result = await orderPaymentModel.findByOrderId(orderId);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /orders/:id/payments - Registrar pagamento
router.post('/:id/payments',
  requireAuth,
  validateId,
  createLimiter,
  activityLogger('Registrou pagamento', 'order_payments'),
  async (req: Request, res: Response): Promise<void> => {
    // Usar middleware de upload dentro do handler
    uploadReceipt(req, res, async (err: any) => {
      try {
        if (err) {
          res.status(400).json({
            success: false,
            error: err.message || 'Erro ao fazer upload do comprovante'
          });
          return;
        }

        const orderId = parseInt(req.params.id);
        const { amount, payment_method, notes, payment_date } = req.body;

        if (!amount || parseFloat(amount) <= 0) {
          res.status(400).json({
            success: false,
            error: 'Valor do pagamento deve ser maior que zero'
          });
          return;
        }

        if (!['Dinheiro', 'Pix', 'Cartão', 'Transferência', 'Depósito'].includes(payment_method)) {
          res.status(400).json({
            success: false,
            error: 'Método de pagamento inválido'
          });
          return;
        }

        // Obter o nome do arquivo do comprovante, se enviado
        const receiptFile = req.file ? req.file.filename : null;

        const result = await orderPaymentModel.create({
          order_id: orderId,
          amount: parseFloat(amount),
          payment_method,
          notes,
          user_id: req.user?.id,
          payment_date,
          receipt_file: receiptFile || undefined
        });

        res.status(result.success ? 201 : 400).json(result);
      } catch (error) {
        console.error('Erro ao registrar pagamento:', error);
        res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }
    });
  }
);

// GET /orders/:id/payments/:paymentId/receipt - Download do comprovante
router.get('/:id/payments/:paymentId/receipt',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const paymentId = parseInt(req.params.paymentId);

      if (isNaN(paymentId)) {
        res.status(400).json({
          success: false,
          error: 'ID do pagamento inválido'
        });
        return;
      }

      const result = await orderPaymentModel.findById(paymentId);
      if (!result.success || !result.data) {
        res.status(404).json({
          success: false,
          error: 'Pagamento não encontrado'
        });
        return;
      }

      const payment = result.data;
      if (!payment.receipt_file) {
        res.status(404).json({
          success: false,
          error: 'Comprovante não encontrado'
        });
        return;
      }

      const filePath = getReceiptPath(payment.receipt_file);
      res.sendFile(filePath);
    } catch (error) {
      console.error('Erro ao buscar comprovante:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// DELETE /orders/:id/payments/:paymentId - Excluir pagamento
router.delete('/:id/payments/:paymentId',
  requireAuth,
  createLimiter,
  activityLogger('Excluiu pagamento', 'order_payments'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const paymentId = parseInt(req.params.paymentId);

      if (isNaN(paymentId)) {
        res.status(400).json({
          success: false,
          error: 'ID do pagamento inválido'
        });
        return;
      }

      const result = await orderPaymentModel.deletePayment(paymentId);
      res.json(result);
    } catch (error) {
      console.error('Erro ao excluir pagamento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /orders/:id/payment-summary - Resumo de pagamentos
router.get('/:id/payment-summary',
  requireAuth,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const orderId = parseInt(req.params.id);
      const result = await orderPaymentModel.getPaymentSummary(orderId);
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar resumo de pagamentos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// PATCH /orders/:id/discount - Atualizar desconto do pedido
router.patch('/:id/discount',
  requireAuth,
  validateId,
  activityLogger('Atualizou desconto do pedido', 'orders'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const { discount } = req.body;

      if (typeof discount !== 'number' || discount < 0) {
        res.status(400).json({
          success: false,
          error: 'Desconto deve ser um número maior ou igual a zero'
        });
        return;
      }

      const result = await orderModel.updateDiscount(id, discount);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Erro ao atualizar desconto do pedido:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

export default router;
