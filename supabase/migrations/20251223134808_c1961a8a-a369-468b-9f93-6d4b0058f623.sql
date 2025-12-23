-- Adicionar coluna local na tabela eventos
ALTER TABLE public.eventos 
ADD COLUMN IF NOT EXISTS local TEXT;