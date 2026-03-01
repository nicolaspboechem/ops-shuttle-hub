

# Remover card combustivel e melhorar KPI de rotas

## Mudancas

### 1. Remover card "Combustivel da Frota" do app cliente

**Arquivo:** `src/components/app/ClienteDashboardTab.tsx`

- Remover o bloco do card de combustivel (linhas 281-315)
- Remover variaveis nao mais usadas: `combustivelFrota`, `FUEL_ORDER`, `FUEL_COLORS`
- Remover import do icone `Fuel`

### 2. Corrigir "Top Rotas" no app cliente para exibir Origem + Destino

**Arquivo:** `src/components/app/ClienteDashboardTab.tsx`

O `topRotas` (linha 167-186) agrupa apenas por `ponto_embarque`. Sera atualizado para usar `ponto_embarque + " > " + ponto_desembarque` como chave, formando a rota completa.

O card "Top Rota" (linha 468-481) e a lista "Top Rotas" (linhas 427-449) tambem serao atualizados para exibir a rota completa (origem > destino).

O `rotaMaisUsada` (linha 124-133) tambem agrupa so por `ponto_embarque` -- sera corrigido da mesma forma.

### 3. Corrigir RoutePerformanceChart (grafico usado no CCO e app cliente)

**Arquivo:** `src/components/dashboard/RoutePerformanceChart.tsx`

O grafico agrupa por `v.ponto_embarque` (linha 24). Sera atualizado para usar `ponto_embarque + " > " + ponto_desembarque` como chave da rota. O tooltip ja mostra `rotaCompleta`, entao continuara funcionando. O eixo Y truncara nomes longos para caber.

### Formato da rota completa

```
"Hotel Fasano > Aeroporto GIG"
```

Quando `ponto_desembarque` for `null` ou vazio, exibir apenas o `ponto_embarque` (comportamento atual como fallback).

## Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/app/ClienteDashboardTab.tsx` | Remover card combustivel, corrigir topRotas e rotaMaisUsada para usar origem+destino |
| `src/components/dashboard/RoutePerformanceChart.tsx` | Agrupar por origem+destino em vez de so origem |

