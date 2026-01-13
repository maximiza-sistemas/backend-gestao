export interface User {
    id: number;
    name: string;
    email: string;
    password_hash?: string;
    role: 'Administrador' | 'Gerente' | 'Vendedor';
    status: 'Ativo' | 'Inativo';
    created_at: Date;
    updated_at: Date;
}
export interface CreateUserRequest {
    name: string;
    email: string;
    password: string;
    role: 'Administrador' | 'Gerente' | 'Vendedor';
    status?: 'Ativo' | 'Inativo';
}
export interface Client {
    id: number;
    name: string;
    type: 'Residencial' | 'Comercial' | 'Industrial';
    contact?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    cpf_cnpj?: string;
    status: 'Ativo' | 'Inativo';
    credit_limit: number;
    created_at: Date;
    updated_at: Date;
}
export interface CreateClientRequest {
    name: string;
    type: 'Residencial' | 'Comercial' | 'Industrial';
    contact?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    cpf_cnpj?: string;
    status?: 'Ativo' | 'Inativo';
    credit_limit?: number;
}
export interface Supplier {
    id: number;
    name: string;
    category?: string;
    contact?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    cnpj?: string;
    status: 'Ativo' | 'Inativo';
    created_at: Date;
    updated_at: Date;
}
export interface CreateSupplierRequest {
    name: string;
    category?: string;
    contact?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    cnpj?: string;
    status?: 'Ativo' | 'Inativo';
}
export interface Product {
    id: number;
    name: string;
    description?: string;
    weight_kg?: number;
    price_sell: number;
    price_buy?: number;
    status: 'Ativo' | 'Inativo';
    created_at: Date;
    updated_at: Date;
}
export interface CreateProductRequest {
    name: string;
    description?: string;
    weight_kg?: number;
    price_sell: number;
    price_buy?: number;
    status?: 'Ativo' | 'Inativo';
}
export interface Location {
    id: number;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    phone?: string;
    status: 'Ativo' | 'Inativo';
    created_at: Date;
    updated_at: Date;
}
export interface CreateLocationRequest {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    phone?: string;
    status?: 'Ativo' | 'Inativo';
}
export interface Stock {
    id: number;
    product_id: number;
    location_id: number;
    full_quantity: number;
    empty_quantity: number;
    maintenance_quantity: number;
    min_stock_level?: number;
    max_stock_level?: number;
    updated_at: Date;
    product?: Product;
    location?: Location;
}
export interface UpdateStockRequest {
    full_quantity?: number;
    empty_quantity?: number;
    maintenance_quantity?: number;
    min_stock_level?: number;
    max_stock_level?: number;
}
export interface CreateVehicleRequest {
    plate: string;
    model?: string;
    brand?: string;
    year?: number;
    driver_name?: string;
    driver_license?: string;
    capacity_kg?: number;
    status?: 'Disponível' | 'Em Rota' | 'Em Manutenção';
    last_maintenance?: Date;
    next_maintenance?: Date;
    location_id?: number;
}
export interface Order {
    id: number;
    client_id: number;
    user_id?: number;
    location_id?: number;
    vehicle_id?: number;
    order_date: Date;
    delivery_date?: Date;
    delivery_address?: string;
    total_value: number;
    discount: number;
    status: 'Pendente' | 'Em Rota' | 'Entregue' | 'Cancelado';
    payment_method?: 'Dinheiro' | 'Pix' | 'Prazo' | 'Misto';
    payment_status: 'Pendente' | 'Pago' | 'Parcial' | 'Vencido';
    payment_cash_amount?: number;
    payment_term_amount?: number;
    payment_installments?: number;
    payment_due_date?: Date;
    notes?: string;
    created_at: Date;
    updated_at: Date;
    client?: Client;
    user?: User;
    location?: Location;
    vehicle?: Vehicle;
    items?: OrderItem[];
}
export interface OrderItem {
    id: number;
    order_id: number;
    product_id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    cost_price?: number;
    created_at: Date;
    product?: Product;
}
export interface CreateOrderRequest {
    client_id: number;
    user_id?: number;
    location_id?: number;
    vehicle_id?: number;
    order_date?: Date;
    delivery_date?: Date;
    delivery_address?: string;
    discount?: number;
    payment_method?: 'Dinheiro' | 'Pix' | 'Prazo' | 'Misto';
    payment_status?: 'Pendente' | 'Pago' | 'Parcial' | 'Vencido';
    payment_cash_amount?: number;
    payment_term_amount?: number;
    payment_installments?: number;
    payment_due_date?: Date;
    notes?: string;
    status?: 'Pendente' | 'Em Rota' | 'Entregue' | 'Cancelado';
    items: CreateOrderItemRequest[];
}
export interface CreateOrderItemRequest {
    product_id: number;
    quantity: number;
    unit_price: number;
    supplier_id?: number;
}
export interface Receivable {
    id: number;
    client_id: number;
    order_id?: number;
    invoice_id?: string;
    issue_date: Date;
    due_date: Date;
    amount: number;
    paid_amount: number;
    status: 'A Vencer' | 'Vencido' | 'Pago' | 'Parcial';
    payment_date?: Date;
    payment_method?: string;
    notes?: string;
    created_at: Date;
    updated_at: Date;
    client?: Client;
    order?: Order;
}
export interface CreateReceivableRequest {
    client_id: number;
    order_id?: number;
    invoice_id?: string;
    issue_date?: Date;
    due_date: Date;
    amount: number;
    notes?: string;
}
export interface Payable {
    id: number;
    supplier_id: number;
    description: string;
    category?: string;
    issue_date: Date;
    due_date: Date;
    amount: number;
    paid_amount: number;
    status: 'A Pagar' | 'Vencido' | 'Pago' | 'Parcial';
    payment_date?: Date;
    payment_method?: string;
    notes?: string;
    created_at: Date;
    updated_at: Date;
    supplier?: Supplier;
}
export interface CreatePayableRequest {
    supplier_id: number;
    description: string;
    category?: string;
    issue_date?: Date;
    due_date: Date;
    amount: number;
    notes?: string;
}
export interface StockMovement {
    id: number;
    product_id: number;
    location_id: number;
    order_id?: number;
    movement_type: 'Entrada' | 'Saída' | 'Transferência' | 'Ajuste' | 'Manutenção';
    bottle_type: 'Cheio' | 'Vazio' | 'Manutenção';
    quantity: number;
    reason?: string;
    user_id?: number;
    created_at: Date;
    product?: Product;
    location?: Location;
    order?: Order;
    user?: User;
}
export interface CreateStockMovementRequest {
    product_id: number;
    location_id: number;
    order_id?: number;
    movement_type: 'Entrada' | 'Saída' | 'Transferência' | 'Ajuste' | 'Manutenção';
    bottle_type: 'Cheio' | 'Vazio' | 'Manutenção';
    quantity: number;
    reason?: string;
    user_id?: number;
}
export interface ActivityLog {
    id: number;
    user_id?: number;
    action: string;
    table_name?: string;
    record_id?: number;
    old_values?: any;
    new_values?: any;
    ip_address?: string;
    user_agent?: string;
    created_at: Date;
    user?: User;
}
export interface SystemSetting {
    id: number;
    key: string;
    value?: string;
    description?: string;
    category?: string;
    updated_by?: number;
    updated_at: Date;
    updater?: User;
}
export interface DashboardKPI {
    totalClientes: number;
    totalPedidos: number;
    faturamentoMensal: number;
    estoqueTotal: number;
}
export interface MonthlySalesData {
    month: string;
    matriz: number;
    filial: number;
    total?: number;
}
export interface StockDistribution {
    name: string;
    value: number;
    percentage?: number;
}
export interface ClientPerformance {
    rank: number;
    client_id: number;
    client_name: string;
    total_spent: number;
    order_count: number;
    last_order_date?: Date;
}
export interface CashFlowData {
    month: string;
    entradas: number;
    saidas: number;
    saldo: number;
}
export interface OverdueAccount {
    type: 'Receber' | 'Pagar';
    id: number;
    client_supplier: string;
    reference: string;
    due_date: Date;
    amount: number;
    days_overdue: number;
}
export interface DetailedSaleRecord {
    client: string;
    city: string;
    unit: string;
    product: string;
    quantity: number;
    total: number;
    unitPrice: number;
    date: string;
    paymentMethod: string;
}
export interface ProductSummary {
    product: string;
    quantity: number;
    averagePrice: number;
    total: number;
}
export interface PaymentBreakdown {
    method: string;
    quantity: number;
    amount: number;
    percentage?: number;
}
export interface ReceivementEntry {
    code: string;
    client: string;
    method: string;
    document: string;
    amount: number;
    received?: number;
    date: string;
}
export interface ExpenseEntry {
    provider: string;
    dueDate: string;
    document: string;
    amount: number;
}
export interface DetailedReportData {
    metadata: {
        date: string;
        unit: string;
        city: string;
        period: string;
        preparedBy: string;
    };
    sales: DetailedSaleRecord[];
    productSummary: ProductSummary[];
    paymentBreakdown: PaymentBreakdown[];
    receivements: ReceivementEntry[];
    receivementSummary: PaymentBreakdown[];
    expenses: ExpenseEntry[];
    generalDetail: PaymentBreakdown[];
    liquidStock?: Array<{
        product: string;
        location: string;
        quantity: number;
    }>;
    containerStock?: Array<{
        product: string;
        location: string;
        empty: number;
        maintenance: number;
        total: number;
    }>;
}
export interface DetailedReportFilters {
    dateFrom: string;
    dateTo: string;
    locationId?: number;
}
export interface AuthRequest {
    email: string;
    password: string;
}
export interface AuthResponse {
    token: string;
    user: Omit<User, 'password_hash'>;
    expires_in: number;
}
export interface JWTPayload {
    user_id: number;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface PaginationQuery {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'ASC' | 'DESC';
    search?: string;
}
export interface FilterQuery {
    status?: string;
    type?: string;
    location_id?: number;
    client_id?: number;
    supplier_id?: number;
    product_id?: number;
    date_from?: Date;
    date_to?: Date;
}
export interface ValidationError {
    field: string;
    message: string;
    value?: any;
}
export interface FinancialCategory {
    id: number;
    name: string;
    type: 'Receita' | 'Despesa';
    description?: string;
    color?: string;
    icon?: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
export interface FinancialAccount {
    id: number;
    name: string;
    type: 'Banco' | 'Caixa' | 'Carteira Digital';
    bank_name?: string;
    account_number?: string;
    agency?: string;
    initial_balance: number;
    current_balance: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
export interface FinancialTransaction {
    id: number;
    transaction_code: string;
    type: 'Receita' | 'Despesa' | 'Transferência' | 'Depósito';
    category_id?: number;
    category?: FinancialCategory;
    account_id: number;
    account?: FinancialAccount;
    destination_account_id?: number;
    destination_account?: FinancialAccount;
    order_id?: number;
    order?: Order;
    client_id?: number;
    client?: Client;
    supplier_id?: number;
    description: string;
    amount: number;
    payment_method?: 'Dinheiro' | 'Pix' | 'Cartão Débito' | 'Cartão Crédito' | 'Boleto' | 'Transferência' | 'Cheque';
    transaction_date: Date;
    due_date?: Date;
    payment_date?: Date;
    status: 'Pendente' | 'Pago' | 'Cancelado' | 'Vencido';
    installment_number?: number;
    total_installments?: number;
    parent_transaction_id?: number;
    reference_number?: string;
    notes?: string;
    attachment_url?: string;
    user_id?: number;
    user?: User;
    created_at: Date;
    updated_at: Date;
    category_name?: string;
    category_color?: string;
    category_icon?: string;
    account_name?: string;
    account_type?: string;
}
export interface CreateFinancialTransactionRequest {
    type: 'Receita' | 'Despesa' | 'Transferência' | 'Depósito';
    category_id?: number;
    account_id: number;
    destination_account_id?: number;
    order_id?: number;
    client_id?: number;
    supplier_id?: number;
    description: string;
    amount: number;
    payment_method?: 'Dinheiro' | 'Pix' | 'Cartão Débito' | 'Cartão Crédito' | 'Boleto' | 'Transferência' | 'Cheque';
    transaction_date: Date;
    due_date?: Date;
    payment_date?: Date;
    status?: 'Pendente' | 'Pago' | 'Cancelado' | 'Vencido';
    installment_number?: number;
    total_installments?: number;
    parent_transaction_id?: number;
    reference_number?: string;
    notes?: string;
    attachment_url?: string;
}
export interface FinancialSummary {
    total_revenue: number;
    total_expenses: number;
    balance: number;
    pending_revenue: number;
    pending_expenses: number;
    overdue_amount: number;
}
export interface Vehicle {
    id: number;
    plate: string;
    model: string;
    brand: string;
    year: number;
    type: 'Caminhão' | 'Van' | 'Utilitário' | 'Moto' | 'Carro';
    fuel_type: 'Diesel' | 'Gasolina' | 'Flex' | 'GNV' | 'Elétrico';
    capacity_kg?: number;
    capacity_units?: number;
    mileage: number;
    status: 'Disponível' | 'Em Rota' | 'Manutenção' | 'Inativo';
    last_maintenance_date?: Date;
    next_maintenance_date?: Date;
    next_maintenance_km?: number;
    insurance_expiry?: Date;
    license_expiry?: Date;
    inspection_expiry?: Date;
    owner_type?: 'Próprio' | 'Alugado' | 'Terceirizado';
    monthly_cost?: number;
    notes?: string;
    created_at: Date;
    updated_at: Date;
}
export interface Driver {
    id: number;
    user_id?: number;
    name: string;
    cpf: string;
    cnh_number: string;
    cnh_category: string;
    cnh_expiry: Date;
    phone?: string;
    emergency_contact?: string;
    emergency_phone?: string;
    hire_date: Date;
    status: 'Ativo' | 'Inativo' | 'Férias' | 'Afastado';
    created_at: Date;
    updated_at: Date;
}
export interface VehicleMaintenance {
    id: number;
    vehicle_id: number;
    vehicle?: Vehicle;
    maintenance_type: 'Preventiva' | 'Corretiva' | 'Revisão' | 'Troca de Óleo' | 'Troca de Pneus' | 'Elétrica' | 'Mecânica' | 'Funilaria' | 'Outro';
    description: string;
    service_provider?: string;
    start_date: Date;
    end_date?: Date;
    mileage_at_service?: number;
    cost?: number;
    parts_replaced?: string;
    next_maintenance_km?: number;
    next_maintenance_date?: Date;
    invoice_number?: string;
    warranty_until?: Date;
    performed_by?: string;
    status: 'Agendada' | 'Em Andamento' | 'Concluída' | 'Cancelada';
    notes?: string;
    created_at: Date;
    updated_at: Date;
}
export interface VehicleFueling {
    id: number;
    vehicle_id: number;
    vehicle?: Vehicle;
    driver_id?: number;
    driver?: Driver;
    fueling_date: Date;
    fueling_time?: string;
    fuel_type: string;
    quantity_liters: number;
    price_per_liter: number;
    total_cost: number;
    mileage: number;
    km_driven?: number;
    fuel_efficiency?: number;
    gas_station?: string;
    payment_method?: string;
    invoice_number?: string;
    notes?: string;
    created_at: Date;
    updated_at: Date;
}
export interface VehicleTrip {
    id: number;
    vehicle_id: number;
    vehicle?: Vehicle;
    driver_id?: number;
    driver?: Driver;
    route_id?: number;
    trip_date: Date;
    start_time: string;
    end_time?: string;
    start_mileage: number;
    end_mileage?: number;
    total_distance?: number;
    fuel_consumed?: number;
    deliveries_completed?: number;
    revenue_generated?: number;
    status: 'Planejada' | 'Em Andamento' | 'Concluída' | 'Cancelada';
    notes?: string;
    created_at: Date;
    updated_at: Date;
}
export interface VehicleExpense {
    id: number;
    vehicle_id: number;
    vehicle?: Vehicle;
    expense_type: 'Seguro' | 'IPVA' | 'Licenciamento' | 'Multa' | 'Pedágio' | 'Estacionamento' | 'Lavagem' | 'Outro';
    description: string;
    expense_date: Date;
    due_date?: Date;
    payment_date?: Date;
    amount: number;
    payment_method?: string;
    reference_number?: string;
    status: 'Pendente' | 'Pago' | 'Vencido' | 'Cancelado';
    notes?: string;
    created_at: Date;
    updated_at: Date;
}
export interface FleetSummary {
    total_vehicles: number;
    available_vehicles: number;
    vehicles_on_route: number;
    vehicles_in_maintenance: number;
    total_distance_month: number;
    total_fuel_cost_month: number;
    total_maintenance_cost_month: number;
    average_fuel_efficiency: number;
}
//# sourceMappingURL=index.d.ts.map