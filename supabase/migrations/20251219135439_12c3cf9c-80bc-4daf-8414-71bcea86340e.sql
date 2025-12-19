-- Corrigir viagens que estão com data 12/12 para 04/12/2025
UPDATE viagens 
SET data_criacao = data_criacao - INTERVAL '8 days'
WHERE evento_id = '29adc3dd-c9dc-4049-9f8c-5333bc5c14c7'
AND DATE(data_criacao) = '2025-12-12';

-- Atualizar data_inicio do evento para incluir dia 04
UPDATE eventos 
SET data_inicio = '2025-12-04'
WHERE id = '29adc3dd-c9dc-4049-9f8c-5333bc5c14c7';