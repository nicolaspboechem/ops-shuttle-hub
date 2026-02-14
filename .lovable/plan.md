

# Otimizacao de Performance -- Reducao de Requisicoes e Carga no Supabase

## Diagnostico: Por que o sistema esta lento

### Problema Central: Cascata de Refetch por Shuttle

Cada registro de shuttle insere uma linha na tabela `viagens`. Essa insercao dispara eventos Realtime que ativam **multiplos hooks simultaneamente**, cada um fazendo suas proprias queries. Com operadores registrando shuttles a cada poucos minutos, o sistema entra em cascata.

### Mapeamento de Canais Realtime por Pagina

**Dashboard (pagina principal do CCO)** -- 5 canais + 6 hooks:

```text
Hook                      Canal Realtime              Queries por trigger
---------------------------------------------------------------------------
useViagens                viagens (evento_id)         1 query (viagens + JOIN veiculos)
useAlertasFrota           alertas_frota (evento_id)   1 query (alertas + 3 JOINs)
useMotoristasDashboard    presenca + missoes           2 queries em paralelo
useEventos                eventos (global!)            1 query (todos os eventos)
NotificationsProvider     viagem_logs + presenca +     4 queries em paralelo
                          vistoria + alertas_frota
useCadastros (veiculos)   nenhum                       1 query (veiculos + JOINs)
useCadastros (motoristas) nenhum                       1 query (motoristas)
```

**Total**: 1 insert de shuttle = ate **11 queries** disparadas em 3-5 segundos

**Pagina Localizador** -- 3 canais adicionais:
- motoristas, viagens, motorista_presenca -- cada mudanca dispara 3 queries

### Problemas Especificos Identificados

1. **NotificationsProvider**: Faz 4 queries simultaneas (viagem_logs, presenca, vistoria, alertas) a cada evento Realtime. Shuttle dispara isso porque escuta `viagem_logs` sem filtro de `evento_id`.

2. **useEventos**: Escuta mudancas na tabela `eventos` **sem filtro** -- qualquer trigger `update_evento_stats` (que roda a cada insert/update de viagem) dispara refetch.

3. **Dados duplicados**: `useMotoristasDashboard` busca missoes separadamente enquanto `useMissoes` busca as mesmas missoes na mesma pagina.

4. **useLocalizadorMotoristas e useLocalizadorVeiculos**: Ambos buscam `viagens` em paralelo, duplicando a query.

5. **Sem staleTime nos hooks manuais**: Cada hook faz fetch independente sem cache compartilhado -- mesmos dados buscados multiplas vezes.

---

## Plano de Otimizacao (5 acoes)

### 1. Filtrar Shuttle do NotificationsProvider

**Arquivo:** `src/hooks/useNotifications.tsx`

O NotificationsProvider ja filtra shuttle no render (`filter(log => log.viagem?.motorista !== 'Shuttle')`), mas ainda **busca** os dados do banco. Alem disso, escuta `viagem_logs` INSERT sem filtro de evento.

Mudancas:
- Adicionar `.neq('tipo_operacao', 'shuttle')` na query de viagem_logs (via JOIN filter) -- nao e possivel direto, entao filtrar no `.not()` ou aceitar o filtro client-side
- O principal problema e que o canal Realtime para `viagem_logs` nao tem filtro de `evento_id` (viagem_logs nao tem essa coluna diretamente). Adicionar **throttle mais agressivo** de 10s em vez de 5s para notificacoes, ja que sao informativas e nao operacionais
- Reduzir o `.limit()` de 30 para 20 nos viagem_logs

### 2. Parar de refetch useEventos a cada insert de viagem

**Arquivo:** `src/hooks/useEventos.ts`

O trigger `update_evento_stats` atualiza a tabela `eventos` a cada insert/update na tabela `viagens`. Isso faz o canal Realtime de `useEventos` disparar. Como o hook busca `SELECT *` de todos os eventos, isso e desnecessario para a operacao.

Mudancas:
- Remover a subscription Realtime de `useEventos` -- os dados de evento raramente mudam durante a operacao
- Manter apenas o polling de 5 minutos como fallback
- Alternativa: filtrar o Realtime para apenas `INSERT` e `DELETE` (ignorar `UPDATE`, que e o trigger de stats)

### 3. Consolidar queries duplicadas com cache compartilhado

**Arquivo:** `src/hooks/useMotoristasDashboard.ts`

Este hook busca `missoes` separadamente, mas na pagina Dashboard o `useMissoes` pode ja estar montado (se o usuario navegou para Motoristas antes). 

Mudancas:
- Converter `useMotoristasDashboard` para receber dados de missoes como prop/parametro em vez de buscar independentemente
- Na pagina Dashboard, o hook `useMissoes` ja esta carregado (se missoes habilitadas) -- passar `missoesAtivas` como parametro
- Se missoes nao estao carregadas, fazer a query como fallback

### 4. Aumentar throttle global e debounce para operacao shuttle

**Arquivo:** `src/lib/utils/refetchThrottle.ts`

O throttle atual e de 3 segundos. Durante pico de shuttle (multiplos operadores registrando simultaneamente), isso ainda permite muitas requisicoes.

Mudancas:
- Aumentar o DEFAULT_INTERVAL_MS de 3000 para 5000 (5 segundos)
- Adicionar um "burst limiter" que detecta mais de 3 triggers em 10 segundos e aumenta automaticamente o intervalo para 10 segundos por 30 segundos

### 5. Desativar Realtime para tabelas menos criticas em paginas pesadas

**Arquivo:** `src/hooks/useCadastros.ts`

Os hooks `useMotoristas` e `useVeiculos` nao tem Realtime (bom), mas tambem nao tem cache -- cada pagina que os monta faz uma nova query. Quando o usuario navega entre Dashboard, Motoristas, Veiculos, os mesmos dados sao buscados repetidamente.

Mudancas:
- Adicionar `staleTime` de 60 segundos usando um ref de timestamp -- se os dados foram buscados ha menos de 60s, retornar o cache
- Isso evita re-fetch ao navegar entre paginas

---

## Resumo de Impacto Esperado

```text
Antes (1 shuttle insert):
  11 queries em ~5s, 5 canais Realtime ativos

Depois:
  3-4 queries em ~5s, 4 canais Realtime (eventos removido)
  Throttle de 5s em vez de 3s
  Notificacoes com throttle de 10s
  Cache de 60s para cadastros
```

**Reducao estimada: ~60% menos queries por evento Realtime**

## Arquivos Alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useNotifications.tsx` | Throttle 10s, limit 20 |
| `src/hooks/useEventos.ts` | Remover Realtime, manter polling |
| `src/hooks/useMotoristasDashboard.ts` | Receber missoes como parametro opcional |
| `src/pages/Dashboard.tsx` | Passar missoesAtivas ao dashboard hook |
| `src/lib/utils/refetchThrottle.ts` | Aumentar intervalo para 5s, adicionar burst detection |
| `src/hooks/useCadastros.ts` | Cache com staleTime de 60s |

