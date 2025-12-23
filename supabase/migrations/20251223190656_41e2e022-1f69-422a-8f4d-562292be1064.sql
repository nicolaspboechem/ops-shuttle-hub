-- Adicionar campos de auditoria na tabela motoristas
ALTER TABLE public.motoristas
ADD COLUMN IF NOT EXISTS criado_por uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS atualizado_por uuid REFERENCES auth.users(id);

-- Adicionar campos de auditoria na tabela veiculos
ALTER TABLE public.veiculos
ADD COLUMN IF NOT EXISTS criado_por uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS atualizado_por uuid REFERENCES auth.users(id);

-- Adicionar campos de auditoria na tabela viagens (já tem iniciado_por e finalizado_por)
ALTER TABLE public.viagens
ADD COLUMN IF NOT EXISTS criado_por uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS atualizado_por uuid REFERENCES auth.users(id);

-- Adicionar campos de auditoria na tabela rotas_shuttle
ALTER TABLE public.rotas_shuttle
ADD COLUMN IF NOT EXISTS criado_por uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS atualizado_por uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS data_atualizacao timestamp with time zone DEFAULT now();

-- Adicionar campos de auditoria na tabela pontos_embarque
ALTER TABLE public.pontos_embarque
ADD COLUMN IF NOT EXISTS criado_por uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS atualizado_por uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS data_atualizacao timestamp with time zone DEFAULT now();