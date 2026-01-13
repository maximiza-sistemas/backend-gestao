import { BaseModel } from './BaseModel';
import { ApiResponse } from '../types';
interface CreatePaymentRequest {
    order_id: number;
    amount: number;
    payment_method: 'Dinheiro' | 'Pix' | 'Cartão' | 'Transferência' | 'Depósito';
    notes?: string;
    user_id?: number;
    payment_date?: string;
}
export declare class OrderPaymentModel extends BaseModel {
    constructor();
    create(paymentData: CreatePaymentRequest): Promise<ApiResponse>;
    findByOrderId(orderId: number): Promise<ApiResponse>;
    deletePayment(paymentId: number): Promise<ApiResponse>;
    getPaymentSummary(orderId: number): Promise<ApiResponse>;
}
export {};
//# sourceMappingURL=OrderPaymentModel.d.ts.map