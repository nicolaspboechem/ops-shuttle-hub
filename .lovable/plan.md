

# Corrigir "useAuth must be used within an AuthProvider" no App Motorista

## Problema

O erro ocorre porque a rota `/app/:eventoId/motorista` fica **fora** do `AuthLayout` (que fornece o `AuthProvider`). Isso foi feito de proposito para que motoristas nao precisem do Supabase Auth. Porem, 3 componentes filhos do `AppMotorista` chamam `useAuth()` diretamente:

- `VistoriaVeiculoWizard.tsx` - linha 58: `const { user } = useAuth()`
- `CreateViagemForm.tsx` - linha 60: `const { user } = useAuth()`
- `RetornoViagemForm.tsx` - linha 48: `const { user } = useAuth()`

Esses componentes usam `useAuth()` para obter o `user` e tambem `useCurrentUser()` para obter `userId`/`userName`. O `useCurrentUser` tem protecao try/catch, mas a chamada direta a `useAuth()` explode.

## Solucao

Remover a chamada direta `useAuth()` desses 3 componentes e usar apenas `useCurrentUser()`, que ja tenta todos os auth contexts com protecao try/catch.

## Alteracoes

### 1. `src/components/app/VistoriaVeiculoWizard.tsx`
- Remover `import { useAuth }` e `const { user } = useAuth()`
- Substituir referencias a `user` por `userId` (ja disponivel via `useCurrentUser`)

### 2. `src/components/app/CreateViagemForm.tsx`
- Remover `import { useAuth }` e `const { user } = useAuth()`
- Substituir referencias a `user` por `userId` (ja disponivel via `useCurrentUser`)

### 3. `src/components/app/RetornoViagemForm.tsx`
- Remover `import { useAuth }` e `const { user } = useAuth()`
- Substituir referencias a `user` por `userId` (ja disponivel via `useCurrentUser`)

## Impacto

Esses componentes ja possuem `useCurrentUser()` que fornece `userId` e `userName`. A chamada extra a `useAuth()` era redundante e causava o crash. Apos a correcao, o app do motorista carregara normalmente no Vercel.

