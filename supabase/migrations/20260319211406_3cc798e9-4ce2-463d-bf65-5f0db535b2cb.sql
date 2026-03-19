
-- Delete viagem_logs for viagens of this event
DELETE FROM public.viagem_logs WHERE viagem_id IN (
  SELECT id FROM public.viagens WHERE evento_id = 'c76c5640-6f6c-4553-8fbe-b385cc552c3e'
);

-- Delete viagens
DELETE FROM public.viagens WHERE evento_id = 'c76c5640-6f6c-4553-8fbe-b385cc552c3e';

-- Delete vistorias
DELETE FROM public.veiculo_vistoria_historico WHERE evento_id = 'c76c5640-6f6c-4553-8fbe-b385cc552c3e';

-- Reset evento counters
UPDATE public.eventos SET total_viagens = 0 WHERE id = 'c76c5640-6f6c-4553-8fbe-b385cc552c3e';
