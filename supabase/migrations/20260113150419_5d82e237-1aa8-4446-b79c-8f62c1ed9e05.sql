-- Add viagem_id field to missoes table to track the created trip
ALTER TABLE public.missoes 
ADD COLUMN viagem_id UUID REFERENCES public.viagens(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_missoes_viagem_id ON public.missoes(viagem_id);

-- Add origem_missao field to viagens to track if trip came from a mission
ALTER TABLE public.viagens 
ADD COLUMN origem_missao_id UUID REFERENCES public.missoes(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_viagens_origem_missao_id ON public.viagens(origem_missao_id);