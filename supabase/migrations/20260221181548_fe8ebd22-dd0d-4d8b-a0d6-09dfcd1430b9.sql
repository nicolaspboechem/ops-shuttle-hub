-- 1. Cancelar missão órfã
UPDATE missoes SET status = 'cancelada', data_atualizacao = now() WHERE id = 'e19f112e-1805-4846-846b-983542fc2bac';

-- 2. Encerrar viagem órfã
UPDATE viagens SET status = 'encerrado', encerrado = true, h_fim_real = now() WHERE id = '0e4f9610-33d6-4797-8a7d-973d7facee8c';

-- 3. Desativar credencial do duplicado
UPDATE motorista_credenciais SET ativo = false WHERE id = '112f60ae-2d16-4d3b-a8b1-d8e6f5c9a123';

-- 4. Desativar motorista duplicado
UPDATE motoristas SET ativo = false, status = 'inativo' WHERE id = 'd01d12d6-50ae-4e3b-b8a9-4b51a4288082';