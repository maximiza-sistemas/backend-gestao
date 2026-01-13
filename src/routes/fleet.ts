import { Router, Request, Response } from 'express';
import { FleetModel } from '../models/FleetModel';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

// ====================================
// ROTAS DE VEÍCULOS
// ====================================

// Listar todos os veículos
router.get('/vehicles', async (req: Request, res: Response): Promise<Response> => {
    try {
        const { status, type } = req.query;
        const vehicles = await FleetModel.findAllVehicles({
            status: status as string,
            type: type as string
        });
        return res.json({ success: true, data: vehicles });
    } catch (error) {
        console.error('Erro ao buscar veículos:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar veículos' 
        });
    }
});

// Buscar veículo por ID
router.get('/vehicles/:id', async (req: Request, res: Response): Promise<Response> => {
    try {
        const vehicle = await FleetModel.findVehicleById(parseInt(req.params.id));
        
        if (!vehicle) {
            return res.status(404).json({ 
                success: false, 
                error: 'Veículo não encontrado' 
            });
        }
        
        return res.json({ success: true, data: vehicle });
    } catch (error) {
        console.error('Erro ao buscar veículo:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar veículo' 
        });
    }
});

// Criar novo veículo
router.post('/vehicles', async (req: Request, res: Response): Promise<Response> => {
    try {
        const vehicle = await FleetModel.createVehicle(req.body);
        return res.status(201).json({ success: true, data: vehicle });
    } catch (error) {
        console.error('Erro ao criar veículo:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao criar veículo' 
        });
    }
});

// Atualizar veículo
router.put('/vehicles/:id', async (req: Request, res: Response): Promise<Response> => {
    try {
        const vehicle = await FleetModel.updateVehicle(
            parseInt(req.params.id),
            req.body
        );
        return res.json({ success: true, data: vehicle });
    } catch (error) {
        console.error('Erro ao atualizar veículo:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao atualizar veículo' 
        });
    }
});

// Deletar veículo
router.delete('/vehicles/:id', async (req: Request, res: Response): Promise<Response> => {
    try {
        await FleetModel.deleteVehicle(parseInt(req.params.id));
        return res.json({ success: true, message: 'Veículo deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar veículo:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao deletar veículo' 
        });
    }
});

// ====================================
// ROTAS DE MOTORISTAS
// ====================================

// Listar todos os motoristas
router.get('/drivers', async (req: Request, res: Response): Promise<Response> => {
    try {
        const { status } = req.query;
        const drivers = await FleetModel.findAllDrivers(status as string);
        return res.json({ success: true, data: drivers });
    } catch (error) {
        console.error('Erro ao buscar motoristas:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar motoristas' 
        });
    }
});

// Buscar motorista por ID
router.get('/drivers/:id', async (req: Request, res: Response): Promise<Response> => {
    try {
        const driver = await FleetModel.findDriverById(parseInt(req.params.id));
        
        if (!driver) {
            return res.status(404).json({ 
                success: false, 
                error: 'Motorista não encontrado' 
            });
        }
        
        return res.json({ success: true, data: driver });
    } catch (error) {
        console.error('Erro ao buscar motorista:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar motorista' 
        });
    }
});

// Criar novo motorista
router.post('/drivers', async (req: Request, res: Response): Promise<Response> => {
    try {
        const driver = await FleetModel.createDriver(req.body);
        return res.status(201).json({ success: true, data: driver });
    } catch (error) {
        console.error('Erro ao criar motorista:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao criar motorista' 
        });
    }
});

// Atualizar motorista
router.put('/drivers/:id', async (req: Request, res: Response): Promise<Response> => {
    try {
        const driver = await FleetModel.updateDriver(
            parseInt(req.params.id),
            req.body
        );
        return res.json({ success: true, data: driver });
    } catch (error) {
        console.error('Erro ao atualizar motorista:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao atualizar motorista' 
        });
    }
});

// ====================================
// ROTAS DE MANUTENÇÕES
// ====================================

// Listar todas as manutenções
router.get('/maintenance', async (req: Request, res: Response): Promise<Response> => {
    try {
        const { status, start_date, end_date } = req.query;
        const maintenance = await FleetModel.findAllMaintenance({
            status: status as string,
            start_date: start_date ? new Date(start_date as string) : undefined,
            end_date: end_date ? new Date(end_date as string) : undefined
        });
        return res.json({ success: true, data: maintenance });
    } catch (error) {
        console.error('Erro ao buscar manutenções:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar manutenções' 
        });
    }
});

