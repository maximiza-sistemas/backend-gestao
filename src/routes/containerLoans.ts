import { Router, Request, Response } from 'express';
import { ContainerLoanModel } from '../models/ContainerLoanModel';
import { requireAuth } from '../middleware/auth';
import { activityLogger } from '../middleware/logger';
import rateLimit from 'express-rate-limit';

const router = Router();
const containerLoanModel = new ContainerLoanModel();

// Rate limiters
const createLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 30,
    message: { success: false, error: 'Muitas requisições. Tente novamente em breve.' }
});

// GET /container-loans - Listar todos os empréstimos
router.get('/',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await containerLoanModel.findAllWithDetails({
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 50,
                status: req.query.status as string,
                direction: req.query.direction as string,
                entity_type: req.query.entity_type as string,
                search: req.query.search as string,
                location_id: req.query.location_id ? parseInt(req.query.location_id as string) : undefined
            });
            res.json(result);
        } catch (error) {
            console.error('Erro ao listar empréstimos:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
);

// GET /container-loans/stats - Estatísticas de empréstimos
router.get('/stats',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await containerLoanModel.getStats();
            res.json(result);
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
);

// GET /container-loans/:id - Buscar empréstimo por ID
router.get('/:id',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ success: false, error: 'ID inválido' });
                return;
            }
            const result = await containerLoanModel.findById(id);
            res.json(result);
        } catch (error) {
            console.error('Erro ao buscar empréstimo:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
);

// POST /container-loans - Criar novo empréstimo
router.post('/',
    requireAuth,
    createLimiter,
    activityLogger('Criou empréstimo de recipiente', 'container_loans'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const {
                loan_type,
                direction,
                product_id,
                quantity,
                entity_type,
                entity_name,
                entity_contact,
                entity_address,
                loan_date,
                expected_return_date,
                notes,
                location_id
            } = req.body;

            // Validações básicas
            if (!loan_type || !direction || !product_id || !quantity || !entity_type || !entity_name) {
                res.status(400).json({
                    success: false,
                    error: 'Campos obrigatórios: loan_type, direction, product_id, quantity, entity_type, entity_name'
                });
                return;
            }

            if (quantity <= 0) {
                res.status(400).json({
                    success: false,
                    error: 'Quantidade deve ser maior que zero'
                });
                return;
            }

            const result = await containerLoanModel.create({
                loan_type,
                direction,
                product_id,
                quantity,
                entity_type,
                entity_name,
                entity_contact: entity_contact || null,
                entity_address: entity_address || null,
                loan_date: loan_date || new Date().toISOString().split('T')[0],
                expected_return_date: expected_return_date || null,
                notes: notes || null,
                location_id,
                user_id: req.user?.id
            });

            res.status(result.success ? 201 : 400).json(result);
        } catch (error) {
            console.error('Erro ao criar empréstimo:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
);

// PUT /container-loans/:id - Atualizar empréstimo
router.put('/:id',
    requireAuth,
    createLimiter,
    activityLogger('Atualizou empréstimo de recipiente', 'container_loans'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ success: false, error: 'ID inválido' });
                return;
            }

            const result = await containerLoanModel.update(id, req.body);
            res.json(result);
        } catch (error) {
            console.error('Erro ao atualizar empréstimo:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
);

// POST /container-loans/:id/return - Devolver empréstimo
router.post('/:id/return',
    requireAuth,
    createLimiter,
    activityLogger('Registrou devolução de empréstimo', 'container_loans'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ success: false, error: 'ID inválido' });
                return;
            }

            const { actual_return_date } = req.body;
            const result = await containerLoanModel.returnLoan(id, actual_return_date);
            res.json(result);
        } catch (error) {
            console.error('Erro ao devolver empréstimo:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
);

// DELETE /container-loans/:id - Cancelar empréstimo
router.delete('/:id',
    requireAuth,
    createLimiter,
    activityLogger('Cancelou empréstimo de recipiente', 'container_loans'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ success: false, error: 'ID inválido' });
                return;
            }

            const result = await containerLoanModel.cancelLoan(id);
            res.json(result);
        } catch (error) {
            console.error('Erro ao cancelar empréstimo:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
);

// POST /container-loans/:id/contract - Upload de contrato PDF
import { uploadContract, deleteContractFile, getContractPath } from '../middleware/upload';
import { query } from '../config/database';
import path from 'path';
import fs from 'fs';

router.post('/:id/contract',
    requireAuth,
    createLimiter,
    (req: Request, res: Response) => {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ success: false, error: 'ID inválido' });
            return;
        }

        uploadContract(req, res, async (err: any) => {
            if (err) {
                res.status(400).json({
                    success: false,
                    error: err.message || 'Erro ao fazer upload do contrato'
                });
                return;
            }

            if (!req.file) {
                res.status(400).json({
                    success: false,
                    error: 'Nenhum arquivo enviado'
                });
                return;
            }

            try {
                // Verificar se o empréstimo existe
                const loanCheck = await query(
                    'SELECT id, contract_file FROM container_loans WHERE id = $1',
                    [id]
                );

                if (loanCheck.rowCount === 0) {
                    // Deletar arquivo enviado pois empréstimo não existe
                    deleteContractFile(req.file.filename);
                    res.status(404).json({
                        success: false,
                        error: 'Empréstimo não encontrado'
                    });
                    return;
                }

                // Se já existe um contrato anterior, deletar
                const oldContract = loanCheck.rows[0].contract_file;
                if (oldContract) {
                    deleteContractFile(oldContract);
                }

                // Atualizar banco com nome do arquivo
                await query(
                    'UPDATE container_loans SET contract_file = $1, updated_at = NOW() WHERE id = $2',
                    [req.file.filename, id]
                );

                res.json({
                    success: true,
                    message: 'Contrato enviado com sucesso',
                    data: {
                        filename: req.file.filename,
                        originalName: req.file.originalname,
                        size: req.file.size
                    }
                });
            } catch (error) {
                console.error('Erro ao salvar contrato:', error);
                // Deletar arquivo em caso de erro
                deleteContractFile(req.file.filename);
                res.status(500).json({
                    success: false,
                    error: 'Erro interno do servidor'
                });
            }
        });
    }
);

