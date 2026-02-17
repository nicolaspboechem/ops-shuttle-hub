import { useState, useMemo } from 'react';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { LoadMoreFooter } from '@/components/ui/load-more-footer';
import { useViagens } from '@/hooks/useViagens';
import { Viagem, StatusViagemOperacao } from '@/lib/types/viagem';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bus, 
  Clock, 
  Play, 
  PauseCircle,
  Pencil,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ViagemCardOperador } from './ViagemCardOperador';
import { EditViagemMobileModal } from './EditViagemMobileModal';
import { toast } from 'sonner';

interface SupervisorViagensTabProps {
  eventoId: string;
  onRefresh: () => void;
  dataOperacional?: string;
  horarioVirada?: string;
  onConcluirMissao?: (id: string) => Promise<any>;
  onCancelarMissao?: (id: string) => Promise<any>;
}

export function SupervisorViagensTab({ 
  eventoId, 
  onRefresh,
  dataOperacional,
  horarioVirada,
  onConcluirMissao,
  onCancelarMissao
}: SupervisorViagensTabProps) {
  const viagensOptions = useMemo(() => {
    if (!dataOperacional) return undefined;
    return { dataOperacional, horarioVirada };
  }, [dataOperacional, horarioVirada]);

  const { viagens, loading, refetch } = useViagens(eventoId, viagensOptions);
  const [statusFilter, setStatusFilter] = useState<StatusViagemOperacao | null>(null);
  const [editingViagem, setEditingViagem] = useState<Viagem | null>(null);
  const [missaoLoading, setMissaoLoading] = useState<string | null>(null);

  const handleRefresh = () => {
    refetch();
    onRefresh();
  };

  const activeViagens = viagens.filter(v => 
    !['encerrado', 'cancelado'].includes(v.status || 'agendado')
  );

  const filteredViagens = statusFilter 
    ? activeViagens.filter(v => v.status === statusFilter)
    : activeViagens;

  const { visibleItems: viagensVisiveis, hasMore, loadMore, total: pTotal, pageSize: pSize, setPageSize: setPSize } = usePaginatedList(filteredViagens);

  const stats = {
    agendado: activeViagens.filter(v => v.status === 'agendado').length,
    em_andamento: activeViagens.filter(v => v.status === 'em_andamento').length,
    aguardando_retorno: activeViagens.filter(v => v.status === 'aguardando_retorno').length,
  };

  const handleConcluirMissao = async (missaoId: string) => {
    if (!onConcluirMissao) return;
    setMissaoLoading(missaoId);
    try {
      await onConcluirMissao(missaoId);
      toast.success('Missão concluída');
      handleRefresh();
    } catch {
      toast.error('Erro ao concluir missão');
    } finally {
      setMissaoLoading(null);
    }
  };

  const handleCancelarMissao = async (missaoId: string) => {
    if (!onCancelarMissao) return;
    setMissaoLoading(missaoId);
    try {
      await onCancelarMissao(missaoId);
      toast.success('Missão cancelada');
      handleRefresh();
    } catch {
      toast.error('Erro ao cancelar missão');
    } finally {
      setMissaoLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats filter */}
      <div className="grid grid-cols-3 gap-2">
        <Card 
          className={cn(
            "cursor-pointer transition-all active:scale-95",
            statusFilter === 'agendado' 
              ? "border-muted-foreground ring-2 ring-muted-foreground/50" 
              : "border-muted hover:bg-muted/20"
          )}
          onClick={() => setStatusFilter(prev => prev === 'agendado' ? null : 'agendado')}
        >
          <CardContent className="p-3 text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xl font-bold">{stats.agendado}</p>
            <p className="text-[10px] text-muted-foreground">Agendados</p>
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "cursor-pointer transition-all active:scale-95",
            statusFilter === 'em_andamento' 
              ? "border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50" 
              : "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10"
          )}
          onClick={() => setStatusFilter(prev => prev === 'em_andamento' ? null : 'em_andamento')}
        >
          <CardContent className="p-3 text-center">
            <Play className="h-4 w-4 mx-auto mb-1 text-blue-600" />
            <p className="text-xl font-bold text-blue-600">{stats.em_andamento}</p>
            <p className="text-[10px] text-muted-foreground">Em Andamento</p>
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "cursor-pointer transition-all active:scale-95",
            statusFilter === 'aguardando_retorno' 
              ? "border-amber-500 bg-amber-500/20 ring-2 ring-amber-500/50" 
              : "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
          )}
          onClick={() => setStatusFilter(prev => prev === 'aguardando_retorno' ? null : 'aguardando_retorno')}
        >
          <CardContent className="p-3 text-center">
            <PauseCircle className="h-4 w-4 mx-auto mb-1 text-amber-600" />
            <p className="text-xl font-bold text-amber-600">{stats.aguardando_retorno}</p>
            <p className="text-[10px] text-muted-foreground">Standby</p>
          </CardContent>
        </Card>
      </div>

      {statusFilter && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-muted-foreground"
          onClick={() => setStatusFilter(null)}
        >
          Limpar filtro
        </Button>
      )}

      {/* Viagens list */}
      {filteredViagens.length === 0 ? (
        <div className="text-center py-12">
          <Bus className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">
            {statusFilter ? 'Nenhuma viagem com este status' : 'Nenhuma viagem ativa'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...viagensVisiveis]
            .sort((a, b) => {
              const order = { em_andamento: 0, aguardando_retorno: 1, agendado: 2 };
              const orderA = order[a.status as keyof typeof order] ?? 3;
              const orderB = order[b.status as keyof typeof order] ?? 3;
              return orderA - orderB;
            })
            .map(viagem => (
              <div key={viagem.id} className="relative">
                <ViagemCardOperador 
                  viagem={viagem}
                  onUpdate={handleRefresh}
                />
                <div className="absolute top-2 right-14 flex gap-1">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 shadow-md"
                    onClick={() => setEditingViagem(viagem)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                {/* Ações de missão para viagens vinculadas */}
                {viagem.origem_missao_id && onConcluirMissao && (
                  <div className="mt-1 flex gap-2 px-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                      onClick={() => handleConcluirMissao(viagem.origem_missao_id!)}
                      disabled={missaoLoading === viagem.origem_missao_id}
                    >
                      {missaoLoading === viagem.origem_missao_id ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      Concluir Missão
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => handleCancelarMissao(viagem.origem_missao_id!)}
                      disabled={missaoLoading === viagem.origem_missao_id}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            ))
          }
          <LoadMoreFooter
            total={pTotal}
            visible={viagensVisiveis.length}
            hasMore={hasMore}
            onLoadMore={loadMore}
            pageSize={pSize}
            onPageSizeChange={setPSize}
          />
        </div>
      )}

      {/* Edit Modal */}
      {editingViagem && (
        <EditViagemMobileModal
          viagem={editingViagem}
          open={!!editingViagem}
          onOpenChange={() => setEditingViagem(null)}
          eventoId={eventoId}
          onSave={() => {
            handleRefresh();
            setEditingViagem(null);
          }}
        />
      )}
    </div>
  );
}