// Buscar manutenções de um veículo
router.get('/vehicles/:vehicleId/maintenance', async (req: Request, res: Response): Promise<Response> => {
    try {
        const maintenance = await FleetModel.findMaintenanceByVehicle(
            parseInt(req.params.vehicleId)
        );
        return res.json({ success: true, data: maintenance });
    } catch (error) {
        console.error('Erro ao buscar manutenções:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar manutenções' 
        });
    }
});

// Criar nova manutenção
router.post('/maintenance', async (req: Request, res: Response): Promise<Response> => {
    try {
        const maintenance = await FleetModel.createMaintenance(req.body);
        return res.status(201).json({ success: true, data: maintenance });
    } catch (error) {
        console.error('Erro ao criar manutenção:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao criar manutenção' 
        });
    }
});

// Atualizar status da manutenção
router.patch('/maintenance/:id/status', async (req: Request, res: Response): Promise<Response> => {
    try {
        const { status, end_date } = req.body;
        
        await FleetModel.updateMaintenanceStatus(
            parseInt(req.params.id),
            status,
            end_date ? new Date(end_date) : undefined
        );
        
        return res.json({ success: true, message: 'Status atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao atualizar status' 
        });
    }
});

// ====================================
// ROTAS DE ABASTECIMENTOS
// ====================================

// Buscar abastecimentos de um veículo
router.get('/vehicles/:vehicleId/fueling', async (req: Request, res: Response): Promise<Response> => {
    try {
        const fueling = await FleetModel.findFuelingByVehicle(
            parseInt(req.params.vehicleId)
        );
        return res.json({ success: true, data: fueling });
    } catch (error) {
        console.error('Erro ao buscar abastecimentos:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar abastecimentos' 
        });
    }
});

// Criar novo abastecimento
router.post('/fueling', async (req: Request, res: Response): Promise<Response> => {
    try {
        const fueling = await FleetModel.createFueling(req.body);
        return res.status(201).json({ success: true, data: fueling });
    } catch (error) {
        console.error('Erro ao criar abastecimento:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao criar abastecimento' 
        });
    }
});

// ====================================
// ROTAS DE VIAGENS
// ====================================

// Buscar viagens de um veículo
router.get('/vehicles/:vehicleId/trips', async (req: Request, res: Response): Promise<Response> => {
    try {
        const trips = await FleetModel.findTripsByVehicle(
            parseInt(req.params.vehicleId)
        );
        return res.json({ success: true, data: trips });
    } catch (error) {
        console.error('Erro ao buscar viagens:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar viagens' 
        });
    }
});

// Criar nova viagem
router.post('/trips', async (req: Request, res: Response): Promise<Response> => {
    try {
        const trip = await FleetModel.createTrip(req.body);
        return res.status(201).json({ success: true, data: trip });
    } catch (error) {
        console.error('Erro ao criar viagem:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao criar viagem' 
        });
    }
});

// Atualizar viagem
router.put('/trips/:id', async (req: Request, res: Response): Promise<Response> => {
    try {
        const trip = await FleetModel.updateTrip(
            parseInt(req.params.id),
            req.body
        );
        return res.json({ success: true, data: trip });
    } catch (error) {
        console.error('Erro ao atualizar viagem:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao atualizar viagem' 
        });
    }
});

// ====================================
// ROTAS DE DESPESAS
// ====================================

// Buscar despesas de um veículo
router.get('/vehicles/:vehicleId/expenses', async (req: Request, res: Response): Promise<Response> => {
    try {
        const expenses = await FleetModel.findExpensesByVehicle(
            parseInt(req.params.vehicleId)
        );
        return res.json({ success: true, data: expenses });
    } catch (error) {
        console.error('Erro ao buscar despesas:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar despesas' 
        });
    }
});

// Criar nova despesa
router.post('/expenses', async (req: Request, res: Response): Promise<Response> => {
    try {
        const expense = await FleetModel.createExpense(req.body);
        return res.status(201).json({ success: true, data: expense });
    } catch (error) {
        console.error('Erro ao criar despesa:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao criar despesa' 
        });
    }
});

// ====================================
// ROTAS DE RESUMO
// ====================================

// Obter resumo da frota
router.get('/summary', async (req: Request, res: Response): Promise<Response> => {
    try {
        const summary = await FleetModel.getFleetSummary();
        return res.json({ success: true, data: summary });
    } catch (error) {
        console.error('Erro ao buscar resumo:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar resumo da frota' 
        });
    }
});

export default router;
