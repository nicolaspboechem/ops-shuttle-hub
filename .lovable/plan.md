
## Plano: Edição de Login de Motoristas + Simplificação do Login por Telefone

### Problema Identificado

1. **Não é possível editar credenciais de login de motoristas existentes** - Atualmente só existe:
   - Resetar senha (para admins na página /usuarios)
   - Criar novo login durante cadastro do motorista
   
2. **Validação de telefone muito restritiva** - O Edge Function `create-user` rejeita telefones que não têm exatamente 10-11 dígitos, causando erros:
   - `"Telefone deve ter 10 ou 11 dígitos"`
   
3. **Falta opção de editar login na página de Equipe** - Os cards de membros da equipe não permitem:
   - Editar telefone de login
   - Resetar senha
   - Criar login para motorista que não tem

4. **AddStaffWizard não limpa telefone antes de enviar** - O telefone é enviado com máscara para o Edge Function

---

### Solução Proposta

#### PARTE 1: Remover Validação Restritiva de Telefone (Edge Function)

**Arquivo: `supabase/functions/create-user/index.ts`**

Remover a validação de 10-11 dígitos e aceitar qualquer formato de telefone:

```typescript
// ANTES (linhas 89-96):
const phoneDigits = telefone.replace(/\D/g, '');
if (phoneDigits.length < 10 || phoneDigits.length > 11) {
  return new Response(
    JSON.stringify({ error: "Telefone deve ter 10 ou 11 dígitos" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// DEPOIS:
const phoneDigits = telefone.replace(/\D/g, '');
// Aceita qualquer telefone - mínimo 4 dígitos para evitar erros acidentais
if (phoneDigits.length < 4) {
  return new Response(
    JSON.stringify({ error: "Telefone inválido" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

---

#### PARTE 2: Corrigir AddStaffWizard (Limpar Máscara)

**Arquivo: `src/components/equipe/AddStaffWizard.tsx`**

Linha 47: Limpar telefone antes de enviar:

```typescript
// ANTES:
telefone: telefone.trim(),

// DEPOIS:
telefone: telefone.replace(/\D/g, ''),
```

---

#### PARTE 3: Adicionar Modal de Edição de Login para Motoristas

**Novo componente:** `src/components/equipe/EditMotoristaLoginModal.tsx`

Modal que permite:
- Visualizar telefone atual de login
- Alterar telefone de login
- Resetar senha
- Criar login para motorista que não tem

```tsx
// Estrutura do modal:
- Título: "Gerenciar Acesso - {Nome do Motorista}"
- Se TEM login:
  - Input: Telefone atual (readonly, exibe telefone formatado)
  - Botão: "Resetar Senha" -> abre sub-modal para definir nova senha
  - Checkbox: "Alterar telefone de login"
    - Se marcado: Input para novo telefone + confirmação
- Se NÃO TEM login:
  - Form para criar login:
    - Input: Telefone
    - Input: Senha (mínimo 6 caracteres)
    - Botão: "Criar Login"
- Exibe credenciais após criação/alteração
```

---

#### PARTE 4: Criar Edge Function para Alterar Telefone de Login

**Novo arquivo:** `supabase/functions/update-user-phone/index.ts`

Função para administradores alterarem o telefone de login de um usuário:

```typescript
// Recebe: user_id, new_phone
// Verifica: caller é admin
// Atualiza: auth.users (phone) via Admin API
// Atualiza: profiles (telefone)
// Retorna: novo telefone formatado
```

---

#### PARTE 5: Integrar Modal na Página de Equipe

**Arquivo: `src/pages/EventoUsuarios.tsx`**

No `MembroCard`, adicionar opções no DropdownMenu:

```tsx
// Para motoristas:
<DropdownMenuItem onClick={() => openLoginModal(membro)}>
  <KeyRound className="w-4 h-4 mr-2" />
  {membro.has_login ? "Gerenciar Login" : "Criar Login"}
</DropdownMenuItem>

{membro.has_login && (
  <DropdownMenuItem onClick={() => openResetPasswordModal(membro)}>
    <Lock className="w-4 h-4 mr-2" />
    Resetar Senha
  </DropdownMenuItem>
)}
```

---

### Resumo de Arquivos

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/create-user/index.ts` | MODIFICAR | Remover validação restritiva de telefone |
| `src/components/equipe/AddStaffWizard.tsx` | MODIFICAR | Limpar máscara do telefone antes de enviar |
| `src/components/equipe/EditMotoristaLoginModal.tsx` | CRIAR | Modal para editar/criar login de motorista |
| `supabase/functions/update-user-phone/index.ts` | CRIAR | Edge Function para alterar telefone de login |
| `src/pages/EventoUsuarios.tsx` | MODIFICAR | Integrar modais no card de membro |

---

### Detalhes Técnicos

**Fluxo de "Criar Login" para motorista existente:**
1. Admin clica em "Criar Login" no card do motorista
2. Modal abre com campos: Telefone + Senha
3. Ao confirmar, chama `create-user` com `motorista_id` para vincular
4. Exibe credenciais geradas para copiar

**Fluxo de "Resetar Senha":**
1. Admin clica em "Resetar Senha"
2. Modal abre com campo de nova senha
3. Chama `reset-password` com `user_id` do motorista
4. Exibe confirmação com nova senha para copiar

**Fluxo de "Alterar Telefone":**
1. Admin clica em "Gerenciar Login"
2. Marca checkbox "Alterar telefone"
3. Digita novo telefone
4. Chama `update-user-phone` com novo telefone
5. Atualiza profiles e auth.users

---

### Simplificação do Login de Motorista

Com essas mudanças:
- Telefone pode ter qualquer formato (mínimo 4 dígitos)
- Senhas simples são permitidas (mínimo 6 caracteres)
- Admin pode criar/editar/resetar logins facilmente
- Motoristas fazem login com: `+55XXXXXXXXXX` + senha

**Exemplos de telefones aceitos:**
- `11999999999` ✓
- `999999999` ✓
- `1234` ✓
- `123` ✗ (menos de 4 dígitos)
