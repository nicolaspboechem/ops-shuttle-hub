-- Allow email to be null for phone-based users
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;