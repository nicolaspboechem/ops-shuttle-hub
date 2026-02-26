
-- Etapa 1: Expandir enum app_role com novos valores de campo
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'motorista';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operador';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cliente';

-- Função auxiliar: verifica se usuário tem acesso a um evento
-- Retorna true se admin OU se existe vínculo em evento_usuarios
CREATE OR REPLACE FUNCTION public.has_event_access(_user_id uuid, _evento_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.evento_usuarios
      WHERE user_id = _user_id AND evento_id = _evento_id
    )
$$;

-- Função auxiliar: retorna o role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Atualizar handle_new_user para NÃO sobrescrever role quando definido via edge function
-- O trigger atual sempre insere 'user' para não-primeiro usuário.
-- Agora, verificamos se o role já foi inserido pela edge function antes de inserir.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Criar profile se não existir
  INSERT INTO public.profiles (user_id, email, full_name, telefone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'nome'),
    NEW.phone
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Inserir role apenas se não existir (edge function pode ter inserido antes)
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
