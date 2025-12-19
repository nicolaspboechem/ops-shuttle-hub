-- Add date fields to eventos table
ALTER TABLE public.eventos 
ADD COLUMN IF NOT EXISTS data_inicio DATE,
ADD COLUMN IF NOT EXISTS data_fim DATE;

-- Create evento_usuarios table for per-event user management
CREATE TABLE IF NOT EXISTS public.evento_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'operador', -- 'coordenador', 'motorista', 'operador'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(evento_id, user_id)
);

-- Enable RLS on evento_usuarios
ALTER TABLE public.evento_usuarios ENABLE ROW LEVEL SECURITY;

-- RLS policies for evento_usuarios
CREATE POLICY "Allow all read on evento_usuarios" 
ON public.evento_usuarios 
FOR SELECT 
USING (true);

CREATE POLICY "Allow all insert on evento_usuarios" 
ON public.evento_usuarios 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all update on evento_usuarios" 
ON public.evento_usuarios 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow all delete on evento_usuarios" 
ON public.evento_usuarios 
FOR DELETE 
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_evento_usuarios_evento_id ON public.evento_usuarios(evento_id);
CREATE INDEX IF NOT EXISTS idx_evento_usuarios_user_id ON public.evento_usuarios(user_id);