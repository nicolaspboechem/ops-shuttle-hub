
-- Limpar dados de credenciais legadas
DELETE FROM motorista_credenciais;
DELETE FROM staff_credenciais;

-- Remover policies antes de dropar tabelas
DROP POLICY IF EXISTS "motorista_credenciais_delete_admin" ON motorista_credenciais;
DROP POLICY IF EXISTS "motorista_credenciais_insert_admin" ON motorista_credenciais;
DROP POLICY IF EXISTS "motorista_credenciais_select_public" ON motorista_credenciais;
DROP POLICY IF EXISTS "motorista_credenciais_update_admin" ON motorista_credenciais;

DROP POLICY IF EXISTS "staff_credenciais_delete_admin" ON staff_credenciais;
DROP POLICY IF EXISTS "staff_credenciais_insert_admin" ON staff_credenciais;
DROP POLICY IF EXISTS "staff_credenciais_select_public" ON staff_credenciais;
DROP POLICY IF EXISTS "staff_credenciais_update_admin" ON staff_credenciais;

-- Dropar tabelas legadas
DROP TABLE IF EXISTS motorista_credenciais;
DROP TABLE IF EXISTS staff_credenciais;

-- Remover policies temporárias de campo
DROP POLICY IF EXISTS "motoristas_update_field_temp" ON motoristas;
DROP POLICY IF EXISTS "veiculos_update_field_temp" ON veiculos;
