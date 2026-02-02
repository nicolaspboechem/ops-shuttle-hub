
# Plano: Unificar Sistema de Login - Staff Usa Mesmo Padrão de Motoristas

## Resumo do Problema

Atualmente temos **dois sistemas de autenticação diferentes**:

| Role | Sistema Atual | Problema |
|------|---------------|----------|
| **Motorista** | Custom JWT + `motorista_credenciais` | ✅ Funciona bem, fácil de gerenciar |
| **Supervisor/Operador** | Supabase Auth + `auth.users` | ❌ Difícil excluir, telefone fica "preso" |
| **Cliente** | Supabase Auth + `auth.users` | ❌ Mesmo problema |

**Solução:** Usar o **mesmo padrão de motoristas** para todos os staff (supervisor, operador, cliente), criando uma tabela `staff_credenciais` e Edge Functions dedicadas.

---

## Arquitetura Proposta

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE AUTENTICAÇÃO                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐          ┌─────────────────────┐          │
│  │  ADMIN (CCO)        │          │  FIELD (App)        │          │
│  │  /auth              │          │  /login/equipe      │          │
│  │  Supabase Auth      │          │  Custom JWT         │          │
│  │  Email/Senha        │          │  Telefone/Senha     │          │
│  └─────────────────────┘          └─────────────────────┘          │
│                                            │                        │
│                          ┌─────────────────┴─────────────────┐     │
│                          │                                   │     │
│                   ┌──────▼──────┐                    ┌───────▼────┐│
│                   │ Motorista   │                    │ Staff      ││
│                   │ driver-login│                    │ staff-login││
│                   │ motorista_  │                    │ staff_     ││
│                   │ credenciais │                    │ credenciais││
│                   └─────────────┘                    └────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Mudanças no Banco de Dados

### Nova Tabela: `staff_credenciais`

Espelha `motorista_credenciais` para operadores, supervisores e clientes:

```sql
CREATE TABLE staff_credenciais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,  -- Referência ao profiles.user_id
  evento_id UUID NOT NULL, -- Evento associado
  telefone VARCHAR NOT NULL,
  senha_hash VARCHAR NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'operador', -- operador, supervisor, cliente
  ativo BOOLEAN DEFAULT true,
  ultimo_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(telefone, evento_id) -- Mesmo telefone pode existir em eventos diferentes
);

-- RLS policies
ALTER TABLE staff_credenciais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read for login" ON staff_credenciais
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated manage" ON staff_credenciais
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/staff-login/index.ts` | Login de staff (como driver-login) |
| `supabase/functions/staff-register/index.ts` | Registro de credenciais staff |
| `supabase/functions/delete-user/index.ts` | Exclusão completa de usuários |
| `src/lib/auth/StaffAuthContext.tsx` | Context de autenticação staff |
| `src/pages/LoginEquipe.tsx` | Página de login para equipe |
| `src/components/equipe/EditStaffModal.tsx` | Modal para editar staff |

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/config.toml` | Adicionar novas Edge Functions |
| `src/App.tsx` | Adicionar rota `/login/equipe` e StaffAuthProvider |
| `src/components/equipe/AddStaffWizard.tsx` | Usar staff-register ao invés de create-user |
| `src/hooks/useEquipe.ts` | Usar delete-user na exclusão |
| `src/pages/app/AppHome.tsx` | Ajustar redirecionamento |
| `src/components/auth/EventRoleRoute.tsx` | Suportar StaffAuthContext |
| `src/pages/Auth.tsx` | Adicionar link "Sou da equipe de campo" |

---

## Seção Técnica

### Edge Function: staff-login

Similar a `driver-login`, mas busca em `staff_credenciais` e retorna role no JWT:

```typescript
// supabase/functions/staff-login/index.ts

// 1. Recebe telefone e senha
// 2. Busca em staff_credenciais
// 3. Verifica hash da senha (SHA-256 com salt)
// 4. Gera JWT com claims:
//    - user_id
//    - user_nome
//    - evento_id
//    - role (operador/supervisor/cliente)
//    - exp (24h)
// 5. Atualiza ultimo_login
// 6. Retorna session com token
```

### Edge Function: staff-register

Similar a `driver-register`:

```typescript
// supabase/functions/staff-register/index.ts

// 1. Recebe: user_id, evento_id, telefone, senha, role
// 2. Valida se user_id existe em profiles
// 3. Verifica se telefone+evento_id já existe
// 4. Hash da senha com SHA-256 + salt
// 5. Insere/atualiza em staff_credenciais
```

### Edge Function: delete-user

Exclusão completa de usuários:

```typescript
// supabase/functions/delete-user/index.ts

