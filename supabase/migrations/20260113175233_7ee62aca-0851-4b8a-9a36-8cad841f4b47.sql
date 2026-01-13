-- Sincronizar user_type dos profiles com os roles existentes
-- Usuários com role 'admin' devem ter user_type 'admin'
UPDATE public.profiles p
SET user_type = 'admin'
FROM public.user_roles ur
WHERE p.user_id = ur.user_id 
  AND ur.role = 'admin'
  AND (p.user_type IS NULL OR p.user_type != 'admin');