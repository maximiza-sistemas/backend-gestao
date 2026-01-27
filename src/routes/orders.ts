import { Router, Request, Response } from 'express';
import { OrderModel } from '../models/OrderModel';
import { OrderPaymentModel } from '../models/OrderPaymentModel';
import { requireAuth } from '../middleware/auth';
import { validate, orderSchemas, validateId, validatePagination } from '../middleware/validation';
import { createLimiter, updateLimiter } from '../middleware/rateLimit';
import { activityLogger } from '../middleware/logger';
import { uploadReceipt, getReceiptPath } from '../middleware/upload';
import { query } from '../config/database';
import path from 'path';
import fs from 'fs';

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
  activityLogger('Criou pedido', 'orders'),
  async (req: Request, res: Response): Promise<void> => {
    // Usar middleware de upload para aceitar comprovante
    uploadReceipt(req, res, async (err: any) => {
      try {
        if (err) {
          console.error('Erro no upload:', err);
          res.status(400).json({
            success: false,
            error: err.message || 'Erro ao fazer upload do comprovante'
          });
          return;
        }

        // Processar dados - podem vir como FormData ou JSON
        let orderData = req.body;

        // Se items veio como string JSON (FormData), fazer parse
        if (typeof orderData.items === 'string') {
          try {
            orderData.items = JSON.parse(orderData.items);
          } catch {
            res.status(400).json({
              success: false,
              error: 'Formato inválido para itens do pedido'
            });
            return;
          }
        }

        // Converter campos numéricos se vieram como string (FormData)
        if (typeof orderData.client_id === 'string') {
          orderData.client_id = parseInt(orderData.client_id);
        }
        if (typeof orderData.payment_cash_amount === 'string') {
          orderData.payment_cash_amount = parseFloat(orderData.payment_cash_amount) || 0;
        }
        if (typeof orderData.payment_term_amount === 'string') {
          orderData.payment_term_amount = parseFloat(orderData.payment_term_amount) || 0;
        }
        if (typeof orderData.expenses === 'string') {
          orderData.expenses = parseFloat(orderData.expenses) || 0;
        }
        if (typeof orderData.gross_value === 'string') {
          orderData.gross_value = parseFloat(orderData.gross_value) || 0;
        }
        if (typeof orderData.net_value === 'string') {
          orderData.net_value = parseFloat(orderData.net_value) || 0;
        }

        // Adicionar o ID do usuário logado ao pedido
        orderData.user_id = req.user!.id;

        // Obter o nome do arquivo do comprovante, se enviado
        const receiptFile = req.file ? req.file.filename : null;

        console.log('📦 Dados do pedido recebidos:', {
          client_id: orderData.client_id,
          order_date: orderData.order_date,
          payment_status: orderData.payment_status,
          payment_method: orderData.payment_method,
          hasReceipt: !!receiptFile,
          receiptFilename: receiptFile
        });

        // Criar o pedido
        const result = await orderModel.createWithItems(orderData);

        // Se o pedido foi criado com sucesso e há comprovante, criar registro de pagamento inicial
        if (result.success && result.data && receiptFile) {
          const paymentStatus = orderData.payment_status || 'Pendente';

          // Só criar pagamento inicial se houve pagamento (à vista ou entrada)
          if (paymentStatus === 'Pago' || paymentStatus === 'Parcial') {
            const orderId = result.data.id;

            // Determinar valor do pagamento inicial
            let paymentAmount = 0;
            let paymentMethod = orderData.payment_method || 'Dinheiro';

            if (paymentStatus === 'Pago') {
              // Pagamento à vista completo - total do pedido
              paymentAmount = parseFloat(result.data.total_value) || 0;
            } else if (paymentStatus === 'Parcial') {
              // Entrada em venda a prazo - valor em dinheiro
              paymentAmount = orderData.payment_cash_amount || 0;
              paymentMethod = 'Entrada';
            }

            if (paymentAmount > 0) {
              // Criar registro de pagamento com comprovante
              await orderPaymentModel.create({
                order_id: orderId,
                amount: paymentAmount,
                payment_method: paymentMethod === 'Misto' ? 'Dinheiro' : paymentMethod,
                notes: 'Pagamento inicial registrado com pedido',
                user_id: req.user!.id,
                payment_date: orderData.order_date,
                receipt_file: receiptFile
              });

              console.log('✅ Pagamento inicial criado com comprovante:', { orderId, paymentAmount, receiptFile });
            } else {
              console.log('⚠️ Comprovante recebido mas valor do pagamento é 0:', { orderId, paymentAmount, paymentStatus });
            }
          } else {
            console.log('⚠️ Comprovante recebido mas status não permite pagamento:', { paymentStatus, orderId: result.data.id });
          }
        } else if (receiptFile && result.success) {
          console.log('⚠️ Comprovante recebido mas condições não atendidas:', {
            hasData: !!result.data,
            paymentStatus: orderData.payment_status
          });
        }

        res.status(result.success ? 201 : 400).json(result);
      } catch (error) {
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }
    });
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

      // Campos permitidos para atualização
      const allowedFields = [
        'client_id',
        'order_date',
        'delivery_date',
        'delivery_address',
        'payment_method',
        'payment_status',
        'payment_cash_amount',
        'payment_term_amount',
        'payment_installments',
        'payment_due_date',
        'notes',
        'status',
        'expenses',
        'gross_value',
        'net_value',
        'discount',
        'payment_details'
      ];

      const updateData: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      // Verificar se há itens para atualizar
      const hasItems = req.body.items && Array.isArray(req.body.items) && req.body.items.length > 0;

      if (Object.keys(updateData).length === 0 && !hasItems) {
        res.status(400).json({
          success: false,
          error: 'Nenhum campo válido para atualização fornecido'
        });
        return;
      }

      // Se tem itens, recalcular total_value
      if (hasItems) {
        let totalValue = 0;
        for (const item of req.body.items) {
          totalValue += item.quantity * item.unit_price;
        }
        totalValue -= (updateData.discount || req.body.discount || 0);
        updateData.total_value = totalValue;

        // Recalcular paid_amount e pending_amount
        const expenses = updateData.expenses || req.body.expenses || 0;
        updateData.gross_value = totalValue;
        updateData.net_value = totalValue - expenses;

        // Calcular paid/pending baseado no status de pagamento
        const paymentStatus = updateData.payment_status || req.body.payment_status || 'Pendente';
        const paymentCashAmount = updateData.payment_cash_amount || req.body.payment_cash_amount || 0;

        if (paymentStatus === 'Pago') {
          updateData.paid_amount = totalValue;
          updateData.pending_amount = 0;
        } else if (paymentStatus === 'Parcial') {
          updateData.paid_amount = paymentCashAmount;
          updateData.pending_amount = totalValue - paymentCashAmount;
        } else {
          updateData.paid_amount = 0;
          updateData.pending_amount = totalValue;
        }
      }

      // Atualizar dados do pedido
      const result = await orderModel.update(id, updateData);

      // Se tem itens, atualizar os itens do pedido
      if (hasItems && result.success) {
        try {
          // Deletar itens antigos
          await query('DELETE FROM order_items WHERE order_id = $1', [id]);

          // Inserir novos itens
          for (const item of req.body.items) {
            await query(
              `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) 
               VALUES ($1, $2, $3, $4, $5)`,
              [id, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price]
            );
          }
        } catch (itemError) {
          console.error('Erro ao atualizar itens do pedido:', itemError);
        }
      }

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
          console.error('Erro no upload:', err);
          res.status(400).json({
            success: false,
            error: err.message || 'Erro ao fazer upload do comprovante'
          });
          return;
        }

        const orderId = parseInt(req.params.id);
        const { amount, payment_method, notes, payment_date } = req.body;

        console.log('Dados recebidos:', { orderId, amount, payment_method, notes, payment_date, hasFile: !!req.file });

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

      // Verificar se o arquivo existe antes de enviar
      if (!fs.existsSync(filePath)) {
        console.error('Arquivo de comprovante não encontrado:', filePath);
        res.status(404).json({
          success: false,
          error: `Arquivo de comprovante não encontrado no servidor. O arquivo pode ter sido perdido durante uma atualização do sistema. Por favor, faça o upload novamente.`
        });
        return;
      }

      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('Erro ao enviar arquivo de comprovante:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: 'Erro ao enviar arquivo de comprovante'
            });
          }
        }
      });
    } catch (error: any) {
      console.error('Erro ao buscar comprovante:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno do servidor'
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
