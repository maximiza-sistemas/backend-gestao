import { Router, Request, Response } from 'express';
import fs from 'fs';
import { FinancialModel } from '../models/FinancialModel';
import { authenticateToken } from '../middleware/auth';
import { uploadReceipt, getReceiptPath } from '../middleware/upload';

const router = Router();

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

// ====================================
// ROTAS DE CATEGORIAS
// ====================================

// Listar todas as categorias
router.get('/categories', async (req: Request, res: Response) => {
    try {
        const { type } = req.query;
        const categories = await FinancialModel.findAllCategories(type as 'Receita' | 'Despesa');
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar categorias'
        });
    }
});

// Criar nova categoria
router.post('/categories', async (req: Request, res: Response) => {
    try {
        const category = await FinancialModel.createCategory(req.body);
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao criar categoria'
        });
    }
});

// ====================================
// ROTAS DE CONTAS
// ====================================

// Listar todas as contas
router.get('/accounts', async (req: Request, res: Response) => {
    try {
        const accounts = await FinancialModel.findAllAccounts();
        res.json({ success: true, data: accounts });
    } catch (error) {
        console.error('Erro ao buscar contas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar contas'
        });
    }
});

// Buscar conta por ID
router.get('/accounts/:id', async (req: Request, res: Response): Promise<Response> => {
    try {
        const account = await FinancialModel.findAccountById(parseInt(req.params.id));

        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'Conta não encontrada'
            });
        }

        return res.json({ success: true, data: account });
    } catch (error) {
        console.error('Erro ao buscar conta:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar conta'
        });
    }
});

// Criar nova conta
router.post('/accounts', async (req: Request, res: Response) => {
    try {
        const account = await FinancialModel.createAccount(req.body);
        res.status(201).json({ success: true, data: account });
    } catch (error) {
        console.error('Erro ao criar conta:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao criar conta'
        });
    }
});

// ====================================
// ROTAS DE TRANSAÇÕES
// ====================================

// Listar todas as transações com filtros
router.get('/transactions', async (req: Request, res: Response) => {
    try {
        const filters = {
            type: req.query.type as string,
            status: req.query.status as string,
            category_id: req.query.category_id ? parseInt(req.query.category_id as string) : undefined,
            account_id: req.query.account_id ? parseInt(req.query.account_id as string) : undefined,
            client_id: req.query.client_id ? parseInt(req.query.client_id as string) : undefined,
            date_from: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
            date_to: req.query.date_to ? new Date(req.query.date_to as string) : undefined
        };

        const transactions = await FinancialModel.findAllTransactions(filters);
        res.json({ success: true, data: transactions });
    } catch (error) {
        console.error('Erro ao buscar transações:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar transações'
        });
    }
});

// Buscar transação por ID
router.get('/transactions/:id', async (req: Request, res: Response): Promise<Response> => {
    try {
        const transaction = await FinancialModel.findTransactionById(parseInt(req.params.id));

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transação não encontrada'
            });
        }

        return res.json({ success: true, data: transaction });
    } catch (error) {
        console.error('Erro ao buscar transação:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar transação'
        });
    }
});

// Download do comprovante de uma transação
router.get('/transactions/:id/receipt', async (req: Request, res: Response): Promise<any> => {
    try {
        const transaction = await FinancialModel.findTransactionById(parseInt(req.params.id));

        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transação não encontrada' });
        }

        if (!transaction.attachment_url) {
            return res.status(404).json({ success: false, error: 'Esta transação não possui comprovante anexado' });
        }

        const filePath = getReceiptPath(transaction.attachment_url);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'Arquivo de comprovante não encontrado no servidor. O arquivo pode ter sido perdido durante uma atualização do sistema.'
            });
        }

        res.sendFile(filePath);
    } catch (error) {
        console.error('Erro ao buscar comprovante:', error);
        return res.status(500).json({ success: false, error: 'Erro ao buscar comprovante' });
    }
});

