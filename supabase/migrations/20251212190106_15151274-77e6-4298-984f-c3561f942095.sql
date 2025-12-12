-- Add fornecedor column to veiculos table
ALTER TABLE public.veiculos 
ADD COLUMN IF NOT EXISTS fornecedor character varying;

-- Remove motorista_id constraint to allow independent vehicle registration
-- Vehicles can exist without a driver assigned
ALTER TABLE public.veiculos 
ALTER COLUMN motorista_id DROP NOT NULL;

-- Add veiculo_id to motoristas table for driver -> vehicle relationship
ALTER TABLE public.motoristas 
ADD COLUMN IF NOT EXISTS veiculo_id uuid REFERENCES public.veiculos(id) ON DELETE SET NULL;

-- Create index for the new relationship
CREATE INDEX IF NOT EXISTS idx_motoristas_veiculo_id ON public.motoristas(veiculo_id);