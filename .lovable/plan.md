

# Virada Operacional Completa: Fechar Tudo ao Encerrar o Dia

## Problema Atual

Existem duas edge functions separadas que cobrem partes do processo, mas com lacunas:

| Funcao | O que faz | Lacuna |
|--------|-----------|--------|
| `auto-checkout` | Checkout de motoristas + desvinculacao de veiculos | So processa eventos com `habilitar_missoes = true`. Nao fecha viagens. |
| `close-open-trips` | Fecha viagens abertas de dias anteriores | Usa meia-noite fixa como corte, ignora `horario_virada_dia` de cada evento. Nao faz checkout. |

## Solucao: Unificar em uma unica Edge Function

Consolidar toda a logica de virada operacional na edge function `auto-checkout`, tornando-a a unica responsavel pela virada completa. A `close-open-trips` sera mantida como fallback de seguranca (apenas para viagens orfas de dias muito antigos).

### Nova logica do `auto-checkout`

Para cada evento ativo (removendo filtro `habilitar_missoes = true`):

```text
1. Calcular se estamos na janela de virada (0-15 min apos horario_virada_dia)
2. Calcular a data operacional que acabou de encerrar (dataOntem)
3. ETAPA A - Fechar viagens abertas do dia operacional encerrado:
   - Buscar viagens com encerrado = false
   - Filtrar por data_criacao dentro dos limites do dia operacional (dataOntem)
   - Atualizar para encerrado = true, status = 'encerrado'
4. ETAPA B - Cancelar missoes ativas do dia anterior:
   - Buscar missoes com status aceita/em_andamento e data_programada = dataOntem
   - Atualizar para status = 'cancelada'
5. ETAPA C - Checkout automatico (logica existente):
   - Buscar presencas abertas do dia operacional encerrado
   - Registrar checkout_at
   - Definir motorista.status = 'indisponivel'
   - Desvinculacao bidirecional de veiculos (motorista.veiculo_id = null, veiculo.motorista_id = null)
```

### Alteracoes na `close-open-trips`

Ajustar para respeitar o `horario_virada_dia` de cada evento em vez de usar meia-noite fixa. Ela servira como rede de seguranca para viagens que possam ter escapado.

## Detalhes Tecnicos

### Arquivo: `supabase/functions/auto-checkout/index.ts`

Alteracoes:
- Remover filtro `.eq("habilitar_missoes", true)` -- processar TODOS os eventos ativos
- Adicionar ETAPA A: fechar viagens abertas cujo `data_criacao` esta dentro do dia operacional encerrado (usando limites calculados com `horario_virada_dia`)
- Adicionar ETAPA B: cancelar missoes fantasma do dia encerrado
- Manter ETAPA C (checkout + desvinculacao bidirecional) como esta

Calculo dos limites do dia operacional encerrado:

```text
// dataOntem = data operacional que acabou
// virada = horario_virada_dia do evento (ex: "03:00")
// Limites do dia operacional "dataOntem":
//   inicio = dataOntem + virada (ex: 2025-02-14T03:00:00-03:00)
//   fim    = dataOntem+1dia + virada - 1ms (ex: 2025-02-15T02:59:59.999-03:00)

// Fechar viagens onde data_criacao >= inicio AND data_criacao <= fim AND encerrado = false
```

### Arquivo: `supabase/functions/close-open-trips/index.ts`

Alteracao: tornar event-aware, iterando por cada evento ativo e usando `horario_virada_dia` para calcular os limites corretos em vez de meia-noite fixa. Manter como fallback que roda no mesmo cron de 15 minutos.

### Nenhuma alteracao de cron necessaria

Ambas as functions ja rodam a cada 15 minutos. A logica de janela de 15 minutos no `auto-checkout` garante que so executa uma vez por virada.

## Resultado

- Na virada do dia operacional (definida por `horario_virada_dia` de cada evento):
  - Todas as viagens abertas daquele dia sao encerradas automaticamente
  - Todas as missoes ativas (aceita/em_andamento) daquele dia sao canceladas
  - Todos os motoristas com presenca aberta recebem checkout automatico
  - Todos os veiculos vinculados sao desvinculados bidirecionalmente
- Funciona para TODOS os eventos ativos, independente de `habilitar_missoes`
- Cada evento pode ter seu proprio horario de virada

