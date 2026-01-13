import { BaseModel } from './BaseModel';
import { ApiResponse } from '../types';
export declare class PayableModel extends BaseModel {
    constructor();
    findAllWithFilters(options?: any): Promise<ApiResponse>;
    getStats(): Promise<ApiResponse>;
    updateStatus(id: number, status: string, userId: number): Promise<ApiResponse>;
}
//# sourceMappingURL=PayableModel.d.ts.map