

# Plano: Limpeza Geral + Refatoracao da Aba Usuarios

## Resumo

O sistema sera simplificado: todo cadastro de usuarios (Admin, Supervisor, Operador, Motorista, Cliente) sera feito na aba **Usuarios** (`/usuarios`). Dentro dos eventos, a pagina de Equipe apenas **vincula usuarios ja cadastrados** ao evento. A role "coordenador" sera eliminada. Tabelas e edge functions legadas de login de campo serao removidas.

---

## Fase 1: Refatorar a Pagina Usuarios (`/usuarios`)

### 1.1 Exibir TODOS os usuarios (nao apenas admins)

Atualmente a pagina filtra apenas admins (linha 107-109). Mudar para exibir todos os profiles.

- Remover o filtro `adminUsers` que mostra apenas `user_type === 'admin'`
- `filteredUsers` passa a usar `users` direto (todos)

### 1.2 Adicionar filtros por tipo

Adicionar abas ou Select de filtro acima da lista:
- **Todos** | **Admin** | **Supervisor** | **Operador** | **Motorista** | **Cliente**
- Integrar com a busca por texto ja existente

### 1.3 Expandir modal "Criar Usuario" para todos os tipos

Atualmente o modal so cria admins (email). Expandir:
- Adicionar RadioGroup para selecionar tipo: Admin, Supervisor, Operador, Motorista, Cliente
- **Admin**: login por email (manter comportamento atual)
- **Outros tipos**: login por telefone + senha
  - Campos: Nome, Telefone (com mascara ja existente), Senha, Confirmar Senha
- Chamar edge function `create-user` com `login_type: 'phone'`, `user_type` correto
- Apos criacao, exibir credenciais no modal existente

### 1.4 Atualizar header e alerta

- Titulo: "Usuarios do Sistema" (em vez de "Administradores do Sistema")
- Botao: "Novo Usuario" (em vez de "Criar Admin")
- Remover o alerta azul que diz "Para cadastrar equipe, va aos Eventos" (linhas 584-601)
- Remover mencao a "Coordenador" em todo o arquivo

### 1.5 Remover role "coordenador"

- Remover `'coordenador'` do type `UserType` (linha 22)
- Remover entrada `coordenador` de `USER_TYPE_CONFIG` (linha 49)
- Remover opcao "Coordenador" do RadioGroup no modal de edicao (linhas 1044-1053)

---

## Fase 2: Refatorar Equipe do Evento (`EventoUsuarios.tsx`)

### 2.1 Mudar "Adicionar Motorista" e "Adicionar Staff" para "Adicionar Equipe"

Em vez de criar usuarios inline (com wizards de cadastro), a pagina deve:
- Ter um unico botao **"Adicionar Equipe"**
- Abrir um modal que lista **usuarios ja cadastrados** na aba Usuarios (buscar de `profiles`)
- Permitir selecionar um usuario e vincular ao evento via `evento_usuarios` (ou `motoristas` se tipo motorista)
- A role ja esta definida no cadastro do usuario

### 2.2 Remover wizards de criacao inline

- Remover `CreateMotoristaWizard` e `AddStaffWizard` da pagina
- Remover `EditMotoristaLoginModal` e `EditStaffLoginModal` (login de campo nao existe mais)
- Remover referencias a `has_login`, `KeyRound`, botoes "Criar Login"

### 2.3 Simplificar `useEquipe.ts`

- Remover busca de `motorista_credenciais` e `staff_credenciais`
- Remover campo `has_login` do `EquipeMembro`
- Stats: remover "Com Login"

---

## Fase 3: Limpeza do Banco de Dados (SQL)

### 3.1 Limpar dados de credenciais

```sql
DELETE FROM motorista_credenciais;
DELETE FROM staff_credenciais;
```

### 3.2 Remover tabelas legadas

```sql
DROP TABLE IF EXISTS motorista_credenciais;
DROP TABLE IF EXISTS staff_credenciais;
```

### 3.3 Remover policies `_field_temp` desnecessarias

```sql
DROP POLICY IF EXISTS "motoristas_update_field_temp" ON motoristas;
DROP POLICY IF EXISTS "veiculos_update_field_temp" ON veiculos;
```

---

## Fase 4: Remover Edge Functions Legadas

### Funcoes a deletar (5):
1. `driver-login`
2. `driver-register`
3. `staff-login`
4. `staff-register`
5. `migrate-field-users`

### Atualizar `supabase/config.toml`:
- Remover entradas dessas 5 funcoes

### Remover secret:
- `DRIVER_JWT_SECRET` (nao mais necessario)

---

## Fase 5: Remover Paginas e Rotas de Login de Campo

### Arquivos a deletar:
- `src/pages/LoginMotorista.tsx`
- `src/pages/LoginEquipe.tsx`
- `src/components/auth/DriverRoute.tsx`
- `src/components/auth/StaffRoute.tsx`
- `src/components/equipe/EditMotoristaLoginModal.tsx`
- `src/components/equipe/EditStaffLoginModal.tsx`

### Atualizar `src/App.tsx`:
- Remover imports e rotas de `/login/motorista`, `/login/equipe`
- Remover imports de `DriverRoute` e `StaffRoute`
- Rotas de campo (`/app/:eventoId/*`) protegidas apenas com `AdminRoute`

---

## Fase 6: Limpar AuthContext

- Remover campos de campo (`fieldRole`, `motoristaId`, `isFieldUser`, etc.) se existirem
- Simplificar para focar em admin auth + role check

---

## Fase 7: Limpar Documentacao

- Deletar `RELATORIO_OTIMIZACAO.md`
- Atualizar `.lovable/plan.md` com resumo da arquitetura atual simplificada

---

## Resumo de Impacto

```text
DELETAR:
  Paginas: LoginMotorista, LoginEquipe
  Componentes: DriverRoute, StaffRoute, EditMotoristaLoginModal, EditStaffLoginModal
  Edge Functions: driver-login, driver-register, staff-login, staff-register, migrate-field-users
  Tabelas DB: motorista_credenciais, staff_credenciais
  Doc: RELATORIO_OTIMIZACAO.md

MODIFICAR:
  Usuarios.tsx - cadastro universal com filtros + remover coordenador
  EventoUsuarios.tsx - vincular usuarios existentes em vez de criar
  useEquipe.ts - remover busca de credenciais
  App.tsx - remover rotas e imports legados
  AuthContext.tsx - simplificar
  config.toml - remover funcoes
  create-user (edge function) - remover referencia a coordenador
  .lovable/plan.md - atualizar

PRESERVAR (dados operacionais intactos):
  motoristas (69 registros de dados)
  veiculos, viagens, evento_usuarios
  Coluna viagens.coordenador (varchar, dado historico)
```

### Sequencia de execucao

| Passo | Acao | Risco |
|---|---|---|
| 1 | Refatorar Usuarios.tsx (cadastro universal + filtros) | Medio |
| 2 | Refatorar EventoUsuarios.tsx (vincular em vez de criar) | Medio |
| 3 | Simplificar useEquipe.ts | Baixo |
| 4 | Migration SQL: limpar credenciais + drop tables + remover policies temp | Baixo |
| 5 | Deletar edge functions legadas | Baixo |
| 6 | Deletar paginas/componentes de login de campo | Baixo |
| 7 | Atualizar App.tsx e AuthContext | Medio |
| 8 | Limpar documentacao | Nenhum |

