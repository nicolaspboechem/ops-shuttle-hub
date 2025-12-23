-- Campos de conteúdo no evento
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS imagem_banner TEXT;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS imagem_logo TEXT;

-- Nova tabela: rotas/serviços de shuttle
CREATE TABLE IF NOT EXISTS rotas_shuttle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  nome VARCHAR NOT NULL,
  origem VARCHAR NOT NULL,
  destino VARCHAR NOT NULL,
  frequencia_minutos INTEGER,
  horario_inicio TIME,
  horario_fim TIME,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies para rotas_shuttle
ALTER TABLE rotas_shuttle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read on rotas_shuttle" ON rotas_shuttle FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on rotas_shuttle" ON rotas_shuttle FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update on rotas_shuttle" ON rotas_shuttle FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete on rotas_shuttle" ON rotas_shuttle FOR DELETE USING (true);

-- Storage bucket para imagens de eventos
INSERT INTO storage.buckets (id, name, public) VALUES ('eventos', 'eventos', true) ON CONFLICT DO NOTHING;

-- Policy para leitura pública de imagens
CREATE POLICY "Public read eventos bucket" ON storage.objects FOR SELECT USING (bucket_id = 'eventos');

-- Policy para upload por usuários autenticados
CREATE POLICY "Authenticated upload eventos bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'eventos' AND auth.role() = 'authenticated');

-- Policy para delete por usuários autenticados
CREATE POLICY "Authenticated delete eventos bucket" ON storage.objects FOR DELETE USING (bucket_id = 'eventos' AND auth.role() = 'authenticated');