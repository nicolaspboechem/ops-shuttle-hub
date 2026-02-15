import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type StaffRole = 'operador' | 'supervisor' | 'cliente';

interface StaffSession {
  token: string;
  user_id: string;
  user_nome: string;
  evento_id: string;
  role: StaffRole;
  expires_at: number;
}

interface StaffAuthContextType {
  staffSession: StaffSession | null;
  loading: boolean;
  signIn: (telefone: string, senha: string) => Promise<{ error: Error | null }>;
  signOut: () => void;
  isAuthenticated: boolean;
}

export const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'staff_session';
const SUPABASE_URL = 'https://gkrczwtldvondiehsesh.supabase.co';

export function StaffAuthProvider({ children }: { children: React.ReactNode }) {
  const [staffSession, setStaffSession] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Load session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const session = JSON.parse(stored) as StaffSession;
        // Check if session is expired
        if (session.expires_at > Date.now()) {
          setStaffSession(session);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async (telefone: string, senha: string): Promise<{ error: Error | null }> => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/staff-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telefone, senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: new Error(data.error || 'Erro ao fazer login') };
      }

      const session: StaffSession = {
        token: data.session.token,
        user_id: data.session.user_id,
        user_nome: data.session.user_nome,
        evento_id: data.session.evento_id,
        role: data.session.role,
        expires_at: data.session.expires_at,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setStaffSession(session);

      return { error: null };
    } catch (error) {
      console.error('Staff sign in error:', error);
      return { error: error instanceof Error ? error : new Error('Erro desconhecido') };
    }
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStaffSession(null);
  }, []);

  // isAuthenticated robusto: useState + verificação periódica
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const check = () => {
      const GRACE_PERIOD = 60 * 60 * 1000; // 1 hora em ms
      const valid = !!staffSession && (staffSession.expires_at + GRACE_PERIOD) > Date.now();
      setIsAuthenticated(valid);
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [staffSession]);

  return (
    <StaffAuthContext.Provider value={{
      staffSession,
      loading,
      signIn,
      signOut,
      isAuthenticated,
    }}>
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const context = useContext(StaffAuthContext);
  if (context === undefined) {
    throw new Error('useStaffAuth must be used within a StaffAuthProvider');
  }
  return context;
}
