
-- Backfill motorista_id from legacy name field
UPDATE viagens v
SET motorista_id = m.id
FROM motoristas m
WHERE v.motorista_id IS NULL
  AND v.motorista = m.nome
  AND v.evento_id = m.evento_id;

-- Backfill veiculo_id from legacy placa field
UPDATE viagens v
SET veiculo_id = vc.id
FROM veiculos vc
WHERE v.veiculo_id IS NULL
  AND v.placa IS NOT NULL
  AND v.placa = vc.placa
  AND v.evento_id = vc.evento_id;
