import { BaseModel } from './BaseModel';
import { CreateOrderRequest, ApiResponse } from '../types';
export declare class OrderModel extends BaseModel {
    constructor();
    createWithItems(orderData: CreateOrderRequest): Promise<ApiResponse>;
    findAllWithDetails(options?: any): Promise<ApiResponse>;
    findByIdWithItems(id: number): Promise<ApiResponse>;
    updateStatus(id: number, status: string, userId?: number): Promise<ApiResponse>;
    updatePaymentStatus(id: number, status: 'Pendente' | 'Pago', userId?: number): Promise<ApiResponse>;
    getStats(): Promise<ApiResponse>;
    getSalesByPeriod(startDate: Date, endDate: Date): Promise<ApiResponse>;
    getSalesByLocation(): Promise<ApiResponse>;
    updateDiscount(id: number, discount: number): Promise<ApiResponse>;
}
//# sourceMappingURL=OrderModel.d.ts.map