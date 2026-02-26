
# Fase 2: Migrar Staff e Motoristas para Supabase Auth + Fechar RLS

## Resumo da Situacao Atual

### Como funciona hoje (3 sistemas de auth separados)

```text
ADMIN:      Email + Senha -> supabase.auth.signInWithPassword -> sessao Supabase Auth -> queries como "authenticated"
STAFF:      Telefone + Senha -> edge function staff-login -> JWT custom -> localStorage -> queries como "anon"
MOTORISTA:  Telefone + Senha -> edge function driver-login -> JWT custom -> localStorage -> queries como "anon"
```

### Dados existentes
- 51 motoristas com credenciais (SHA-256 custom hash, senhas nao recuperaveis)
- 8 staff (7 supervisores + 1 operador) com credenciais (SHA-256 custom hash)
- 25 admins ja em `auth.users`
- Enum `app_role` atual: apenas `admin` e `user`
- Staff e motoristas cadastrados pela aba "Equipe do Evento" (`/evento/:id/equipe`)

### O que o usuario pediu
1. Migrar TODOS para Supabase Auth oficial (sem login paralelo)
2. Cadastro centralizado na aba **Usuarios** do painel principal (`/usuarios`)
3. Ao cadastrar, escolher role: motorista, supervisor, cliente
4. Usar os filtros ja existentes na pagina para definir permissoes

---

## Plano de Implementacao (9 etapas)

### Etapa 1: Expandir enum `app_role` e criar funcoes auxiliares (Migration SQL)

Adicionar novos valores ao enum `app_role`:
- `motorista`
- `supervisor`
- `operador`
- `cliente`

Criar funcao auxiliar `has_event_access(user_id uuid, evento_id uuid)` que retorna `true` se:
- O usuario e admin (`is_admin()`)
- Existe registro em `evento_usuarios` vinculando esse usuario ao evento

Criar funcao `get_user_role(user_id uuid)` que retorna o `app_role` do usuario.

### Etapa 2: Atualizar edge function `create-user`

A edge function `create-user` ja suporta criacao por telefone (`login_type: 'phone'`). Ajustes:
- Ao criar usuario com `user_type` de campo (motorista/supervisor/operador/cliente), inserir o role correto no `user_roles` (usar os novos valores do enum expandido: `motorista`, `supervisor`, `operador`, `cliente` em vez de apenas `user`)
- Manter criacao automatica de `motorista_credenciais` / `staff_credenciais` como backup durante transicao (sera removido depois)

### Etapa 3: Atualizar edge functions `driver-register` e `staff-register`

**`driver-register`**: Em vez de apenas criar credenciais na tabela custom:
- Criar usuario em `auth.users` via `auth.admin.createUser({ phone, password, phone_confirm: true })`
- Inserir role `motorista` em `user_roles`
- Inserir em `evento_usuarios` com role `motorista`
- Atualizar `motoristas.user_id` com o novo auth user id
- Manter insert em `motorista_credenciais` como backup temporario

**`staff-register`**: Mesmo padrao:
- Criar usuario em `auth.users` via `auth.admin.createUser({ phone, password })`
- Inserir role no `user_roles` (supervisor/operador/cliente)
- Inserir em `evento_usuarios`
- Manter insert em `staff_credenciais` como backup temporario

### Etapa 4: Criar edge function `migrate-field-users`

Edge function executada UMA VEZ para migrar os 59 usuarios existentes:

Para cada `motorista_credenciais` e `staff_credenciais` ativo:
1. Criar usuario em `auth.users` com telefone e senha temporaria: `As@` + ultimos 4 digitos do telefone
2. Inserir em `user_roles` com role correto
3. Inserir/atualizar `profiles` com dados existentes
4. Inserir em `evento_usuarios` se nao existir
5. Atualizar `motoristas.user_id` com novo auth user id
6. Retornar relatorio com lista de usuarios migrados e suas senhas temporarias

**Importante**: As senhas SHA-256 NAO podem ser revertidas. Os usuarios recebem senha temporaria e o admin comunica as novas credenciais.

### Etapa 5: Atualizar pagina Usuarios (`/usuarios`)

