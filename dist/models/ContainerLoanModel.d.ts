import { BaseModel } from './BaseModel';
import { ApiResponse } from '../types';
export interface ContainerLoan {
    id?: number;
    loan_type: 'Empréstimo' | 'Comodato';
    direction: 'Saída' | 'Entrada';
    product_id: number;
    quantity: number;
    entity_type: 'Empresa' | 'Pessoa Física';
    entity_name: string;
    entity_contact?: string;
    entity_address?: string;
    loan_date: string;
    expected_return_date?: string;
    actual_return_date?: string;
    status?: 'Ativo' | 'Devolvido' | 'Cancelado';
    notes?: string;
    location_id?: number;
    user_id?: number;
}
export declare class ContainerLoanModel extends BaseModel {
    constructor();
    findAllWithDetails(options?: any): Promise<ApiResponse>;
    returnLoan(id: number, actualReturnDate?: string): Promise<ApiResponse>;
    cancelLoan(id: number): Promise<ApiResponse>;
    getStats(): Promise<ApiResponse>;
}
//# sourceMappingURL=ContainerLoanModel.d.ts.map