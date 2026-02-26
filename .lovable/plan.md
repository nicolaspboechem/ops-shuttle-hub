
# Plano em 2 Fases: Seguranca RLS + Migracao para Supabase Auth

## Diagnostico Real vs. Analise Enviada

A analise que voce compartilhou tem alguns pontos validos e outros incorretos:

| Afirmacao da Analise | Realidade |
|---|---|
| `user_roles` esta vazia | ERRADO - tem 21 registros (6 admin, 15 user) |
| `user_permissions` esta vazia | ERRADO - tem 17 registros |
| `is_admin()` nao esta definida | ERRADO - funciona como security definer |
| RLS e inadequado | CORRETO - 47 politicas com `USING (true)` |
| JWT fraco | PARCIALMENTE CORRETO - o problema nao e o JWT, e que staff/driver usam anon key |
| Precisa de tabela `roles` nova | ERRADO - `user_roles` com enum `app_role` ja existe |
| Consolidar logins em pagina unica | VALIDO para o futuro, mas nao urgente |

### O Problema Real de Seguranca

Quase TODAS as tabelas (viagens, motoristas, veiculos, missoes, etc.) tem RLS assim:

```text
INSERT: WITH CHECK (true)
UPDATE: USING (true)
DELETE: USING (true)
SELECT: USING (true)
```

Isso significa: qualquer pessoa com a chave anon (que e publica no codigo do frontend) pode ler, inserir, alterar e deletar QUALQUER dado do banco. Viagens, motoristas, veiculos, tudo.

### Por que nao podemos fechar tudo AGORA

Staff e Motoristas usam o client Supabase com a chave anon (nao tem sessao Supabase Auth). Se restringirmos as tabelas a `authenticated` apenas, os apps de campo param de funcionar imediatamente.

---

## FASE 1: Endurecer RLS (AGORA)

Proteger imediatamente as tabelas que SÓ admins acessam via frontend:

### 1.1 Tabelas admin-only: restringir a `authenticated`

Estas tabelas so sao acessadas por admins logados via Supabase Auth:

| Tabela | Politica Atual | Politica Nova |
|---|---|---|
| `user_roles` | Ja tem RLS correto | Manter |
| `user_permissions` | Ja tem RLS correto | Manter |
| `profiles` | Ja tem RLS correto | Manter |
| `evento_usuarios` | `USING (true)` em tudo | Restringir a `authenticated` + `is_admin()` para write |
| `escalas` | `USING (true)` em tudo | Restringir a `authenticated` para write, manter SELECT publico |
| `escala_motoristas` | `USING (true)` em tudo | Mesmo padrao das escalas |

### 1.2 Tabelas operacionais: SELECT publico, WRITE restrito

Estas tabelas sao lidas por apps de campo (anon) mas so deveriam ser escritas por admins ou edge functions:

| Tabela | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| `motoristas` | `USING (true)` (manter) | `is_admin(auth.uid())` -- so admin cadastra |
| `veiculos` | `USING (true)` (manter) | `is_admin(auth.uid())` -- so admin cadastra |
| `pontos_embarque` | `USING (true)` (manter) | `is_admin(auth.uid())` |
| `rotas_shuttle` | `USING (true)` (manter) | `is_admin(auth.uid())` |
| `motorista_credenciais` | `USING (true)` (manter para login) | `is_admin(auth.uid())` |
| `staff_credenciais` | `USING (true)` (manter para login) | `is_admin(auth.uid())` |

### 1.3 Tabelas que campo PRECISA escrever: manter aberto (temporariamente)

Estas tabelas sao escritas por staff/motoristas via anon key. NAO podem ser restringidas sem quebrar o app. Serao corrigidas na Fase 2:

| Tabela | Motivo |
|---|---|
| `viagens` | Staff cria/atualiza viagens no campo |
| `missoes` | Motoristas aceitam/iniciam/concluem missoes |
| `viagem_logs` | Staff e motoristas registram logs |
| `motorista_presenca` | Check-in/checkout no campo |
| `alertas_frota` | Gerados pelo campo |
| `veiculo_fotos` | Upload de fotos no campo |
| `veiculo_vistoria_historico` | Vistorias feitas no campo |

### 1.4 Migration SQL (Fase 1)

Uma unica migration que:
- Remove politicas `USING (true)` das tabelas admin-only
- Adiciona politicas com `is_admin(auth.uid())` para write
- Mantem SELECT publico nas tabelas operacionais
- Adiciona comentarios marcando tabelas pendentes para Fase 2

