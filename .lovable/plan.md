

# Diagnóstico: Problemas de Check-in/Check-out no App Motorista

## Problemas Identificados

### Problema 1: Check-in pode estar falhando por falta de veículo

O código do `CheckinCheckoutCard` exige um veículo atribuído (`veiculoAtribuido`) para habilitar o botão de check-in:

```typescript
// Linha 140-141 de CheckinCheckoutCard.tsx
disabled={loading || !veiculoAtribuido}
```

Se o motorista não tiver um veículo atribuído, o botão fica desabilitado e o check-in não funciona.

### Problema 2: Falta de Sincronização em Tempo Real (CRÍTICO)

O hook `useMotoristaPresenca` **não possui Realtime subscription**. Quando o admin faz checkout de um motorista no painel (via `useEquipe.handleCheckout`), a alteração é salva no banco, mas o app do motorista não recebe essa atualização até fazer um refresh manual.

**Fluxo atual quebrado:**
```text
Admin faz checkout → Banco atualiza ✅ → App do motorista NÃO sabe ❌
```

### Problema 3: Data Operacional pode estar diferente

Os registros de presença mais recentes no banco são da data `2026-02-03`, mas o horário do servidor agora é `2026-02-04 09:30` (após a virada das 04:00). Isso significa que ao buscar a presença de "hoje", o sistema está buscando registros de `2026-02-04` (que não existem), enquanto os dados reais estão em `2026-02-03`.

---

## Soluções Propostas

### 1. Adicionar Realtime Subscription no `useMotoristaPresenca`

Adicionar um listener de Realtime do Supabase para monitorar mudanças na tabela `motorista_presenca`. Quando o admin fizer checkout, o app do motorista receberá a atualização automaticamente.

### 2. Polling como Fallback

Implementar um polling a cada 30 segundos como backup caso o Realtime falhe silenciosamente (problema conhecido).

### 3. Verificar Veículo antes do Check-in

Mostrar mensagem clara se o motorista não tiver veículo atribuído e impedir o check-in nesse caso (já está implementado, mas confirmar que a UX está clara).

### 4. Debug de Sincronização de Hora

Adicionar logs temporários para verificar se a data operacional está sendo calculada corretamente.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useMotoristaPresenca.ts` | Adicionar Realtime subscription + polling fallback |

---

## Seção Técnica

### Código do Realtime + Polling no `useMotoristaPresenca`

```typescript
// Adicionar após o fetchPresenca inicial

useEffect(() => {
  if (!eventoId || !motoristaId) return;
  
  // Realtime subscription para mudanças de presença
  const channel = supabase
    .channel(`presenca-${motoristaId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'motorista_presenca',
        filter: `motorista_id=eq.${motoristaId}`
      },
      (payload) => {
        console.log('[Presença] Realtime update:', payload.eventType);
        // Refetch para garantir dados atualizados
        fetchPresenca();
      }
    )
    .subscribe((status) => {
      console.log('[Presença] Subscription status:', status);
    });

  // Polling fallback (a cada 30s)
  const pollInterval = setInterval(() => {
    fetchPresenca();
  }, 30000);

  return () => {
    supabase.removeChannel(channel);
    clearInterval(pollInterval);
  };
}, [eventoId, motoristaId, fetchPresenca]);
```

### Verificação de Veículo no Check-in

Manter o botão desabilitado mas melhorar a mensagem de feedback para o motorista entender que precisa de um veículo atribuído.

### Fluxo Corrigido

```text
Admin faz checkout 
       │
       ▼
Banco atualiza (motorista_presenca)
       │
       ▼
Realtime notifica app motorista
       │
       ▼
App recarrega presença automaticamente ✅
       │
       ▼
UI reflete checkout imediatamente
```

---

## Impacto

- **Check-in**: Funcionará se o motorista tiver veículo atribuído
- **Checkout pelo Admin**: Sincronizará automaticamente no app do motorista
- **Checkout pelo Motorista**: Continuará funcionando normalmente
- **Fallback**: Polling garante sincronização mesmo se Realtime falhar

