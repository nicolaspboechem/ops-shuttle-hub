

# Desativar Auto-Checkout e Usar created_at para Filtros

## Problema

A Edge Function `auto-checkout` dispara 3 horas antes do horario configurado. A causa raiz: na linha 22, `serverTime.getHours()` retorna horas UTC no runtime Deno, nao horas de Sao Paulo. Quando sao 04:50 em SP, Deno le 07:50 UTC, e a funcao dispara as 01:50 SP.

## Decisao do Usuario

Desativar o auto-checkout completamente. O historico de veiculos ja usa `created_at` das acoes reais (vinculacao/desvinculacao) como filtro de data -- isso e suficiente e mais confiavel.

## Alteracoes

### 1. Remover o cron job do banco de dados

Executar SQL para remover o job que chama a funcao a cada 15 minutos:

```text
SELECT cron.unschedule(2);
```

O job ID 2 e o que dispara `auto-checkout` a cada 15 minutos.

### 2. Desativar a Edge Function `auto-checkout`

Reescrever o `index.ts` para retornar uma resposta indicando que a funcao esta desativada, sem executar nenhuma logica. Isso evita erros caso alguma chamada manual ainda aconteca.

A funcao passara a retornar: `{ "message": "Auto-checkout desativado", "disabled": true }`

### 3. Nenhuma alteracao no frontend

O hook `useVeiculoPresencaHistorico` ja filtra por `created_at` das acoes de vinculacao/desvinculacao -- nao depende do auto-checkout. Os filtros de data continuam funcionando normalmente baseados nos timestamps reais das acoes.

## Impacto

| Item | Antes | Depois |
|------|-------|--------|
| Viagens abertas na virada | Fechadas automaticamente | Permanecem abertas ate acao manual |
| Missoes pendentes na virada | Canceladas automaticamente | Permanecem no status atual |
| Presenca sem checkout | Auto-checkout registrado | Permanece aberta ate checkout manual |
| Desvinculacao de veiculos | Automatica na virada | Apenas por acao manual (checkout, supervisor, troca) |
| Historico de uso de veiculos | Continha registros de "Auto-checkout" | Apenas acoes reais |

## Arquivos Alterados

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/auto-checkout/index.ts` | Substituir logica por resposta de "desativado" |
| Banco de dados (cron job) | Remover o agendamento via SQL |

