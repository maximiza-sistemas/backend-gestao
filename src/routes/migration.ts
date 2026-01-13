import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import fs from 'fs';
import path from 'path';

const router = Router();

// Endpoint temporário para rodar a migração
router.post('/run-delivery-routes', async (req: Request, res: Response) => {
  try {
    const migrationPath = path.join(__dirname, '../database/migrations/003_add_delivery_routes.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Executando migração de rotas de entrega...');
    await query(sql);
    console.log('✅ Migração executada com sucesso!');

    res.json({
      success: true,
      message: 'Migração de rotas de entrega executada com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao executar migração',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Endpoint para rodar migração financeira
router.post('/run-financial', async (req: Request, res: Response) => {
  try {
    const migrationPath = path.join(__dirname, '../database/migrations/005_add_financial_tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Executando migração do módulo financeiro...');
    await query(sql);
    console.log('✅ Migração executada com sucesso!');

    res.json({
      success: true,
      message: 'Migração do módulo financeiro executada com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao executar migração',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;
