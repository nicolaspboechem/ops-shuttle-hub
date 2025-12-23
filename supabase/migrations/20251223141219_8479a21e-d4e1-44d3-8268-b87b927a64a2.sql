-- Adicionar coluna ponto_desembarque na tabela viagens
ALTER TABLE public.viagens 
ADD COLUMN ponto_desembarque VARCHAR NULL;