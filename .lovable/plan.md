
# Corrigir exclusao de usuarios e toggle de permissoes

## Problema 1: Exclusao de usuario nao funciona

Na pagina Usuarios (`src/pages/Usuarios.tsx`), o `handleDeleteUser` chama `supabase.functions.invoke('delete-user')` sem passar explicitamente o header `Authorization`. Embora o SDK normalmente envie o token automaticamente, em alguns cenarios o header pode nao ser incluido corretamente. Compare com `useEquipe.ts` que passa o header explicitamente e funciona.

**Correcao**: Obter a sessao ativa e passar o header `Authorization` manualmente, igual ao padrao usado em `useEquipe.ts`.

## Problema 2: Permissoes nao persistem

A funcao `togglePermission` faz `await supabase.from('user_permissions').insert(...)` e `.delete(...)` mas **nao verifica o retorno `{ error }`**. Se a operacao falhar (RLS, rede, etc), o erro e silenciosamente ignorado e o state local e atualizado como se tivesse funcionado. Na proxima vez que a pagina carrega, as permissoes voltam ao estado anterior.

**Correcao**: Desestruturar `{ error }` de cada chamada e lancar excecao se houver erro, impedindo a atualizacao otimista do state local.

## Mudancas tecnicas

### `src/pages/Usuarios.tsx`

**handleDeleteUser (linhas 325-350)**:
- Antes de chamar `supabase.functions.invoke`, obter a sessao com `supabase.auth.getSession()`
- Passar `headers: { Authorization: \`Bearer ...\` }` na chamada da edge function
- Adicionar verificacao se a sessao existe

**togglePermission (linhas 370-400)**:
- No bloco `if (currentlyHas)`: desestruturar `{ error }` do `.delete()` e fazer `if (error) throw error`
- No bloco `else`: desestruturar `{ error }` do `.insert()` e fazer `if (error) throw error`

## Arquivo afetado

- `src/pages/Usuarios.tsx` -- corrigir handleDeleteUser e togglePermission
