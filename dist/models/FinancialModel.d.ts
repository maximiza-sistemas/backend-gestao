import { FinancialTransaction, FinancialCategory, FinancialAccount, CreateFinancialTransactionRequest, FinancialSummary } from '../types';
export declare class FinancialModel {
    private static query;
    static findAllCategories(type?: 'Receita' | 'Despesa'): Promise<FinancialCategory[]>;
    static createCategory(data: Partial<FinancialCategory>): Promise<FinancialCategory>;
    static findAllAccounts(): Promise<FinancialAccount[]>;
    static findAccountById(id: number): Promise<FinancialAccount | null>;
    static createAccount(data: Partial<FinancialAccount>): Promise<FinancialAccount>;
    static updateAccountBalance(id: number, amount: number): Promise<void>;
    static findAllTransactions(filters?: {
        type?: string;
        status?: string;
        category_id?: number;
        account_id?: number;
        client_id?: number;
        date_from?: Date;
        date_to?: Date;
    }): Promise<FinancialTransaction[]>;
    static findTransactionById(id: number): Promise<FinancialTransaction | null>;
    static createTransaction(data: CreateFinancialTransactionRequest, userId: number): Promise<FinancialTransaction>;
    static updateTransaction(id: number, data: Partial<CreateFinancialTransactionRequest>): Promise<FinancialTransaction>;
    static deleteTransaction(id: number): Promise<void>;
    static updateTransactionStatus(id: number, status: string, paymentDate?: Date): Promise<void>;
    static getFinancialSummary(filters?: {
        date_from?: Date;
        date_to?: Date;
        account_id?: number;
    }): Promise<FinancialSummary>;
    static getCashFlow(startDate: Date, endDate: Date): Promise<any[]>;
    static getCategoryBreakdown(type: 'Receita' | 'Despesa', startDate?: Date, endDate?: Date): Promise<any[]>;
}
//# sourceMappingURL=FinancialModel.d.ts.map