import { BaseModel } from './BaseModel';
import { Product, ApiResponse } from '../types';
export declare class ProductModel extends BaseModel {
    constructor();
    findActive(): Promise<ApiResponse<Product[]>>;
    findWithStock(): Promise<ApiResponse>;
    findByPriceRange(minPrice: number, maxPrice: number): Promise<ApiResponse<Product[]>>;
    getMostSold(limit?: number): Promise<ApiResponse>;
    getLowStock(): Promise<ApiResponse>;
    getStats(): Promise<ApiResponse>;
    getProfitabilityReport(): Promise<ApiResponse>;
    getPriceHistory(productId: number): Promise<ApiResponse>;
}
//# sourceMappingURL=ProductModel.d.ts.map