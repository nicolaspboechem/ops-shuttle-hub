

## Plano: Corrigir PAX em Trânsito no Dashboard CCO + melhorias no Cliente

### ✅ Concluído

**1. `src/pages/Dashboard.tsx` — PAX em Trânsito corrigido**
- Substituído filtro incorreto (`!v.h_retorno` incluía todos os shuttles) por `viagensAtivas.reduce()`
- Agora mostra apenas PAX de viagens realmente em andamento

**2. `src/components/app/ClientePainelTab.tsx` — Filtro de rotas ativas**
- Adicionado `rotaEstaAtiva()` para esconder rotas fora do horário de operação
- Mensagem de empty state atualizada

**3. `src/hooks/useViagensPublicas.ts` — Dia operacional corrigido**
- Usa `getDataOperacional()` com `horarioVirada` em vez de meia-noite simples
- Aceita parâmetro `horarioVirada` opcional

**4. `src/hooks/useViagens.ts` — Sincronização entre operadores corrigida**
- Adicionado listener `visibilitychange` em `useViagens` e `useViagensPorMotorista`
- Polling reduzido de 120s para 60s
- Viagens encerradas por outro operador agora atualizam instantaneamente ao voltar ao app
