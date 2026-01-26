-- Adicionar coluna eh_base na tabela pontos_embarque
ALTER TABLE pontos_embarque 
ADD COLUMN eh_base BOOLEAN DEFAULT false;

-- Índice para garantir performance na busca por base
CREATE INDEX idx_pontos_embarque_base 
ON pontos_embarque(evento_id, eh_base) 
WHERE eh_base = true;