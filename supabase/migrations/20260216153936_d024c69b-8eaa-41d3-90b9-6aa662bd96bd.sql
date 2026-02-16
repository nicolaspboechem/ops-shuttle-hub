CREATE OR REPLACE FUNCTION public.update_evento_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evento_id UUID;
  v_total INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_evento_id := OLD.evento_id;
  ELSE
    v_evento_id := NEW.evento_id;
  END IF;
  
  IF v_evento_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  SELECT COUNT(*)
  INTO v_total
  FROM viagens
  WHERE evento_id = v_evento_id;
  
  UPDATE eventos
  SET 
    total_viagens = COALESCE(v_total, 0),
    data_ultima_sync = NOW()
  WHERE id = v_evento_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;