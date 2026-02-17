
# Corrigir Foreign Keys da Tabela Veiculos

## Problema

Ao fazer uma vistoria/revistoria pelo app Supervisor (que usa autenticacao Staff JWT), o sistema tenta gravar o `user_id` do Staff na coluna `atualizado_por` da tabela `veiculos`. Porem, essa coluna tem uma foreign key apontando para `auth.users(id)`, e o ID do Staff nao existe la -- ele existe apenas na tabela `staff_credenciais`.

Isso causa o erro: **"violates foreign key constraint veiculos_atualizado_por_fkey"**.

## Causa Raiz

A tabela `veiculos` possui 4 foreign keys que referenciam `auth.users` ou `profiles`, mas o sistema suporta 3 tipos de autenticacao (Supabase Auth, Staff JWT, Motorista JWT). Os IDs de Staff e Motorista nao existem nessas tabelas referenciadas.

| Constraint | Referencia | Problema |
|---|---|---|
| `veiculos_atualizado_por_fkey` | `auth.users(id)` | Staff/Motorista nao existe em auth.users |
| `veiculos_criado_por_fkey` | `auth.users(id)` | Staff/Motorista nao existe em auth.users |
| `veiculos_inspecao_por_fkey` | `profiles(user_id)` | Staff/Motorista nao existe em profiles |
| `veiculos_liberado_por_fkey` | `profiles(user_id)` | Staff/Motorista nao existe em profiles |

## Solucao

Remover as 4 foreign key constraints. As colunas continuam existindo e armazenando os IDs normalmente, apenas sem a restricao de FK. Isso esta alinhado com a arquitetura do projeto (conforme documentado: campos de auditoria nao devem ter FK para suportar o modelo dual de autenticacao).

## Alteracao Tecnica

### Migracao SQL (unica alteracao necessaria)

```sql
ALTER TABLE veiculos DROP CONSTRAINT veiculos_atualizado_por_fkey;
ALTER TABLE veiculos DROP CONSTRAINT veiculos_criado_por_fkey;
ALTER TABLE veiculos DROP CONSTRAINT veiculos_inspecao_por_fkey;
ALTER TABLE veiculos DROP CONSTRAINT veiculos_liberado_por_fkey;
```

Nenhuma alteracao de codigo necessaria -- o codigo ja grava os IDs corretamente, so a constraint do banco que estava impedindo.
