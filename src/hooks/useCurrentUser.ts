import { useAuth } from '@/lib/auth/AuthContext';
import { useStaffAuth } from '@/lib/auth/StaffAuthContext';
import { useDriverAuth } from '@/lib/auth/DriverAuthContext';

/**
 * Hook unificado que retorna userId e userName do usuário autenticado,
 * independente do sistema de auth (Supabase Auth, Staff JWT ou Driver JWT).
 */
export function useCurrentUser(): { userId: string | null; userName: string | null } {
  // Try each auth context - they throw if not inside provider,
  // so we use safe wrappers
  let userId: string | null = null;
  let userName: string | null = null;

  try {
    const { user, profile } = useAuth();
    if (user) {
      userId = user.id;
      userName = profile?.full_name || user.email || null;
    }
  } catch {
    // Not inside AuthProvider
  }

  if (!userId) {
    try {
      const { staffSession } = useStaffAuth();
      if (staffSession && staffSession.expires_at > Date.now()) {
        userId = staffSession.user_id;
        userName = staffSession.user_nome;
      }
    } catch {
      // Not inside StaffAuthProvider
    }
  }

  if (!userId) {
    try {
      const { driverSession } = useDriverAuth();
      if (driverSession && driverSession.expires_at > Date.now()) {
        userId = driverSession.motorista_id;
        userName = driverSession.motorista_nome;
      }
    } catch {
      // Not inside DriverAuthProvider
    }
  }

  return { userId, userName };
}