// GET /container-loans/:id/contract - Download de contrato
router.get('/:id/contract',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ success: false, error: 'ID inválido' });
                return;
            }

            const result = await query(
                'SELECT contract_file FROM container_loans WHERE id = $1',
                [id]
            );

            if (result.rowCount === 0) {
                res.status(404).json({ success: false, error: 'Empréstimo não encontrado' });
                return;
            }

            const contractFile = result.rows[0].contract_file;
            if (!contractFile) {
                res.status(404).json({ success: false, error: 'Nenhum contrato encontrado para este empréstimo' });
                return;
            }

            const filePath = getContractPath(contractFile);
            if (!fs.existsSync(filePath)) {
                res.status(404).json({ success: false, error: 'Arquivo de contrato não encontrado' });
                return;
            }

            res.download(filePath, contractFile);
        } catch (error) {
            console.error('Erro ao baixar contrato:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
);

// DELETE /container-loans/:id/contract - Deletar contrato
router.delete('/:id/contract',
    requireAuth,
    createLimiter,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ success: false, error: 'ID inválido' });
                return;
            }

            const result = await query(
                'SELECT contract_file FROM container_loans WHERE id = $1',
                [id]
            );

            if (result.rowCount === 0) {
                res.status(404).json({ success: false, error: 'Empréstimo não encontrado' });
                return;
            }

            const contractFile = result.rows[0].contract_file;
            if (!contractFile) {
                res.status(404).json({ success: false, error: 'Nenhum contrato para deletar' });
                return;
            }

            // Deletar arquivo
            deleteContractFile(contractFile);

            // Atualizar banco
            await query(
                'UPDATE container_loans SET contract_file = NULL, updated_at = NOW() WHERE id = $1',
                [id]
            );

            res.json({
                success: true,
                message: 'Contrato deletado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao deletar contrato:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
);

// DELETE /container-loans/:id/permanent - Excluir empréstimo permanentemente
router.delete('/:id/permanent',
    requireAuth,
    createLimiter,
    activityLogger('Excluiu empréstimo de recipiente permanentemente', 'container_loans'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ success: false, error: 'ID inválido' });
                return;
            }

            // Verificar se empréstimo existe e obter contrato
            const loanCheck = await query(
                'SELECT id, contract_file FROM container_loans WHERE id = $1',
                [id]
            );

            if (loanCheck.rowCount === 0) {
                res.status(404).json({
                    success: false,
                    error: 'Empréstimo não encontrado'
                });
                return;
            }

            // Deletar arquivo de contrato se existir
            const contractFile = loanCheck.rows[0].contract_file;
            if (contractFile) {
                deleteContractFile(contractFile);
            }

            // Excluir do banco de dados
            await query('DELETE FROM container_loans WHERE id = $1', [id]);

            res.json({
                success: true,
                message: 'Empréstimo excluído permanentemente'
            });
        } catch (error) {
            console.error('Erro ao excluir empréstimo:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    }
);

export default router;

