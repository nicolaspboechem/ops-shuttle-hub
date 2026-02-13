import { useContext } from 'react';
import { AuthContext } from '@/lib/auth/AuthContext';
import { StaffAuthContext } from '@/lib/auth/StaffAuthContext';
import { DriverAuthContext } from '@/lib/auth/DriverAuthContext';

/**
 * Hook unificado que retorna userId e userName do usuário autenticado,
 * independente do sistema de auth (Supabase Auth, Staff JWT ou Driver JWT).
 * Usa useContext direto para não explodir fora dos providers.
 */
export function useCurrentUser(): { userId: string | null; userName: string | null } {
  const authCtx = useContext(AuthContext);
  const staffCtx = useContext(StaffAuthContext);
  const driverCtx = useContext(DriverAuthContext);

  if (authCtx?.user) {
    return {
      userId: authCtx.user.id,
      userName: authCtx.profile?.full_name || authCtx.user.email || null,
    };
  }

  if (staffCtx?.staffSession && staffCtx.staffSession.expires_at > Date.now()) {
    return {
      userId: staffCtx.staffSession.user_id,
      userName: staffCtx.staffSession.user_nome,
    };
  }

  if (driverCtx?.driverSession && driverCtx.driverSession.expires_at > Date.now()) {
    return {
      userId: driverCtx.driverSession.motorista_id,
      userName: driverCtx.driverSession.motorista_nome,
    };
  }

  return { userId: null, userName: null };
}
