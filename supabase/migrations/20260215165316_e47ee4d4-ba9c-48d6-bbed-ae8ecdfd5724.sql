
-- Create escalas table
CREATE TABLE public.escalas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  nome varchar NOT NULL,
  horario_inicio time NOT NULL,
  horario_fim time NOT NULL,
  cor varchar,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  criado_por uuid
);

-- Create escala_motoristas join table
CREATE TABLE public.escala_motoristas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escala_id uuid NOT NULL REFERENCES public.escalas(id) ON DELETE CASCADE,
  motorista_id uuid NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (escala_id, motorista_id)
);

-- Enable RLS
ALTER TABLE public.escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_motoristas ENABLE ROW LEVEL SECURITY;

-- RLS policies for escalas
CREATE POLICY "Allow all read on escalas" ON public.escalas FOR SELECT USING (true);
CREATE POLICY "Allow all insert on escalas" ON public.escalas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on escalas" ON public.escalas FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on escalas" ON public.escalas FOR DELETE USING (true);

-- RLS policies for escala_motoristas
CREATE POLICY "Allow all read on escala_motoristas" ON public.escala_motoristas FOR SELECT USING (true);
CREATE POLICY "Allow all insert on escala_motoristas" ON public.escala_motoristas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on escala_motoristas" ON public.escala_motoristas FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on escala_motoristas" ON public.escala_motoristas FOR DELETE USING (true);
