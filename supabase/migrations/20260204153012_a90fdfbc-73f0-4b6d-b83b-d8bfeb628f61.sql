-- Corrigir a função update_updated_at_column para usar updated_at
-- Esta função é usada pelo trigger na tabela motorista_presenca
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;