
# Otimizar Tempo de Carregamento do App Publicado

## Problema
O app demora para renderizar porque: (1) a fonte Google bloqueia o render, (2) queries e canais Realtime disparam para todos os usuarios (incluindo nao autenticados), e (3) queries de perfil sao sequenciais em vez de paralelas.

## Correcoes

### 1. Mover Google Fonts para o HTML com preload (index.html)

Remover o `@import url(...)` do `src/index.css` e adicionar a fonte diretamente no `index.html` com `<link rel="preconnect">` e `<link rel="stylesheet">` com `display=swap`. Isso permite que o navegador comece a baixar a fonte em paralelo sem bloquear o CSS.

**Arquivo**: `index.html` - Adicionar no `<head>`:
```
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap">
```

**Arquivo**: `src/index.css` - Remover a linha 1:
```
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```

### 2. Condicionar NotificationsProvider a usuario autenticado (App.tsx)

Envolver o `NotificationsProvider` em um componente que so renderiza quando o usuario esta autenticado. Criar um componente wrapper `AuthenticatedNotifications` que verifica `user` do `useAuth()` antes de montar o provider, evitando 3 queries + 3 canais Realtime em paginas publicas e de login.

**Arquivo**: `src/App.tsx`

Criar componente interno:
```tsx
function ConditionalNotifications({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <>{children}</>;
  return <NotificationsProvider>{children}</NotificationsProvider>;
}
```

Substituir `<NotificationsProvider>` por `<ConditionalNotifications>` no JSX.

### 3. Paralelizar queries do AuthContext (AuthContext.tsx)

No `fetchUserData`, substituir as 4 queries sequenciais por `Promise.all`, reduzindo o tempo de ~800ms (4x200ms) para ~200ms (1x200ms).

**Arquivo**: `src/lib/auth/AuthContext.tsx`

Refatorar `fetchUserData` para:
```tsx
const [profileRes, roleRes, permRes, eventRolesRes] = await Promise.all([
  supabase.from('profiles').select('*').eq('user_id', userId).single(),
  supabase.from('user_roles').select('role').eq('user_id', userId).single(),
  supabase.from('user_permissions').select('permission').eq('user_id', userId),
  supabase.from('evento_usuarios').select('evento_id, role').eq('user_id', userId),
]);
// Processar resultados...
```

### 4. Adicionar preconnect ao Supabase (index.html)

Adicionar `<link rel="preconnect">` para o dominio do Supabase, permitindo que a conexao TLS comece antes mesmo do JavaScript carregar.

**Arquivo**: `index.html` - Adicionar no `<head>`:
```
<link rel="preconnect" href="https://gkrczwtldvondiehsesh.supabase.co">
```

## Impacto Esperado

- **Font blocking**: Eliminado (~300-500ms de melhoria no First Contentful Paint)
- **Queries desnecessarias**: 3 queries e 3 canais Realtime eliminados para usuarios nao autenticados
- **Auth sequencial para paralelo**: ~600ms de economia no carregamento pos-login
- **Preconnect Supabase**: ~100-200ms de economia na primeira query

Total estimado: **1-1.5s mais rapido** no carregamento inicial.
