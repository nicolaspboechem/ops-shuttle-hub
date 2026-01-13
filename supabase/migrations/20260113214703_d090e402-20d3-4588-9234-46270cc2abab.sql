-- Add location tracking fields to motoristas table
ALTER TABLE public.motoristas 
ADD COLUMN IF NOT EXISTS ultima_localizacao text,
ADD COLUMN IF NOT EXISTS ultima_localizacao_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN public.motoristas.ultima_localizacao IS 'Last known location (ponto_desembarque from last completed trip)';
COMMENT ON COLUMN public.motoristas.ultima_localizacao_at IS 'Timestamp when the driver arrived at the location';