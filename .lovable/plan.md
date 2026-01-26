
# Plano: Corrigir Permissões de Viagem para Motoristas

## Problema Identificado

O hook `useViagemOperacao` usa `useAuth()` (Supabase Auth) para verificar se o usuário está logado:

```typescript
const { user } = useAuth(); // ← Sempre null para motoristas!

const iniciarViagem = useCallback(async (viagem: Viagem) => {
  if (!user) {
    toast.error('Você precisa estar logado'); // ← Este erro aparece
    return false;
  }
  // ...
```

Motoristas usam um sistema de autenticação **customizado** (`useDriverAuth()`) com JWT próprio, então o `user` do Supabase Auth é sempre `null`.

---

## Solução Proposta

Criar um hook alternativo `useViagemOperacaoMotorista` que:

1. Usa `useDriverAuth()` para obter `motorista_id` e `motorista_nome`
2. Permite operações baseadas nas regras de negócio:
   - **Transfer/Missão**: Motorista pode iniciar e encerrar
   - **Shuttle**: Motorista pode iniciar, mas só registra chegada (não encerra)
3. Registra logs com identificador do motorista (não UUID de user_id)

---

## Arquivos a Modificar/Criar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/hooks/useViagemOperacaoMotorista.ts` | CRIAR | Hook específico para operações de motorista |
| `src/pages/app/AppMotorista.tsx` | MODIFICAR | Usar o novo hook |

---

## Novo Hook: `useViagemOperacaoMotorista.ts`

```typescript
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDriverAuth } from '@/lib/auth/DriverAuthContext';
import { useServerTime } from '@/hooks/useServerTime';
import { Viagem, StatusViagemOperacao } from '@/lib/types/viagem';
import { toast } from 'sonner';

export function useViagemOperacaoMotorista() {
  const { driverSession } = useDriverAuth();
  const { getAgoraSync } = useServerTime();

  // Funções com validação baseada em driverSession
  // em vez de user do Supabase Auth
}
```

---

## Diferenças Principais

### useViagemOperacao (Admin/Operador)
- Usa `useAuth()` → Supabase Auth
- Valida `user.id` para registrar logs
- Acesso total a todas as operações

### useViagemOperacaoMotorista (Motorista)
- Usa `useDriverAuth()` → JWT customizado
- Usa `driverSession.motorista_id` para identificação
- Restrições:
  - **Shuttle**: Não pode encerrar diretamente (apenas registrar chegada com standby)
  - **Transfer/Missão**: Pode encerrar normalmente

---

## Fluxo de Permissões

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         TIPO DE OPERAÇÃO                                │
├───────────────┬───────────────────────┬─────────────────────────────────┤
│               │      MOTORISTA        │        OPERADOR/ADMIN          │
├───────────────┼───────────────────────┼─────────────────────────────────┤
│   Transfer    │  ✅ Iniciar           │  ✅ Iniciar                     │
│               │  ✅ Encerrar          │  ✅ Encerrar                    │
│               │                       │  ✅ Iniciar Retorno             │
├───────────────┼───────────────────────┼─────────────────────────────────┤
│   Missão      │  ✅ Iniciar           │  ✅ Iniciar                     │
│               │  ✅ Encerrar          │  ✅ Encerrar                    │
│               │                       │  ✅ Iniciar Retorno             │
├───────────────┼───────────────────────┼─────────────────────────────────┤
│   Shuttle     │  ✅ Iniciar           │  ✅ Iniciar                     │
│               │  ⚠️ Chegou (standby)  │  ✅ Encerrar                    │
│               │  ❌ Encerrar          │  ✅ Iniciar Retorno             │
└───────────────┴───────────────────────┴─────────────────────────────────┘
```

---

## Detalhes da Implementação

### 1. Criar `useViagemOperacaoMotorista.ts`

```typescript
export function useViagemOperacaoMotorista() {
  const { driverSession } = useDriverAuth();
  const { getAgoraSync } = useServerTime();

  const iniciarViagem = useCallback(async (viagem: Viagem) => {
    if (!driverSession) {
      toast.error('Sessão expirada. Faça login novamente.');
      return false;
    }
    // ... lógica de iniciar
  }, [driverSession, getAgoraSync]);

  const registrarChegada = useCallback(async (viagem: Viagem, qtdPax?: number) => {
    if (!driverSession) {
      toast.error('Sessão expirada. Faça login novamente.');
      return false;
    }

    // Para Shuttle: sempre aguarda retorno (motorista não encerra)
    // Para Transfer/Missão: encerra diretamente
    const aguardarRetorno = viagem.tipo_operacao === 'shuttle';
    
    // ... lógica de registrar chegada
  }, [driverSession, getAgoraSync]);

  // Motorista NÃO pode usar:
  // - encerrarViagem (para shuttle - só operador)
  // - iniciarRetorno (só operador)
  // - cancelarViagem (só operador)

  return {
    iniciarViagem,
    registrarChegada,
    // Não exportar: encerrarViagem, cancelarViagem, iniciarRetorno
  };
}
```

### 2. Modificar `AppMotorista.tsx`

```typescript
// DE:
import { useViagemOperacao } from '@/hooks/useViagemOperacao';
const { iniciarViagem, registrarChegada } = useViagemOperacao();

// PARA:
import { useViagemOperacaoMotorista } from '@/hooks/useViagemOperacaoMotorista';
const { iniciarViagem, registrarChegada } = useViagemOperacaoMotorista();
```

---

## Tabela de Mudanças

### Antes (Problema)

| Ação | useAuth().user | Resultado |
|------|----------------|-----------|
| Motorista clica "Iniciar" | null | ❌ "Precisa estar logado" |
| Motorista clica "Chegou" | null | ❌ "Precisa estar logado" |

### Depois (Solução)

| Ação | useDriverAuth().driverSession | Resultado |
|------|-------------------------------|-----------|
| Motorista clica "Iniciar" | válido | ✅ Viagem iniciada |
| Motorista clica "Chegou" (Transfer/Missão) | válido | ✅ Viagem encerrada |
| Motorista clica "Chegou" (Shuttle) | válido | ✅ Aguardando retorno |

---

## Registro de Logs

Como motoristas não têm `user_id` (UUID do Supabase Auth), os logs serão registrados de forma diferente:

```typescript
// Para logs de viagem, usar detalhes com motorista_id
await supabase.from('viagem_logs').insert([{
  viagem_id: viagem.id,
  user_id: driverSession.motorista_id, // UUID do motorista
  acao: 'inicio',
  detalhes: { 
    via: 'app_motorista',
    motorista_nome: driverSession.motorista_nome 
  }
}]);
```

**Nota**: A tabela `viagem_logs` tem `user_id` como UUID, e o `motorista_id` também é UUID, então isso funciona. No entanto, para distinguir logs de motoristas vs operadores, adicionamos o campo `via: 'app_motorista'` nos detalhes.

---

## Seção Técnica

### Validação de Sessão

O hook verificará se a sessão do motorista ainda é válida antes de cada operação:

```typescript
if (!driverSession || driverSession.expires_at < Date.now()) {
  toast.error('Sessão expirada. Faça login novamente.');
  return false;
}
```

### Atualização de Status do Motorista

Ao iniciar uma viagem, o status do motorista deve mudar para `em_viagem`. Ao encerrar (Transfer/Missão) ou registrar chegada com standby (Shuttle), verificar se há outras viagens ativas antes de mudar status.

### Compatibilidade com AppOperador

O `AppOperador` continuará usando `useViagemOperacao` (que usa `useAuth()`), pois operadores fazem login via Supabase Auth. Não há conflito.

