-- Função para atualizar estatísticas do evento
CREATE OR REPLACE FUNCTION public.update_evento_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evento_id UUID;
  v_total INTEGER;
  v_data_inicio DATE;
  v_data_fim DATE;
BEGIN
  -- Determinar qual evento_id atualizar
  IF TG_OP = 'DELETE' THEN
    v_evento_id := OLD.evento_id;
  ELSE
    v_evento_id := NEW.evento_id;
  END IF;
  
  -- Se não tem evento_id, não faz nada
  IF v_evento_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Calcular estatísticas
  SELECT 
    COUNT(*),
    MIN(DATE(data_criacao)),
    MAX(DATE(data_criacao))
  INTO v_total, v_data_inicio, v_data_fim
  FROM viagens
  WHERE evento_id = v_evento_id;
  
  -- Atualizar evento
  UPDATE eventos
  SET 
    total_viagens = COALESCE(v_total, 0),
    data_inicio = v_data_inicio,
    data_fim = v_data_fim,
    data_ultima_sync = NOW()
  WHERE id = v_evento_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger para INSERT
CREATE TRIGGER trigger_viagens_insert_stats
AFTER INSERT ON viagens
FOR EACH ROW
EXECUTE FUNCTION update_evento_stats();

-- Trigger para UPDATE (quando evento_id muda)
CREATE TRIGGER trigger_viagens_update_stats
AFTER UPDATE ON viagens
FOR EACH ROW
WHEN (OLD.evento_id IS DISTINCT FROM NEW.evento_id OR OLD.data_criacao IS DISTINCT FROM NEW.data_criacao)
EXECUTE FUNCTION update_evento_stats();

-- Trigger para DELETE
CREATE TRIGGER trigger_viagens_delete_stats
AFTER DELETE ON viagens
FOR EACH ROW
EXECUTE FUNCTION update_evento_stats();