

# Corrigir "useAuth must be used within an AuthProvider" - Causa Raiz Definitiva

## Problema

A correcao anterior removeu `useAuth()` de 3 componentes, mas o erro persiste porque existem **mais 2 fontes** do problema:

### Fonte 1: `useMissoesPorMotorista` (src/hooks/useMissoes.ts)
O hook `useMissoesPorMotorista` chama `const { user } = useAuth()` na linha 286. Este hook e importado diretamente pelo `AppMotorista`, que roda **fora** do `AuthProvider`. O `user` e usado apenas nas funcoes `aceitarMissao` e `recusarMissao` para preencher `atualizado_por`.

### Fonte 2: `useCurrentUser` (src/hooks/useCurrentUser.ts)
Este hook chama `useAuth()` dentro de um bloco `try/catch`. Isso viola as **Rules of Hooks** do React: hooks devem ser chamados incondicionalmente, na mesma ordem, em todo render. Em modo de producao, o React pode interceptar o erro antes do `catch`, causando crash.

## Solucao

### 1. Corrigir `useMissoesPorMotorista` em `src/hooks/useMissoes.ts`
- Remover `const { user } = useAuth()` (linha 286)
- Remover import de `useAuth` (ja usado pelo `useMissoes` no mesmo arquivo, entao manter o import)
- Substituir `user?.id` por `motoristaId` nas funcoes `aceitarMissao` (linha 382) e `recusarMissao` (linha 402), ja que `motoristaId` esta disponivel como parametro do hook

### 2. Reescrever `useCurrentUser` em `src/hooks/useCurrentUser.ts`
Em vez de chamar os hooks diretamente (violando Rules of Hooks quando fora do provider), usar `useContext` diretamente com os contextos brutos. `useContext` retorna `null`/`undefined` quando fora do provider sem explodir, diferente dos hooks customizados que fazem `throw`.

A nova implementacao:
- Importar os contextos brutos (AuthContext, StaffAuthContext, DriverAuthContext) via `useContext` direto
- Verificar se cada contexto esta disponivel (nao-null) antes de acessar dados
- Nenhum try/catch necessario — `useContext` e seguro por design

### 3. Exportar os contextos brutos
- Exportar `AuthContext` de `src/lib/auth/AuthContext.tsx` (adicionar export no createContext)
- Exportar `StaffAuthContext` de `src/lib/auth/StaffAuthContext.tsx`
- Exportar `DriverAuthContext` de `src/lib/auth/DriverAuthContext.tsx`

## Resultado

Apos essas alteracoes, nenhum componente ou hook dentro de `/app/:eventoId/motorista` chamara `useAuth()`, eliminando definitivamente o erro. O `useCurrentUser` funcionara de forma segura em qualquer contexto da aplicacao.

