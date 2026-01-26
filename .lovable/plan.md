
# Plano: Integrar Sistema de Login Customizado de Motoristas

## Resumo

Completar a integração do sistema de login customizado para motoristas, garantindo que:
- Motoristas usem **exclusivamente** o sistema de credenciais customizado (`motorista_credenciais`)
- A página de motorista (`AppMotorista`) seja protegida pelo `DriverAuthContext`
- A página de Equipe gerencie credenciais na tabela `motorista_credenciais`

---

## Arquitetura Final

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXOS DE AUTENTICAÇÃO                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ADMIN/OPERADOR/SUPERVISOR              MOTORISTA               │
│  ┌──────────────────────┐               ┌──────────────────┐    │
│  │  /auth (email)       │               │  /login/motorista│    │
│  └──────────┬───────────┘               │  (celular)       │    │
│             │                           └────────┬─────────┘    │
│             ▼                                    ▼              │
│  ┌──────────────────────┐               ┌──────────────────┐    │
│  │  Supabase Auth       │               │  driver-login    │    │
│  │  (AuthContext)       │               │  Edge Function   │    │
│  └──────────┬───────────┘               └────────┬─────────┘    │
│             │                                    │              │
│             ▼                                    ▼              │
│  ┌──────────────────────┐               ┌──────────────────┐    │
│  │  auth.users          │               │motorista_        │    │
│  │  evento_usuarios     │               │credenciais       │    │
│  └──────────────────────┘               └──────────────────┘    │
│             │                                    │              │
│             ▼                                    ▼              │
│  ┌──────────────────────┐               ┌──────────────────┐    │
│  │  /app/:id/operador   │               │  /app/:id/       │    │
│  │  /app/:id/supervisor │               │  motorista       │    │
│  │  /evento/... (CCO)   │               │                  │    │
│  └──────────────────────┘               └──────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mudanças Necessárias

### 1. Criar Componente de Proteção de Rota para Motoristas

**Arquivo:** `src/components/auth/DriverRoute.tsx`

Componente que protege rotas de motoristas usando `DriverAuthContext`:

- Se não autenticado via driver login, redireciona para `/login/motorista`
- Valida se o `evento_id` da sessão corresponde ao da rota
- Permite acesso apenas se token for válido e não expirado

---

### 2. Atualizar AppMotorista para usar DriverAuthContext

**Arquivo:** `src/pages/app/AppMotorista.tsx`

Mudanças:
- Usar `useDriverAuth()` ao invés de `useAuth()`
- Obter `motorista_id` diretamente da sessão do motorista (não mais por comparação de nome)
- Atualizar função de logout para usar `signOut` do `DriverAuthContext`
- Redirecionar para `/login/motorista` ao sair

---

### 3. Atualizar Rotas no App.tsx

**Arquivo:** `src/App.tsx`

Mudanças:
- Substituir `EventRoleRoute` por `DriverRoute` na rota `/app/:eventoId/motorista`
- Manter `EventRoleRoute` para operadores e supervisores

---

### 4. Atualizar Modal de Login do Motorista (Equipe)

**Arquivo:** `src/components/equipe/EditMotoristaLoginModal.tsx`

Mudanças:
- **Criar login**: Chamar `driver-register` Edge Function (tabela `motorista_credenciais`)
- **Resetar senha**: Atualizar hash na tabela `motorista_credenciais`
- Remover integração com `create-user` do Supabase Auth

---

### 5. Atualizar Hook useEquipe para verificar credenciais

**Arquivo:** `src/hooks/useEquipe.ts`

Mudanças:
- Verificar se motorista tem login na tabela `motorista_credenciais` (não mais `user_id`)
- Atualizar propriedade `has_login` baseada na nova tabela

---

### 6. Criar/Atualizar Edge Functions

#### 6.1 Atualizar `driver-register` para suportar reset de senha

Adicionar funcionalidade de atualizar senha existente (não apenas criar nova)

#### 6.2 Garantir que `driver-login` retorna dados corretos

Já implementado, apenas validar que retorna `evento_id` do motorista

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/auth/DriverRoute.tsx` | **CRIAR** | Proteção de rota usando DriverAuthContext |
| `src/pages/app/AppMotorista.tsx` | MODIFICAR | Usar DriverAuthContext, obter motorista_id da sessão |
| `src/App.tsx` | MODIFICAR | Usar DriverRoute para rota de motorista |
| `src/components/equipe/EditMotoristaLoginModal.tsx` | MODIFICAR | Usar driver-register ao invés de create-user |
| `src/hooks/useEquipe.ts` | MODIFICAR | Verificar has_login na tabela motorista_credenciais |
| `supabase/functions/driver-register/index.ts` | MODIFICAR | Adicionar suporte a reset de senha |

---

## Detalhes Técnicos

### DriverRoute Component

```typescript
// Verifica se motorista está autenticado via DriverAuthContext
// Redireciona para /login/motorista se não autenticado
// Valida que evento_id da sessão = evento_id da rota
```

### AppMotorista - Mudanças Principais

```typescript
// ANTES (usa Supabase Auth)
const { profile, signOut, user } = useAuth();
const nomeMotorista = profile?.full_name || '';
const motoristaData = motoristas.find(m => m.nome === nomeMotorista);

// DEPOIS (usa Driver Auth)
const { driverSession, signOut } = useDriverAuth();
const motoristaData = motoristas.find(m => m.id === driverSession?.motorista_id);
```

### useEquipe - Verificação de Login

```typescript
// ANTES
has_login: !!m.user_id

// DEPOIS
// Fazer join com motorista_credenciais para verificar se existe registro
has_login: !!credenciais.find(c => c.motorista_id === m.id)
```

### EditMotoristaLoginModal - Criar Login

```typescript
// ANTES (usa Supabase Auth)
await supabase.functions.invoke('create-user', { ... });

// DEPOIS (usa driver-register)
await supabase.functions.invoke('driver-register', {
  body: {
    motorista_id: motorista.id,
    telefone: telefoneDigits,
    senha: senha.trim(),
  }
});
```

---

## Fluxo Final do Motorista

1. Admin acessa página de Equipe
2. Clica em "Criar Login" no card do motorista
3. Sistema salva credenciais em `motorista_credenciais` via `driver-register`
4. Motorista acessa `/login/motorista`
5. Digita celular + senha
6. `driver-login` valida e retorna JWT com `motorista_id`, `evento_id`
7. `DriverRoute` permite acesso a `/app/:eventoId/motorista`
8. `AppMotorista` usa dados da sessão para mostrar viagens/missões

---

## Benefícios

1. **Separação clara**: Motoristas usam sistema próprio, sem conflito com Supabase Auth
2. **Simplicidade**: Sem SMS, sem Twilio, telefones fictícios funcionam
3. **Segurança**: Senhas com bcrypt, JWT com expiração
4. **Consistência**: Toda lógica de motorista usa mesma tabela `motorista_credenciais`
5. **Funcionamento**: Sistema completo e integrado com funcionalidades existentes
