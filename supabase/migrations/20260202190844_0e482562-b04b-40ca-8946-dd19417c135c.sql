
-- Remove foreign key constraint from profiles to auth.users
-- This allows creating profiles for staff with custom UUIDs (not in Supabase Auth)
ALTER TABLE public.profiles DROP CONSTRAINT profiles_user_id_fkey;

-- Add a comment explaining why this FK was removed
COMMENT ON COLUMN public.profiles.user_id IS 'UUID do usuário. Para admins: referencia auth.users. Para staff de campo: UUID gerado localmente (não existe no Supabase Auth).';