Atualmente a pagina `Usuarios.tsx`:
- Mostra apenas admins (`adminUsers` filtra por `user_type === 'admin' || role === 'admin'`)
- Permite criar apenas admins (email obrigatorio)

**Alteracoes**:
- Remover filtro que mostra apenas admins -- exibir TODOS os usuarios
- Adicionar abas/filtro por tipo: Admin, Supervisor, Operador, Motorista, Cliente (usar os filtros ja existentes na interface)
- No modal de criacao ("Novo Usuario"), adicionar:
  - Selecao de role (Admin, Supervisor, Operador, Motorista, Cliente)
  - Se role = Admin: login por email (manter comportamento atual)
  - Se role != Admin: login por telefone + selecao de evento para vincular
- Chamar `create-user` com `login_type: 'phone'`, `user_type`, e `evento_id`
- Exibir credenciais apos criacao (telefone + senha)
- Adicionar acoes: editar role, resetar senha, vincular/desvincular de evento

### Etapa 6: Atualizar AuthContext para suportar roles de campo

Expandir `AuthContext.tsx`:
- Adicionar `fieldRole: string | null` (motorista/supervisor/operador/cliente)
- Adicionar `motoristaId: string | null` (se role = motorista, buscar de `motoristas.user_id`)
- Em `fetchUserData`, buscar tambem:
  - Role real de `user_roles` (agora pode ser motorista/supervisor/etc)
  - Se motorista, buscar `motorista_id` de `motoristas` onde `user_id` = auth user id
- Adicionar metodos auxiliares: `isFieldUser`, `isMotorist`, `isSupervisor`

### Etapa 7: Atualizar login pages e routes

**`LoginMotorista.tsx`**:
- Substituir `useDriverAuth().signIn()` por `supabase.auth.signInWithPassword({ phone: '+55' + phoneDigits, password })`
- Apos login, buscar `motoristas` onde `user_id` = auth user id para obter `evento_id` e `motorista_id`
- Redirecionar para `/app/{eventoId}/motorista`

**`LoginEquipe.tsx`**:
- Substituir `useStaffAuth().signIn()` por `supabase.auth.signInWithPassword({ phone: '+55' + phoneDigits, password })`
- Apos login, buscar `evento_usuarios` para obter `evento_id` e `role`
- Redirecionar para `/app/{eventoId}/{role}`

**`DriverRoute.tsx`**:
- Substituir verificacao de `useDriverAuth()` por `useAuth()` + verificar role = motorista

**`StaffRoute.tsx`**:
- Substituir verificacao de `useStaffAuth()` por `useAuth()` + verificar role em allowedRoles

**`App.tsx`**:
- Remover `DriverAuthProvider` e `StaffAuthProvider` do wrapper
- Mover rota `/app/:eventoId/motorista` para dentro do `AuthLayout`
- Todas as rotas de campo agora usam Supabase Auth

### Etapa 8: Atualizar componentes de campo

| Arquivo | Alteracao |
|---|---|
| `AppMotorista.tsx` | `useDriverAuth()` -> `useAuth()` + `motoristaId` do context |
| `AppOperador.tsx` | `useStaffAuth()` -> `useAuth()` |
| `AppSupervisor.tsx` | `useStaffAuth()` -> `useAuth()` |
| `useViagemOperacaoMotorista.ts` | `useDriverAuth()` -> `useAuth()` |
| `CreateViagemMotoristaForm.tsx` | `useDriverAuth()` -> `useAuth()` |
| `useCurrentUser.ts` | Remover consumo de StaffAuthContext e DriverAuthContext |

### Etapa 9: Fechar RLS completamente (Migration SQL final)

