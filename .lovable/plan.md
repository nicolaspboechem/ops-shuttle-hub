

# Plano: Login Customizado para Motoristas (Tabela Separada)

## Resumo da Solução

Criar um sistema de autenticação **separado e simplificado** para motoristas, usando uma tabela própria para armazenar credenciais (telefone + senha com hash). Admins continuam usando Supabase Auth via `/auth`, enquanto motoristas usarão `/login/motorista`.

---

## Arquitetura

```text
┌─────────────────────────────────────────────────────────────────┐
│                      FLUXOS DE LOGIN                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ADMIN/OPERADOR                    MOTORISTA                    │
│  ┌─────────────┐                   ┌─────────────┐              │
│  │  /auth      │                   │  /login/    │              │
│  │  (email)    │                   │  motorista  │              │
│  └──────┬──────┘                   │  (celular)  │              │
│         │                          └──────┬──────┘              │
│         ▼                                 ▼                     │
│  ┌─────────────┐                   ┌─────────────────────┐      │
│  │ Supabase    │                   │ driver-login        │      │
│  │ Auth        │                   │ (Edge Function)     │      │
│  └──────┬──────┘                   └──────┬──────────────┘      │
│         │                                 │                     │
│         ▼                                 ▼                     │
│  ┌─────────────┐                   ┌─────────────────────┐      │
│  │ auth.users  │                   │ motorista_credenciais│     │
│  │ (Supabase)  │                   │ (tabela customizada) │     │
│  └─────────────┘                   └─────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Componentes da Solução

### 1. Nova Tabela: `motorista_credenciais`

Armazena as credenciais de login dos motoristas de forma segura:

```sql
CREATE TABLE motorista_credenciais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id UUID NOT NULL REFERENCES motoristas(id) ON DELETE CASCADE,
  telefone VARCHAR(20) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  ultimo_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca rápida por telefone
CREATE INDEX idx_motorista_credenciais_telefone ON motorista_credenciais(telefone);
```

---

### 2. Edge Function: `driver-login`

Valida credenciais e retorna um token JWT customizado:

**Fluxo:**
1. Recebe `telefone` + `senha`
2. Busca na tabela `motorista_credenciais` pelo telefone
3. Verifica se o hash da senha confere (usando bcrypt)
4. Se válido, gera um JWT customizado com claims do motorista
5. Retorna token para o cliente

**Segurança:**
- Senhas armazenadas com bcrypt (hash seguro)
- JWT com expiração configurável (ex: 24h)
- Rate limiting recomendado

---

### 3. Edge Function: `driver-register`

Cria credenciais para um motorista existente:

**Fluxo:**
1. Recebe `motorista_id` + `telefone` + `senha`
2. Verifica se o admin está autenticado
3. Gera hash bcrypt da senha
4. Insere registro em `motorista_credenciais`

---

### 4. Nova Página: `/login/motorista`

Interface de login simplificada para motoristas:

- Campo: Telefone (com máscara)
- Campo: Senha
- Botão: Entrar
- Link: "Sou administrador" → `/auth`

**Visual:** Similar ao `/auth` atual, mas com foco em celular

---

### 5. Contexto de Autenticação: `DriverAuthContext`

Contexto separado para motoristas:

```tsx
interface DriverSession {
  motorista_id: string;
  motorista_nome: string;
  evento_id: string;
  token: string;
  expires_at: number;
}

// Armazena sessão em localStorage
// Valida token em cada request
```

---

### 6. Modificações na Página `/auth`

- Remover toggle Celular/Email
- Manter apenas login por Email
- Adicionar link: "Sou motorista? Entre aqui"

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/migrations/xxx_create_motorista_credenciais.sql` | CRIAR | Tabela de credenciais |
| `supabase/functions/driver-login/index.ts` | CRIAR | Validação de login |
| `supabase/functions/driver-register/index.ts` | CRIAR | Cadastro de credenciais |
| `src/pages/LoginMotorista.tsx` | CRIAR | Página de login para motoristas |
| `src/lib/auth/DriverAuthContext.tsx` | CRIAR | Contexto de auth para motoristas |
| `src/pages/Auth.tsx` | MODIFICAR | Remover opção de celular, adicionar link |
| `src/App.tsx` | MODIFICAR | Adicionar rota `/login/motorista` |
| `supabase/config.toml` | MODIFICAR | Registrar novas funções |

---

## Fluxo de Uso

### Criação de Credencial (Admin):
1. Admin acessa página de Equipe do evento
2. Clica em "Gerenciar Login" no card do motorista
3. Define telefone e senha
4. Sistema salva hash da senha em `motorista_credenciais`

### Login do Motorista:
1. Motorista acessa `/login/motorista`
2. Digita telefone: `(11) 99999-9999`
3. Digita senha: `1234`
4. Sistema valida via Edge Function
5. Token JWT retornado e armazenado
6. Redireciona para `/app`

---

## Segurança

| Aspecto | Implementação |
|---------|---------------|
| Senhas | Hash bcrypt (custo 10) |
| Tokens | JWT com HMAC-SHA256, expiração 24h |
| Transporte | HTTPS obrigatório |
| Tentativas | Considerar rate limiting futuro |
| Sessão | Token em localStorage, validado a cada request |

---

## Vantagens

1. **Sem dependência de SMS** - Não precisa Twilio/Vonage
2. **Controle total** - Você define as regras de senha
3. **Telefones fictícios** - Pode usar qualquer número para testes
4. **Separação clara** - Admins e motoristas em fluxos distintos
5. **Simples** - Sem configuração extra no Supabase

---

## Detalhes Técnicos

### Hash de Senha (Edge Function)

```typescript
import { hash, compare } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

// Ao registrar
const senhaHash = await hash(senha, 10);

// Ao validar login
const valid = await compare(senhaFornecida, senhaHash);
```

### JWT Customizado

```typescript
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";

const jwt = await create(
  { alg: "HS256", typ: "JWT" },
  { 
    motorista_id: motorista.id,
    motorista_nome: motorista.nome,
    evento_id: motorista.evento_id,
    exp: Date.now() / 1000 + 86400 // 24h
  },
  Deno.env.get("JWT_SECRET")!
);
```

---

## Migração de Motoristas Existentes

Motoristas que já foram criados com login Supabase Auth:
- Podem continuar usando o sistema antigo (se phone auth for habilitado no futuro)
- Ou podem ter credenciais criadas na nova tabela
- Recomendação: criar credenciais novas para todos na nova tabela

