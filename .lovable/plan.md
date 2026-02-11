

# Corrigir CRUD de Administradores na pagina Usuarios

## Problema Raiz

Existem dois bugs que impedem o gerenciamento de admins:

### Bug 1: Criacao duplica registros (trigger vs edge function)
O trigger `on_auth_user_created` no `auth.users` chama `handle_new_user()`, que insere automaticamente em `profiles` e `user_roles`. Depois, a edge function `create-user` tenta inserir nos mesmos registros, causando erro de chave duplicada.

### Bug 2: Exclusao nao remove do auth.users
O `handleDeleteUser` no frontend deleta de `profiles`, `user_roles` e `user_permissions` via client SDK, mas nao remove o usuario de `auth.users` (requer service role key). Isso deixa o usuario "orfao" no Supabase Auth e impede recriacao com o mesmo email.

## Solucao

### 1. Edge Function `create-user/index.ts`

Trocar os `insert` de `profiles` e `user_roles` por `upsert` para funcionar em harmonia com o trigger:

```typescript
// Antes:
await supabaseAdmin.from('profiles').insert({...});
await supabaseAdmin.from('user_roles').insert({...});

// Depois:
await supabaseAdmin.from('profiles').upsert({...}, { onConflict: 'user_id' });
await supabaseAdmin.from('user_roles').upsert({...}, { onConflict: 'user_id' });
```

Isso garante que:
- Se o trigger ja criou os registros, o upsert apenas atualiza com os dados corretos (user_type, login_type, etc.)
- Se por algum motivo o trigger nao executou, o upsert cria normalmente

### 2. Frontend `src/pages/Usuarios.tsx` -- handleDeleteUser

Trocar a exclusao client-side pela chamada ao edge function `delete-user` (que ja existe e usa service role key para deletar de auth.users):

```typescript
// Antes: deleta direto via supabase client (sem auth.users)
// Depois: chama edge function delete-user
const { data, error } = await supabase.functions.invoke('delete-user', {
  body: { user_id: deletingUser.user_id }
});
```

A edge function `delete-user` ja faz toda a limpeza: profiles, user_roles, user_permissions, evento_usuarios, staff_credenciais e auth.users.

### 3. Nenhuma alteracao no banco de dados

Nao precisa de migrations. O trigger continua funcionando, e o upsert resolve o conflito.

## Resumo

| Operacao | Antes | Depois |
|----------|-------|--------|
| Criar admin | Erro de chave duplicada (trigger + insert) | Upsert resolve conflito |
| Editar admin | Funciona (sem mudanca) | Sem mudanca |
| Deletar admin | Nao remove de auth.users | Edge function faz limpeza completa |

