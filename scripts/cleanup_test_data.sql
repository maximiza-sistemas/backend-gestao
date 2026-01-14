-- ============================================
-- SCRIPT DE LIMPEZA DO BANCO DE DADOS
-- Sistema de Gestão de Distribuidora de Gás
-- ============================================
-- 
-- ATENÇÃO: Este script remove TODOS os dados de teste,
-- mantendo APENAS o usuário admin.
--
-- Execute este script no banco de dados de produção
-- ANTES do cliente começar a cadastrar dados reais.
-- ============================================

-- Desabilitar verificação de chaves estrangeiras temporariamente
-- (não necessário no PostgreSQL, mas mantemos a ordem correta)

BEGIN;

-- ============================================
-- 1. LIMPAR TABELAS DE LOGS E ATIVIDADES
-- ============================================
TRUNCATE TABLE activity_logs CASCADE;

-- ============================================
-- 2. LIMPAR TABELAS DE MOVIMENTAÇÃO DE ESTOQUE
-- ============================================
DELETE FROM stock_movements;

-- ============================================
-- 3. LIMPAR TABELAS DE PAGAMENTOS E FINANCEIRO
-- ============================================
DELETE FROM order_payments;
DELETE FROM purchase_installments;
DELETE FROM financial_transactions;

-- ============================================
-- 4. LIMPAR TABELAS DE PEDIDOS
-- ============================================
DELETE FROM order_items;
DELETE FROM orders;

-- ============================================
-- 5. LIMPAR TABELAS DE COMPRAS
-- ============================================
DELETE FROM product_purchases;

-- ============================================
-- 6. LIMPAR TABELAS DE ROTAS E ENTREGAS
-- ============================================
DELETE FROM delivery_route_stops;
DELETE FROM delivery_routes;

-- ============================================
-- 7. LIMPAR TABELAS DE EMPRÉSTIMOS DE VASILHAMES
-- ============================================
DELETE FROM container_loan_items;
DELETE FROM container_loans;

-- ============================================
-- 8. LIMPAR TABELAS DE FROTA
-- ============================================
DELETE FROM vehicle_expenses;
DELETE FROM vehicle_trips;
DELETE FROM vehicle_fueling;
DELETE FROM vehicle_maintenance;
DELETE FROM drivers;
DELETE FROM vehicles;

-- ============================================
-- 9. LIMPAR TABELAS DE ESTOQUE
-- ============================================
DELETE FROM stock;

-- ============================================
-- 10. LIMPAR TABELAS DE CUSTOS DE PRODUTOS
-- ============================================
DELETE FROM product_supplier_costs;

-- ============================================
-- 11. LIMPAR TABELAS PRINCIPAIS
-- ============================================
DELETE FROM products;
DELETE FROM clients;
DELETE FROM suppliers;
DELETE FROM locations;

-- ============================================
-- 12. LIMPAR TABELAS FINANCEIRAS (CONTAS E CATEGORIAS)
-- ============================================
DELETE FROM financial_accounts;
DELETE FROM financial_categories;

-- ============================================
-- 13. MANTER APENAS O USUÁRIO ADMIN
-- ============================================
DELETE FROM users WHERE email != 'admin@sisgas.com';

-- ============================================
-- 14. RESETAR SEQUÊNCIAS (IDs)
-- ============================================
-- Isso faz com que os novos registros comecem do ID 1

-- Tabelas principais
ALTER SEQUENCE IF EXISTS clients_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS products_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS suppliers_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS locations_id_seq RESTART WITH 1;

-- Pedidos e itens
ALTER SEQUENCE IF EXISTS orders_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS order_payments_id_seq RESTART WITH 1;

-- Estoque
ALTER SEQUENCE IF EXISTS stock_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS stock_movements_id_seq RESTART WITH 1;

-- Empréstimos
ALTER SEQUENCE IF EXISTS container_loans_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS container_loan_items_id_seq RESTART WITH 1;

-- Rotas
ALTER SEQUENCE IF EXISTS delivery_routes_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS delivery_route_stops_id_seq RESTART WITH 1;

-- Frota
ALTER SEQUENCE IF EXISTS vehicles_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS drivers_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS vehicle_maintenance_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS vehicle_fueling_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS vehicle_trips_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS vehicle_expenses_id_seq RESTART WITH 1;

-- Financeiro
ALTER SEQUENCE IF EXISTS financial_accounts_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS financial_categories_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS financial_transactions_id_seq RESTART WITH 1;

-- Compras
ALTER SEQUENCE IF EXISTS product_purchases_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS purchase_installments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS product_supplier_costs_id_seq RESTART WITH 1;

-- Logs
ALTER SEQUENCE IF EXISTS activity_logs_id_seq RESTART WITH 1;

COMMIT;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
SELECT 'Limpeza concluída!' AS status;
SELECT 'Usuários restantes:' AS info, COUNT(*) AS total FROM users;
SELECT email, name, role FROM users;
