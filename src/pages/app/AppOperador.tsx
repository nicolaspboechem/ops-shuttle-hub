import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useViagens } from '@/hooks/useViagens';
import { useStaffAuth } from '@/lib/auth/StaffAuthContext';
import { useServerTime } from '@/hooks/useServerTime';
import { useUserNames } from '@/hooks/useUserNames';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
import { Evento, Viagem } from '@/lib/types/viagem';
import { Button } from '@/components/ui/button';
import { CreateShuttleForm } from '@/components/app/CreateShuttleForm';
import { PullToRefresh } from '@/components/app/PullToRefresh';
import { DiaSeletor } from '@/components/app/DiaSeletor';
import { OperadorBottomNav, OperadorTabId } from '@/components/app/OperadorBottomNav';
import { OperadorHistoricoTab } from '@/components/app/OperadorHistoricoTab';
import { OperadorMaisTab } from '@/components/app/OperadorMaisTab';
import { 
  ArrowLeft, 
  Loader2,
  Bus,
  Users,
  RefreshCw
} from 'lucide-react';
import logoAS from '@/assets/as_logo_reduzida_branca.png';
import { format } from 'date-fns';

const MemoizedHistoricoTab = memo(OperadorHistoricoTab);
const MemoizedMaisTab = memo(OperadorMaisTab);

// Card simples para shuttle registrado
function ShuttleRegistroCard({ viagem, getName }: { viagem: Viagem; getName: (id: string) => string }) {
  const horario = viagem.h_inicio_real 
    ? format(new Date(viagem.h_inicio_real), 'HH:mm')
    : '--:--';
  const criador = viagem.criado_por ? getName(viagem.criado_por) : '';

  return (
    <div className="bg-card border rounded-lg px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 rounded-full p-1.5">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <span className="text-lg font-bold">{viagem.qtd_pax || 0} PAX</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-mono text-muted-foreground">{horario}</span>
          {criador && (
            <p className="text-xs text-muted-foreground truncate max-w-[120px]">{criador}</p>
          )}
        </div>
      </div>
      {viagem.observacao && (
        <p className="text-xs text-muted-foreground mt-1.5 truncate">
          {viagem.observacao}
        </p>
      )}
    </div>
  );
}

export default function AppOperador() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { staffSession, signOut } = useStaffAuth();
  const { getAgoraSync } = useServerTime();
  
  const [evento, setEvento] = useState<Evento | null>(null);
  const [showShuttleForm, setShowShuttleForm] = useState(false);
  const [activeTab, setActiveTab] = useState<OperadorTabId>('viagens');
  
  const [dataOperacional, setDataOperacional] = useState<string>(() => 
    getDataOperacional(new Date(), '04:00')
  );
  const [verTodosDias, setVerTodosDias] = useState(false);
  
  useEffect(() => {
    if (evento?.horario_virada_dia) {
      setDataOperacional(getDataOperacional(getAgoraSync(), evento.horario_virada_dia));
    }
  }, [evento?.horario_virada_dia, getAgoraSync]);

  const viagensOptions = useMemo(() => {
    const opts: any = { tipoOperacao: 'shuttle' };
    if (!verTodosDias) {
      opts.dataOperacional = dataOperacional;
      opts.horarioVirada = evento?.horario_virada_dia || '04:00';
    }
    return opts;
  }, [dataOperacional, evento?.horario_virada_dia, verTodosDias]);

  const { viagens, loading, refreshing, refetch } = useViagens(eventoId, viagensOptions);

  // Get creator names
  const creatorIds = useMemo(() => 
    viagens.map(v => v.criado_por).filter(Boolean) as string[], 
    [viagens]
  );
  const { getName } = useUserNames(creatorIds);

  // Summary metrics
  const summary = useMemo(() => ({
    total: viagens.length,
    totalPax: viagens.reduce((sum, v) => sum + (v.qtd_pax || 0), 0),
  }), [viagens]);

  // Sort by most recent first
  const sortedViagens = useMemo(() => 
    [...viagens].sort((a, b) => 
      new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime()
    ),
    [viagens]
  );

  const handleRefresh = async () => {
    await refetch();
  };

  useEffect(() => {
    if (eventoId) {
      supabase
        .from('eventos')
        .select('*')
        .eq('id', eventoId)
        .single()
        .then(({ data }) => setEvento(data));
    }
  }, [eventoId]);

  const handleLogout = useCallback(() => {
    signOut();
    navigate('/login/equipe');
  }, [signOut, navigate]);

  const handleTabChange = (tab: OperadorTabId) => {
    if (tab === 'nova') {
      setShowShuttleForm(true);
    } else {
      setActiveTab(tab);
    }
  };

  const maisTabProps = useMemo(() => ({
    userName: staffSession?.user_nome,
    eventoNome: evento?.nome_planilha,
    onLogout: handleLogout,
  }), [staffSession?.user_nome, evento?.nome_planilha, handleLogout]);

  useEffect(() => {
    if (!staffSession) {
      navigate('/login/equipe');
    }
  }, [staffSession, navigate]);

  if (!staffSession) {
    return null;
  }

  if (loading && !viagens.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderAllTabs = () => (
    <>
      {/* Tab: Viagens */}
      <div className={activeTab === 'viagens' ? 'block' : 'hidden'}>
        <div className="space-y-4">
          <DiaSeletor
            dataOperacional={dataOperacional}
            onChange={setDataOperacional}
            dataInicio={evento?.data_inicio}
            dataFim={evento?.data_fim}
            showToggleAll={true}
            verTodosDias={verTodosDias}
            onToggleTodosDias={setVerTodosDias}
          />

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border rounded-lg p-4 text-center">
              <Bus className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{summary.total}</p>
              <p className="text-xs text-muted-foreground">Shuttles</p>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{summary.totalPax}</p>
              <p className="text-xs text-muted-foreground">Passageiros</p>
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            {sortedViagens.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Bus className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Nenhum shuttle</p>
                <p className="text-sm mb-4">Toque em + para registrar</p>
              </div>
            ) : (
              sortedViagens.map(viagem => (
                <ShuttleRegistroCard 
                  key={viagem.id} 
                  viagem={viagem}
                  getName={getName}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tab: Histórico */}
      <div className={activeTab === 'historico' ? 'block' : 'hidden'}>
        <MemoizedHistoricoTab viagens={viagens} />
      </div>

      {/* Tab: Mais */}
      <div className={activeTab === 'mais' ? 'block' : 'hidden'}>
        <MemoizedMaisTab {...maisTabProps} />
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden w-full max-w-full">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary safe-area-top">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/app')} className="text-primary-foreground hover:bg-white/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img 
                src={logoAS} 
                alt="AS Brasil" 
                className="h-9 w-9 rounded-lg object-contain"
              />
              <div>
                <h1 className="text-base font-semibold text-primary-foreground">Operador</h1>
                <p className="text-xs text-primary-foreground/70 truncate max-w-[160px]">
                  {evento?.nome_planilha || 'Carregando...'}
                </p>
              </div>
            </div>

            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-primary-foreground hover:bg-white/10"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <PullToRefresh onRefresh={handleRefresh}>
        <main className="container mx-auto px-4 py-4 pb-24">
          {renderAllTabs()}
        </main>
      </PullToRefresh>

      <OperadorBottomNav 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />

      <CreateShuttleForm
        open={showShuttleForm}
        onOpenChange={setShowShuttleForm}
        eventoId={eventoId!}
        onCreated={() => {
          refetch();
          setActiveTab('viagens');
        }}
      />
    </div>
  );
}
