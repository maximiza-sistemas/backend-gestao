import { query } from '../config/database';
import {
  DetailedReportData,
  DetailedReportFilters,
  DetailedSaleRecord,
  ProductSummary,
  PaymentBreakdown,
  ReceivementEntry,
  ExpenseEntry,
} from '../types';

const formatDate = (value: string | Date): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().split('T')[0];
};

const toNumber = (value: any): number => Number(value ?? 0);

export class ReportModel {
  async getDetailedReport(filters: DetailedReportFilters): Promise<DetailedReportData> {
    const { dateFrom, dateTo, locationId } = filters;
    const baseParams = [dateFrom, dateTo];
    const paramsWithLocation = locationId ? [...baseParams, locationId] : baseParams;
    const locationClause = locationId ? ' AND o.location_id = $3' : '';

    const salesResult = await query(
      `
        SELECT
          CONCAT(c.id, ' - ', c.name) AS client_label,
          COALESCE(c.city, 'Cidade não informada') AS client_city,
          COALESCE(l.name, 'Unidade não informada') AS unit_name,
          p.name AS product_name,
          oi.quantity,
          oi.unit_price,
          oi.total_price,
          o.order_date,
          COALESCE(o.payment_method, 'Não informado') AS payment_method,
          COALESCE(o.expenses, 0) AS order_expenses,
          COALESCE(o.status, 'Pendente') AS order_status,
          COALESCE(o.payment_status, 'Pendente') AS payment_status
        FROM orders o
        JOIN clients c ON c.id = o.client_id
        LEFT JOIN locations l ON l.id = o.location_id
        JOIN order_items oi ON oi.order_id = o.id
        JOIN products p ON p.id = oi.product_id
        WHERE o.order_date BETWEEN $1 AND $2
        ${locationClause}
        ORDER BY o.order_date ASC, c.name ASC
      `,
      paramsWithLocation
    );

    const sales: DetailedSaleRecord[] = salesResult.rows.map((row: any) => ({
      client: row.client_label,
      city: row.client_city,
      unit: row.unit_name,
      product: row.product_name,
      quantity: toNumber(row.quantity),
      total: toNumber(row.total_price),
      unitPrice: toNumber(row.unit_price),
      date: formatDate(row.order_date),
      paymentMethod: row.payment_method || 'Não informado',
      expenses: toNumber(row.order_expenses),
      status: row.order_status || 'Pendente',
      paymentStatus: row.payment_status || 'Pendente',
    }));

    const productSummaryResult = await query(
      `
        SELECT
          p.name AS product_name,
          oi.unit_price,
          SUM(oi.quantity) AS total_quantity,
          SUM(oi.total_price) AS total_value
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN products p ON p.id = oi.product_id
        WHERE o.order_date BETWEEN $1 AND $2
        ${locationClause}
        GROUP BY p.name, oi.unit_price
        ORDER BY p.name ASC, oi.unit_price DESC
      `,
      paramsWithLocation
    );

    const productSummary: ProductSummary[] = productSummaryResult.rows.map((row: any) => {
      const quantity = toNumber(row.total_quantity);
      const total = toNumber(row.total_value);
      const unitPrice = toNumber(row.unit_price);
      return {
        product: row.product_name,
        quantity,
        total,
        averagePrice: unitPrice, // Using averagePrice field for unitPrice to maintain type compatibility
      };
    });

    const paymentResult = await query(
      `
        SELECT
          COALESCE(o.payment_method, 'Não informado') AS method,
          COUNT(*) AS total_orders,
          SUM(o.total_value) AS total_amount
        FROM orders o
        WHERE o.order_date BETWEEN $1 AND $2
        ${locationClause}
        GROUP BY method
        ORDER BY total_amount DESC NULLS LAST
      `,
      paramsWithLocation
    );

    const paymentBreakdown: PaymentBreakdown[] = paymentResult.rows.map((row: any) => ({
      method: row.method,
      quantity: toNumber(row.total_orders),
      amount: toNumber(row.total_amount),
    }));

    // Buscar recebimentos da tabela receivables
    let receivements: ReceivementEntry[] = [];
    try {
      const receivementsResult = await query(
        `
          SELECT
            r.id,
            COALESCE(r.invoice_id, CONCAT('RC-', r.id)) AS code,
            c.name AS client_name,
            COALESCE(r.payment_method, 'Não informado') AS method,
            COALESCE(r.invoice_id, CONCAT('FAT-', r.id)) AS document,
            r.amount,
            r.paid_amount,
            r.issue_date,
            o.location_id
          FROM receivables r
          JOIN clients c ON c.id = r.client_id
          LEFT JOIN orders o ON o.id = r.order_id
          WHERE r.issue_date BETWEEN $1 AND $2
          ${locationId ? ' AND o.location_id = $3' : ''}
          ORDER BY r.issue_date ASC
        `,
        locationId ? paramsWithLocation : baseParams
      );

      receivements = receivementsResult.rows.map((row: any) => ({
        code: row.code,
        client: row.client_name,
        method: row.method,
        document: row.document,
        amount: toNumber(row.amount),
        received: toNumber(row.paid_amount),
        date: formatDate(row.issue_date),
      }));
    } catch (e) {
      console.warn('Tabela receivables pode não existir ou estar vazia:', e);
    }

    // Buscar pagamentos de pedidos (order_payments)
    try {
      const orderPaymentsResult = await query(
        `
          SELECT
            op.id,
            CONCAT('PAG-', op.id) AS code,
            c.name AS client_name,
            op.payment_method AS method,
            CONCAT('PED-', o.id) AS document,
            op.amount,
            op.amount AS paid_amount,
            op.payment_date AS issue_date
          FROM order_payments op
          JOIN orders o ON o.id = op.order_id
          JOIN clients c ON c.id = o.client_id
          WHERE op.payment_date BETWEEN $1 AND $2
          ${locationId ? ' AND o.location_id = $3' : ''}
          ORDER BY op.payment_date ASC
        `,
        locationId ? paramsWithLocation : baseParams
      );

      const orderPayments: ReceivementEntry[] = orderPaymentsResult.rows.map((row: any) => ({
        code: row.code,
        client: row.client_name,
        method: row.method || 'Não informado',
        document: row.document,
        amount: toNumber(row.amount),
        received: toNumber(row.paid_amount),
        date: formatDate(row.issue_date),
      }));

      // Adicionar pagamentos de pedidos aos recebimentos
      receivements = [...receivements, ...orderPayments];
    } catch (e) {
      console.warn('Tabela order_payments pode não existir:', e);
    }

    const expensesResult = await query(
      `
        SELECT
          COALESCE(s.name, 'Fornecedor não informado') AS provider,
          p.due_date,
          p.description AS document,
          p.amount
        FROM payables p
        LEFT JOIN suppliers s ON s.id = p.supplier_id
        WHERE p.due_date BETWEEN $1 AND $2
        ORDER BY p.due_date ASC
      `,
      baseParams
    );

    const expenses: ExpenseEntry[] = expensesResult.rows.map((row: any) => ({
      provider: row.provider,
      dueDate: formatDate(row.due_date),
      document: row.document,
      amount: toNumber(row.amount),
    }));

    const receivementSummaryMap = new Map<string, PaymentBreakdown>();
    receivements.forEach((item) => {
      const existing = receivementSummaryMap.get(item.method) || {
        method: item.method,
        quantity: 0,
        amount: 0,
      };
      existing.quantity += 1;
      existing.amount += item.amount;
      receivementSummaryMap.set(item.method, existing);
    });
    const receivementSummary = Array.from(receivementSummaryMap.values());

    const generalDetail = paymentBreakdown.map((item) => ({ ...item }));

    let unitLabel = 'Todas as unidades';
    let cityLabel = 'Consolidado';
    if (locationId) {
      const locationResult = await query(
        'SELECT name, city, state FROM locations WHERE id = $1',
        [locationId]
      );
      if (locationResult.rowCount > 0) {
        const location = locationResult.rows[0];
        unitLabel = location.name;
        cityLabel = [location.city, location.state].filter(Boolean).join(' - ') || cityLabel;
      } else {
        unitLabel = 'Unidade não encontrada';
      }
    }

    // Buscar Estoque Líquido (botijões cheios)
    const liquidStockResult = await query(
      `
        SELECT
          p.name AS product_name,
          l.name AS location_name,
          s.full_quantity AS quantity
        FROM stock s
        JOIN products p ON p.id = s.product_id
        JOIN locations l ON l.id = s.location_id
        WHERE s.full_quantity > 0
        ${locationId ? ' AND s.location_id = $1' : ''}
        ORDER BY p.name, l.name
      `,
      locationId ? [locationId] : []
    );

    const liquidStock = liquidStockResult.rows.map((row: any) => ({
      product: row.product_name,
      location: row.location_name,
      quantity: toNumber(row.quantity),
    }));

    // Buscar Estoque de Vasilhame (botijões vazios e em manutenção)
    const containerStockResult = await query(
      `
        SELECT
          p.name AS product_name,
          l.name AS location_name,
          s.empty_quantity AS empty,
          s.maintenance_quantity AS maintenance,
          (s.empty_quantity + s.maintenance_quantity) AS total
        FROM stock s
        JOIN products p ON p.id = s.product_id
        JOIN locations l ON l.id = s.location_id
        WHERE (s.empty_quantity > 0 OR s.maintenance_quantity > 0)
        ${locationId ? ' AND s.location_id = $1' : ''}
        ORDER BY p.name, l.name
      `,
      locationId ? [locationId] : []
    );

    const containerStock = containerStockResult.rows.map((row: any) => ({
      product: row.product_name,
      location: row.location_name,
      empty: toNumber(row.empty),
      maintenance: toNumber(row.maintenance),
      total: toNumber(row.total),
    }));

    // Buscar Compras de Produtos (product_purchases) no período
    let purchasesTotal = 0;
    let purchasesList: Array<{
      product: string;
      quantity: number;
      unitPrice: number;
      total: number;
      date: string;
      location: string;
    }> = [];

    try {
      const purchasesLocationClause = locationId ? ' AND pp.location_id = $3' : '';
      const purchasesResult = await query(
        `
          SELECT
            p.name AS product_name,
            pp.quantity,
            pp.unit_price,
            (pp.quantity * pp.unit_price) AS total_value,
            pp.purchase_date,
            COALESCE(l.name, 'Não informada') AS location_name
          FROM product_purchases pp
          JOIN products p ON p.id = pp.product_id
          LEFT JOIN locations l ON l.id = pp.location_id
          WHERE pp.purchase_date BETWEEN $1 AND $2
          ${purchasesLocationClause}
          ORDER BY pp.purchase_date ASC
        `,
        paramsWithLocation
      );

      purchasesList = purchasesResult.rows.map((row: any) => ({
        product: row.product_name,
        quantity: toNumber(row.quantity),
        unitPrice: toNumber(row.unit_price),
        total: toNumber(row.total_value),
        date: formatDate(row.purchase_date),
        location: row.location_name,
      }));

      purchasesTotal = purchasesList.reduce((sum, p) => sum + p.total, 0);
    } catch (e) {
      console.warn('Tabela product_purchases pode não existir:', e);
    }

    const intlFormatter = new Intl.DateTimeFormat('pt-BR');
    const intlFormatterUTC = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
    const metadata: DetailedReportData['metadata'] = {
      date: intlFormatter.format(new Date()),
      unit: unitLabel,
      city: cityLabel || 'Consolidado',
      period: `${intlFormatterUTC.format(new Date(dateFrom + 'T00:00:00Z'))} - ${intlFormatterUTC.format(new Date(dateTo + 'T00:00:00Z'))}`,
      preparedBy: 'Sistema SISGÁS',
    };

    return {
      metadata,
      sales,
      productSummary,
      paymentBreakdown,
      receivements,
      receivementSummary,
      expenses,
      generalDetail,
      liquidStock,
      containerStock,
      purchases: purchasesList,
      purchasesTotal,
    };
  }
}
