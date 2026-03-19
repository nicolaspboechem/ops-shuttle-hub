

# Plan: Fix Event Day Count + Preserve Historical Data for Finalized Events

## Problems Identified

1. **"Dias" count is wrong in EventoGroupCard**: Uses `eventos.length` (number of grouped database records) instead of calculating actual days from `data_inicio` to `data_fim`. If one event has dates 2025-03-15 to 2025-03-20, it should show 6 days, not 1.

2. **Client dashboard shows zero metrics after event ends**: `ClienteDashboardTab` uses `useViagens` with `dataOperacional` filter, which filters by today's date. Once the event is over, no trips match, so all numbers are zero. Finalized events should show totals across ALL days (historical view).

3. **Date parsing inconsistency**: Dates use `new Date(date + 'T12:00:00')` in some places but other logic may not handle timezone properly.

## Changes

### 1. `EventoGroupCard.tsx` — Fix "Dias" calculation

Replace `{eventos.length}` with a proper day count computed from `primaryEvento.data_inicio` and `primaryEvento.data_fim` using `differenceInDays` from date-fns. Fallback to `eventos.length` if dates are not set.

```
const diasEvento = useMemo(() => {
  if (primaryEvento.data_inicio && primaryEvento.data_fim) {
    const start = new Date(primaryEvento.data_inicio + 'T12:00:00');
    const end = new Date(primaryEvento.data_fim + 'T12:00:00');
    return differenceInCalendarDays(end, start) + 1; // inclusive
  }
  return eventos.length;
}, [primaryEvento, eventos.length]);
```

### 2. `ClienteDashboardTab.tsx` — Show all-time data for finalized events

Add a prop `eventoStatus` (or `eventoFinalizado`). When the event status is not `ativo`, skip the `dataOperacional` filter so `useViagens` fetches ALL trips — showing historical totals.

- **`AppCliente.tsx`**: Fetch `status` in the evento query, pass it to `ClienteDashboardTab`
- **`ClienteDashboardTab.tsx`**: Accept `eventoStatus` prop. When `eventoStatus !== 'ativo'`, pass `undefined` for `dataOperacional` to `useViagens`, showing all trips as a historical summary

### 3. `EditEventoModal.tsx` — Ensure dates save/load correctly

The current implementation looks correct for saving. Verify that `data_inicio`/`data_fim` are properly persisted as `YYYY-MM-DD` strings. No changes needed here based on code review — the issue is in the display (EventoGroupCard), not the save.

## Files Affected (4 files)

| File | Change |
|---|---|
| `EventoGroupCard.tsx` | Replace `eventos.length` with date-based day count |
| `ClienteDashboardTab.tsx` | Accept `eventoStatus`, skip date filter for finalized events |
| `AppCliente.tsx` | Fetch `status` from evento, pass to dashboard tab |
| `EventoCard.tsx` | Add day count display (same logic) if needed |

