-- Tabela de motoristas cadastrados
CREATE TABLE public.motoristas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR NOT NULL,
  telefone VARCHAR,
  cnh VARCHAR,
  observacao TEXT,
  ativo BOOLEAN DEFAULT true,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de veículos cadastrados (vinculados a motoristas)
CREATE TABLE public.veiculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  motorista_id UUID REFERENCES public.motoristas(id) ON DELETE SET NULL,
  placa VARCHAR NOT NULL UNIQUE,
  tipo_veiculo VARCHAR NOT NULL DEFAULT 'Van',
  marca VARCHAR,
  modelo VARCHAR,
  ano INTEGER,
  capacidade INTEGER DEFAULT 15,
  ativo BOOLEAN DEFAULT true,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_motoristas_nome ON public.motoristas(nome);
CREATE INDEX idx_motoristas_ativo ON public.motoristas(ativo);
CREATE INDEX idx_veiculos_placa ON public.veiculos(placa);
CREATE INDEX idx_veiculos_motorista ON public.veiculos(motorista_id);
CREATE INDEX idx_veiculos_ativo ON public.veiculos(ativo);

-- Enable RLS
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para motoristas (acesso público para leitura, service role para escrita)
CREATE POLICY "Allow public read on motoristas" ON public.motoristas FOR SELECT USING (true);
CREATE POLICY "Allow service role insert on motoristas" ON public.motoristas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role update on motoristas" ON public.motoristas FOR UPDATE USING (true);
CREATE POLICY "Allow service role delete on motoristas" ON public.motoristas FOR DELETE USING (true);

-- Políticas RLS para veículos
CREATE POLICY "Allow public read on veiculos" ON public.veiculos FOR SELECT USING (true);
CREATE POLICY "Allow service role insert on veiculos" ON public.veiculos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role update on veiculos" ON public.veiculos FOR UPDATE USING (true);
CREATE POLICY "Allow service role delete on veiculos" ON public.veiculos FOR DELETE USING (true);

-- Trigger para atualizar data_atualizacao
CREATE TRIGGER update_motoristas_updated_at
  BEFORE UPDATE ON public.motoristas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_veiculos_updated_at
  BEFORE UPDATE ON public.veiculos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();