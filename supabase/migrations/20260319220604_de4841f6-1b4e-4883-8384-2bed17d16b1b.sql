-- Drop policies on user_permissions
DROP POLICY IF EXISTS "Users can view own permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can view all permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.user_permissions;

-- Drop the has_permission function
DROP FUNCTION IF EXISTS public.has_permission(uuid, public.app_permission);

-- Drop the user_permissions table
DROP TABLE IF EXISTS public.user_permissions;

-- Drop the app_permission enum
DROP TYPE IF EXISTS public.app_permission;