// Criar nova transação (com suporte a upload de comprovante)
router.post('/transactions', (req: Request, res: Response): void => {
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

            const userId = (req as any).user.id;
            const data = { ...req.body };

            // Se um arquivo foi enviado, salvar o nome do arquivo
            if (req.file) {
                data.attachment_url = req.file.filename;
            }

            // Converter campos numéricos que vêm como string do FormData
            if (data.amount) data.amount = parseFloat(data.amount);
            if (data.category_id) data.category_id = data.category_id === 'null' ? null : Number(data.category_id);
            if (data.account_id) data.account_id = Number(data.account_id);
            if (data.destination_account_id) data.destination_account_id = data.destination_account_id === 'null' ? null : Number(data.destination_account_id);
            if (data.client_id) data.client_id = data.client_id === 'null' ? null : Number(data.client_id);
            if (data.supplier_id) data.supplier_id = data.supplier_id === 'null' ? null : Number(data.supplier_id);

            const transaction = await FinancialModel.createTransaction(data, userId);
            res.status(201).json({ success: true, data: transaction });
        } catch (error) {
            console.error('Erro ao criar transação:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao criar transação'
            });
        }
    });
});

// Atualizar transação
router.put('/transactions/:id', async (req: Request, res: Response) => {
    try {
        const transaction = await FinancialModel.updateTransaction(
            parseInt(req.params.id),
            req.body
        );
        res.json({ success: true, data: transaction });
    } catch (error) {
        console.error('Erro ao atualizar transação:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar transação'
        });
    }
});

// Deletar transação
router.delete('/transactions/:id', async (req: Request, res: Response) => {
    try {
        await FinancialModel.deleteTransaction(parseInt(req.params.id));
        res.json({ success: true, message: 'Transação deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar transação:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao deletar transação'
        });
    }
});

// Atualizar status da transação
router.patch('/transactions/:id/status', async (req: Request, res: Response) => {
    try {
        const { status, payment_date } = req.body;

        await FinancialModel.updateTransactionStatus(
            parseInt(req.params.id),
            status,
            payment_date ? new Date(payment_date) : undefined
        );

        res.json({ success: true, message: 'Status atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar status'
        });
    }
});

// ====================================
// ROTAS DE RESUMO E RELATÓRIOS
// ====================================

// Obter resumo financeiro
router.get('/summary', async (req: Request, res: Response) => {
    try {
        const filters = {
            date_from: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
            date_to: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
            account_id: req.query.account_id ? parseInt(req.query.account_id as string) : undefined
        };

        const summary = await FinancialModel.getFinancialSummary(filters);
        res.json({ success: true, data: summary });
    } catch (error) {
        console.error('Erro ao buscar resumo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar resumo financeiro'
        });
    }
});

// Obter fluxo de caixa
router.get('/cash-flow', async (req: Request, res: Response): Promise<Response> => {
    try {
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'Datas de início e fim são obrigatórias'
            });
        }

        const cashFlow = await FinancialModel.getCashFlow(
            new Date(start_date as string),
            new Date(end_date as string)
        );

        return res.json({ success: true, data: cashFlow });
    } catch (error) {
        console.error('Erro ao buscar fluxo de caixa:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar fluxo de caixa'
        });
    }
});

// Obter breakdown por categoria
router.get('/category-breakdown', async (req: Request, res: Response): Promise<Response> => {
    try {
        const { type, start_date, end_date } = req.query;

        if (!type || (type !== 'Receita' && type !== 'Despesa')) {
            return res.status(400).json({
                success: false,
                error: 'Tipo deve ser "Receita" ou "Despesa"'
            });
        }

        const breakdown = await FinancialModel.getCategoryBreakdown(
            type as 'Receita' | 'Despesa',
            start_date ? new Date(start_date as string) : undefined,
            end_date ? new Date(end_date as string) : undefined
        );

        return res.json({ success: true, data: breakdown });
    } catch (error) {
        console.error('Erro ao buscar breakdown:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar breakdown por categoria'
        });
    }
});

export default router;