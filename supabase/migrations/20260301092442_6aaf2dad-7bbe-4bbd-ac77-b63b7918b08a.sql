
-- 1. Apagar logs das viagens do evento Routes Hotel 2026
DELETE FROM public.viagem_logs
WHERE viagem_id IN (
  SELECT id FROM public.viagens
  WHERE evento_id = '1dde22c2-884c-4b14-89e2-17fa5d0b33d1'
);

-- 2. Apagar viagens do evento
DELETE FROM public.viagens
WHERE evento_id = '1dde22c2-884c-4b14-89e2-17fa5d0b33d1';
