-- Tabela para histórico completo de vistorias de veículos
CREATE TABLE public.veiculo_vistoria_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id UUID NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  
  -- Dados da vistoria
  tipo_vistoria VARCHAR NOT NULL DEFAULT 'inspecao', -- 'inspecao', 're-vistoria', 'checkout'
  status_anterior VARCHAR,
  status_novo VARCHAR NOT NULL,
  possui_avarias BOOLEAN DEFAULT false,
  
  -- Dados de inspeção (snapshot no momento da vistoria)
  inspecao_dados JSONB,
  fotos_urls TEXT[], -- URLs das fotos gerais
  nivel_combustivel VARCHAR,
  km_registrado INTEGER,
  observacoes TEXT,
  
  -- Quem fez a vistoria
  realizado_por UUID REFERENCES profiles(user_id),
  realizado_por_nome VARCHAR,
  
  -- Motorista que estava usando o veículo no momento
  motorista_id UUID REFERENCES motoristas(id) ON DELETE SET NULL,
  motorista_nome VARCHAR, -- Desnormalizado para histórico
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para consultas
CREATE INDEX idx_vistoria_historico_veiculo ON veiculo_vistoria_historico(veiculo_id);
CREATE INDEX idx_vistoria_historico_evento ON veiculo_vistoria_historico(evento_id);
CREATE INDEX idx_vistoria_historico_data ON veiculo_vistoria_historico(created_at DESC);

-- RLS
ALTER TABLE veiculo_vistoria_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on veiculo_vistoria_historico" 
  ON veiculo_vistoria_historico FOR SELECT USING (true);

CREATE POLICY "Allow insert on veiculo_vistoria_historico" 
  ON veiculo_vistoria_historico FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update on veiculo_vistoria_historico" 
  ON veiculo_vistoria_historico FOR UPDATE USING (true);

CREATE POLICY "Allow delete on veiculo_vistoria_historico" 
  ON veiculo_vistoria_historico FOR DELETE USING (true);