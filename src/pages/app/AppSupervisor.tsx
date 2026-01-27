import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useViagens } from '@/hooks/useViagens';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft,
  MoreVertical,
  LogOut
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import logoAS from '@/assets/as_logo_reduzida_preta.png';
import { SupervisorBottomNav, SupervisorTabId } from '@/components/app/SupervisorBottomNav';
import { SupervisorFrotaTab } from '@/components/app/SupervisorFrotaTab';
import { SupervisorViagensTab } from '@/components/app/SupervisorViagensTab';
import { SupervisorLocalizadorTab } from '@/components/app/SupervisorLocalizadorTab';
import { SupervisorMaisTab } from '@/components/app/SupervisorMaisTab';
import { CreateViagemForm } from '@/components/app/CreateViagemForm';

export default function AppSupervisor() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { user, signOut, profile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<SupervisorTabId>('frota');
  const [evento, setEvento] = useState<{ nome_planilha: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNovaViagem, setShowNovaViagem] = useState(false);
  
  const { refetch: refetchViagens } = useViagens(eventoId);

  useEffect(() => {
    if (eventoId) {
      fetchEvento();
    }
  }, [eventoId]);

  const fetchEvento = async () => {
    const { data } = await supabase
      .from('eventos')
      .select('nome_planilha')
      .eq('id', eventoId)
      .single();
    
    if (data) setEvento(data);
    setLoading(false);
  };

  const handleTabChange = (tab: SupervisorTabId) => {
    if (tab === 'nova') {
      setShowNovaViagem(true);
    } else {
      setActiveTab(tab);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'frota':
        return <SupervisorFrotaTab eventoId={eventoId!} />;
      case 'viagens':
        return <SupervisorViagensTab eventoId={eventoId!} onRefresh={refetchViagens} />;
      case 'localizador':
        return <SupervisorLocalizadorTab eventoId={eventoId!} />;
      case 'mais':
        return (
          <SupervisorMaisTab 
            eventoId={eventoId!} 
            eventoNome={evento?.nome_planilha}
            userName={profile?.full_name || user?.email}
            onLogout={signOut}
          />
        );
      default:
        return <SupervisorFrotaTab eventoId={eventoId!} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/app')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <img 
                src={logoAS} 
                alt="AS Brasil" 
                className="h-8 w-8 rounded-lg object-contain"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold truncate">Supervisor</h1>
                  <Badge variant="secondary" className="text-xs">Master</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {evento?.nome_planilha || 'Carregando...'}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/app')}>
                  Trocar Evento
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-4">
        {renderTabContent()}
      </main>

      {/* Bottom Navigation */}
      <SupervisorBottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Nova Viagem */}
      <CreateViagemForm 
        open={showNovaViagem}
        onOpenChange={setShowNovaViagem}
        eventoId={eventoId!}
        onCreated={() => {
          setShowNovaViagem(false);
          refetchViagens();
          setActiveTab('viagens');
        }}
      />
    </div>
  );
}
