import { Router, Request, Response } from 'express';
import { DashboardModel } from '../models/DashboardModel';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const dashboardModel = new DashboardModel();

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

/**
 * GET /api/dashboard/stats
 * Retorna estatísticas gerais do dashboard (KPIs)
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await dashboardModel.getStats(
      startDate as string,
      endDate as string
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas do dashboard',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

/**
 * GET /api/dashboard/monthly-sales
 * Retorna vendas mensais dos últimos 6 meses por localização
 */
router.get('/monthly-sales', async (req: Request, res: Response) => {
  try {
    const monthlySales = await dashboardModel.getMonthlySales();

    res.json({
      success: true,
      data: monthlySales,
    });
  } catch (error) {
    console.error('Erro ao buscar vendas mensais:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar vendas mensais',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

/**
 * GET /api/dashboard/stock-distribution
 * Retorna distribuição de estoque por tipo de produto
 */
router.get('/stock-distribution', async (req: Request, res: Response) => {
  try {
    const stockDistribution = await dashboardModel.getStockDistribution();

    res.json({
      success: true,
      data: stockDistribution,
    });
  } catch (error) {
    console.error('Erro ao buscar distribuição de estoque:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar distribuição de estoque',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

export default router;
