
-- =============================================
-- FASE 1.1 - Trigger de sincronização legado ↔ FK
-- =============================================

CREATE OR REPLACE FUNCTION public.sync_viagem_legado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Sincroniza campos varchar a partir das FKs
  IF NEW.motorista_id IS NOT NULL THEN
    SELECT nome INTO NEW.motorista FROM motoristas WHERE id = NEW.motorista_id;
  END IF;
  IF NEW.veiculo_id IS NOT NULL THEN
    SELECT placa, tipo_veiculo INTO NEW.placa, NEW.tipo_veiculo 
    FROM veiculos WHERE id = NEW.veiculo_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_viagem_legado
BEFORE INSERT OR UPDATE ON viagens
FOR EACH ROW EXECUTE FUNCTION public.sync_viagem_legado();

-- =============================================
-- FASE 1.3 - Constraint parcial presença ativa única
-- =============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_presenca_ativa_unica
  ON motorista_presenca (motorista_id, evento_id, data)
  WHERE checkout_at IS NULL;

-- =============================================
-- FASE 1.4 - CHECK constraints para status
-- =============================================

ALTER TABLE motoristas ADD CONSTRAINT chk_motorista_status
  CHECK (status IN ('disponivel','em_viagem','indisponivel','inativo'));

ALTER TABLE veiculos ADD CONSTRAINT chk_veiculo_status  
  CHECK (status IN ('em_inspecao','liberado','abastecimento','manutencao'));

ALTER TABLE viagens ADD CONSTRAINT chk_viagem_status
  CHECK (status IN ('agendado','em_andamento','aguardando_retorno','encerrado','cancelado'));

-- =============================================
-- FASE 1.5 - alertas_frota.motorista_id nullable
-- =============================================

ALTER TABLE alertas_frota ALTER COLUMN motorista_id DROP NOT NULL;

-- =============================================
-- FASE 3 - Índices de performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_viagens_evento_encerrado 
  ON viagens (evento_id, encerrado) WHERE encerrado = false;

CREATE INDEX IF NOT EXISTS idx_viagens_motorista_id 
  ON viagens (motorista_id) WHERE motorista_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_viagens_veiculo_id 
  ON viagens (veiculo_id) WHERE veiculo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presenca_ativa 
  ON motorista_presenca (motorista_id, evento_id, data) 
  WHERE checkout_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vistoria_evento_tipo 
  ON veiculo_vistoria_historico (evento_id, tipo_vistoria);
