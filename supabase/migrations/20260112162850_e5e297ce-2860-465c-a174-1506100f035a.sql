-- 1. Adicionar campo viagem_pai_id na tabela viagens (para rastrear sequência de rotas)
ALTER TABLE public.viagens 
ADD COLUMN IF NOT EXISTS viagem_pai_id uuid REFERENCES public.viagens(id) ON DELETE SET NULL;

-- 2. Adicionar campo status na tabela motoristas (para controle de disponibilidade)
ALTER TABLE public.motoristas 
ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'disponivel';

-- 3. Criar tabela de missões
CREATE TABLE IF NOT EXISTS public.missoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  motorista_id uuid NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  ponto_embarque text,
  ponto_desembarque text,
  horario_previsto time without time zone,
  status varchar(50) DEFAULT 'pendente',
  prioridade varchar(20) DEFAULT 'normal',
  criado_por uuid,
  atualizado_por uuid,
  created_at timestamp with time zone DEFAULT now(),
  data_atualizacao timestamp with time zone DEFAULT now()
);

-- 4. Habilitar RLS na tabela missoes
ALTER TABLE public.missoes ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para missoes
CREATE POLICY "Allow all read on missoes" 
ON public.missoes 
FOR SELECT 
USING (true);

CREATE POLICY "Allow all insert on missoes" 
ON public.missoes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all update on missoes" 
ON public.missoes 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow all delete on missoes" 
ON public.missoes 
FOR DELETE 
USING (true);

-- 6. Trigger para atualizar data_atualizacao
CREATE OR REPLACE FUNCTION public.update_missoes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER missoes_update_timestamp
BEFORE UPDATE ON public.missoes
FOR EACH ROW
EXECUTE FUNCTION public.update_missoes_timestamp();

-- 7. Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_missoes_evento_id ON public.missoes(evento_id);
CREATE INDEX IF NOT EXISTS idx_missoes_motorista_id ON public.missoes(motorista_id);
CREATE INDEX IF NOT EXISTS idx_missoes_status ON public.missoes(status);
CREATE INDEX IF NOT EXISTS idx_viagens_viagem_pai_id ON public.viagens(viagem_pai_id);
CREATE INDEX IF NOT EXISTS idx_motoristas_status ON public.motoristas(status);

-- 8. Habilitar realtime para a tabela missoes
ALTER PUBLICATION supabase_realtime ADD TABLE public.missoes;