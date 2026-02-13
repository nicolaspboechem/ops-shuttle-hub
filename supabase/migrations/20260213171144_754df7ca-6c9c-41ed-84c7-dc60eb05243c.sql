
-- Fix FK constraints to allow motorista deletion without 409 errors

-- viagens.motorista_id -> SET NULL on delete
ALTER TABLE viagens 
  DROP CONSTRAINT IF EXISTS viagens_motorista_id_fkey;
ALTER TABLE viagens
  ADD CONSTRAINT viagens_motorista_id_fkey 
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL;

-- alertas_frota.motorista_id -> SET NULL on delete
ALTER TABLE alertas_frota 
  DROP CONSTRAINT IF EXISTS alertas_frota_motorista_id_fkey;
ALTER TABLE alertas_frota
  ADD CONSTRAINT alertas_frota_motorista_id_fkey 
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL;

-- Also fix other tables that reference motoristas to be safe
-- missoes.motorista_id -> SET NULL on delete
ALTER TABLE missoes 
  DROP CONSTRAINT IF EXISTS missoes_motorista_id_fkey;
ALTER TABLE missoes
  ADD CONSTRAINT missoes_motorista_id_fkey 
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL;

-- veiculos.motorista_id -> SET NULL on delete
ALTER TABLE veiculos 
  DROP CONSTRAINT IF EXISTS veiculos_motorista_id_fkey;
ALTER TABLE veiculos
  ADD CONSTRAINT veiculos_motorista_id_fkey 
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL;

-- veiculo_vistoria_historico.motorista_id -> SET NULL on delete
ALTER TABLE veiculo_vistoria_historico 
  DROP CONSTRAINT IF EXISTS veiculo_vistoria_historico_motorista_id_fkey;
ALTER TABLE veiculo_vistoria_historico
  ADD CONSTRAINT veiculo_vistoria_historico_motorista_id_fkey 
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE SET NULL;

-- motorista_presenca.motorista_id -> CASCADE on delete
ALTER TABLE motorista_presenca 
  DROP CONSTRAINT IF EXISTS motorista_presenca_motorista_id_fkey;
ALTER TABLE motorista_presenca
  ADD CONSTRAINT motorista_presenca_motorista_id_fkey 
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE CASCADE;

-- motorista_credenciais.motorista_id -> CASCADE on delete
ALTER TABLE motorista_credenciais 
  DROP CONSTRAINT IF EXISTS motorista_credenciais_motorista_id_fkey;
ALTER TABLE motorista_credenciais
  ADD CONSTRAINT motorista_credenciais_motorista_id_fkey 
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE CASCADE;

-- ponto_motoristas.motorista_id -> CASCADE on delete
ALTER TABLE ponto_motoristas 
  DROP CONSTRAINT IF EXISTS ponto_motoristas_motorista_id_fkey;
ALTER TABLE ponto_motoristas
  ADD CONSTRAINT ponto_motoristas_motorista_id_fkey 
    FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE CASCADE;
