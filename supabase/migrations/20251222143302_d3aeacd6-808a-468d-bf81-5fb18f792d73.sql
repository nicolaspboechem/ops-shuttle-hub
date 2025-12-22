-- Tabela para pontos de embarque por evento
CREATE TABLE public.pontos_embarque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL,
  endereco TEXT,
  observacao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de vínculo motorista-ponto preferencial
CREATE TABLE public.ponto_motoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ponto_id UUID NOT NULL REFERENCES public.pontos_embarque(id) ON DELETE CASCADE,
  motorista_id UUID NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  prioridade INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ponto_id, motorista_id)
);

-- Enable RLS
ALTER TABLE public.pontos_embarque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ponto_motoristas ENABLE ROW LEVEL SECURITY;

-- RLS policies for pontos_embarque
CREATE POLICY "Allow all read on pontos_embarque" ON public.pontos_embarque FOR SELECT USING (true);
CREATE POLICY "Allow all insert on pontos_embarque" ON public.pontos_embarque FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on pontos_embarque" ON public.pontos_embarque FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on pontos_embarque" ON public.pontos_embarque FOR DELETE USING (true);

-- RLS policies for ponto_motoristas
CREATE POLICY "Allow all read on ponto_motoristas" ON public.ponto_motoristas FOR SELECT USING (true);
CREATE POLICY "Allow all insert on ponto_motoristas" ON public.ponto_motoristas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on ponto_motoristas" ON public.ponto_motoristas FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on ponto_motoristas" ON public.ponto_motoristas FOR DELETE USING (true);