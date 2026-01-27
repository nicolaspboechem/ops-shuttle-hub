-- Corrigir localizações desatualizadas dos motoristas
-- Baseado na última viagem encerrada de cada um

WITH ultima_viagem AS (
  SELECT DISTINCT ON (motorista_id) 
    motorista_id,
    ponto_desembarque,
    h_fim_real
  FROM viagens
  WHERE encerrado = true 
    AND motorista_id IS NOT NULL
    AND ponto_desembarque IS NOT NULL
  ORDER BY motorista_id, h_fim_real DESC NULLS LAST
)
UPDATE motoristas m
SET 
  ultima_localizacao = uv.ponto_desembarque,
  ultima_localizacao_at = uv.h_fim_real
FROM ultima_viagem uv
WHERE m.id = uv.motorista_id
  AND (m.ultima_localizacao IS DISTINCT FROM uv.ponto_desembarque OR m.ultima_localizacao IS NULL)