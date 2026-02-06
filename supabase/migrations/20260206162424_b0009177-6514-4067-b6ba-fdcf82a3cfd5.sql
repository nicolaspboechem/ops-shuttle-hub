
-- Criar foreign keys para veiculos → profiles (inspecao_por e liberado_por)
-- Usa DO block para não falhar se já existirem

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'veiculos_inspecao_por_fkey' 
    AND table_name = 'veiculos'
  ) THEN
    ALTER TABLE public.veiculos
      ADD CONSTRAINT veiculos_inspecao_por_fkey
      FOREIGN KEY (inspecao_por) REFERENCES public.profiles(user_id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'veiculos_liberado_por_fkey' 
    AND table_name = 'veiculos'
  ) THEN
    ALTER TABLE public.veiculos
      ADD CONSTRAINT veiculos_liberado_por_fkey
      FOREIGN KEY (liberado_por) REFERENCES public.profiles(user_id)
      ON DELETE SET NULL;
  END IF;
END $$;
