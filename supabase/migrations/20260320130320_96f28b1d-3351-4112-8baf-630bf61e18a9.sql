DELETE FROM viagem_logs WHERE viagem_id IN (
  SELECT id FROM viagens 
  WHERE data_criacao >= '2026-03-19T00:00:00-03:00' 
  AND data_criacao < '2026-03-20T00:00:00-03:00'
);

DELETE FROM viagens 
WHERE data_criacao >= '2026-03-19T00:00:00-03:00' 
AND data_criacao < '2026-03-20T00:00:00-03:00';