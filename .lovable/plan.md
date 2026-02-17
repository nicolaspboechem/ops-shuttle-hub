
# Corrigir Ciclos Orfaos de Veiculos - Backend + Frontend

## Diagnostico

- **71 vinculacoes orfas** de dias anteriores (sem desvinculacao correspondente)
- **24 vinculacoes orfas** de hoje (normais, veiculos em uso)
- **Bug de fuso horario** no `close-open-trips`: mesma causa do auto-checkout. `serverTime.getHours()` retorna UTC, nao SP. A funcao `get_server_time` retorna `2026-02-17T12:40:47-03:00`, mas `new Date(str).getHours()` converte para UTC (15h), nao SP (12h). Resultado: o dia operacional e calculado errado.

## Solucao em 3 Partes

### Parte 1: Corrigir fuso horario no `close-open-trips`

Extrair hora/minuto diretamente da string retornada por `get_server_time` (parse manual dos caracteres, sem depender de `Date.getHours()`). O formato e fixo: `YYYY-MM-DDTHH:MI:SS.MS-03:00`.

```text
const horaAtual = parseInt(serverTimeData.substring(11, 13))
const minAtual  = parseInt(serverTimeData.substring(14, 16))
const dataHoje  = serverTimeData.substring(0, 10)
```

Isso ja resolve o calculo de `dataOpAtual` e `dataOpHoje` para todos os blocos.

### Parte 2: Novo bloco na Edge Function - fechar vinculacoes orfas

Adicionar um **Bloco 4** no `close-open-trips` que:

1. Busca todas as vinculacoes sem desvinculacao correspondente de dias anteriores ao dia operacional atual
2. Para cada vinculacao orfa, determina o timestamp de fechamento usando (em ordem de prioridade):
   - A proxima vinculacao no mesmo veiculo (troca de motorista)
   - A ultima viagem encerrada (`h_fim_real`) do motorista naquele veiculo apos a vinculacao
   - O `checkout_at` da presenca do motorista apos a vinculacao
   - Se nenhum dado disponivel: usa o inicio do dia operacional seguinte ao da vinculacao (virada)
3. Insere um registro de `desvinculacao` no `veiculo_vistoria_historico` com o timestamp calculado e observacao "Desvinculacao retroativa (correcao automatica)"

Essa logica roda a cada execucao do cron, garantindo que novas orfas sejam corrigidas automaticamente.

### Parte 3: Frontend - fechamento implicito no hook

No `useVeiculoPresencaHistorico.ts`, quando uma vinculacao e seguida por outra vinculacao (sem desvinculacao entre elas):

- Fechar o ciclo anterior usando o timestamp da proxima vinculacao como `desvinculado_em`
- Marcar `desvinculado_por` como "(troca de motorista)"
- Calcular duracao normalmente
- Nao marcar como `em_uso`

Isso garante que mesmo antes da Edge Function rodar, o frontend ja exibe os ciclos corretamente.

## Detalhes Tecnicos

### Arquivo: `supabase/functions/close-open-trips/index.ts`

**Fix do fuso**: Substituir todas as ocorrencias de `serverTime.getHours()` e `serverTime.getMinutes()` por parse direto da string `serverTimeData`. Aplicar em todos os 3 blocos existentes (viagens, desvinculacao, orfas).

**Novo Bloco 4**: Query SQL com window function para identificar vinculacoes orfas:

```text
Para cada evento ativo:
1. SELECT vinculacoes WHERE tipo_vistoria = 'vinculacao'
   AND NOT EXISTS (desvinculacao subsequente antes da proxima vinculacao)
   AND created_at < inicio do dia operacional atual
   
2. Para cada orfa:
   - Buscar proxima vinculacao no mesmo veiculo -> usar como timestamp
   - OU buscar ultima viagem (h_fim_real) do motorista+veiculo
   - OU buscar checkout_at do motorista
   - OU usar virada do dia da vinculacao
   
3. INSERT desvinculacao com timestamp calculado
```

### Arquivo: `src/hooks/useVeiculoPresencaHistorico.ts`

No loop de pareamento (linhas 109-154), quando `cicloAberto` existe e chega nova vinculacao:

Em vez de criar registro com `em_uso: true` e `duracao_minutos: 0`, fechar o ciclo:
- `desvinculado_em` = nova vinculacao `.created_at`
- `duracao_minutos` = diferenca calculada
- `desvinculado_por` = "(troca de motorista)"
- `em_uso` = false

O unico caso de `em_uso: true` sera o ultimo ciclo aberto de **hoje**.

## Arquivos Alterados

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/close-open-trips/index.ts` | Fix UTC + Bloco 4 (fechar orfas retroativamente) |
| `src/hooks/useVeiculoPresencaHistorico.ts` | Fechamento implicito de ciclos consecutivos |

## Ordem de Implementacao

1. **Frontend** (`useVeiculoPresencaHistorico.ts`) - correcao visual imediata
2. **Edge Function** (`close-open-trips`) - fix UTC + bloco de limpeza retroativa
3. **Deploy e teste manual** - chamar `close-open-trips` para processar as 71 orfas