Com todos os usuarios em `auth.users`, remover TODAS as politicas `USING (true)` restantes e aplicar:

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| viagens | `authenticated + has_event_access` | `authenticated + has_event_access` | `authenticated + has_event_access` | `is_admin` |
| missoes | `authenticated + has_event_access` | `authenticated + has_event_access` | `authenticated + has_event_access` | `is_admin` |
| viagem_logs | `authenticated` | `authenticated` | - | - |
| motorista_presenca | `authenticated + has_event_access` | `authenticated + has_event_access` | `authenticated + has_event_access` | `is_admin` |
| alertas_frota | `authenticated + has_event_access` | `authenticated + has_event_access` | `authenticated + has_event_access` | `is_admin` |
| veiculo_fotos | `authenticated` | `authenticated` | `authenticated` | `is_admin` |
| veiculo_vistoria_historico | `authenticated` | `authenticated` | `authenticated` | `is_admin` |
| motoristas | `authenticated + has_event_access` | `is_admin` | `authenticated + has_event_access` | `is_admin` |
| veiculos | `authenticated + has_event_access` | `is_admin` | `authenticated + has_event_access` | `is_admin` |
| motorista_credenciais | `is_admin` | `is_admin` | `is_admin` | `is_admin` |
| staff_credenciais | `is_admin` | `is_admin` | `is_admin` | `is_admin` |

Remover politicas `_field_temp` criadas na Fase 1.

---

## Arquivos afetados

### Novos (2)
- `supabase/functions/migrate-field-users/index.ts`
- 2 migrations SQL (enum + funcoes auxiliares + RLS final)

### Modificados (~15)
- `supabase/functions/create-user/index.ts` -- roles expandidos
- `supabase/functions/driver-register/index.ts` -- criar em auth.users
- `supabase/functions/staff-register/index.ts` -- criar em auth.users
- `supabase/config.toml` -- adicionar migrate-field-users
- `src/pages/Usuarios.tsx` -- mostrar todos usuarios, cadastro com role
- `src/lib/auth/AuthContext.tsx` -- suportar roles de campo
- `src/hooks/useCurrentUser.ts` -- simplificar
- `src/pages/LoginMotorista.tsx` -- usar Supabase Auth
- `src/pages/LoginEquipe.tsx` -- usar Supabase Auth
- `src/components/auth/DriverRoute.tsx` -- usar useAuth()
- `src/components/auth/StaffRoute.tsx` -- usar useAuth()
- `src/App.tsx` -- remover providers custom
- `src/pages/app/AppMotorista.tsx` -- usar useAuth()
- `src/pages/app/AppOperador.tsx` -- usar useAuth()
- `src/pages/app/AppSupervisor.tsx` -- usar useAuth()
- `src/hooks/useViagemOperacaoMotorista.ts` -- usar useAuth()
- `src/components/app/CreateViagemMotoristaForm.tsx` -- usar useAuth()

### Removidos (2 arquivos, edge functions desativadas)
- `src/lib/auth/DriverAuthContext.tsx` -- substituido por AuthContext
- `src/lib/auth/StaffAuthContext.tsx` -- substituido por AuthContext
- Edge functions `driver-login` e `staff-login` serao desativadas no `config.toml`

---

## Sequencia de execucao

| Passo | Acao | Risco |
|---|---|---|
| 1 | Migration SQL: expandir enum + criar funcoes auxiliares | Nenhum (aditivo) |
| 2 | Atualizar `create-user` para usar roles expandidos | Baixo |
| 3 | Atualizar `driver-register` e `staff-register` para criar em auth.users | Baixo (novos cadastros) |
| 4 | Criar `migrate-field-users` e executar migracao | Alto (irreversivel) |
| 5 | Atualizar `Usuarios.tsx` com cadastro centralizado | Medio |
| 6 | Atualizar `AuthContext` com suporte a roles de campo | Medio (core auth) |
| 7 | Atualizar login pages e routes | Alto (quebra login antigo) |
| 8 | Atualizar componentes de campo | Medio |
| 9 | Migration SQL: fechar RLS completo | Alto (deve ser apos migracao) |

## Nota sobre senhas

As senhas existentes estao em hash SHA-256 custom e NAO podem ser revertidas. A migracao define senha temporaria padrao (`As@` + ultimos 4 digitos do telefone) para todos os usuarios de campo. O admin devera comunicar as novas credenciais a equipe. Apos o primeiro login, cada usuario pode manter a senha temporaria ou o admin pode resetar individualmente via a pagina Usuarios.