// 1. Verifica se chamador é admin
// 2. Se motorista_id:
//    - Remove de motorista_credenciais
//    - Remove de motorista_presenca
//    - Remove de motoristas
// 3. Se user_id (staff):
//    - Remove de staff_credenciais
//    - Remove de evento_usuarios
//    - Remove de profiles
// 4. NÃO precisa mais chamar auth.admin.deleteUser()
//    (staff não estará mais no Supabase Auth)
```

### StaffAuthContext

Espelha `DriverAuthContext`:

```typescript
interface StaffSession {
  token: string;
  user_id: string;
  user_nome: string;
  evento_id: string;
  role: 'operador' | 'supervisor' | 'cliente';
  expires_at: number;
}

// Storage key: 'staff_session'
// Endpoint: /functions/v1/staff-login
```

### LoginEquipe.tsx

Página de login para equipe de campo:

- Visual similar a `LoginMotorista.tsx`
- Cor diferenciada (azul ao invés de verde)
- Campos: Telefone + Senha
- Após login, redireciona para `/app/{evento_id}/{role}`

### Atualização do AddStaffWizard

```typescript
// Ao criar staff, chamar staff-register ao invés de create-user

const handleSubmit = async () => {
  // 1. Criar profile no banco (sem Supabase Auth)
  const { data: profile } = await supabase.from('profiles').insert({
    user_id: crypto.randomUUID(), // Gerar UUID local
    full_name: nome,
    telefone: telefone,
    user_type: staffType,
  }).select().single();

  // 2. Vincular ao evento
  await supabase.from('evento_usuarios').insert({
    user_id: profile.user_id,
    evento_id: eventoId,
    role: staffType,
  });

  // 3. Criar credenciais via Edge Function
  await supabase.functions.invoke('staff-register', {
    body: {
      user_id: profile.user_id,
      evento_id: eventoId,
      telefone: telefone.replace(/\D/g, ''),
      senha: senha,
      role: staffType,
    },
  });
};
```

### Atualização do EventRoleRoute

Suportar tanto `AuthContext` (admin) quanto `StaffAuthContext` (campo):

```typescript
export function EventRoleRoute({ children, allowedRoles }: Props) {
  const { user, eventRoles } = useAuth(); // Supabase Auth (admins)
  const { staffSession, isAuthenticated } = useStaffAuth(); // Custom JWT (field)
  
  // Verificar se é staff autenticado pelo sistema customizado
  if (isAuthenticated && staffSession) {
    if (allowedRoles.includes(staffSession.role)) {
      return children;
    }
  }
  
  // Fallback para admin que pode acessar qualquer role
  if (user && eventRoles.some(er => allowedRoles.includes(er.role))) {
    return children;
  }
  
  return <Navigate to="/login/equipe" />;
}
```

---

## Fluxo de Criação de Staff

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Admin abre AddStaffWizard no CCO                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. Cria registro em `profiles` (sem Supabase Auth)                 │
│  2. Cria registro em `evento_usuarios`                              │
│  3. Chama staff-register → cria `staff_credenciais`                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Supervisor acessa /login/equipe                                    │
│  Digite: Telefone + Senha                                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  staff-login:                                                       │
│  - Busca em staff_credenciais                                       │
│  - Verifica senha                                                   │
│  - Gera JWT com role                                                │
│  - Retorna session                                                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Redireciona para /app/{evento_id}/supervisor                       │
│  StaffAuthContext gerencia sessão                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Exclusão

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Admin clica "Remover da Equipe"                                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  delete-user Edge Function:                                         │
│  - Remove de staff_credenciais                                      │
│  - Remove de evento_usuarios                                        │
│  - Remove de profiles                                               │
│  ✅ Telefone liberado imediatamente!                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Comparativo: Antes vs Depois

| Aspecto | Antes (Supabase Auth) | Depois (Custom JWT) |
|---------|----------------------|---------------------|
| **Criar Staff** | auth.admin.createUser() | INSERT em profiles + staff_credenciais |
| **Login Staff** | /auth com email/telefone | /login/equipe com telefone/senha |
| **Excluir Staff** | Precisa auth.admin.deleteUser() | Apenas DELETE nas tabelas |
| **Telefone "preso"** | ❌ Sim, permanece no Auth | ✅ Não, limpa completamente |
| **Editar Telefone** | Difícil (Auth API) | ✅ Fácil (UPDATE tabela) |
| **Complexidade** | Alta (2 sistemas) | ✅ Baixa (1 padrão unificado) |

---

## Páginas de Login

| Rota | Usuário | Sistema |
|------|---------|---------|
| `/auth` | Administradores (CCO) | Supabase Auth (email) |
| `/login/motorista` | Motoristas | Custom JWT (telefone) |
| `/login/equipe` | Supervisores, Operadores, Clientes | Custom JWT (telefone) |

---

## Resultado Esperado

1. ✅ **Staff criado sem Supabase Auth** - Apenas tabelas locais
2. ✅ **Login simplificado** - Telefone + Senha em `/login/equipe`
3. ✅ **Exclusão completa** - Telefone liberado imediatamente
4. ✅ **Edição fácil** - UPDATE direto na tabela
5. ✅ **Mesmo padrão de motoristas** - Código reutilizável
6. ✅ **Admin preservado** - Continua usando Supabase Auth normalmente
