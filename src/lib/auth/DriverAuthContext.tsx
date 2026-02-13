import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface DriverSession {
  token: string;
  motorista_id: string;
  motorista_nome: string;
  evento_id: string;
  expires_at: number;
}

interface DriverAuthContextType {
  driverSession: DriverSession | null;
  loading: boolean;
  signIn: (telefone: string, senha: string) => Promise<{ error: Error | null }>;
  signOut: () => void;
  isAuthenticated: boolean;
}

export const DriverAuthContext = createContext<DriverAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'driver_session';
const SUPABASE_URL = 'https://gkrczwtldvondiehsesh.supabase.co';

export function DriverAuthProvider({ children }: { children: React.ReactNode }) {
  const [driverSession, setDriverSession] = useState<DriverSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Load session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const session = JSON.parse(stored) as DriverSession;
        // Check if session is expired
        if (session.expires_at > Date.now()) {
          setDriverSession(session);
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
      const response = await fetch(`${SUPABASE_URL}/functions/v1/driver-login`, {
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

      const session: DriverSession = {
        token: data.session.token,
        motorista_id: data.session.motorista_id,
        motorista_nome: data.session.motorista_nome,
        evento_id: data.session.evento_id,
        expires_at: data.session.expires_at,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setDriverSession(session);

      return { error: null };
    } catch (error) {
      console.error('Driver sign in error:', error);
      return { error: error instanceof Error ? error : new Error('Erro desconhecido') };
    }
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setDriverSession(null);
  }, []);

  const isAuthenticated = !!driverSession && driverSession.expires_at > Date.now();

  return (
    <DriverAuthContext.Provider value={{
      driverSession,
      loading,
      signIn,
      signOut,
      isAuthenticated,
    }}>
      {children}
    </DriverAuthContext.Provider>
  );
}

export function useDriverAuth() {
  const context = useContext(DriverAuthContext);
  if (context === undefined) {
    throw new Error('useDriverAuth must be used within a DriverAuthProvider');
  }
  return context;
}
