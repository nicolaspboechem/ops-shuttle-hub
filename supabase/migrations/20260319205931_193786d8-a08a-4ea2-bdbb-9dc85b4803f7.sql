
-- Change default for habilitar_localizador from true to false
ALTER TABLE public.eventos ALTER COLUMN habilitar_localizador SET DEFAULT false;

-- Normalize NULL values to false (don't touch existing true values)
UPDATE public.eventos SET habilitar_localizador = false WHERE habilitar_localizador IS NULL;
