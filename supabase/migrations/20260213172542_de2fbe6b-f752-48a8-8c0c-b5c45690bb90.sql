-- Drop the unique constraint on telefone to allow same phone across different motoristas/events
ALTER TABLE public.motorista_credenciais DROP CONSTRAINT IF EXISTS motorista_credenciais_telefone_key;