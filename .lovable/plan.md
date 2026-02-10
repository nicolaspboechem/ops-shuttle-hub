

# Remover todas as referências a PCD do sistema

## Contexto
O campo "PCD" no gráfico de veículos do dashboard é dados fictícios hardcoded (fixo em 1 nas horas 9h-11h) e não representa nenhuma categoria real de veículo. Os tipos reais são: Van, Ônibus, Sedan, SUV e Blindado.

## Alterações

### 1. `src/components/dashboard/VehiclesChart.tsx`
- Remover o bloco `<Bar>` que exibe "PCD" no gráfico (linhas 55-60)

### 2. `src/lib/utils/calculadores.ts`
- Remover o cálculo fictício de `pcdPorHora` (linhas 186-187)
- Remover `pcd: pcdPorHora` do objeto de métricas (linha 196)

### 3. `src/lib/types/viagem.ts`
- Remover o campo `pcd?: number` da interface `MetricasPorHora` (linha 114)

Nenhuma outra parte do sistema usa PCD. As missões continuarão usando os tipos de veículo corretos (Sedan, SUV, etc.) sem interferência.

