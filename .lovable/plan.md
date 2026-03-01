

# Corrigir cobertura de timestamps no ciclo de vida das viagens

## Diagnostico

Analisando o fluxo completo (useViagemOperacao.ts, useViagens.ts, ViagensTable.tsx, calculadores.ts), identifiquei as seguintes lacunas:

### O que funciona
- **Inicio**: `h_pickup` (HH:mm) + `h_inicio_real` (ISO timestamp) -- gravados por `iniciarViagem()`
- **Encerramento**: `h_fim_real` (ISO timestamp) -- gravado por `encerrarViagem()` e `registrarChegada()` quando encerra

### Problemas encontrados

1. **`h_retorno` nunca e preenchido programaticamente**
   - O campo existe no banco e na tabela visual, mas nenhuma funcao operacional o preenche
   - `marcarRetorno()` (shuttle) grava o horario de chegada ao destino em `h_chegada`, mas nao grava `h_retorno`
   - Quando o shuttle volta e `registrarChegada()` e chamado novamente, ele sobrescreve `h_chegada` com o novo horario, perdendo o horario da chegada original

2. **Shuttle perde horario da primeira chegada**
   - Fluxo atual: Inicio (h_pickup) -> Chegou destino (h_chegada) -> marcarRetorno (h_chegada sobrescrito) -> Chegou base (h_chegada sobrescrito novamente)
   - Resultado: h_chegada final contem o horario de volta a base, nao o da chegada ao destino

3. **Coluna "Retorno" na ViagensTable sempre vazia**
   - Para viagens operacionais, `h_retorno` nunca e populado
   - So aparece se preenchido manualmente via EditViagemModal

4. **Calculo de tempo distorcido para shuttles com retorno**
   - `calcularTempoViagem(h_pickup, h_chegada)` calcula tempo total (incluindo retorno) em vez de tempo de ida

## Solucao proposta

### 1. Gravar `h_retorno` no `marcarRetorno()` e no `encerrarViagem()`

**Arquivo:** `src/hooks/useViagemOperacao.ts`

No `marcarRetorno()` (linha 391-428): antes de sobrescrever `h_chegada`, guardar o horario atual como `h_retorno` (horario em que iniciou o retorno).

Alterar de:
```typescript
h_chegada: now.toTimeString().slice(0, 8),
```

Para:
```typescript
h_retorno: now.toTimeString().slice(0, 8),
// manter h_chegada inalterado (horario que chegou ao destino)
```

Isso preserva `h_chegada` (chegada ao destino) e preenche `h_retorno` (inicio do retorno).

### 2. Gravar `h_retorno` no encerramento de viagens que estavam em retorno

No `registrarChegada()`: quando a viagem esta retornando (viagem_pai_id === viagem.id ou shuttle completando retorno), gravar `h_retorno` com o horario de conclusao.

Logica:
- Se a viagem ja tem `h_chegada` e esta encerrando, gravar o horario atual em `h_retorno` (chegou de volta)
- Nao sobrescrever `h_chegada` nesse caso

### 3. Atualizar `registrarChegada()` para nao sobrescrever `h_chegada` em retornos

**Arquivo:** `src/hooks/useViagemOperacao.ts`

Na funcao `registrarChegada()` (linha 164-225):
- Verificar se a viagem ja tem `h_chegada` preenchido (indica que e a segunda chegada / retorno)
- Se sim, gravar o horario atual em `h_retorno` em vez de `h_chegada`

```typescript
const jaTemChegada = !!viagem.h_chegada;
const updateData = {
  status: novoStatus,
  h_fim_real: novoStatus === 'encerrado' ? now.toISOString() : null,
  ...(jaTemChegada
    ? { h_retorno: horaChegada }           // Segunda chegada -> retorno
    : { h_chegada: horaChegada }),          // Primeira chegada -> destino
  // ... demais campos
};
```

### 4. Corrigir calculo de tempo na tabela

**Arquivo:** `src/components/viagens/ViagensTable.tsx`

Atualizar o calculo de `tempoViagem` para considerar o ciclo completo:

```typescript
// Tempo total: pickup ate retorno (se existir) ou ate chegada
const tempoViagem = viagem.h_retorno
  ? calcularTempoViagem(viagem.h_pickup, viagem.h_retorno)
  : viagem.h_chegada
    ? calcularTempoViagem(viagem.h_pickup, viagem.h_chegada)
    : null;
```

Isso mostra o tempo total da operacao (ida + retorno) quando h_retorno existe.

### 5. Exibir tempos separados no tooltip ou detalhe

Opcional mas recomendado: no `EditViagemModal`, os calculos de tempoIda e tempoRetorno ja funcionam corretamente pois usam `h_pickup->h_chegada` e `h_chegada->h_retorno`. Com os dados corretos agora sendo gravados, esses calculos passam a exibir valores reais.

## Resumo do ciclo de vida corrigido

### Transfer / Missao
```
Inicio        -> h_pickup + h_inicio_real
Chegada       -> h_chegada
Encerramento  -> h_fim_real
(h_retorno nao se aplica -- retorno gera nova viagem via iniciarRetorno)
```

### Shuttle (ida e volta no mesmo registro)
```
Inicio        -> h_pickup + h_inicio_real
Chegada dest. -> h_chegada (preservado)
Marca retorno -> h_retorno nao muda (retorno começa)
Chegada base  -> h_retorno (hora que voltou) + h_fim_real
Encerramento  -> h_fim_real
```

## Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useViagemOperacao.ts` | Corrigir `marcarRetorno()` para gravar `h_retorno` e nao sobrescrever `h_chegada`; corrigir `registrarChegada()` para detectar segunda chegada |
| `src/components/viagens/ViagensTable.tsx` | Usar `h_retorno` no calculo de tempo total quando disponivel |

## Dados existentes

Viagens ja encerradas nao serao afetadas (dados historicos permanecem como estao). Apenas novas operacoes passam a gravar os timestamps corretamente.

