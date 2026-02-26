
-- Add tipos_viagem_habilitados column
ALTER TABLE public.eventos
ADD COLUMN tipos_viagem_habilitados TEXT[] DEFAULT '{missao}';

-- Populate from legacy fields
UPDATE public.eventos SET tipos_viagem_habilitados = 
  CASE
    WHEN habilitar_missoes = true AND tipo_operacao = 'ambos' THEN '{missao,transfer,shuttle}'::TEXT[]
    WHEN habilitar_missoes = true AND tipo_operacao = 'transfer' THEN '{missao,transfer}'::TEXT[]
    WHEN habilitar_missoes = true AND tipo_operacao = 'shuttle' THEN '{missao,shuttle}'::TEXT[]
    WHEN habilitar_missoes = true THEN '{missao}'::TEXT[]
    WHEN tipo_operacao = 'ambos' THEN '{transfer,shuttle}'::TEXT[]
    WHEN tipo_operacao = 'transfer' THEN '{transfer}'::TEXT[]
    WHEN tipo_operacao = 'shuttle' THEN '{shuttle}'::TEXT[]
    ELSE '{missao}'::TEXT[]
  END;
