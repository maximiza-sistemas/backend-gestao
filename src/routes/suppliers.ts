import { Router, Request, Response } from 'express';
import { SupplierModel } from '../models/SupplierModel';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

// Listar todos os fornecedores
router.get('/', async (req: Request, res: Response): Promise<Response> => {
    try {
        const { status, category, search, page, limit } = req.query;
        
        // Se tiver paginação
        if (page) {
            const pageNum = parseInt(page as string) || 1;
            const limitNum = parseInt(limit as string) || 10;
            
            const result = await SupplierModel.findPaginated(
                pageNum,
                limitNum,
                {
                    status: status as string,
                    category: category as string,
                    search: search as string
                }
            );
            
            return res.json({
                success: true,
                data: result.data,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: result.total,
                    totalPages: result.totalPages
                }
            });
        }
        
        // Sem paginação
        const suppliers = await SupplierModel.findAll({
            status: status as string,
            category: category as string,
            search: search as string
        });
        
        return res.json({ success: true, data: suppliers });
    } catch (error) {
        console.error('Erro ao buscar fornecedores:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar fornecedores' 
        });
    }
});

// Buscar fornecedor por ID
router.get('/:id', async (req: Request, res: Response): Promise<Response> => {
    try {
        const supplier = await SupplierModel.findById(parseInt(req.params.id));
        
        if (!supplier) {
            return res.status(404).json({ 
                success: false, 
                error: 'Fornecedor não encontrado' 
            });
        }
        
        return res.json({ success: true, data: supplier });
    } catch (error) {
        console.error('Erro ao buscar fornecedor:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar fornecedor' 
        });
    }
});

// Criar novo fornecedor
router.post('/', async (req: Request, res: Response): Promise<Response> => {
    try {
        const supplier = await SupplierModel.create(req.body);
        return res.status(201).json({ success: true, data: supplier });
    } catch (error: any) {
        console.error('Erro ao criar fornecedor:', error);
        
        if (error.message === 'CNPJ já cadastrado') {
            return res.status(400).json({ 
                success: false, 
                error: 'CNPJ já cadastrado' 
            });
        }
        
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao criar fornecedor' 
        });
    }
});

// Atualizar fornecedor
router.put('/:id', async (req: Request, res: Response): Promise<Response> => {
    try {
        const supplier = await SupplierModel.update(
            parseInt(req.params.id),
            req.body
        );
        return res.json({ success: true, data: supplier });
    } catch (error: any) {
        console.error('Erro ao atualizar fornecedor:', error);
        
        if (error.message === 'Fornecedor não encontrado') {
            return res.status(404).json({ 
                success: false, 
                error: 'Fornecedor não encontrado' 
            });
        }
        
        if (error.message === 'CNPJ já cadastrado para outro fornecedor') {
            return res.status(400).json({ 
                success: false, 
                error: 'CNPJ já cadastrado para outro fornecedor' 
            });
        }
        
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao atualizar fornecedor' 
        });
    }
});

// Deletar fornecedor
router.delete('/:id', async (req: Request, res: Response): Promise<Response> => {
    try {
        await SupplierModel.delete(parseInt(req.params.id));
        return res.json({ success: true, message: 'Fornecedor excluído com sucesso' });
    } catch (error: any) {
        console.error('Erro ao deletar fornecedor:', error);
        
        if (error.message === 'Fornecedor não encontrado') {
            return res.status(404).json({ 
                success: false, 
                error: 'Fornecedor não encontrado' 
            });
        }
        
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao deletar fornecedor' 
        });
    }
});

// Buscar categorias únicas
router.get('/data/categories', async (req: Request, res: Response): Promise<Response> => {
    try {
        const categories = await SupplierModel.getCategories();
        return res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar categorias' 
        });
    }
});

// Estatísticas dos fornecedores
router.get('/data/statistics', async (req: Request, res: Response): Promise<Response> => {
    try {
        const statistics = await SupplierModel.getStatistics();
        return res.json({ success: true, data: statistics });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar estatísticas' 
        });
    }
});

export default router;


