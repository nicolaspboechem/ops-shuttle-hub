-- Add KM tracking columns to veiculos table
ALTER TABLE public.veiculos 
ADD COLUMN IF NOT EXISTS km_inicial INTEGER,
ADD COLUMN IF NOT EXISTS km_final INTEGER,
ADD COLUMN IF NOT EXISTS km_inicial_registrado_por UUID,
ADD COLUMN IF NOT EXISTS km_final_registrado_por UUID,
ADD COLUMN IF NOT EXISTS km_inicial_data TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS km_final_data TIMESTAMPTZ;