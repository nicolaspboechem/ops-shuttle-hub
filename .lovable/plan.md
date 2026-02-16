

# Melhorias no Sistema de Gestao de Veiculos

## 1. Paginacao

### 1.1 Lista de Veiculos (VeiculosListView)
- Aplicar `usePaginatedList(veiculos)` na tabela de veiculos
- Adicionar `<LoadMoreFooter>` abaixo da tabela
- Mesma abordagem usada em ViagensTable, ShuttleTable, etc.

### 1.2 Auditoria de Veiculos (VeiculosAuditoria)
- Paginar `metricasConsolidadas` nas vistas Card e Lista
- Adicionar `<LoadMoreFooter>` abaixo do grid de cards e abaixo da tabela

### 1.3 Historico de Uso (VeiculosUsoAuditoria)
- Paginar `veiculosFiltrados` na lista de veiculos collapsiveis
- Adicionar `<LoadMoreFooter>` abaixo da lista

---

## 2. Correcao do Historico de Uso de Veiculos

### Problema
O historico de uso (`useVeiculoPresencaHistorico`) consulta apenas a tabela `motorista_presenca` -- ou seja, so registra uso quando o motorista faz check-in/check-out formal. Muitos veiculos sao vinculados/desvinculados sem presenca formal, resultando em poucos registros.

O componente `VeiculoUsoDetalheModal` (modal de detalhe do veiculo) ja tem uma aba de historico que mescla dados de presenca + viagens. O `VeiculosUsoAuditoria` (tela de auditoria) porem usa apenas presenca.

### Solucao
Enriquecer o hook `useVeiculoPresencaHistorico` para tambem consultar a tabela `veiculo_vistoria_historico` (tipos `vinculacao` e `desvinculacao`) e incluir esses registros na timeline de uso de cada veiculo. Isso garante que trocas feitas pelo CCO, supervisor ou auto-checkout aparecam no historico.

Alterar o hook para:
1. Buscar tambem `veiculo_vistoria_historico` filtrando por `tipo_vistoria IN ('vinculacao', 'desvinculacao')`
2. Mesclar esses registros com os de `motorista_presenca` na lista `usos` de cada veiculo
3. Diferenciar visualmente na tabela com um badge indicando o tipo (check-in/out vs vinculacao/desvinculacao)

---

## 3. Registro de Historico em Desvinculacoes Faltantes

### Locais que desvinculam SEM registrar no historico:

| Local | Contexto |
|-------|----------|
| `SupervisorFrotaTab.tsx` (handleUnlinkVehicle) | Supervisor desvincula pelo app |
| `useMotoristaPresenca.ts` (handleCheckout) | Check-out do motorista |
| `auto-checkout/index.ts` | Virada automatica do dia |

### Locais que JA registram historico:
| Local | Contexto |
|-------|----------|
| `VincularVeiculo.tsx` | Vinculacao e desvinculacao via tela dedicada |
| `CheckoutModal.tsx` | Checkout com observacao |

### Correcoes:

**SupervisorFrotaTab.tsx**: Adicionar insert em `veiculo_vistoria_historico` com tipo `desvinculacao` ao desvincular, incluindo nome do supervisor (via `staffUser`) como `realizado_por_nome`.

**useMotoristaPresenca.ts** (handleCheckout): Adicionar insert em `veiculo_vistoria_historico` com tipo `desvinculacao` ao fazer checkout (o veiculo e desvinculado mas o historico nao e registrado).

**auto-checkout/index.ts**: Antes de limpar `veiculo_id`/`motorista_id`, buscar quais motoristas tinham veiculos vinculados e inserir registros de desvinculacao em batch na tabela `veiculo_vistoria_historico`.

---

## Arquivos Alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/veiculos/VeiculosListView.tsx` | Paginacao na tabela de veiculos |
| `src/components/veiculos/VeiculosAuditoria.tsx` | Paginacao nas vistas card e lista |
| `src/components/veiculos/VeiculosUsoAuditoria.tsx` | Paginacao na lista de veiculos + badge de tipo de registro |
| `src/hooks/useVeiculoPresencaHistorico.ts` | Incluir dados de `veiculo_vistoria_historico` (vinculacao/desvinculacao) |
| `src/components/app/SupervisorFrotaTab.tsx` | Registrar historico ao desvincular |
| `src/hooks/useMotoristaPresenca.ts` | Registrar historico ao fazer checkout |
| `supabase/functions/auto-checkout/index.ts` | Registrar historico das desvinculacoes automaticas |

