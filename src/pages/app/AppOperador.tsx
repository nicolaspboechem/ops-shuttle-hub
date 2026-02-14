import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useViagens } from '@/hooks/useViagens';
import { useStaffAuth } from '@/lib/auth/StaffAuthContext';
import { useServerTime } from '@/hooks/useServerTime';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
import { Evento } from '@/lib/types/viagem';
import { Button } from '@/components/ui/button';
import { ViagemCardOperador } from '@/components/app/ViagemCardOperador';
import { CreateShuttleForm } from '@/components/app/CreateShuttleForm';
import { useViagemOperacaoStaff } from '@/hooks/useViagemOperacaoStaff';
import { PullToRefresh } from '@/components/app/PullToRefresh';
import { DiaSeletor } from '@/components/app/DiaSeletor';
import { OperadorBottomNav, OperadorTabId } from '@/components/app/OperadorBottomNav';
import { OperadorHistoricoTab } from '@/components/app/OperadorHistoricoTab';
import { OperadorMaisTab } from '@/components/app/OperadorMaisTab';
import { 
  ArrowLeft, 
  Loader2,
  Bus,
  Clock,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import logoAS from '@/assets/as_logo_reduzida_branca.png';

type StatusFilter = 'todos' | 'agendado' | 'em_andamento' | 'aguardando_retorno' | 'encerrado';

const MemoizedHistoricoTab = memo(OperadorHistoricoTab);
const MemoizedMaisTab = memo(OperadorMaisTab);

export default function AppOperador() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const navigate = useNavigate();
  const { staffSession, signOut } = useStaffAuth();
  const { getAgoraSync } = useServerTime();
  
  const [evento, setEvento] = useState<Evento | null>(null);
  const [showShuttleForm, setShowShuttleForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
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
  const staffOperacoes = useViagemOperacaoStaff();

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

  const filteredViagens = useMemo(() => 
    viagens.filter(v => statusFilter === 'todos' || v.status === statusFilter),
    [viagens, statusFilter]
  );

  const sortedViagens = useMemo(() => {
    const statusOrder: Record<string, number> = { 
      em_andamento: 0, aguardando_retorno: 1, agendado: 2, encerrado: 3, cancelado: 4 
    };
    return [...filteredViagens].sort((a, b) => {
      const orderA = statusOrder[a.status as string] ?? 5;
      const orderB = statusOrder[b.status as string] ?? 5;
      if (orderA !== orderB) return orderA - orderB;
      return (a.h_pickup || '').localeCompare(b.h_pickup || '');
    });
  }, [filteredViagens]);

  const counts = useMemo(() => ({
    agendado: viagens.filter(v => v.status === 'agendado').length,
    em_andamento: viagens.filter(v => v.status === 'em_andamento').length,
    aguardando_retorno: viagens.filter(v => v.status === 'aguardando_retorno').length,
    encerrado: viagens.filter(v => v.status === 'encerrado').length,
  }), [viagens]);

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

          <div className="grid grid-cols-4 gap-2">
            <div 
              className={`text-center p-3 rounded-lg cursor-pointer transition-all ${statusFilter === 'agendado' ? 'ring-2 ring-primary' : 'bg-muted/50'}`}
              onClick={() => setStatusFilter(statusFilter === 'agendado' ? 'todos' : 'agendado')}
            >
              <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xl font-bold">{counts.agendado}</p>
              <p className="text-[10px] text-muted-foreground">Agendado</p>
            </div>
            <div 
              className={`text-center p-3 rounded-lg cursor-pointer transition-all ${statusFilter === 'em_andamento' ? 'ring-2 ring-primary' : 'bg-primary/10'}`}
              onClick={() => setStatusFilter(statusFilter === 'em_andamento' ? 'todos' : 'em_andamento')}
            >
              <Bus className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold text-primary">{counts.em_andamento}</p>
              <p className="text-[10px] text-muted-foreground">Andamento</p>
            </div>
            <div 
              className={`text-center p-3 rounded-lg cursor-pointer transition-all ${statusFilter === 'aguardando_retorno' ? 'ring-2 ring-primary' : 'bg-amber-500/10'}`}
              onClick={() => setStatusFilter(statusFilter === 'aguardando_retorno' ? 'todos' : 'aguardando_retorno')}
            >
              <Clock className="h-4 w-4 mx-auto mb-1 text-amber-600" />
              <p className="text-xl font-bold text-amber-600">{counts.aguardando_retorno}</p>
              <p className="text-[10px] text-muted-foreground">Aguardando</p>
            </div>
            <div 
              className={`text-center p-3 rounded-lg cursor-pointer transition-all ${statusFilter === 'encerrado' ? 'ring-2 ring-primary' : 'bg-emerald-500/10'}`}
              onClick={() => setStatusFilter(statusFilter === 'encerrado' ? 'todos' : 'encerrado')}
            >
              <CheckCircle className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
              <p className="text-xl font-bold text-emerald-600">{counts.encerrado}</p>
              <p className="text-[10px] text-muted-foreground">Encerrado</p>
            </div>
          </div>

          <div className="space-y-3">
            {sortedViagens.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Bus className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Nenhuma viagem</p>
                <p className="text-sm mb-4">
                  {statusFilter !== 'todos' 
                    ? 'Nenhuma viagem com este status'
                    : 'Toque em + para registrar um shuttle'}
                </p>
              </div>
            ) : (
              sortedViagens.map(viagem => (
                <ViagemCardOperador 
                  key={viagem.id} 
                  viagem={viagem} 
                  onUpdate={refetch}
                  operacoes={staffOperacoes}
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
      {/* Header simplificado */}
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
