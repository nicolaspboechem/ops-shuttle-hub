-- Criar tabela para fotos de veículos
CREATE TABLE public.veiculo_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id UUID NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  tipo VARCHAR(50) DEFAULT 'geral', -- 'inspecao', 'avaria', 'geral'
  area_veiculo VARCHAR(50), -- 'frente', 'lateral_esquerda', 'lateral_direita', 'traseira', 'teto', 'interior'
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  criado_por UUID,
  data_criacao TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para queries por veículo
CREATE INDEX idx_veiculo_fotos_veiculo_id ON public.veiculo_fotos(veiculo_id);

-- RLS para veiculo_fotos
ALTER TABLE public.veiculo_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read on veiculo_fotos" ON public.veiculo_fotos
  FOR SELECT USING (true);

CREATE POLICY "Allow all insert on veiculo_fotos" ON public.veiculo_fotos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all update on veiculo_fotos" ON public.veiculo_fotos
  FOR UPDATE USING (true);

CREATE POLICY "Allow all delete on veiculo_fotos" ON public.veiculo_fotos
  FOR DELETE USING (true);

-- Adicionar novos campos na tabela veiculos
ALTER TABLE public.veiculos 
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'em_inspecao',
  ADD COLUMN IF NOT EXISTS liberado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS liberado_por UUID,
  ADD COLUMN IF NOT EXISTS nivel_combustivel VARCHAR(10),
  ADD COLUMN IF NOT EXISTS possui_avarias BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS inspecao_dados JSONB,
  ADD COLUMN IF NOT EXISTS inspecao_data TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inspecao_por UUID,
  ADD COLUMN IF NOT EXISTS observacoes_gerais TEXT;

-- Criar bucket para fotos de veículos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('veiculos', 'veiculos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para o bucket veiculos
CREATE POLICY "Public read veiculos bucket" ON storage.objects 
  FOR SELECT USING (bucket_id = 'veiculos');

CREATE POLICY "Authenticated upload veiculos bucket" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'veiculos');

CREATE POLICY "Authenticated delete veiculos bucket" ON storage.objects 
  FOR DELETE USING (bucket_id = 'veiculos');