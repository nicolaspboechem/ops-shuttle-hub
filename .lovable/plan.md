
# Plano: Corrigir Criação de Login no Wizard de Motorista

## Problema Identificado

O `CreateMotoristaWizard` está chamando a Edge Function **errada**:

| Situação Atual | Situação Correta |
|----------------|------------------|
| Chama `create-user` (Supabase Auth) | Deve chamar `driver-register` (sistema customizado) |
| Cria usuário em `auth.users` | Deve criar em `motorista_credenciais` |
| Motorista não consegue logar em `/login/motorista` | Login funciona corretamente |

### Código Problemático (linhas 84-103)

```typescript
// ERRADO: usa create-user (Supabase Auth)
const response = await supabase.functions.invoke('create-user', {
  body: {
    telefone: telefoneDigits,
    login_type: 'phone',
    password: senha.trim(),
    full_name: nome.trim(),
    user_type: 'motorista',
    evento_id: eventoId,
    motorista_id: motoristaId,
  },
  headers: {
    Authorization: `Bearer ${sessionData.session?.access_token}`,
  },
});
```

### Código do `EditMotoristaLoginModal` (funciona corretamente)

```typescript
// CORRETO: usa driver-register (tabela motorista_credenciais)
const response = await supabase.functions.invoke('driver-register', {
  body: {
    motorista_id: motorista.id,
    telefone: telefoneDigits,
    senha: senha.trim(),
  },
});
```

---

## Solução

Substituir a chamada de `create-user` por `driver-register` no `CreateMotoristaWizard`, igual ao `EditMotoristaLoginModal`.

---

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/motoristas/CreateMotoristaWizard.tsx` | Trocar `create-user` por `driver-register` |

---

## Seção Técnica

### Código Corrigido

```typescript
// Se criarLogin está ativo e temos o motoristaId, criar credenciais
if (criarLogin && telefone.trim() && senha.trim() && motoristaId) {
  const telefoneDigits = telefone.replace(/\D/g, '');
  
  // CORRETO: usar driver-register (sistema customizado de motoristas)
  const response = await supabase.functions.invoke('driver-register', {
    body: {
      motorista_id: motoristaId,
      telefone: telefoneDigits,
      senha: senha.trim(),
    },
  });

  if (response.error) {
    toast.error(`Motorista criado, mas erro ao criar login: ${response.error.message}`);
    handleClose();
    return;
  }

  if (response.data?.error) {
    toast.error(`Motorista criado, mas erro ao criar login: ${response.data.error}`);
    handleClose();
    return;
  }
  
  // Guardar credenciais para mostrar
  setCreatedCredentials({
    login: telefoneDigits,
    password: senha.trim(),
  });
  setShowCredentialsModal(true);
} else {
  handleClose();
}
```

### Mudanças Adicionais

1. **Validação de senha**: Alterar de 6 para 4 caracteres (igual ao `EditMotoristaLoginModal`)
   - Linha 153: `senha.trim().length >= 4` (era 6)
   - Linha 450: Placeholder "Mínimo 4 caracteres" (era 6)
   - Linha 463-464: Mensagem de erro para 4 caracteres (era 6)

2. **Formato do login exibido**: Mostrar apenas os dígitos (sem +55)
   - O sistema customizado usa apenas dígitos, não o formato internacional

---

## Fluxo Corrigido

```text
1. Usuário preenche dados do motorista
2. Usuário ativa "Criar login" e define telefone + senha
3. handleSubmit() é chamado:
   a) Cria motorista na tabela `motoristas` → retorna motoristaId
   b) Chama `driver-register` com motorista_id, telefone, senha
   c) Edge Function cria registro em `motorista_credenciais` com hash SHA-256
4. Modal de credenciais é exibido
5. Motorista pode logar via `/login/motorista`
```

---

## Resultado Esperado

1. Login é criado corretamente na tabela `motorista_credenciais`
2. Modal fecha após criação bem-sucedida
3. Credenciais são exibidas para o admin copiar
4. Motorista consegue fazer login em `/login/motorista`
