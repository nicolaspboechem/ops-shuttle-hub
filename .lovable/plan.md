

# Plan: Remove Transfer + Restructure NewActionModal

## Summary

Remove all Transfer references from the entire codebase (frontend, filters, event config, mission creation). Restructure the "Nova Operacao" modal to show 3 top-level buttons (Missao, Shuttle, Deslocamento) where Missao and Shuttle expand into sub-options.

## Database

**Migration:** Change existing `tipo_operacao = 'transfer'` rows to `'shuttle'` so no data is lost. Remove 'transfer' from event config arrays. No schema changes needed (the column is varchar, not enum).

```sql
-- Convert all existing transfer viagens to shuttle
UPDATE viagens SET tipo_operacao = 'shuttle' WHERE tipo_operacao = 'transfer';

-- Remove 'transfer' from tipos_viagem_habilitados arrays
UPDATE eventos 
SET tipos_viagem_habilitados = array_remove(tipos_viagem_habilitados, 'transfer')
WHERE 'transfer' = ANY(tipos_viagem_habilitados);

-- Update legacy tipo_operacao field  
UPDATE eventos SET tipo_operacao = 'shuttle' WHERE tipo_operacao = 'transfer';
```

## Frontend Changes

### 1. NewActionModal — Restructure to hierarchical menu

Replace flat button list with 3 top-level groups:
1. **Missao** (purple) — clicking shows sub-options: Instantanea / Agendada
2. **Shuttle** (emerald) — clicking shows sub-options: Rapido / Completo
3. **Deslocamento** (teal) — direct action, no sub-menu

Each group expands inline (accordion-style) when clicked.

**ActionType:** Remove `'transfer'` from the type. Keep: `'missao' | 'missao_agendada' | 'deslocamento' | 'shuttle_rapido' | 'shuttle_completo'`

### 2. Remove Transfer from event creation/editing

**Files:** `CreateEventoWizard.tsx`, `EditEventoModal.tsx`
- Remove 'transfer' option from `tiposViagem` checkbox list
- Simplify legacy `tipo_operacao` derivation (no more transfer case)

### 3. Remove Transfer from OperationTabs filter

**File:** `OperationTabs.tsx`
- Remove `'transfer'` from `TipoOperacaoFiltro` type and `SPECIFIC_TYPES`
- Remove transfer tab trigger
- Keep only: `'todos' | 'shuttle' | 'missao'`

### 4. Remove Transfer from contadores everywhere

**Files (all have the same pattern):**
- `Dashboard.tsx`, `DashboardMobile.tsx`, `ViagensAtivas.tsx`, `ViagensFinalizadas.tsx`
- `Auditoria.tsx`, `MotoristasAuditoria.tsx`, `VeiculosAuditoria.tsx`
- `ClienteDashboardTab.tsx`

Remove `transfer:` counter line. Adjust total calculations.

### 5. Remove Transfer components

**Delete:** `src/components/transfer/TransferTable.tsx`, `src/components/transfer/TransferMetrics.tsx`

### 6. Simplify EventoTabs

**File:** `EventoTabs.tsx`
- Remove `viagensTransfer` prop, transfer tab, TransferTable/Metrics imports
- Only show shuttle metrics/table (no tabs needed since only one type)

### 7. Remove ExportButton transfer prop

**File:** `ExportButton.tsx` — Remove `viagensTransfer` prop, only export shuttle data

### 8. Fix EventoCard / EventoGroupCard

Remove transfer counting/badges.

### 9. Fix mission viagem creation (tipo_operacao)

**Files:** `useMissoes.ts` (line 369), `AppMotorista.tsx` (line 302)
- Change `tipo_operacao: 'transfer'` to `tipo_operacao: 'shuttle'` when creating viagens from missions

### 10. Remove CreateViagemForm usage from Operador/Supervisor apps

**Files:** `AppOperador.tsx`, `AppSupervisor.tsx`
- Remove `showViagemForm` state, `CreateViagemForm` import, and the transfer branch in `handleTabChange`/`handleActionSelect`
- The `CreateViagemForm` component itself can stay (used for mission-linked trips) or be cleaned up

### 11. Remove transfer label from Operador/Supervisor

**Files:** `AppOperador.tsx`, `AppSupervisor.tsx`
- Remove `'transfer': 'Transfer'` from labels map

### 12. Tutorial text cleanup

**File:** `useTutorial.ts` — Remove "Transfer" from description text

## Files affected (~20 files)

| Action | Files |
|--------|-------|
| Migration | 1 new SQL migration |
| Delete | `TransferTable.tsx`, `TransferMetrics.tsx` |
| Major edit | `NewActionModal.tsx`, `OperationTabs.tsx`, `EventoTabs.tsx`, `ExportButton.tsx` |
| Minor edit | `AppOperador.tsx`, `AppSupervisor.tsx`, `Dashboard.tsx`, `DashboardMobile.tsx`, `ViagensAtivas.tsx`, `ViagensFinalizadas.tsx`, `Auditoria.tsx`, `MotoristasAuditoria.tsx`, `VeiculosAuditoria.tsx`, `ClienteDashboardTab.tsx`, `EventoCard.tsx`, `EventoGroupCard.tsx`, `CreateEventoWizard.tsx`, `EditEventoModal.tsx`, `useMissoes.ts`, `AppMotorista.tsx`, `useTutorial.ts` |

