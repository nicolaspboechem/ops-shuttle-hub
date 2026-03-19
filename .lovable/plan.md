

# Plan: Motorista Home Tab + 3 Bug Fixes

## 1. New "Home" tab for Motorista app

Add a new tab to `MotoristaBottomNav` and render a personal dashboard in `AppMotorista`:

**New component: `src/components/app/MotoristaHomeTab.tsx`**
- Total completed trips (count from `viagens` where `motorista_id` matches and `status = 'encerrado'`)
- Km driven (sum of `km_final - km_inicial` from completed trips' vehicles, or display "N/A" if unavailable)
- Today's metrics: trips completed today, current status, hours since check-in
- Notifications section: reuse the same `notificacao_usuario` DB-backed read/unread/hide logic from the admin Home page, filtered to the motorista's user

**Changes:**
- `MotoristaBottomNav.tsx`: Add 'home' tab before 'inicio', rename 'inicio' to 'Missoes' (missions tab)
- `AppMotorista.tsx`: Add 'home' case in `renderTabContent()` rendering `MotoristaHomeTab`
- Notifications: query `useNotifications` hook (already user-scoped) and render a simplified notification list with mark-as-read/unread/delete actions

## 2. Bug Fix: Supervisor cannot end missions

**Root cause:** RLS policy `motoristas_update_admin` only allows admins to UPDATE the `motoristas` table. When a supervisor calls `concluirMissao`, it calls `syncMotoristaAoEncerrarMissao` which updates `motoristas.status` — this silently fails for non-admin users.

**Fix:** Add a new RLS policy on `motoristas` allowing authenticated users with event access to update specific operational fields.

```sql
CREATE POLICY "motoristas_update_event_member"
  ON public.motoristas
  FOR UPDATE
  TO authenticated
  USING (has_event_access(auth.uid(), evento_id))
  WITH CHECK (has_event_access(auth.uid(), evento_id));
```

This also fixes the motorista's own updates (status, location) since the motorista is a member of the event via `evento_usuarios`.

## 3. Bug Fix: Deslocamento mission doesn't finalize in motorista app

**Root cause:** Same as Bug #2 — the motorista app's `handleMissaoAction('finalizar')` tries to update `motoristas.status` to 'disponivel' and `ultima_localizacao`, but the RLS blocks non-admin updates. The migration in Bug #2 fixes this.

**Additional issue:** After examining the code, the finalization flow in `AppMotorista` queries for remaining active viagens BEFORE updating the current one to 'encerrado'. This means the query finds the viagem being finalized as still active, so it never sets the motorista to 'disponivel'.

**Fix in `AppMotorista.tsx`:** Move the "check for other active viagens" query AFTER the viagem update, and exclude the current `viagemId` from the query.

## 4. Session timeout (30min inactivity → logout)

**New hook: `src/hooks/useInactivityLogout.ts`**
- Track last user interaction (touch, click, keypress, scroll)
- Every 60 seconds, check if `Date.now() - lastActivity > 30 * 60 * 1000`
- If inactive, call `signOut()` and navigate to `/auth`
- Mount in `AuthLayout` (App.tsx) so it applies globally to all authenticated routes

## Files to create/modify

| File | Action |
|---|---|
| `supabase/migrations/...` | Add `motoristas_update_event_member` policy |
| `src/components/app/MotoristaHomeTab.tsx` | Create — dashboard + notifications |
| `src/components/app/MotoristaBottomNav.tsx` | Add 'home' tab |
| `src/pages/app/AppMotorista.tsx` | Add home tab rendering, fix finalization query order |
| `src/hooks/useInactivityLogout.ts` | Create — 30min timeout hook |
| `src/App.tsx` | Mount inactivity hook in AuthLayout |

