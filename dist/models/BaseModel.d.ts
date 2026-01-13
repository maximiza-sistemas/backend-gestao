import { ApiResponse, PaginationQuery, FilterQuery } from '../types';
export declare abstract class BaseModel {
    protected tableName: string;
    constructor(tableName: string);
    findAll(options?: PaginationQuery & FilterQuery): Promise<ApiResponse>;
    findById(id: number): Promise<ApiResponse>;
    create(data: any): Promise<ApiResponse>;
    update(id: number, data: any): Promise<ApiResponse>;
    delete(id: number): Promise<ApiResponse>;
    protected customQuery(queryText: string, params?: any[]): Promise<ApiResponse>;
    protected executeTransaction(callback: (client: any) => Promise<any>): Promise<ApiResponse>;
}
//# sourceMappingURL=BaseModel.d.ts.map