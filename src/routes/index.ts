import { Router } from 'express';
import { requireAuth } from '../middleware/auth';

// Importar todas as rotas
import authRoutes from './auth';
import userRoutes from './users';
import clientRoutes from './clients';
import productRoutes from './products';
import orderRoutes from './orders';
import stockRoutes from './stock';
import reportRoutes from './reports';
import dashboardRoutes from './dashboard';
import deliveryRoutes from './deliveryRoutes';
import migrationRoutes from './migration';
import financialRoutes from './financial';
import fleetRoutes from './fleet';
import supplierRoutes from './suppliers';
import containerLoanRoutes from './containerLoans';
import locationRoutes from './locations';

const router = Router();

// Rota de health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API da Distribuidora de Gás funcionando',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Rotas de autenticação (não requerem auth)
router.use('/auth', authRoutes);

// Rotas de migração (temporário - apenas para desenvolvimento)
router.use('/migration', migrationRoutes);

// Aplicar middleware de autenticação para todas as outras rotas, mas ignorar preflight
router.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return requireAuth(req, res, next);
});

// Rotas protegidas
router.use('/users', userRoutes);
router.use('/clients', clientRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/stock', stockRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/delivery-routes', deliveryRoutes);
router.use('/financial', financialRoutes);
router.use('/fleet', fleetRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/container-loans', containerLoanRoutes);
router.use('/locations', locationRoutes);

// Rota 404 para endpoints não encontrados
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado',
    path: req.originalUrl,
    method: req.method
  });
});

export default router;
