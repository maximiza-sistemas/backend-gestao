export interface DashboardStats {
    totalClients: number;
    totalOrders: number;
    monthlyRevenue: number;
    totalStock: number;
}
export interface MonthlySalesData {
    month: string;
    [key: string]: string | number;
}
export interface StockDistribution {
    name: string;
    value: number;
}
export declare class DashboardModel {
    getStats(startDate?: string, endDate?: string): Promise<DashboardStats>;
    getMonthlySales(): Promise<MonthlySalesData[]>;
    getStockDistribution(): Promise<StockDistribution[]>;
}
//# sourceMappingURL=DashboardModel.d.ts.map