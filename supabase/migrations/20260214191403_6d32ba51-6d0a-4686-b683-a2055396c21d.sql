-- Índice composto para queries filtradas por evento + tipo_operacao (usado pelo operador shuttle)
CREATE INDEX IF NOT EXISTS idx_viagens_evento_tipo_operacao 
ON public.viagens (evento_id, tipo_operacao);

-- Índice composto para queries filtradas por evento + data_criacao (usado pelo dia operacional)
CREATE INDEX IF NOT EXISTS idx_viagens_evento_data_criacao 
ON public.viagens (evento_id, data_criacao);

-- Índice para viagem_logs por created_at (usado pelo painel de notificações)
CREATE INDEX IF NOT EXISTS idx_viagem_logs_created_at 
ON public.viagem_logs (created_at DESC);