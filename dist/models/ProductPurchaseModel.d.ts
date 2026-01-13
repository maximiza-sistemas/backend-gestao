export interface ProductPurchase {
    id: number;
    product_id: number;
    product_name?: string;
    unit_price: number;
    quantity: number;
    total_amount: number;
    purchase_date: string;
    is_installment: boolean;
    installment_count: number;
    notes?: string;
    created_at: string;
    updated_at?: string;
    paid_amount?: number;
    pending_amount?: number;
    installments?: PurchaseInstallment[];
}
export interface PurchaseInstallment {
    id: number;
    purchase_id: number;
    installment_number: number;
    due_date: string;
    amount: number;
    paid_amount: number;
    paid_date?: string;
    status: 'Pendente' | 'Pago' | 'Vencido';
    created_at: string;
}
export interface CreatePurchaseData {
    product_id: number;
    unit_price: number;
    quantity: number;
    purchase_date?: string;
    is_installment?: boolean;
    installment_count?: number;
    notes?: string;
}
export interface UpdateInstallmentData {
    paid_amount: number;
    paid_date: string;
}
export declare class ProductPurchaseModel {
    static create(data: CreatePurchaseData): Promise<ProductPurchase>;
    static getByProduct(productId: number): Promise<ProductPurchase[]>;
    static getLatestPrice(productId: number): Promise<number | null>;
    static getInstallments(purchaseId: number): Promise<PurchaseInstallment[]>;
    static updateInstallment(installmentId: number, data: UpdateInstallmentData): Promise<PurchaseInstallment>;
    static delete(purchaseId: number): Promise<void>;
}
//# sourceMappingURL=ProductPurchaseModel.d.ts.map