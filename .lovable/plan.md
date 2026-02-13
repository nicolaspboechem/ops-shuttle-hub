
# Otimizar Painel CCO para Alta Utilizacao - Prevenir Crashes

## Diagnostico

Quando o painel CCO esta sob uso intenso (muitos motoristas ativos, viagens sendo criadas, missoes mudando), o sistema sofre de **cascata de refetches** que sobrecarrega tanto o Supabase quanto o navegador:

### Canais Realtime simultaneos no CCO (por pagina)

Quando um operador esta na pagina **Motoristas**, por exemplo, os seguintes canais Realtime estao ativos ao mesmo tempo:

1. `motoristas-status-{eventoId}` - tabela `motoristas` (Motoristas.tsx)
2. `viagens-changes-{eventoId}` - tabela `viagens` (useViagens)
3. `eventos-changes` - tabela `eventos` (useEventos)
4. `shared-notifications-all` - 4 tabelas SEM filtro de evento (useNotifications)
5. `alertas-frota-{eventoId}` - tabela `alertas_frota` (useAlertasFrota)

Total: **5 canais, ~8 subscriptions** em tabelas diferentes

### O problema principal: Notifications sem filtro

O canal `shared-notifications-all` escuta **todas** as mudancas em `viagem_logs`, `motorista_presenca`, `veiculo_vistoria_historico` e `alertas_frota` de **todos os eventos**. Cada mudanca dispara `fetchNotifications()`, que faz **4 queries sequenciais** a essas tabelas. Com muitos motoristas ativos, isso cria uma tempestade de queries.

### Efeito cascata

Uma unica mudanca de status de motorista dispara:
1. Canal `motoristas-status` -> `refetchMotoristas()` (query completa)
2. Canal `shared-notifications-all` (via `motorista_presenca`) -> `fetchNotifications()` (4 queries)
3. Se Dashboard aberto: Canal `dashboard-motoristas` -> `fetchData()` (2 queries)

Total: **~7 queries** por **1 mudanca** de status

## Solucao

### 1. Filtrar canal de Notifications por evento ativo

No `useNotifications.tsx`, adicionar filtro `evento_id` nas subscriptions Realtime. O hook ja tem acesso ao `eventoId` via contexto ou props. Isso reduz em ~90% os eventos Realtime recebidos.

Mudanca: Adicionar `filter: evento_id=eq.{eventoId}` nas 4 subscriptions do canal `shared-notifications-all`.

### 2. Consolidar canais duplicados

Na pagina Motoristas, os canais `motoristas-status-{eventoId}` e o canal interno do `useViagens` escutam tabelas diferentes mas disparam refetches ao mesmo tempo. Consolidar em um unico canal por pagina.

Mudanca em `Motoristas.tsx`: Remover o canal dedicado `motoristas-status-{eventoId}` e mover a subscription de `motoristas` para dentro do canal existente do `useViagens` (ou criar um canal consolidado unico).

### 3. Aumentar debounce em alta carga

Quando multiplos canais disparam ao mesmo tempo (como em alta utilizacao), os debounces individuais de 2s nao previnem a cascata. Implementar um **global refetch coordinator** simples: um timestamp compartilhado que impede mais de N refetches por intervalo.

Mudanca: Criar um utilitario `src/lib/utils/refetchThrottle.ts` que wrapa as funcoes de refetch com throttle global (maximo 1 refetch por hook a cada 3 segundos).

### 4. Lazy-load do fetchNotifications

O `fetchNotifications` faz 4 queries simultaneas (viagem_logs, presenca, vistorias, alertas) a cada evento Realtime. Mudar para queries incrementais: em vez de refazer tudo, buscar apenas registros novos (com `created_at > lastFetchTime`).

Mudanca em `useNotifications.tsx`: Manter um `lastFetchTime` ref e usar `.gte('created_at', lastFetchTime)` nas queries subsequentes (nao na initial load).

## Resumo das alteracoes

| Arquivo | Mudanca | Impacto |
|---------|---------|---------|
| `src/hooks/useNotifications.tsx` | Filtrar Realtime por evento_id + queries incrementais | -90% eventos Realtime, -80% dados por query |
| `src/pages/Motoristas.tsx` | Remover canal duplicado de motoristas | -1 canal Realtime |
| `src/lib/utils/refetchThrottle.ts` | Novo: throttle global de refetches | Previne cascata |
| `src/hooks/useViagens.ts` | Aplicar throttle global | Reduz queries redundantes |
| `src/hooks/useMotoristasDashboard.ts` | Aplicar throttle global | Reduz queries redundantes |

Resultado esperado: reducao de ~70% nas queries ao Supabase sob alta carga, eliminando os crashes por sobrecarga.
