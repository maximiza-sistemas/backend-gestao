export interface ProductSupplierCost {
    id: number;
    product_id: number;
    supplier_id: number;
    cost_price: number;
    is_default: boolean;
    created_at: Date;
    updated_at: Date;
    supplier_name?: string;
}
export declare class ProductSupplierCostModel {
    static create(productId: number, supplierId: number, costPrice: number, isDefault?: boolean): Promise<ProductSupplierCost>;
    static upsert(productId: number, supplierId: number, costPrice: number, isDefault?: boolean): Promise<ProductSupplierCost>;
    static getByProduct(productId: number): Promise<ProductSupplierCost[]>;
    static getCurrentCost(productId: number, supplierId: number): Promise<number | null>;
    static getDefaultCost(productId: number): Promise<number | null>;
    static delete(productId: number, supplierId: number): Promise<void>;
}
//# sourceMappingURL=ProductSupplierCostModel.d.ts.map