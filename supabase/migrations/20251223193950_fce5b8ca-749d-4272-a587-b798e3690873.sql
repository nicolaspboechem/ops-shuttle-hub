-- Remover o trigger incorreto da tabela profiles
-- Este trigger usa a função update_updated_at_column() que tenta atualizar 'data_atualizacao'
-- mas a tabela profiles usa o campo 'updated_at'
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;