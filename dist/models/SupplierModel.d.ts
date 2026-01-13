import { Supplier, CreateSupplierRequest } from '../types';
export declare class SupplierModel {
    private static query;
    static findAll(filters?: {
        status?: string;
        category?: string;
        search?: string;
    }): Promise<Supplier[]>;
    static findById(id: number): Promise<Supplier | null>;
    static findByCNPJ(cnpj: string): Promise<Supplier | null>;
    static create(data: CreateSupplierRequest): Promise<Supplier>;
    static update(id: number, data: Partial<CreateSupplierRequest>): Promise<Supplier>;
    static delete(id: number): Promise<void>;
    static getCategories(): Promise<string[]>;
    static count(filters?: {
        status?: string;
    }): Promise<number>;
    static findPaginated(page?: number, limit?: number, filters?: {
        status?: string;
        category?: string;
        search?: string;
    }): Promise<{
        data: Supplier[];
        total: number;
        totalPages: number;
    }>;
    static getStatistics(): Promise<{
        total: number;
        active: number;
        inactive: number;
        byCategory: {
            category: string;
            count: number;
        }[];
    }>;
}
//# sourceMappingURL=SupplierModel.d.ts.map