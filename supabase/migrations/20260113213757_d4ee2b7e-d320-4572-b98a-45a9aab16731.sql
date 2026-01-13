-- Add vehicle tracking and checkout observation to motorista_presenca
ALTER TABLE motorista_presenca 
ADD COLUMN IF NOT EXISTS veiculo_id uuid REFERENCES veiculos(id),
ADD COLUMN IF NOT EXISTS observacao_checkout text;

-- Add comment for documentation
COMMENT ON COLUMN motorista_presenca.veiculo_id IS 'Vehicle used by driver on this day';
COMMENT ON COLUMN motorista_presenca.observacao_checkout IS 'Optional observation when checking out (damages, issues, etc)';