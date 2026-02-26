-- Backfill: inserir em evento_usuarios todos os motoristas existentes com user_id e evento_id
-- que ainda não possuem vínculo correspondente
INSERT INTO public.evento_usuarios (evento_id, user_id, role)
SELECT DISTINCT m.evento_id, m.user_id, 'motorista'
FROM public.motoristas m
WHERE m.user_id IS NOT NULL
  AND m.evento_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.evento_usuarios eu
    WHERE eu.evento_id = m.evento_id AND eu.user_id = m.user_id
  );

-- Criar índice único parcial para evitar duplicidade futura de user+evento em evento_usuarios
CREATE UNIQUE INDEX IF NOT EXISTS idx_evento_usuarios_user_evento
ON public.evento_usuarios (evento_id, user_id);