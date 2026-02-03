-- Adicionar colunas de navegação na tabela rotas_shuttle
ALTER TABLE rotas_shuttle 
ADD COLUMN IF NOT EXISTS link_maps text,
ADD COLUMN IF NOT EXISTS link_waze text,
ADD COLUMN IF NOT EXISTS ponto_origem_id uuid REFERENCES pontos_embarque(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS ponto_destino_id uuid REFERENCES pontos_embarque(id) ON DELETE SET NULL;

-- Índice para busca por pontos
CREATE INDEX IF NOT EXISTS idx_rotas_shuttle_pontos 
ON rotas_shuttle(ponto_origem_id, ponto_destino_id);