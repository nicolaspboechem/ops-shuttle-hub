-- Remove the UNIQUE constraint to allow multiple presence records per driver per day
ALTER TABLE public.motorista_presenca 
  DROP CONSTRAINT motorista_presenca_motorista_id_evento_id_data_key;

-- Add a non-unique index for query performance
CREATE INDEX idx_motorista_presenca_motorista_evento_data 
  ON public.motorista_presenca (motorista_id, evento_id, data);