
CREATE OR REPLACE FUNCTION public.get_motorista_presenca(
  p_evento_id UUID,
  p_motorista_id UUID,
  p_data DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'habilitar_missoes', e.habilitar_missoes,
    'horario_virada_dia', e.horario_virada_dia,
    'veiculo_id', m.veiculo_id,
    'veiculo', CASE WHEN m.veiculo_id IS NOT NULL THEN (
      SELECT row_to_json(v) FROM veiculos v WHERE v.id = m.veiculo_id
    ) ELSE NULL END,
    'presenca_ativa', (
      SELECT row_to_json(mp) FROM motorista_presenca mp
      WHERE mp.motorista_id = p_motorista_id
        AND mp.evento_id = p_evento_id
        AND mp.data = p_data
        AND mp.checkin_at IS NOT NULL
        AND mp.checkout_at IS NULL
      ORDER BY mp.created_at DESC LIMIT 1
    ),
    'presenca_recente', (
      SELECT row_to_json(mp) FROM motorista_presenca mp
      WHERE mp.motorista_id = p_motorista_id
        AND mp.evento_id = p_evento_id
        AND mp.data = p_data
      ORDER BY mp.created_at DESC LIMIT 1
    )
  ) INTO result
  FROM eventos e
  CROSS JOIN motoristas m
  WHERE e.id = p_evento_id
    AND m.id = p_motorista_id;
  
  RETURN result;
END;
$$;