### Arquivos modificados na Fase 1

Apenas 1 migration SQL. Zero mudanca no frontend (as queries ja passam como `authenticated` para admins).

---

## FASE 2: Migrar Staff/Motoristas para Supabase Auth (DEPOIS)

### 2.1 Estrategia de migracao

Em vez de JWT custom, staff e motoristas passam a usar Supabase Auth real:

```text
ANTES:
  Staff -> edge function staff-login -> JWT custom -> localStorage -> queries com anon key
  
DEPOIS:
  Staff -> supabase.auth.signInWithPassword() -> sessao Supabase Auth -> queries com authenticated role
```

### 2.2 Preparacao do banco

- Criar usuarios em `auth.users` para cada staff e motorista existente (via edge function de migracao)
- Adicionar role `staff` e `motorista` ao enum `app_role`
- Inserir registros em `user_roles` para cada usuario migrado
- Manter `staff_credenciais` e `motorista_credenciais` como tabelas de referencia (nao deletar)

### 2.3 Criar funcao auxiliar para RLS

```text
has_event_access(user_id, evento_id) -> boolean
  Verifica se o usuario tem acesso ao evento via:
  - user_roles.role = 'admin' (acesso total)
  - evento_usuarios.user_id = user_id AND evento_usuarios.evento_id = evento_id
```

### 2.4 Fechar RLS completo

Com todos os usuarios em `auth.users`, TODAS as tabelas podem ser restritas a `authenticated`:

```text
viagens:
  SELECT: authenticated + has_event_access(auth.uid(), evento_id)
  INSERT: authenticated + has_event_access(auth.uid(), evento_id)
  UPDATE: authenticated + has_event_access(auth.uid(), evento_id)
  DELETE: authenticated + is_admin(auth.uid())
```

### 2.5 Atualizar Frontend

- Substituir `StaffAuthContext` e `DriverAuthContext` por `AuthContext` unificado
- Manter diferenciacao de interface por role (app motorista vs app supervisor)
- Remover edge functions `staff-login` e `driver-login`
- Atualizar `StaffRoute` e `DriverRoute` para usar Supabase Auth com verificacao de role
- Pagina de login unificada (ou manter separadas, mas usando Supabase Auth em todas)

### 2.6 Migracao de credenciais existentes

Edge function `migrate-field-users` que:
1. Le todos os `staff_credenciais` e `motorista_credenciais` ativos
2. Cria usuario em `auth.users` com email gerado (ex: `motorista-{id}@app.interno`) ou telefone
3. Define senha igual a atual
4. Insere em `user_roles` com role adequado
5. Insere em `profiles` com dados do motorista/staff
6. Retorna relatorio de migracao

### Arquivos modificados na Fase 2

| Arquivo | Acao |
|---|---|
| Migration SQL | Criar usuarios, atualizar RLS |
| `src/lib/auth/AuthContext.tsx` | Adicionar roles staff/motorista |
| `src/lib/auth/StaffAuthContext.tsx` | Refatorar para usar Supabase Auth |
| `src/lib/auth/DriverAuthContext.tsx` | Refatorar para usar Supabase Auth |
| `src/components/auth/StaffRoute.tsx` | Simplificar (so verifica role) |
| `src/components/auth/DriverRoute.tsx` | Simplificar (so verifica role) |
| `src/pages/LoginMotorista.tsx` | Usar `supabase.auth.signInWithPassword()` |
| `src/pages/LoginEquipe.tsx` | Usar `supabase.auth.signInWithPassword()` |
| Edge functions login | Manter como fallback ou remover |
| Nova edge function migracao | Criar `migrate-field-users` |

---

## Resumo

| Fase | O que resolve | Risco se nao fizer | Complexidade |
|---|---|---|---|
| Fase 1 (AGORA) | Protege tabelas admin-only contra acesso anonimo | Qualquer pessoa pode alterar motoristas, veiculos, escalas | Baixa (1 migration SQL) |
| Fase 2 (DEPOIS) | Protege TODAS as tabelas, login unificado | Apps de campo continuam com dados expostos via anon key | Alta (migracao de usuarios + refactor frontend) |

### Proximo passo

Aprovar para executar a Fase 1 (migration SQL com RLS corrigido). Fase 2 sera planejada separadamente.
