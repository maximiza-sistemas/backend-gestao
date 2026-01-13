import { BaseModel } from './BaseModel';
import { UpdateStockRequest, CreateStockMovementRequest, ApiResponse } from '../types';
export declare class StockModel extends BaseModel {
    constructor();
    findAllWithDetails(options?: any): Promise<ApiResponse>;
    findConsolidated(): Promise<ApiResponse>;
    findByProductAndLocation(productId: number, locationId: number): Promise<ApiResponse>;
    updateStock(productId: number, locationId: number, stockData: UpdateStockRequest, userId?: number): Promise<ApiResponse>;
    createMovement(movementData: CreateStockMovementRequest): Promise<ApiResponse>;
    getMovements(options?: any): Promise<ApiResponse>;
    getLowStockReport(): Promise<ApiResponse>;
    getStats(): Promise<ApiResponse>;
    deleteStock(productId: number, locationId: number): Promise<ApiResponse>;
}
//# sourceMappingURL=StockModel.d.ts.map