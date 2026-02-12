
-- Criar tabela alertas_frota
CREATE TABLE public.alertas_frota (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id uuid NOT NULL REFERENCES public.eventos(id),
  veiculo_id uuid NOT NULL REFERENCES public.veiculos(id),
  motorista_id uuid NOT NULL REFERENCES public.motoristas(id),
  tipo character varying NOT NULL DEFAULT 'combustivel_baixo',
  nivel_combustivel character varying,
  observacao text,
  status character varying NOT NULL DEFAULT 'aberto',
  resolvido_por uuid,
  resolvido_em timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alertas_frota ENABLE ROW LEVEL SECURITY;

-- Policies permissivas (mesmo padrão do projeto)
CREATE POLICY "Allow all read on alertas_frota" ON public.alertas_frota FOR SELECT USING (true);
CREATE POLICY "Allow all insert on alertas_frota" ON public.alertas_frota FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on alertas_frota" ON public.alertas_frota FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on alertas_frota" ON public.alertas_frota FOR DELETE USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas_frota;
