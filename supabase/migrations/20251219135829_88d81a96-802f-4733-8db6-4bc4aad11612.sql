-- Adicionar campos de controle de status na tabela viagens
ALTER TABLE viagens ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'agendado';
-- Valores: 'agendado' | 'em_andamento' | 'aguardando_retorno' | 'encerrado' | 'cancelado'

ALTER TABLE viagens ADD COLUMN IF NOT EXISTS iniciado_por UUID;
ALTER TABLE viagens ADD COLUMN IF NOT EXISTS finalizado_por UUID;
ALTER TABLE viagens ADD COLUMN IF NOT EXISTS h_inicio_real TIMESTAMP WITH TIME ZONE;
ALTER TABLE viagens ADD COLUMN IF NOT EXISTS h_fim_real TIMESTAMP WITH TIME ZONE;

-- Atualizar viagens existentes: encerrado=true -> status='encerrado', senão 'agendado'
UPDATE viagens SET status = CASE WHEN encerrado = true THEN 'encerrado' ELSE 'agendado' END;

-- Criar tabela de logs de viagem para histórico de ações
CREATE TABLE IF NOT EXISTS viagem_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id UUID REFERENCES viagens(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  acao VARCHAR NOT NULL, -- 'inicio', 'embarque', 'chegada', 'retorno', 'encerramento', 'cancelamento'
  detalhes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS na tabela de logs
ALTER TABLE viagem_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para viagem_logs
CREATE POLICY "Allow all read on viagem_logs" ON viagem_logs FOR SELECT USING (true);
CREATE POLICY "Allow insert on viagem_logs" ON viagem_logs FOR INSERT WITH CHECK (true);

-- Habilitar Realtime para viagens (para sincronização em tempo real)
ALTER TABLE viagens REPLICA IDENTITY FULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_viagens_status ON viagens(status);
CREATE INDEX IF NOT EXISTS idx_viagens_evento_status ON viagens(evento_id, status);
CREATE INDEX IF NOT EXISTS idx_viagem_logs_viagem_id ON viagem_logs(viagem_id);