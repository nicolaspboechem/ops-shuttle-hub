
-- Inserir motoristas únicos baseado nas viagens
INSERT INTO motoristas (nome, telefone, cnh, observacao, ativo)
VALUES 
  ('Anderson', NULL, NULL, NULL, true),
  ('André', NULL, NULL, NULL, true),
  ('Assis', NULL, NULL, NULL, true),
  ('Bira', NULL, NULL, NULL, true),
  ('Celso', NULL, NULL, NULL, true),
  ('Ciro', NULL, NULL, NULL, true),
  ('Edson', NULL, NULL, NULL, true),
  ('Eduardo', NULL, NULL, NULL, true),
  ('Everton', NULL, NULL, NULL, true),
  ('Fernando', NULL, NULL, NULL, true),
  ('Gustavo', NULL, NULL, NULL, true),
  ('Heraldo', NULL, NULL, NULL, true),
  ('Jadir', NULL, NULL, NULL, true),
  ('Jesse', NULL, NULL, NULL, true),
  ('João Paulo', NULL, NULL, NULL, true),
  ('Leandro', NULL, NULL, NULL, true),
  ('Lucas', NULL, NULL, NULL, true),
  ('Luciano', NULL, NULL, NULL, true),
  ('Marcelo', NULL, NULL, NULL, true),
  ('Mineiro', NULL, NULL, NULL, true),
  ('Odilon', NULL, NULL, NULL, true),
  ('Paulo', NULL, NULL, NULL, true),
  ('Paulo Henrique', NULL, NULL, NULL, true),
  ('Rafael', NULL, NULL, NULL, true),
  ('Ramon', NULL, NULL, NULL, true),
  ('Regis', NULL, NULL, NULL, true),
  ('Renato', NULL, NULL, NULL, true),
  ('Vilson', NULL, NULL, NULL, true)
ON CONFLICT DO NOTHING;

-- Inserir veículos únicos com vínculo ao motorista
-- Para motoristas com múltiplos veículos, inserir apenas o mais usado
INSERT INTO veiculos (placa, tipo_veiculo, motorista_id, marca, modelo, ano, capacidade, ativo)
SELECT 
  v.placa,
  v.tipo_veiculo,
  m.id,
  NULL,
  NULL,
  NULL,
  NULL,
  true
FROM (
  SELECT DISTINCT ON (motorista) motorista, placa, tipo_veiculo
  FROM viagens
  WHERE motorista IS NOT NULL AND placa IS NOT NULL
  ORDER BY motorista, placa
) v
JOIN motoristas m ON m.nome = v.motorista
ON CONFLICT DO NOTHING;
