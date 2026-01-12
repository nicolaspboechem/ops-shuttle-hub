-- Add nome column to veiculos table for vehicle naming/aliasing
ALTER TABLE public.veiculos 
ADD COLUMN IF NOT EXISTS nome VARCHAR(100) NULL;

COMMENT ON COLUMN public.veiculos.nome IS 'Nome/apelido do veículo para identificação rápida';