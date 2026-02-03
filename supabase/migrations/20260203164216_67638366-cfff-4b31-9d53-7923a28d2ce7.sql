-- Primeiro dropa a função existente para poder alterar o tipo de retorno
DROP FUNCTION IF EXISTS public.get_server_time();

-- Recria a função retornando TEXT com offset explícito de São Paulo
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT to_char(
    NOW() AT TIME ZONE 'America/Sao_Paulo',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"-03:00"'
  );
$$;