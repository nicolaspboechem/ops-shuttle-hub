-- Adicionar coluna qtd_pax na tabela missoes para registrar quantidade de passageiros
ALTER TABLE public.missoes 
ADD COLUMN IF NOT EXISTS qtd_pax integer DEFAULT 0;