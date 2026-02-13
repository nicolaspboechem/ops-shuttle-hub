
# Otimizacao de Performance - App Motorista travando com muitas missoes

## Diagnostico

O app do motorista esta sobrecarregando porque cada motorista conectado:

1. **Carrega TODAS as 95 viagens do evento** - mesmo precisando apenas das suas
2. **Carrega TODAS as 153 missoes do evento** (com JOINs) - mesmo precisando apenas das suas
3. **Carrega TODOS os 41 motoristas** - so precisa dos seus dados
4. **3 subscricoes Realtime SEM filtro de motorista** - cada missao criada para qualquer motorista dispara refetch em TODOS os 41 motoristas conectados
5. **Polling de 30s na presenca** + realtime duplicado
6. **fetchPresenca faz 4 queries sequenciais** a cada 30 segundos

### Calculo do impacto

Com 41 motoristas conectados e missoes sendo criadas rapidamente:
- Cada nova missao dispara 41 refetches simultaneos de TODAS as missoes (153 registros com JOINs)
- Cada nova viagem dispara 41 refetches de TODAS as viagens (95 registros com JOINs)
- Polling de presenca: 41 motoristas x 4 queries x cada 30s = ~328 queries/min extras
- **Resultado**: centenas de queries/minuto que congestionam a conexao, especialmente em 4G

## Solucao

### 1. AppMotorista.tsx - Usar hook filtrado por motorista

Em vez de `useMissoes(eventoId)` que carrega TODAS as missoes, usar `useMissoesPorMotorista(eventoId, motoristaId)` que ja existe no codigo e carrega apenas as missoes do motorista logado.

Em vez de `useViagens(eventoId)` que carrega TODAS as viagens, filtrar apenas as do motorista logado.

Remover `useMotoristas(eventoId)` que carrega todos os 41 motoristas - buscar apenas o motorista logado diretamente.

### 2. useMissoes.ts - Filtrar realtime por motorista

No hook `useMissoesPorMotorista`, adicionar filtro no canal Realtime:
```text
filter: `motorista_id=eq.${motoristaId}`
```
Isso evita que cada missao criada para outro motorista dispare refetch.

### 3. useViagens.ts - Criar variante filtrada para motorista

Criar `useViagensPorMotorista(eventoId, motoristaId)` que:
- Filtra `motorista_id=eq.${motoristaId}` na query
- Filtra realtime pelo mesmo motorista_id
- Reduz de 95 viagens para apenas as 2-5 do motorista

### 4. useMotoristaPresenca.ts - Reduzir polling

- Aumentar polling de 30s para 60s (realtime ja cobre a maioria dos casos)
- Combinar as 4 queries sequenciais em menos chamadas

### 5. AppMotorista.tsx - Buscar motorista diretamente

Em vez de carregar todos os 41 motoristas com `useMotoristas(eventoId)` e filtrar, buscar apenas o motorista logado via query direta com `driverSession.motorista_id`.

## Resumo de mudancas

| Arquivo | Mudanca | Impacto |
|---|---|---|
| `src/pages/app/AppMotorista.tsx` | Usar hooks filtrados por motorista em vez de carregar tudo | -90% dados transferidos |
| `src/hooks/useMissoes.ts` | Adicionar filtro realtime em `useMissoesPorMotorista` | -97% eventos realtime processados |
| `src/hooks/useViagens.ts` | Criar `useViagensPorMotorista` com query e realtime filtrados | -95% viagens carregadas |
| `src/hooks/useMotoristaPresenca.ts` | Aumentar polling para 60s | -50% queries de presenca |
| `src/lib/version.ts` | Atualizar para 1.7.4 | - |

## Resultado esperado

- Cada motorista carrega apenas seus proprios dados (2-5 missoes em vez de 153)
- Realtime so dispara quando a missao e para aquele motorista especifico
- Reducao de ~90% no trafego de dados e queries por motorista
- App funcional mesmo em 4G lento
