import { BaseModel } from './BaseModel';
import { ApiResponse } from '../types';
export declare class RouteModel extends BaseModel {
    constructor();
    findAllWithDetails(options?: any): Promise<ApiResponse>;
    findByIdWithStops(id: number): Promise<ApiResponse>;
    createWithStops(routeData: any, stops: any[], userId: number): Promise<ApiResponse>;
    updateStatus(id: number, status: string, userId: number): Promise<ApiResponse>;
    updateStop(stopId: number, stopData: any): Promise<ApiResponse>;
    getStats(): Promise<ApiResponse>;
}
//# sourceMappingURL=RouteModel.d.ts.map