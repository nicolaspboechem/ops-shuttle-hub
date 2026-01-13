-- ==============================================
-- MIGRAÇÃO COMPLETA: Normalização do Banco de Dados
-- ==============================================

-- 1. VIAGENS: Adicionar colunas de FK
ALTER TABLE public.viagens 
ADD COLUMN IF NOT EXISTS motorista_id uuid REFERENCES public.motoristas(id),
ADD COLUMN IF NOT EXISTS veiculo_id uuid REFERENCES public.veiculos(id),
ADD COLUMN IF NOT EXISTS ponto_embarque_id uuid REFERENCES public.pontos_embarque(id),
ADD COLUMN IF NOT EXISTS ponto_desembarque_id uuid REFERENCES public.pontos_embarque(id);

-- 2. MISSOES: Adicionar colunas de FK para pontos
ALTER TABLE public.missoes
ADD COLUMN IF NOT EXISTS ponto_embarque_id uuid REFERENCES public.pontos_embarque(id),
ADD COLUMN IF NOT EXISTS ponto_desembarque_id uuid REFERENCES public.pontos_embarque(id);

-- 3. Índices para performance nas novas FKs
CREATE INDEX IF NOT EXISTS idx_viagens_motorista_id ON public.viagens(motorista_id);
CREATE INDEX IF NOT EXISTS idx_viagens_veiculo_id ON public.viagens(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_viagens_ponto_embarque_id ON public.viagens(ponto_embarque_id);
CREATE INDEX IF NOT EXISTS idx_viagens_ponto_desembarque_id ON public.viagens(ponto_desembarque_id);
CREATE INDEX IF NOT EXISTS idx_missoes_ponto_embarque_id ON public.missoes(ponto_embarque_id);
CREATE INDEX IF NOT EXISTS idx_missoes_ponto_desembarque_id ON public.missoes(ponto_desembarque_id);

-- 4. MIGRAR DADOS: Vincular viagens aos motoristas existentes pelo nome
UPDATE public.viagens v
SET motorista_id = m.id
FROM public.motoristas m
WHERE v.motorista = m.nome 
  AND v.evento_id = m.evento_id
  AND v.motorista_id IS NULL;

-- 5. MIGRAR DADOS: Vincular viagens aos veículos existentes pela placa
UPDATE public.viagens v
SET veiculo_id = ve.id
FROM public.veiculos ve
WHERE v.placa = ve.placa 
  AND v.evento_id = ve.evento_id
  AND v.veiculo_id IS NULL;

-- 6. MIGRAR DADOS: Vincular viagens aos pontos de embarque existentes
UPDATE public.viagens v
SET ponto_embarque_id = pe.id
FROM public.pontos_embarque pe
WHERE v.ponto_embarque = pe.nome 
  AND v.evento_id = pe.evento_id
  AND v.ponto_embarque_id IS NULL;

-- 7. MIGRAR DADOS: Vincular viagens aos pontos de desembarque existentes
UPDATE public.viagens v
SET ponto_desembarque_id = pe.id
FROM public.pontos_embarque pe
WHERE v.ponto_desembarque = pe.nome 
  AND v.evento_id = pe.evento_id
  AND v.ponto_desembarque_id IS NULL;

-- 8. MIGRAR DADOS: Vincular missões aos pontos de embarque
UPDATE public.missoes mi
SET ponto_embarque_id = pe.id
FROM public.pontos_embarque pe
WHERE mi.ponto_embarque = pe.nome 
  AND mi.evento_id = pe.evento_id
  AND mi.ponto_embarque_id IS NULL;

-- 9. MIGRAR DADOS: Vincular missões aos pontos de desembarque
UPDATE public.missoes mi
SET ponto_desembarque_id = pe.id
FROM public.pontos_embarque pe
WHERE mi.ponto_desembarque = pe.nome 
  AND mi.evento_id = pe.evento_id
  AND mi.ponto_desembarque_id IS NULL;

-- 10. Adicionar índice composto para consultas por evento
CREATE INDEX IF NOT EXISTS idx_viagens_evento_status ON public.viagens(evento_id, status);
CREATE INDEX IF NOT EXISTS idx_motoristas_evento_status ON public.motoristas(evento_id, status);