-- Tabela para armazenar credenciais de login de motoristas
CREATE TABLE motorista_credenciais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id UUID NOT NULL REFERENCES motoristas(id) ON DELETE CASCADE,
  telefone VARCHAR(20) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  ultimo_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca rápida por telefone
CREATE INDEX idx_motorista_credenciais_telefone ON motorista_credenciais(telefone);

-- Enable RLS
ALTER TABLE motorista_credenciais ENABLE ROW LEVEL SECURITY;

-- Policy para permitir leitura anônima (Edge Functions usarão service role)
CREATE POLICY "Allow anon read for login verification" 
ON motorista_credenciais 
FOR SELECT 
USING (true);

-- Policy para admins gerenciarem credenciais
CREATE POLICY "Allow authenticated users to manage credentials" 
ON motorista_credenciais 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_motorista_credenciais_updated_at
BEFORE UPDATE ON motorista_credenciais
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();