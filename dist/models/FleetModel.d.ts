import { Vehicle, Driver, VehicleMaintenance, VehicleFueling, VehicleTrip, VehicleExpense, FleetSummary } from '../types';
export declare class FleetModel {
    private static query;
    static findAllVehicles(filters?: {
        status?: string;
        type?: string;
    }): Promise<Vehicle[]>;
    static findVehicleById(id: number): Promise<Vehicle | null>;
    static createVehicle(data: Partial<Vehicle>): Promise<Vehicle>;
    static updateVehicle(id: number, data: Partial<Vehicle>): Promise<Vehicle>;
    static deleteVehicle(id: number): Promise<void>;
    static findAllDrivers(status?: string): Promise<Driver[]>;
    static findDriverById(id: number): Promise<Driver | null>;
    static createDriver(data: Partial<Driver>): Promise<Driver>;
    static updateDriver(id: number, data: Partial<Driver>): Promise<Driver>;
    static findMaintenanceByVehicle(vehicleId: number): Promise<VehicleMaintenance[]>;
    static findAllMaintenance(filters?: {
        status?: string;
        start_date?: Date;
        end_date?: Date;
    }): Promise<VehicleMaintenance[]>;
    static createMaintenance(data: Partial<VehicleMaintenance>): Promise<VehicleMaintenance>;
    static updateMaintenanceStatus(id: number, status: string, endDate?: Date): Promise<void>;
    static findFuelingByVehicle(vehicleId: number): Promise<VehicleFueling[]>;
    static createFueling(data: Partial<VehicleFueling>): Promise<VehicleFueling>;
    static findTripsByVehicle(vehicleId: number): Promise<VehicleTrip[]>;
    static createTrip(data: Partial<VehicleTrip>): Promise<VehicleTrip>;
    static updateTrip(id: number, data: Partial<VehicleTrip>): Promise<VehicleTrip>;
    static findExpensesByVehicle(vehicleId: number): Promise<VehicleExpense[]>;
    static createExpense(data: Partial<VehicleExpense>): Promise<VehicleExpense>;
    static getFleetSummary(): Promise<FleetSummary>;
}
//# sourceMappingURL=FleetModel.d.ts.map