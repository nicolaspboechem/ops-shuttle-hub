
-- Remove the global unique constraint on placa
ALTER TABLE veiculos DROP CONSTRAINT IF EXISTS veiculos_placa_key;

-- Add a composite unique constraint on (placa, evento_id) to allow same plate in different events
ALTER TABLE veiculos ADD CONSTRAINT veiculos_placa_evento_unique UNIQUE (placa, evento_id);
