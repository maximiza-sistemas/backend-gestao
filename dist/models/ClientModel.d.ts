import { BaseModel } from './BaseModel';
import { Client, ApiResponse } from '../types';
export declare class ClientModel extends BaseModel {
    constructor();
    findAllWithLastPurchase(options?: any): Promise<ApiResponse>;
    findByCpfCnpj(cpfCnpj: string): Promise<ApiResponse<Client>>;
    findActive(): Promise<ApiResponse<Client[]>>;
    findByType(type: string): Promise<ApiResponse<Client[]>>;
    findWithCreditLimit(): Promise<ApiResponse<Client[]>>;
    getStats(): Promise<ApiResponse>;
    getTopClientsBySpent(limit?: number): Promise<ApiResponse>;
    getInactiveClients(daysSinceLastOrder?: number): Promise<ApiResponse>;
    getPurchaseHistory(clientId: number): Promise<ApiResponse>;
}
//# sourceMappingURL=ClientModel.d.ts.map