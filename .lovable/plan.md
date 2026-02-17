
# Corrigir Foreign Keys da Tabela Veiculos (Manter FKs)

## Diagnostico

| Constraint | Aponta para | Staff existe la? | Status |
|---|---|---|---|
| `veiculos_atualizado_por_fkey` | `auth.users(id)` | NAO | PROBLEMA |
| `veiculos_criado_por_fkey` | `auth.users(id)` | NAO | PROBLEMA |
| `veiculos_inspecao_por_fkey` | `profiles(user_id)` | SIM | OK |
| `veiculos_liberado_por_fkey` | `profiles(user_id)` | SIM | OK |

O `staff-register` ja cria um registro em `profiles` para cada Staff. Entao basta redirecionar as 2 FKs que apontam para `auth.users` para apontar para `profiles(user_id)`.

## Solucao

Trocar a referencia de `auth.users(id)` para `profiles(user_id)` nas constraints `atualizado_por` e `criado_por`. Assim mantemos a integridade referencial sem remover nenhuma FK.

## Alteracao Tecnica

### Migracao SQL (unica alteracao)

```sql
-- Remover FKs que apontam para auth.users
ALTER TABLE veiculos DROP CONSTRAINT veiculos_atualizado_por_fkey;
ALTER TABLE veiculos DROP CONSTRAINT veiculos_criado_por_fkey;

-- Recriar apontando para profiles (onde Staff ja existe)
ALTER TABLE veiculos
  ADD CONSTRAINT veiculos_atualizado_por_fkey
  FOREIGN KEY (atualizado_por) REFERENCES profiles(user_id) ON DELETE SET NULL;

ALTER TABLE veiculos
  ADD CONSTRAINT veiculos_criado_por_fkey
  FOREIGN KEY (criado_por) REFERENCES profiles(user_id) ON DELETE SET NULL;
```

Nenhuma alteracao de codigo necessaria. As 4 FKs passam a apontar para `profiles(user_id)`, tabela onde tanto Admins (via `handle_new_user`) quanto Staff (via `staff-register`) ja possuem registros.
