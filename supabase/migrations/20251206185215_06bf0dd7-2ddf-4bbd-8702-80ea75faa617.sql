-- Tabela de eventos (representa uma planilha sincronizada)
CREATE TABLE public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_planilha VARCHAR(255) NOT NULL UNIQUE,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_ultima_sync TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_viagens INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'ativo'
);

-- Tabela de viagens (unificada para Transfer e Shuttle)
CREATE TABLE public.viagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE,
  tipo_operacao VARCHAR(20) NOT NULL CHECK (tipo_operacao IN ('transfer', 'shuttle')),
  coordenador VARCHAR(100),
  ponto_embarque VARCHAR(200),
  tipo_veiculo VARCHAR(20) CHECK (tipo_veiculo IN ('Ônibus', 'Van')),
  motorista VARCHAR(100) NOT NULL,
  placa VARCHAR(20),
  qtd_pax INTEGER DEFAULT 0,
  h_pickup TIME,
  h_chegada TIME,
  h_retorno TIME,
  qtd_pax_retorno INTEGER DEFAULT 0,
  encerrado BOOLEAN DEFAULT FALSE,
  observacao TEXT,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes para performance
CREATE INDEX idx_viagens_evento_id ON public.viagens(evento_id);
CREATE INDEX idx_viagens_motorista ON public.viagens(motorista);
CREATE INDEX idx_viagens_placa ON public.viagens(placa);
CREATE INDEX idx_viagens_data_criacao ON public.viagens(data_criacao);

-- Enable RLS
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viagens ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública (para o dashboard)
CREATE POLICY "Allow public read on eventos" 
ON public.eventos FOR SELECT 
USING (true);

CREATE POLICY "Allow public read on viagens" 
ON public.viagens FOR SELECT 
USING (true);

-- Políticas de escrita (service role para sincronização via Apps Script)
CREATE POLICY "Allow service role insert on eventos"
ON public.eventos FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow service role update on eventos"
ON public.eventos FOR UPDATE
USING (true);

CREATE POLICY "Allow service role insert on viagens"
ON public.viagens FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow service role update on viagens"
ON public.viagens FOR UPDATE
USING (true);

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar data_atualizacao automaticamente
CREATE TRIGGER update_viagens_updated_at
BEFORE UPDATE ON public.viagens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função RPC para obter hora do servidor (São Paulo)
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS TIMESTAMPTZ
LANGUAGE SQL
STABLE
AS $$
  SELECT NOW() AT TIME ZONE 'America/Sao_Paulo';
$$;