

## Diagnóstico: Tela branca e logout ao criar viagem

### Causa raiz

O `AuthContext` (linha 48-50) define `user = null` brevemente durante refresh de token do Supabase (`onAuthStateChange` dispara com sessão transitória). Como todas as páginas do app têm checagens agressivas de `!user`:

- **AppOperador** (linha 347-355): `useEffect` navega para `/auth` + retorna `null` (tela branca)
- **AppHome** (linha 25-29): `useEffect` navega para `/auth`
- **AppCliente** (linha 106-107): retorna `<Navigate to="/auth">`

Essas páginas **já estão dentro de `<ProtectedRoute>`** (App.tsx linhas 194, 197), que já cuida da proteção de autenticação. As checagens internas são **redundantes e nocivas**.

**Quando o operador cria uma viagem:**
1. INSERT no Supabase dispara Realtime → refetch de viagens
2. A atividade no Supabase pode provocar token refresh
3. `onAuthStateChange` seta `user = null` por um instante
4. `useEffect(!user)` navega para `/auth` → **logout falso**
5. `if (!user) return null` → **tela branca**

### Plano de correção

**1. Remover checagens redundantes de `!user` nas páginas do app**

- **`src/pages/app/AppOperador.tsx`**: Remover o `useEffect` (linhas 347-351) e o `if (!user) return null` (linhas 353-355). O `ProtectedRoute` já garante que o user existe.

- **`src/pages/app/AppHome.tsx`**: Remover `if (!user) navigate('/auth')` do `useEffect` (linhas 26-28). Usar `loading` do `useAuth` para guardar o fetch.

- **`src/pages/app/AppCliente.tsx`**: Remover `if (!user) return <Navigate>` (linhas 106-107).

- **`src/pages/app/AppEvento.tsx`**: Remover `if (!user) return <Navigate>` (linha 62) — já protegido por `ProtectedRoute`.

**2. Proteger `AuthContext` contra flash de null durante token refresh**

- No `onAuthStateChange`, só setar `user = null` se o evento for `SIGNED_OUT` (não durante `TOKEN_REFRESHED` ou outros eventos transitórios):

```ts
(event, session) => {
  setSession(session);
  setUser(session?.user ?? null);
  
  if (session?.user) {
    setTimeout(() => fetchUserData(session.user.id), 0);
  } else if (event === 'SIGNED_OUT') {
    resetState();
  }
}
```

### Resultado esperado
- Sem tela branca durante atualizações automáticas
- Sem logout falso ao criar viagem ou durante token refresh
- Proteção de auth mantida pelo `ProtectedRoute` centralizado

