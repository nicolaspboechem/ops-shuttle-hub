
# Criar Status "Abastecimento" para Veiculos

## Contexto

Quando o supervisor marca um veiculo com combustivel baixo no modal de alertas, o sistema grava o status `em_manutencao` (que nem e reconhecido pela interface). O correto e criar um novo status **"abastecimento"** dedicado para essa situacao, separando de "manutencao" que e para problemas mecanicos.

Alem disso, existem 4 veiculos no banco presos no status `em_manutencao` que precisam ser corrigidos para `abastecimento`.

## Resumo das Alteracoes

1. **SupervisorAlertasModal** - trocar `em_manutencao` por `abastecimento` e renomear botao
2. **SupervisorFrotaTab** - adicionar grupo/filtro "Abastecimento"
3. **VeiculoCardSupervisor** - adicionar status `abastecimento` no config visual e no dropdown
4. **VeiculoStatusBadge** - adicionar entrada para `abastecimento`
5. **VeiculoKanbanColumn** - adicionar coluna/config `abastecimento`
6. **VeiculoKanbanColumnFull** - adicionar coluna/config `abastecimento`
7. **Pagina Veiculos (CCO)** - adicionar `abastecimento` nos filtros, grupos e kanban
8. **CadastroModals** - adicionar `abastecimento` na ordenacao/agrupamento
9. **Corrigir dados** - UPDATE dos 4 veiculos de `em_manutencao` para `abastecimento`

## Detalhes Tecnicos

### 1. `src/components/app/SupervisorAlertasModal.tsx`
- Linha 57: trocar `em_manutencao` por `abastecimento`
- Trocar icone do botao de `Wrench` para `Fuel`
- Renomear label do botao de "Manutencao" para "Abastecimento"

### 2. `src/components/app/SupervisorFrotaTab.tsx`
- Adicionar `'abastecimento'` ao type `VeiculoFilterType`
- Adicionar stat card para abastecimento (icone Fuel, cor orange)
- Adicionar grupo "Abastecimento" na listagem agrupada
- Adicionar label no filtro ativo
- Importar icone `Fuel`

### 3. `src/components/app/VeiculoCardSupervisor.tsx`
- Adicionar `abastecimento` no `statusConfig` (icone Fuel, cor orange)
- Adicionar opcao "Abastecimento" no dropdown menu

### 4. `src/components/veiculos/VeiculoStatusBadge.tsx`
- Adicionar entrada `abastecimento` no `statusConfig` com icone Fuel e cores orange

### 5. `src/components/veiculos/VeiculoKanbanColumn.tsx`
- Adicionar `'abastecimento'` ao type union do `status` prop
- Adicionar config visual para `abastecimento`

### 6. `src/components/veiculos/VeiculoKanbanColumnFull.tsx`
- Adicionar `'abastecimento'` ao type union do `status` prop
- Adicionar config visual para `abastecimento`

### 7. `src/pages/Veiculos.tsx`
- Adicionar `'abastecimento'` no array `validStatuses`
- Adicionar label no toast
- Adicionar no `SelectItem` de filtro
- Adicionar grupo no kanban e na listagem
- Adicionar coluna `VeiculoKanbanColumnFull` para abastecimento

### 8. `src/components/cadastros/CadastroModals.tsx`
- Adicionar `abastecimento` na ordem de status e no agrupamento

### 9. Correcao de dados (SQL)
```sql
UPDATE veiculos SET status = 'abastecimento' WHERE status = 'em_manutencao';
```

### Visual do novo status
- **Label**: "Abastecimento"
- **Icone**: Fuel (lucide-react)
- **Cor**: Orange (bg-orange-500/10, text-orange-600, border-orange-500/30)
