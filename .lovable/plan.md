

# V2.0.0 - Sessao Robusta, Sincronizacao e Atualizacao de Versao

## Resumo

Tres problemas resolvidos nesta versao:
1. **App deslogando toda hora** - token expira em 24h sem renovacao
2. **Data errada no celular** (ex: Simmy vendo dia 14) - app usa hora local antes da sincronizacao completar
3. **Versao atualizada** para 2.0.0

---

## Alteracoes

### 1. Token de 24h para 7 dias (Edge Functions)

**`supabase/functions/driver-login/index.ts`** (linha 152):
- Mudar `getNumericDate(60 * 60 * 24)` para `getNumericDate(60 * 60 * 24 * 7)`

**`supabase/functions/staff-login/index.ts`** (linha 124):
- Mesma alteracao

### 2. Renovacao automatica silenciosa (Auth Contexts)

**`src/lib/auth/DriverAuthContext.tsx`**:
- Adicionar `useEffect` que verifica a cada 30 minutos se faltam menos de 24h para expirar
- Se sim, chama `driver-login` novamente com telefone/senha do token (nao temos senha armazenada, entao a renovacao sera feita estendendo o `expires_at` localmente baseado no tempo restante do JWT -- o token continua valido por 7 dias no servidor)
- Na pratica: como o token agora dura 7 dias, a verificacao local de `expires_at` nao causara logouts frequentes. A renovacao real acontece no proximo login manual.

Abordagem simplificada: em vez de renovar o token (que exigiria armazenar credenciais), vamos:
- Mudar `isAuthenticated` de calculo inline para `useState` + `useEffect` com verificacao a cada 60 segundos
- Adicionar margem de tolerancia: se o token expirou ha menos de 1 hora, ainda considerar autenticado (graceful degradation)

**`src/lib/auth/StaffAuthContext.tsx`**:
- Mesmas alteracoes

### 3. Re-sincronizacao ao voltar do background

**`src/hooks/useServerTime.ts`**:
- Adicionar listener `visibilitychange` no `useEffect`: quando o documento volta a ficar visivel, chamar `syncTime()` imediatamente
- Isso garante que apos o celular ficar em segundo plano, o offset seja recalculado

### 4. Aguardar sync antes de calcular dataOperacional

**`src/pages/app/AppMotorista.tsx`** (linha 66):
- Extrair `loading` do `useServerTime()`
- No calculo de `dataOperacional` (linha 147-149): se `loading` for true, usar null
- No render: enquanto `loading` do serverTime for true, mostrar spinner antes do conteudo principal (ou simplesmente nao renderizar o conteudo que depende de dataOperacional)

### 5. Versao 2.0.0

**`src/lib/version.ts`**:
- `APP_VERSION = '2.0.0'`
- `APP_BUILD_DATE = '2026-02-15'`

---

## Detalhes Tecnicos

### useServerTime.ts - visibilitychange

```text
useEffect(() => {
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      syncTime();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, [syncTime]);
```

### DriverAuthContext - isAuthenticated robusto

```text
// Antes (recalcula a cada render, logout instantaneo):
const isAuthenticated = !!driverSession && driverSession.expires_at > Date.now();

// Depois (useState + verificacao periodica):
const [isAuthenticated, setIsAuthenticated] = useState(false);

useEffect(() => {
  const check = () => {
    const valid = !!driverSession && driverSession.expires_at > Date.now();
    setIsAuthenticated(valid);
  };
  check();
  const interval = setInterval(check, 60000); // Verifica a cada 60s
  return () => clearInterval(interval);
}, [driverSession]);
```

### AppMotorista - guardar contra loading

```text
const { getAgoraSync, loading: loadingServerTime } = useServerTime();

// No dataOperacional:
const dataOperacional = useMemo(() => {
  if (loadingServerTime) return null;
  return getDataOperacional(getAgoraSync(), evento?.horario_virada_dia || '04:00');
}, [getAgoraSync, evento?.horario_virada_dia, loadingServerTime]);
```

---

## Arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/driver-login/index.ts` | Token 24h -> 7 dias |
| `supabase/functions/staff-login/index.ts` | Token 24h -> 7 dias |
| `src/lib/auth/DriverAuthContext.tsx` | isAuthenticated como useState + check periodico |
| `src/lib/auth/StaffAuthContext.tsx` | Mesma alteracao |
| `src/hooks/useServerTime.ts` | visibilitychange listener |
| `src/pages/app/AppMotorista.tsx` | Aguardar sync antes de dataOperacional |
| `src/lib/version.ts` | Versao 2.0.0, build date 2026-02-15 |

