-- Deletar logs das viagens do Nicolas
DELETE FROM viagem_logs WHERE viagem_id IN (
  SELECT id FROM viagens WHERE motorista_id = 'ea37e6cd-c9f2-4eff-a96d-a8520b7a61bf'
);

-- Deletar viagens do Nicolas
DELETE FROM viagens WHERE motorista_id = 'ea37e6cd-c9f2-4eff-a96d-a8520b7a61bf';

-- Deletar presença
DELETE FROM motorista_presenca WHERE motorista_id = 'ea37e6cd-c9f2-4eff-a96d-a8520b7a61bf';

-- Deletar credenciais
DELETE FROM motorista_credenciais WHERE motorista_id = 'ea37e6cd-c9f2-4eff-a96d-a8520b7a61bf';

-- Deletar ponto_motoristas (se houver)
DELETE FROM ponto_motoristas WHERE motorista_id = 'ea37e6cd-c9f2-4eff-a96d-a8520b7a61bf';

-- Deletar o motorista
DELETE FROM motoristas WHERE id = 'ea37e6cd-c9f2-4eff-a96d-a8520b7a61bf';