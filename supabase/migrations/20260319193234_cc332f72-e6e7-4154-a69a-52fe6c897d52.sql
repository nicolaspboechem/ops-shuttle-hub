
-- Convert all existing transfer viagens to shuttle
UPDATE viagens SET tipo_operacao = 'shuttle' WHERE tipo_operacao = 'transfer';

-- Remove 'transfer' from tipos_viagem_habilitados arrays
UPDATE eventos 
SET tipos_viagem_habilitados = array_remove(tipos_viagem_habilitados, 'transfer')
WHERE 'transfer' = ANY(tipos_viagem_habilitados);

-- Update legacy tipo_operacao field  
UPDATE eventos SET tipo_operacao = 'shuttle' WHERE tipo_operacao = 'transfer';

-- Change default for eventos.tipo_operacao from 'transfer' to 'shuttle'
ALTER TABLE eventos ALTER COLUMN tipo_operacao SET DEFAULT 'shuttle';
