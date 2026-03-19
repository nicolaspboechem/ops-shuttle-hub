

## Auditoria de Performance e Custos — Supabase

### Estado Atual

O sistema já está **bem otimizado**. Aqui está o resumo:

#### O que já está correto
- **Throttle global** (`refetchThrottle.ts`): 3s padrão, 5s em burst — impede cascata de refetches
- **Realtime filtrado por `evento_id`** em quase todos os hooks (viagens, presença, missões, alertas, veículos)
- **Cache por sessão** no `useViagensAuditoria` — abas históricas não fazem polling nem realtime
- **Paginação automática** (blocos de 1000) para datasets grandes
- **`useViagensPorMotorista`** filtra por `motorista_id` no Realtime — evita refetch cruzado
- **Canais consolidados** em `Motoristas.tsx` e `Home.tsx` — múltiplas tabelas num só canal
- **`useMotoristasDashboard`** aceita `missoesExternas` para evitar queries duplicadas
- **`select` minimalista** em queries de contagem (ex: `select('motorista_id')` em presença)

#### Problemas encontrados (3 itens)

1. **`useNotifications` — throttle de 10s + polling de 120s**
   - O throttle local é de 10s (deveria ser 3s como os demais hooks)
   - Polling fallback de 120s pode ser reduzido para 60s
   - Falta listener de `visibilitychange` para sync imediato ao voltar ao app

2. **`LogsPanel` — sem throttle, sem filtro de evento**
   - O listener Realtime em `viagem_logs` não tem throttle nem filtro por evento
   - Cada INSERT em qualquer evento dispara `fetchLogs()` com query pesada (JOIN + filtro client-side)
   - Deveria filtrar server-side pelo `evento_id` da viagem (não é possível direto no Realtime para FKs, mas pode usar throttle)

3. **`useLocalizadorMotoristas` — query extra ao evento**
   - Faz uma query separada ao `eventos` para pegar `horario_virada_dia`, quando esse dado geralmente já está disponível no contexto do evento

### Plano de Otimização

#### 1. Otimizar `useNotifications` (throttle 10s → 3s, polling 120s → 60s, visibilitychange)
- Arquivo: `src/hooks/useNotifications.tsx`
- Reduzir throttle de `10000` para `3000` (linhas 391, 399)
- Reduzir polling de `120000` para `60000` (linha 422)
- Adicionar listener `visibilitychange` que força fetch imediato ao voltar à aba

#### 2. Otimizar `LogsPanel` (adicionar throttle)
- Arquivo: `src/components/operacao/LogsPanel.tsx`
- Importar `createThrottledRefetch` e `clearThrottleKey`
- Aplicar throttle de 3s no callback do Realtime
- Sem filtro possível no Realtime para `viagem_logs` (FK indireto), mas o throttle elimina refetches desnecessários

#### 3. Nenhuma mudança de banco necessária
- Servidor já está em São Paulo
- Timezone já está correto
- Não há queries redundantes significativas além dos 2 itens acima

### Impacto Estimado
- **Notificações**: latência percebida cai de ~10s para ~3s
- **LogsPanel**: queries reduzidas de N/segundo (burst) para 1 a cada 3s
- **Custo Supabase**: redução marginal — o sistema já é eficiente

