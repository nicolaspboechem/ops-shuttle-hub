-- Add evento_id column to motoristas table
ALTER TABLE public.motoristas 
ADD COLUMN evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE;

-- Add evento_id column to veiculos table
ALTER TABLE public.veiculos 
ADD COLUMN evento_id UUID REFERENCES public.eventos(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_motoristas_evento_id ON public.motoristas(evento_id);
CREATE INDEX idx_veiculos_evento_id ON public.veiculos(evento_id);