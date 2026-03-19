

# Plan: Hide Localizador from field apps when disabled in event config

## Summary

When `habilitar_localizador` is `false` in the event settings, hide the Localizador tab from the **Supervisor** and **Client** field apps. The **CCO panel** (`PainelLocalizador.tsx`, `MapaServico.tsx`) remains always visible — it's the admin control center.

The Client app already handles this correctly. Only the Supervisor app needs the fix.

## Changes

### 1. `src/pages/app/AppSupervisor.tsx`

- Add `habilitar_localizador` to the `Evento` interface (line ~164)
- Fetch `habilitar_localizador` in the evento query
- Pass it to `SupervisorBottomNav` as a prop to conditionally hide the "Local" tab
- Guard the localizador tab content: if disabled, don't render `MemoizedLocalizadorTab`
- If active tab is 'localizador' when disabled, redirect to 'frota'

### 2. `src/components/app/SupervisorBottomNav.tsx`

- Accept `habilitarLocalizador?: boolean` prop
- Filter out the 'localizador' tab from rendered tabs when `habilitarLocalizador` is `false`

### Files affected: 2

| File | Change |
|---|---|
| `AppSupervisor.tsx` | Fetch `habilitar_localizador`, pass to nav, guard tab |
| `SupervisorBottomNav.tsx` | Accept prop, conditionally hide tab |

