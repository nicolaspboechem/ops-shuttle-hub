

# Corrigir divergencia de status entre supervisores e sincronizar hooks Staff/CCO

## Diagnostico

Encontrei **dois problemas** que causam a divergencia:

### Problema 1: Hook Staff desatualizado (causa principal)

O `useViagemOperacaoStaff.ts` (usado pelos supervisores/operadores no app mobile) **nao recebeu as correcoes** aplicadas ao `useViagemOperacao.ts` (usado pelo CCO):

| Funcao | CCO (corrigido) | Staff (BUG) |
|--------|-----------------|-------------|
| `registrarChegada` | Verifica `jaTemChegada` e grava em `h_retorno` na segunda chegada | Sempre sobrescreve `h_chegada`, perde a chegada original |
| `marcarRetorno` | Grava `h_retorno` (preserva `h_chegada`) | Sobrescreve `h_chegada` com hora do retorno |

Quando um supervisor encerra uma viagem shuttle pelo app mobile:
1. `marcarRetorno` sobrescreve `h_chegada` (em vez de gravar `h_retorno`)
2. `registrarChegada` sobrescreve `h_chegada` novamente
3. Os campos ficam inconsistentes, e os calculos de "ativa vs finalizada" podem divergir entre interfaces

### Problema 2: Throttle de realtime causa atraso na propagacao

O sistema de throttle tem um modo "burst" que, quando 3+ atualizacoes ocorrem em 10 segundos, aumenta o intervalo de refetch para **10 segundos durante 30 segundos**. Em operacao intensa com muitos shuttles, isso causa atrasos significativos na propagacao de status entre usuarios.

## Solucao

### 1. Sincronizar `useViagemOperacaoStaff.registrarChegada()` com a logica do CCO

**Arquivo:** `src/hooks/useViagemOperacaoStaff.ts`

Adicionar a mesma verificacao `jaTemChegada` que existe no hook CCO:

```typescript
const registrarChegada = useCallback(async (viagem, qtdPax, aguardarRetorno, observacao) => {
  const jaTemChegada = !!viagem.h_chegada;

  const { error } = await supabase
    .from('viagens')
    .update({
      status: novoStatus,
      ...(jaTemChegada
        ? { h_retorno: horaChegada }
        : { h_chegada: horaChegada }),
      h_fim_real: novoStatus === 'encerrado' ? now.toISOString() : null,
      // ...demais campos
    })
    .eq('id', viagem.id);
});
```

### 2. Corrigir `useViagemOperacaoStaff.marcarRetorno()` para gravar `h_retorno`

**Arquivo:** `src/hooks/useViagemOperacaoStaff.ts`

Alterar de `h_chegada` para `h_retorno`:

```typescript
// De:
h_chegada: now.toTimeString().slice(0, 8),
// Para:
h_retorno: now.toTimeString().slice(0, 8),
```

### 3. Reduzir throttle para atualizacoes de status

**Arquivo:** `src/lib/utils/refetchThrottle.ts`

Reduzir o intervalo base de 5s para 3s e o intervalo burst de 10s para 5s, para que mudancas de status propaguem mais rapido entre usuarios:

```typescript
const DEFAULT_INTERVAL_MS = 3000;
const BURST_INTERVAL_MS = 5000;
const BURST_BOOST_DURATION_MS = 15000; // reduzir de 30s para 15s
```

## Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useViagemOperacaoStaff.ts` | Adicionar `jaTemChegada` no `registrarChegada`, corrigir `marcarRetorno` para gravar `h_retorno` |
| `src/lib/utils/refetchThrottle.ts` | Reduzir intervalos de throttle para propagacao mais rapida |

## Dados existentes

As viagens ja finalizadas com dados inconsistentes (h_chegada sobrescrito) nao serao corrigidas automaticamente. Apenas novas operacoes passam a funcionar corretamente.

