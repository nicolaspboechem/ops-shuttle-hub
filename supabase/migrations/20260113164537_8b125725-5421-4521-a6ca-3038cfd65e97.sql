-- Add field to eventos table to enable/disable check-in/check-out
ALTER TABLE public.eventos 
ADD COLUMN IF NOT EXISTS habilitar_checkin boolean DEFAULT false;

-- Create table for daily driver attendance
CREATE TABLE public.motorista_presenca (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  motorista_id UUID NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  checkin_at TIMESTAMP WITH TIME ZONE,
  checkout_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(motorista_id, evento_id, data)
);

-- Enable RLS
ALTER TABLE public.motorista_presenca ENABLE ROW LEVEL SECURITY;

-- Create policies for motorista_presenca
CREATE POLICY "Allow all operations on motorista_presenca" 
ON public.motorista_presenca 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_motorista_presenca_updated_at
BEFORE UPDATE ON public.motorista_presenca
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_motorista_presenca_evento_data ON public.motorista_presenca(evento_id, data);
CREATE INDEX idx_motorista_presenca_motorista ON public.motorista_presenca(motorista_id);