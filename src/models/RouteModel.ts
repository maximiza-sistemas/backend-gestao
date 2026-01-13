import { BaseModel } from './BaseModel';
import { ApiResponse } from '../types';

export class RouteModel extends BaseModel {
  constructor() {
    super('delivery_routes');
  }

  // Buscar todas as rotas com detalhes
  async findAllWithDetails(options: any = {}): Promise<ApiResponse> {
    try {
      const {
        page = 1,
        limit = 50,
        sort = 'route_date',
        order = 'DESC',
        search,
        status,
        date_from,
        date_to
      } = options;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (search) {
        whereClause += ` AND (dr.route_name ILIKE $${paramIndex} OR dr.route_code ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (status) {
        whereClause += ` AND dr.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (date_from) {
        whereClause += ` AND dr.route_date >= $${paramIndex}`;
        params.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        whereClause += ` AND dr.route_date <= $${paramIndex}`;
        params.push(date_to);
        paramIndex++;
      }

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM delivery_routes dr
        ${whereClause}
      `;
      const countResult = await this.customQuery(countQuery, params);
      const total = parseInt(countResult.data[0].total);

      // Query principal
      const offset = (page - 1) * limit;
      const dataQuery = `
        SELECT
          dr.*,
          COUNT(DISTINCT drs.id) as total_stops,
          COUNT(DISTINCT CASE WHEN drs.status = 'Concluído' THEN drs.id END) as completed_stops
        FROM delivery_routes dr
        LEFT JOIN delivery_route_stops drs ON dr.id = drs.route_id
        ${whereClause}
        GROUP BY dr.id
        ORDER BY dr.${sort} ${order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const dataResult = await this.customQuery(dataQuery, params);

      return {
        success: true,
        data: dataResult.data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Erro ao buscar rotas:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Buscar rota por ID com paradas
  async findByIdWithStops(id: number): Promise<ApiResponse> {
    try {
      const routeQuery = `
        SELECT dr.*
        FROM delivery_routes dr
        WHERE dr.id = $1
      `;
      const routeResult = await this.customQuery(routeQuery, [id]);

      if (routeResult.data.length === 0) {
        return {
          success: false,
          error: 'Rota não encontrada'
        };
      }

      const stopsQuery = `
        SELECT drs.*
        FROM delivery_route_stops drs
        WHERE drs.route_id = $1
        ORDER BY drs.stop_order
      `;
      const stopsResult = await this.customQuery(stopsQuery, [id]);

      return {
        success: true,
        data: {
          ...routeResult.data[0],
          stops: stopsResult.data || []
        }
      };
    } catch (error) {
      console.error('Erro ao buscar rota por ID:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Criar rota com paradas
  async createWithStops(routeData: any, stops: any[], userId: number): Promise<ApiResponse> {
    return await this.executeTransaction(async (client) => {
      try {
        // Criar rota
        const routeInsert = `
          INSERT INTO delivery_routes (
            route_code, route_name, route_date, vehicle_plate, driver_name,
            status, notes, total_distance_km, total_duration_minutes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;

        const routeResult = await client.query(routeInsert, [
          routeData.route_code,
          routeData.route_name,
          routeData.route_date,
          routeData.vehicle_plate || null,
          routeData.driver_name || null,
          routeData.status || 'Planejada',
          routeData.notes || null,
          routeData.total_distance_km || null,
          routeData.total_duration_minutes || null
        ]);

        const route = routeResult.rows[0];

        // Criar paradas se houver
        if (stops && stops.length > 0) {
          for (let i = 0; i < stops.length; i++) {
            const stop = stops[i];
            await client.query(
              `INSERT INTO delivery_route_stops (
                route_id, order_id, stop_order, address, latitude, longitude, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                route.id,
                stop.order_id,
                i + 1,
                stop.address,
                stop.latitude || null,
                stop.longitude || null,
                'Pendente'
              ]
            );
          }
        }

        return route;
      } catch (error) {
        console.error('Erro ao criar rota:', error);
        throw error;
      }
    });
  }

  // Atualizar status da rota
  async updateStatus(id: number, status: string, userId: number): Promise<ApiResponse> {
    try {
      const result = await this.update(id, { status, updated_at: new Date() });
      return result;
    } catch (error) {
      console.error('Erro ao atualizar status da rota:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Atualizar parada da rota
  async updateStop(stopId: number, stopData: any): Promise<ApiResponse> {
    return await this.executeTransaction(async (client) => {
      try {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (stopData.status !== undefined) {
          fields.push(`status = $${paramIndex}`);
          values.push(stopData.status);
          paramIndex++;
        }

        if (stopData.delivered_at !== undefined) {
          fields.push(`delivered_at = $${paramIndex}`);
          values.push(stopData.delivered_at);
          paramIndex++;
        }

        if (stopData.notes !== undefined) {
          fields.push(`notes = $${paramIndex}`);
          values.push(stopData.notes);
          paramIndex++;
        }

        if (fields.length === 0) {
          throw new Error('Nenhum campo para atualizar');
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(stopId);

        const updateQuery = `
          UPDATE delivery_route_stops
          SET ${fields.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `;

        const result = await client.query(updateQuery, values);

        if (result.rows.length === 0) {
          throw new Error('Parada não encontrada');
        }

        return result.rows[0];
      } catch (error) {
        console.error('Erro ao atualizar parada:', error);
        throw error;
      }
    });
  }

  // Obter estatísticas de rotas
  async getStats(): Promise<ApiResponse> {
    try {
      const query = `
        SELECT
          COUNT(*) as total_routes,
          COUNT(CASE WHEN status = 'Planejada' THEN 1 END) as planned_routes,
          COUNT(CASE WHEN status = 'Em Andamento' THEN 1 END) as in_progress_routes,
          COUNT(CASE WHEN status = 'Concluída' THEN 1 END) as completed_routes,
          COUNT(CASE WHEN status = 'Cancelada' THEN 1 END) as cancelled_routes,
          COALESCE(SUM(total_distance_km), 0) as total_distance,
          COALESCE(AVG(total_distance_km), 0) as avg_distance
        FROM delivery_routes
        WHERE route_date >= CURRENT_DATE - INTERVAL '30 days'
      `;

      return await this.customQuery(query);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de rotas:', error);
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }
}
