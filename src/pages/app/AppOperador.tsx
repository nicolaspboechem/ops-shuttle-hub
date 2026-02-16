import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { LoadMoreFooter } from '@/components/ui/load-more-footer';
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
import { ShuttleCardOperador } from '@/components/app/ShuttleCardOperador';
import { ShuttleEncerrarModal } from '@/components/app/ShuttleEncerrarModal';
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
  RefreshCw,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import logoAS from '@/assets/as_logo_reduzida_branca.png';
import { format } from 'date-fns';

const MemoizedHistoricoTab = memo(OperadorHistoricoTab);
const MemoizedMaisTab = memo(OperadorMaisTab);

// Card simples para shuttle encerrado
function ShuttleRegistroCard({ viagem, getName }: { viagem: Viagem; getName: (id: string) => string }) {
  const horario = viagem.h_inicio_real 
    ? format(new Date(viagem.h_inicio_real), 'HH:mm')
    : '--:--';
  const criador = viagem.criado_por ? getName(viagem.criado_por) : '';
  const nomeViagem = viagem.coordenador;

  return (
    <div className="bg-card border rounded-lg px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="bg-primary/10 rounded-full p-1.5 shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            {nomeViagem && <p className="text-sm font-medium truncate">{nomeViagem}</p>}
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">{viagem.qtd_pax || 0}↑</span>
              <span className="text-base font-bold text-muted-foreground">{viagem.qtd_pax_retorno || 0}↓</span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
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
  const [viagemParaEncerrar, setViagemParaEncerrar] = useState<Viagem | null>(null);
  
  const [dataOperacional, setDataOperacional] = useState<string>(() => 
    getDataOperacional(getAgoraSync(), '04:00')
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

  // Separar ativas vs encerradas
  const viagensAtivas = useMemo(() => 
    viagens.filter(v => !v.encerrado && v.status !== 'cancelado' && v.status !== 'encerrado'),
    [viagens]
  );

  const viagensEncerradas = useMemo(() => 
    viagens.filter(v => v.encerrado || v.status === 'encerrado' || v.status === 'cancelado'),
    [viagens]
  );

  // Get creator names
  const creatorIds = useMemo(() => 
    viagens.map(v => v.criado_por).filter(Boolean) as string[], 
    [viagens]
  );
  const { getName } = useUserNames(creatorIds);

  // Summary metrics
  const summary = useMemo(() => {
    const totalPaxIda = viagens.reduce((sum, v) => sum + (v.qtd_pax || 0), 0);
    const totalPaxVolta = viagens.reduce((sum, v) => sum + (v.qtd_pax_retorno || 0), 0);
    return {
      total: viagens.length,
      ativas: viagensAtivas.length,
      totalPaxIda,
      totalPaxVolta,
      totalPax: totalPaxIda + totalPaxVolta,
    };
  }, [viagens, viagensAtivas]);

  // Sort by most recent first
  const sortedAtivas = useMemo(() => 
    [...viagensAtivas].sort((a, b) => 
      new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime()
    ), [viagensAtivas]
  );

  const sortedEncerradas = useMemo(() => 
    [...viagensEncerradas].sort((a, b) => 
      new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime()
    ), [viagensEncerradas]
  );

  const { visibleItems: encerradasVisiveis, hasMore: hasMoreEnc, loadMore: loadMoreEnc, total: totalEnc, pageSize: pageSizeEnc, setPageSize: setPageSizeEnc } = usePaginatedList(sortedEncerradas);

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
              <p className="text-xs text-muted-foreground">{summary.ativas > 0 ? `${summary.ativas} ativas` : 'Viagens'}</p>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{summary.totalPax}</p>
              <p className="text-xs text-muted-foreground">PAX Total</p>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <ArrowUp className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
              <p className="text-2xl font-bold">{summary.totalPaxIda}</p>
              <p className="text-xs text-muted-foreground">PAX Ida</p>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <ArrowDown className="h-5 w-5 mx-auto mb-1 text-sky-500" />
              <p className="text-2xl font-bold">{summary.totalPaxVolta}</p>
              <p className="text-xs text-muted-foreground">PAX Volta</p>
            </div>
          </div>

          {/* Viagens ativas */}
          {sortedAtivas.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Em andamento ({sortedAtivas.length})
              </h2>
              {sortedAtivas.map(viagem => (
                <ShuttleCardOperador
                  key={viagem.id}
                  viagem={viagem}
                  getName={getName}
                  onEncerrar={setViagemParaEncerrar}
                />
              ))}
            </div>
          )}

          {/* Viagens encerradas */}
          <div className="space-y-2">
            {sortedEncerradas.length > 0 && (
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Encerradas ({sortedEncerradas.length})
              </h2>
            )}
            {sortedAtivas.length === 0 && sortedEncerradas.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Bus className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Nenhum shuttle</p>
                <p className="text-sm mb-4">Toque em + para registrar</p>
              </div>
            ) : (
              <>
                {encerradasVisiveis.map(viagem => (
                  <ShuttleRegistroCard 
                    key={viagem.id} 
                    viagem={viagem}
                    getName={getName}
                  />
                ))}
                <LoadMoreFooter
                  total={totalEnc}
                  visible={encerradasVisiveis.length}
                  hasMore={hasMoreEnc}
                  onLoadMore={loadMoreEnc}
                  pageSize={pageSizeEnc}
                  onPageSizeChange={setPageSizeEnc}
                />
              </>
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

      <ShuttleEncerrarModal
        open={!!viagemParaEncerrar}
        onOpenChange={(val) => { if (!val) setViagemParaEncerrar(null); }}
        viagem={viagemParaEncerrar}
        onEncerrado={() => {
          setViagemParaEncerrar(null);
          refetch();
        }}
      />
    </div>
  );
}
