-- Remover FKs que apontam para auth.users
ALTER TABLE veiculos DROP CONSTRAINT IF EXISTS veiculos_atualizado_por_fkey;
ALTER TABLE veiculos DROP CONSTRAINT IF EXISTS veiculos_criado_por_fkey;

-- Recriar apontando para profiles(user_id) onde Staff ja existe
ALTER TABLE veiculos
  ADD CONSTRAINT veiculos_atualizado_por_fkey
  FOREIGN KEY (atualizado_por) REFERENCES profiles(user_id) ON DELETE SET NULL;

ALTER TABLE veiculos
  ADD CONSTRAINT veiculos_criado_por_fkey
  FOREIGN KEY (criado_por) REFERENCES profiles(user_id) ON DELETE SET NULL;