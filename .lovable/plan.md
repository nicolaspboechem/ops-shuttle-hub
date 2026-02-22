
# Corrigir bug de turnos com duracao impossivel (114h)

## Problema raiz

O registro do Cassio em 11/02 tem:
- `checkin_at`: 2026-02-11 19:46
- `checkout_at`: 2026-02-16 14:02 (5 dias depois!)

Isso resulta em 114h calculadas para um unico turno. Ha tambem um segundo registro problematico:
- data 14/02, checkin 15/02 07:58, checkout 16/02 14:02 (~30h)

Ambos parecem ser registros orfaos que receberam checkout tardio em massa.

## Correcao em 2 partes

### Parte 1: Validacao no calculo (codigo)

**Arquivo: `src/hooks/useMotoristaPresencaHistorico.ts`**

Adicionar constante de duracao maxima razoavel:
```
const DURACAO_MAXIMA_TURNO_MINUTOS = 1440; // 24h - limite de sanidade
```

No loop de calculo (linhas 111-123), apos calcular `duracaoMin`, verificar se excede 24h:
- Se `duracaoMin > 1440`: marcar como turno **anomalo**
  - NAO somar nas horas trabalhadas
  - NAO somar no saldo
  - Incrementar novo contador `turnosAnomalos`
- Se `duracaoMin <= 1440`: comportamento normal (turno completo)

Adicionar campo `turnosAnomalos: number` na interface `MotoristaPresencaAgregado`.

Na secao de estatisticas gerais, aplicar a mesma validacao.

**Arquivo: `src/components/motoristas/MotoristaAuditoriaCard.tsx`**

No card expandido (detalhamento dia a dia):
- Para turnos com duracao > 24h: exibir badge **"ANOMALIA"** em vermelho/roxo
- Mostrar a duracao calculada mas com indicador visual claro de que esta fora do padrao
- NAO incluir na soma do card fechado

No card fechado:
- Se houver `turnosAnomalos > 0`, exibir contador como alerta adicional

**Arquivo: `src/components/motoristas/MotoristasAuditoria.tsx`**

- Adicionar metrica global de turnos anomalos nas estatisticas do topo

### Parte 2: Limpeza dos dados (SQL)

Os 2 registros problematicos do Cassio precisam ser corrigidos manualmente. Apresentarei a query SQL separadamente para execucao no Cloud View, pois o plano proibe alteracao de dados pelo codigo.

Registros a corrigir:
1. ID `3e3a5fdc` (data 11/02): checkout em 16/02 -- setar `checkout_at = NULL` e `observacao_checkout = 'Checkout removido - registro orfao fechado incorretamente'`
2. ID `877c1ecd` (data 14/02, checkin 15/02): registro duplicado/orfao -- setar `checkout_at = NULL` e `observacao_checkout = 'Checkout removido - registro orfao fechado incorretamente'`

## Ordem de execucao

1. Alterar `useMotoristaPresencaHistorico.ts` -- adicionar validacao de duracao maxima e campo `turnosAnomalos`
2. Alterar `MotoristaAuditoriaCard.tsx` -- badge de anomalia e exclusao da soma
3. Alterar `MotoristasAuditoria.tsx` -- metrica global de anomalias
4. Fornecer SQL de limpeza para execucao manual

## Resultado esperado

- Turnos com duracao > 24h sao sinalizados como anomalias e NUNCA somados
- O total de horas do Cassio reflete apenas os turnos reais (~12h cada)
- Os registros orfaos sao limpos no banco
- Qualquer novo registro orfao que receba checkout tardio sera automaticamente detectado
