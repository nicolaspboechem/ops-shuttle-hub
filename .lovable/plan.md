

# Limpeza bidirecional de usuarios e dados orfaos

## Problema encontrado

Ao investigar o banco, encontrei dados orfaos significativos:

- **10 profiles** sem usuario correspondente no Supabase Auth (foram deletados do Auth mas ficaram na tabela profiles)
- **5 usuarios no Auth** sem profile correspondente (criados mas profile nao foi gerado)
- **6 registros em evento_usuarios** referenciando usuarios que nao existem mais no Auth

A edge function `delete-user` ja deleta do Supabase Auth, mas referencia uma tabela `staff_credenciais` que nao existe (erro silencioso).

## Plano de acao

### 1. Limpeza imediata dos dados orfaos (SQL direto)

Executar queries para limpar:
- Deletar os 10 profiles orfaos (sem auth.users correspondente)
- Deletar os 6 evento_usuarios orfaos
- Deletar user_roles e user_permissions orfaos (se houver)
- Os 5 auth.users sem profile serao tratados na edge function (criando profile ou deletando)

IDs dos profiles orfaos a remover:
- `2bf77817...`, `5909cfe2...`, `c3e2c2c3...`, `62162a57...`, `ba2fad6e...`, `551c8825...`, `27477205...`, `ab19f36d...`, `c5bd8d01...`, `8ba25828...`

### 2. Corrigir edge function `delete-user`

- Remover referencia a tabela `staff_credenciais` (nao existe)
- Garantir que a exclusao global (sem evento_id) sempre deleta: profile, user_roles, user_permissions, evento_usuarios, e auth.users
- Remover a logica condicional que verifica "outras associacoes" antes de deletar - quando o admin exclui um usuario da tela global de Usuarios, deve ser exclusao completa

### 3. Criar edge function de limpeza de orfaos

Criar uma funcao `cleanup-orphans` que:
- Identifica profiles sem auth.users e os remove
- Identifica evento_usuarios sem auth.users e os remove
- Identifica auth.users sem profiles e cria os profiles faltantes (ou deleta se forem lixo)
- Pode ser chamada manualmente pelo admin ou via cron

### 4. Ajustar frontend (Usuarios.tsx)

- Apos deletar usuario, forcar refetch dos dados para garantir sincronia
- Ja esta funcionando corretamente (chama edge function sem evento_id = exclusao total)

## Resumo tecnico de arquivos

| Arquivo | Acao |
|---|---|
| SQL (limpeza) | Deletar profiles, evento_usuarios e dados orfaos |
| `supabase/functions/delete-user/index.ts` | Remover ref a staff_credenciais, simplificar exclusao global |
| `supabase/functions/cleanup-orphans/index.ts` | Nova funcao para limpeza periodica |
| `supabase/config.toml` | Adicionar config da nova funcao |

