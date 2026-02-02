import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { ClienteBottomNav, ClienteTabId } from '@/components/app/ClienteBottomNav';
import { ClienteHeaderNav } from '@/components/app/ClienteHeaderNav';
import { ClienteDashboardTab } from '@/components/app/ClienteDashboardTab';
import { ClienteLocalizadorTab } from '@/components/app/ClienteLocalizadorTab';
import { ClientePainelTab } from '@/components/app/ClientePainelTab';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { PullToRefresh } from '@/components/app/PullToRefresh';
import { Loader2 } from 'lucide-react';
import { isValidUUID } from '@/lib/utils/uuid';

interface EventoConfig {
  nome_planilha: string;
  habilitar_localizador: boolean | null;
  visivel_publico: boolean | null;
}

export default function AppCliente() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { user, signOut, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<ClienteTabId>('dashboard');
  const [evento, setEvento] = useState<EventoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!eventoId || !isValidUUID(eventoId)) {
      setLoading(false);
      return;
    }

    supabase
      .from('eventos')
      .select('nome_planilha, habilitar_localizador, visivel_publico')
      .eq('id', eventoId)
      .maybeSingle()
      .then(({ data }) => {
        setEvento(data);
        setLoading(false);
      });
  }, [eventoId]);

  const availableTabs = useMemo(() => {
    const tabs: ClienteTabId[] = ['dashboard'];
    if (evento?.habilitar_localizador) tabs.push('localizador');
    if (evento?.visivel_publico) tabs.push('painel');
    return tabs;
  }, [evento]);

  // Garantir que tab ativa está disponível
  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [availableTabs, activeTab]);

  const handleRefresh = useCallback(async () => {
    // Trigger refresh by updating key
    setRefreshKey(prev => prev + 1);
    // Small delay to ensure components re-fetch
    await new Promise(resolve => setTimeout(resolve, 500));
  }, []);

  const renderContent = () => {
    if (!eventoId) return null;
    
    switch (activeTab) {
      case 'dashboard':
        return <ClienteDashboardTab key={refreshKey} eventoId={eventoId} />;
      case 'localizador':
        return <ClienteLocalizadorTab key={refreshKey} eventoId={eventoId} />;
      case 'painel':
        return <ClientePainelTab key={refreshKey} eventoId={eventoId} />;
      default:
        return <ClienteDashboardTab key={refreshKey} eventoId={eventoId} />;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!eventoId || !isValidUUID(eventoId)) {
    return <Navigate to="/app" replace />;
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col pb-16">
        <MobileHeader 
          title={evento?.nome_planilha || 'Cliente'} 
          subtitle="Cliente"
        />
        <PullToRefresh onRefresh={handleRefresh}>
          <main className="flex-1 overflow-auto">
            {renderContent()}
          </main>
        </PullToRefresh>
        <ClienteBottomNav 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          availableTabs={availableTabs}
        />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-background">
      <ClienteHeaderNav 
        eventoNome={evento?.nome_planilha}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        availableTabs={availableTabs}
        onLogout={signOut}
      />
      <main className="container mx-auto py-6">
        {renderContent()}
      </main>
    </div>
  );
}
