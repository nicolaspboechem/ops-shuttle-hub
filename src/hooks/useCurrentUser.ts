import { useContext } from 'react';
import { AuthContext } from '@/lib/auth/AuthContext';

/**
 * Hook unificado que retorna userId e userName do usuário autenticado.
 * Agora usa apenas o AuthContext (Supabase Auth unificado).
 */
export function useCurrentUser(): { userId: string | null; userName: string | null } {
  const authCtx = useContext(AuthContext);

  if (authCtx?.user) {
    return {
      userId: authCtx.user.id,
      userName: authCtx.profile?.full_name || authCtx.user.email || null,
    };
  }

  return { userId: null, userName: null };
}
