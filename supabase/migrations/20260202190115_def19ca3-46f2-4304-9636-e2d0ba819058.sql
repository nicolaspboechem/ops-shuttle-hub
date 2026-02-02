-- Create staff_credenciais table for supervisor/operador/cliente auth
CREATE TABLE public.staff_credenciais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  telefone VARCHAR NOT NULL,
  senha_hash VARCHAR NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'operador',
  ativo BOOLEAN DEFAULT true,
  ultimo_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(telefone, evento_id)
);

-- Enable Row Level Security
ALTER TABLE public.staff_credenciais ENABLE ROW LEVEL SECURITY;

-- Allow anon read for login verification
CREATE POLICY "Allow anon read for login verification" 
ON public.staff_credenciais 
FOR SELECT 
USING (true);

-- Allow authenticated users to manage credentials
CREATE POLICY "Allow authenticated users to manage credentials" 
ON public.staff_credenciais 
FOR ALL 
TO authenticated
USING (true) 
WITH CHECK (true);

-- Create index for faster login lookups
CREATE INDEX idx_staff_credenciais_telefone ON public.staff_credenciais(telefone);
CREATE INDEX idx_staff_credenciais_evento ON public.staff_credenciais(evento_id);