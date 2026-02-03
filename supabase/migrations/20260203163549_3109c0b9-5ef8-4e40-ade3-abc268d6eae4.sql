-- Fix the update_updated_at_column function to use the correct column name
-- The motorista_credenciais table uses 'updated_at', not 'data_atualizacao'
-- We'll create a new function specific for tables that use updated_at

CREATE OR REPLACE FUNCTION public.update_updated_at_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Drop the existing trigger
DROP TRIGGER IF EXISTS update_motorista_credenciais_updated_at ON motorista_credenciais;

-- Recreate with the correct function
CREATE TRIGGER update_motorista_credenciais_updated_at
  BEFORE UPDATE ON public.motorista_credenciais
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();