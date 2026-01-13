"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FleetModel = void 0;
const database_1 = require("../config/database");
class FleetModel {
    static async query(text, params) {
        return database_1.pool.query(text, params);
    }
    static async findAllVehicles(filters) {
        let query = 'SELECT * FROM vehicles WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (filters) {
            if (filters.status) {
                query += ` AND status = $${paramIndex}`;
                params.push(filters.status);
                paramIndex++;
            }
            if (filters.type) {
                query += ` AND type = $${paramIndex}`;
                params.push(filters.type);
                paramIndex++;
            }
        }
        query += ' ORDER BY plate';
        const result = await this.query(query, params);
        return result.rows;
    }
    static async findVehicleById(id) {
        const result = await this.query('SELECT * FROM vehicles WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    static async createVehicle(data) {
        const result = await this.query(`INSERT INTO vehicles (
                plate, model, brand, year, type, fuel_type, 
                capacity_kg, capacity_units, mileage, status,
                insurance_expiry, license_expiry, inspection_expiry,
                owner_type, monthly_cost, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *`, [
            data.plate, data.model, data.brand, data.year, data.type, data.fuel_type,
            data.capacity_kg, data.capacity_units, data.mileage || 0, data.status || 'Disponível',
            data.insurance_expiry, data.license_expiry, data.inspection_expiry,
            data.owner_type, data.monthly_cost, data.notes
        ]);
        return result.rows[0];
    }
    static async updateVehicle(id, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        const updateableFields = [
            'model', 'brand', 'year', 'type', 'fuel_type',
            'capacity_kg', 'capacity_units', 'mileage', 'status',
            'last_maintenance_date', 'next_maintenance_date', 'next_maintenance_km',
            'insurance_expiry', 'license_expiry', 'inspection_expiry',
            'owner_type', 'monthly_cost', 'notes'
        ];
        for (const field of updateableFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = $${paramIndex}`);
                values.push(data[field]);
                paramIndex++;
            }
        }
        if (fields.length === 0) {
            throw new Error('Nenhum campo para atualizar');
        }
        values.push(id);
        const result = await this.query(`UPDATE vehicles SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
        return result.rows[0];
    }
    static async deleteVehicle(id) {
        await this.query('DELETE FROM vehicles WHERE id = $1', [id]);
    }
    static async findAllDrivers(status) {
        let query = 'SELECT * FROM drivers';
        const params = [];
        if (status) {
            query += ' WHERE status = $1';
            params.push(status);
        }
        query += ' ORDER BY name';
        const result = await this.query(query, params);
        return result.rows;
    }
    static async findDriverById(id) {
        const result = await this.query('SELECT * FROM drivers WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    static async createDriver(data) {
        const result = await this.query(`INSERT INTO drivers (
                name, cpf, cnh_number, cnh_category, cnh_expiry,
                phone, emergency_contact, emergency_phone, hire_date, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`, [
            data.name, data.cpf, data.cnh_number, data.cnh_category, data.cnh_expiry,
            data.phone, data.emergency_contact, data.emergency_phone,
            data.hire_date, data.status || 'Ativo'
        ]);
        return result.rows[0];
    }
    static async updateDriver(id, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        const updateableFields = [
            'name', 'phone', 'emergency_contact', 'emergency_phone',
            'cnh_category', 'cnh_expiry', 'status'
        ];
        for (const field of updateableFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = $${paramIndex}`);
                values.push(data[field]);
                paramIndex++;
            }
        }
        if (fields.length === 0) {
            throw new Error('Nenhum campo para atualizar');
        }
        values.push(id);
        const result = await this.query(`UPDATE drivers SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
        return result.rows[0];
    }
    static async findMaintenanceByVehicle(vehicleId) {
        const result = await this.query(`SELECT m.*, v.plate, v.model, v.brand
             FROM vehicle_maintenance m
             JOIN vehicles v ON m.vehicle_id = v.id
             WHERE m.vehicle_id = $1
             ORDER BY m.start_date DESC`, [vehicleId]);
        return result.rows.map((row) => ({
            ...row,
            vehicle: {
                id: row.vehicle_id,
                plate: row.plate,
                model: row.model,
                brand: row.brand
            }
        }));
    }
    static async findAllMaintenance(filters) {
        let query = `
            SELECT m.*, v.plate, v.model, v.brand
            FROM vehicle_maintenance m
            JOIN vehicles v ON m.vehicle_id = v.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        if (filters) {
            if (filters.status) {
                query += ` AND m.status = $${paramIndex}`;
                params.push(filters.status);
                paramIndex++;
            }
            if (filters.start_date) {
                query += ` AND m.start_date >= $${paramIndex}`;
                params.push(filters.start_date);
                paramIndex++;
            }
            if (filters.end_date) {
                query += ` AND m.start_date <= $${paramIndex}`;
                params.push(filters.end_date);
                paramIndex++;
            }
        }
        query += ' ORDER BY m.start_date DESC';
        const result = await this.query(query, params);
        return result.rows.map((row) => ({
            ...row,
            vehicle: {
                id: row.vehicle_id,
                plate: row.plate,
                model: row.model,
                brand: row.brand
            }
        }));
    }
    static async createMaintenance(data) {
        const result = await this.query(`INSERT INTO vehicle_maintenance (
                vehicle_id, maintenance_type, description, service_provider,
                start_date, end_date, mileage_at_service, cost,
                parts_replaced, next_maintenance_km, next_maintenance_date,
                invoice_number, warranty_until, performed_by, status, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *`, [
            data.vehicle_id, data.maintenance_type, data.description, data.service_provider,
            data.start_date, data.end_date, data.mileage_at_service, data.cost,
            data.parts_replaced, data.next_maintenance_km, data.next_maintenance_date,
            data.invoice_number, data.warranty_until, data.performed_by,
            data.status || 'Agendada', data.notes
        ]);
        return result.rows[0];
    }
    static async updateMaintenanceStatus(id, status, endDate) {
        const query = endDate
            ? 'UPDATE vehicle_maintenance SET status = $1, end_date = $2 WHERE id = $3'
            : 'UPDATE vehicle_maintenance SET status = $1 WHERE id = $2';
        const params = endDate ? [status, endDate, id] : [status, id];
        await this.query(query, params);
    }
    static async findFuelingByVehicle(vehicleId) {
        const result = await this.query(`SELECT f.*, v.plate, v.model, d.name as driver_name
             FROM vehicle_fueling f
             JOIN vehicles v ON f.vehicle_id = v.id
             LEFT JOIN drivers d ON f.driver_id = d.id
             WHERE f.vehicle_id = $1
             ORDER BY f.fueling_date DESC, f.fueling_time DESC`, [vehicleId]);
        return result.rows.map((row) => ({
            ...row,
            vehicle: {
                id: row.vehicle_id,
                plate: row.plate,
                model: row.model
            },
            driver: row.driver_id ? {
                id: row.driver_id,
                name: row.driver_name
            } : undefined
        }));
    }
    static async createFueling(data) {
        let kmDriven = data.km_driven;
        let fuelEfficiency = data.fuel_efficiency;
        if (data.vehicle_id && data.mileage && !kmDriven) {
            const lastFueling = await this.query(`SELECT mileage FROM vehicle_fueling 
                 WHERE vehicle_id = $1 AND mileage < $2 
                 ORDER BY fueling_date DESC, fueling_time DESC 
                 LIMIT 1`, [data.vehicle_id, data.mileage]);
            if (lastFueling.rows.length > 0) {
                kmDriven = data.mileage - lastFueling.rows[0].mileage;
                if (data.quantity_liters && data.quantity_liters > 0) {
                    fuelEfficiency = kmDriven / data.quantity_liters;
                }
            }
        }
        const result = await this.query(`INSERT INTO vehicle_fueling (
                vehicle_id, driver_id, fueling_date, fueling_time,
                fuel_type, quantity_liters, price_per_liter, total_cost,
                mileage, km_driven, fuel_efficiency, gas_station,
                payment_method, invoice_number, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *`, [
            data.vehicle_id, data.driver_id, data.fueling_date, data.fueling_time,
            data.fuel_type, data.quantity_liters, data.price_per_liter, data.total_cost,
            data.mileage, kmDriven, fuelEfficiency, data.gas_station,
            data.payment_method, data.invoice_number, data.notes
        ]);
        if (data.vehicle_id && data.mileage) {
            await this.query('UPDATE vehicles SET mileage = $1 WHERE id = $2 AND mileage < $1', [data.mileage, data.vehicle_id]);
        }
        return result.rows[0];
    }
    static async findTripsByVehicle(vehicleId) {
        const result = await this.query(`SELECT t.*, v.plate, v.model, d.name as driver_name
             FROM vehicle_trips t
             JOIN vehicles v ON t.vehicle_id = v.id
             LEFT JOIN drivers d ON t.driver_id = d.id
             WHERE t.vehicle_id = $1
             ORDER BY t.trip_date DESC, t.start_time DESC`, [vehicleId]);
        return result.rows.map((row) => ({
            ...row,
            vehicle: {
                id: row.vehicle_id,
                plate: row.plate,
                model: row.model
            },
            driver: row.driver_id ? {
                id: row.driver_id,
                name: row.driver_name
            } : undefined
        }));
    }
    static async createTrip(data) {
        const result = await this.query(`INSERT INTO vehicle_trips (
                vehicle_id, driver_id, route_id, trip_date,
                start_time, end_time, start_mileage, end_mileage,
                total_distance, fuel_consumed, deliveries_completed,
                revenue_generated, status, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *`, [
            data.vehicle_id, data.driver_id, data.route_id, data.trip_date,
            data.start_time, data.end_time, data.start_mileage, data.end_mileage,
            data.total_distance, data.fuel_consumed, data.deliveries_completed,
            data.revenue_generated, data.status || 'Planejada', data.notes
        ]);
        if (data.status === 'Em Andamento') {
            await this.query('UPDATE vehicles SET status = $1 WHERE id = $2', ['Em Rota', data.vehicle_id]);
        }
        return result.rows[0];
    }
    static async updateTrip(id, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        const updateableFields = [
            'end_time', 'end_mileage', 'total_distance', 'fuel_consumed',
            'deliveries_completed', 'revenue_generated', 'status', 'notes'
        ];
        for (const field of updateableFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = $${paramIndex}`);
                values.push(data[field]);
                paramIndex++;
            }
        }
        if (fields.length === 0) {
            throw new Error('Nenhum campo para atualizar');
        }
        values.push(id);
        const result = await this.query(`UPDATE vehicle_trips SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
        if (data.status === 'Concluída') {
            const trip = result.rows[0];
            await this.query('UPDATE vehicles SET status = $1, mileage = GREATEST(mileage, $2) WHERE id = $3', ['Disponível', trip.end_mileage || trip.start_mileage, trip.vehicle_id]);
        }
        return result.rows[0];
    }
    static async findExpensesByVehicle(vehicleId) {
        const result = await this.query(`SELECT e.*, v.plate, v.model
             FROM vehicle_expenses e
             JOIN vehicles v ON e.vehicle_id = v.id
             WHERE e.vehicle_id = $1
             ORDER BY e.expense_date DESC`, [vehicleId]);
        return result.rows.map((row) => ({
            ...row,
            vehicle: {
                id: row.vehicle_id,
                plate: row.plate,
                model: row.model
            }
        }));
    }
    static async createExpense(data) {
        const result = await this.query(`INSERT INTO vehicle_expenses (
                vehicle_id, expense_type, description, expense_date,
                due_date, payment_date, amount, payment_method,
                reference_number, status, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`, [
            data.vehicle_id, data.expense_type, data.description, data.expense_date,
            data.due_date, data.payment_date, data.amount, data.payment_method,
            data.reference_number, data.status || 'Pendente', data.notes
        ]);
        return result.rows[0];
    }
    static async getFleetSummary() {
        const currentMonth = new Date();
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const vehicleStats = await this.query(`
            SELECT 
                COUNT(*) as total_vehicles,
                COUNT(CASE WHEN status = 'Disponível' THEN 1 END) as available_vehicles,
                COUNT(CASE WHEN status = 'Em Rota' THEN 1 END) as vehicles_on_route,
                COUNT(CASE WHEN status = 'Manutenção' THEN 1 END) as vehicles_in_maintenance
            FROM vehicles
            WHERE status != 'Inativo'
        `);
        const distanceStats = await this.query(`SELECT 
                COALESCE(SUM(total_distance), 0) as total_distance_month
             FROM vehicle_trips
             WHERE trip_date BETWEEN $1 AND $2`, [firstDay, lastDay]);
        const fuelStats = await this.query(`SELECT 
                COALESCE(SUM(total_cost), 0) as total_fuel_cost_month,
                COALESCE(AVG(fuel_efficiency), 0) as average_fuel_efficiency
             FROM vehicle_fueling
             WHERE fueling_date BETWEEN $1 AND $2`, [firstDay, lastDay]);
        const maintenanceStats = await this.query(`SELECT 
                COALESCE(SUM(cost), 0) as total_maintenance_cost_month
             FROM vehicle_maintenance
             WHERE start_date BETWEEN $1 AND $2`, [firstDay, lastDay]);
        return {
            total_vehicles: parseInt(vehicleStats.rows[0].total_vehicles),
            available_vehicles: parseInt(vehicleStats.rows[0].available_vehicles),
            vehicles_on_route: parseInt(vehicleStats.rows[0].vehicles_on_route),
            vehicles_in_maintenance: parseInt(vehicleStats.rows[0].vehicles_in_maintenance),
            total_distance_month: parseFloat(distanceStats.rows[0].total_distance_month),
            total_fuel_cost_month: parseFloat(fuelStats.rows[0].total_fuel_cost_month),
            total_maintenance_cost_month: parseFloat(maintenanceStats.rows[0].total_maintenance_cost_month),
            average_fuel_efficiency: parseFloat(fuelStats.rows[0].average_fuel_efficiency)
        };
    }
}
exports.FleetModel = FleetModel;
//# sourceMappingURL=FleetModel.js.map