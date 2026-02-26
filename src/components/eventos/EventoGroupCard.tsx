import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Calendar, Bus, Car, ChevronRight, Pencil, MoreVertical, Eye, EyeOff, Archive, Trash2, Power } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Evento } from '@/lib/types/viagem';
import { supabase } from '@/integrations/supabase/client';
import { EditEventoModal } from './EditEventoModal';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface EventoGroupCardProps {
  groupName: string;
  eventos: Evento[];
  onUpdate?: () => void;
}

interface ViagemStats {
  transfer: number;
  shuttle: number;
  total: number;
  totalPax: number;
}

export function EventoGroupCard({ groupName, eventos, onUpdate }: EventoGroupCardProps) {
  const navigate = useNavigate();
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>(eventos.map(e => e.id));
  const [stats, setStats] = useState<Record<string, ViagemStats>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const primaryEvento = eventos[0];
  const isActive = primaryEvento.status === 'ativo';
  const isHidden = primaryEvento.visivel_publico === false;
  const isArchived = primaryEvento.status === 'arquivado';

  useEffect(() => {
    async function fetchStats() {
      const statsMap: Record<string, ViagemStats> = {};
      
      for (const evento of eventos) {
        const { data, error } = await supabase
          .from('viagens')
          .select('tipo_operacao, qtd_pax, qtd_pax_retorno')
          .eq('evento_id', evento.id);

        if (!error && data) {
          const transfer = data.filter(v => v.tipo_operacao === 'transfer').length;
          const shuttle = data.filter(v => v.tipo_operacao === 'shuttle').length;
          const totalPax = data.reduce((acc, v) => acc + (v.qtd_pax || 0) + (v.qtd_pax_retorno || 0), 0);
          statsMap[evento.id] = { transfer, shuttle, total: data.length, totalPax };
        }
      }
      
      setStats(statsMap);
    }
    fetchStats();
  }, [eventos]);

  const aggregatedStats = useMemo(() => {
    return selectedEventIds.reduce(
      (acc, id) => {
        const s = stats[id] || { transfer: 0, shuttle: 0, total: 0, totalPax: 0 };
        return {
          transfer: acc.transfer + s.transfer,
          shuttle: acc.shuttle + s.shuttle,
          total: acc.total + s.total,
          totalPax: acc.totalPax + s.totalPax,
        };
      },
      { transfer: 0, shuttle: 0, total: 0, totalPax: 0 }
    );
  }, [selectedEventIds, stats]);

  const getDateRange = () => {
    if (primaryEvento.data_inicio && primaryEvento.data_fim) {
      const start = new Date(primaryEvento.data_inicio + 'T12:00:00');
      const end = new Date(primaryEvento.data_fim + 'T12:00:00');
      return `${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}`;
    }
    const dates = eventos.map(e => new Date(e.data_criacao));
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    return `${format(min, 'dd/MM/yyyy')} - ${format(max, 'dd/MM/yyyy')}`;
  };

  const handleEnterEvent = () => {
    if (selectedEventIds.length === 1) {
      navigate(`/evento/${selectedEventIds[0]}`);
    } else if (selectedEventIds.length > 0) {
      navigate(`/evento/${selectedEventIds[0]}`);
    }
  };

  const updateEventStatus = async (status: string) => {
    setActionLoading(true);
    const { error } = await supabase
      .from('eventos')
      .update({ status })
      .eq('id', primaryEvento.id);

    if (error) {
      toast.error('Erro ao atualizar evento');
    } else {
      const messages: Record<string, string> = {
        ativo: 'Evento ativado',
        inativo: 'Evento desativado',
        arquivado: 'Evento arquivado',
      };
      toast.success(messages[status] || 'Evento atualizado');
      onUpdate?.();
    }
    setActionLoading(false);
  };

  const toggleVisibility = async () => {
    setActionLoading(true);
    const { error } = await supabase
      .from('eventos')
      .update({ visivel_publico: !isHidden ? false : true })
      .eq('id', primaryEvento.id);

    if (error) {
      toast.error('Erro ao alterar visibilidade');
    } else {
      toast.success(isHidden ? 'Evento visível no painel público' : 'Evento oculto do painel público');
      onUpdate?.();
    }
    setActionLoading(false);
  };

  const deleteEvent = async () => {
    setActionLoading(true);
    
    try {
      // Delete all related data first - in dependency order
      for (const evento of eventos) {
        // 1. Tabelas que dependem de outras tabelas principais
        await supabase.from('missoes').delete().eq('evento_id', evento.id);
        await supabase.from('motorista_presenca').delete().eq('evento_id', evento.id);
        await supabase.from('veiculo_vistoria_historico').delete().eq('evento_id', evento.id);
        // staff_credenciais removed in cleanup
        
        // 2. Tabelas principais
        await supabase.from('viagens').delete().eq('evento_id', evento.id);
        await supabase.from('motoristas').delete().eq('evento_id', evento.id);
        await supabase.from('veiculos').delete().eq('evento_id', evento.id);
        await supabase.from('pontos_embarque').delete().eq('evento_id', evento.id);
        await supabase.from('rotas_shuttle').delete().eq('evento_id', evento.id);
        await supabase.from('evento_usuarios').delete().eq('evento_id', evento.id);
      }

      // 3. Delete the event itself
      const { error } = await supabase
        .from('eventos')
        .delete()
        .eq('id', primaryEvento.id);

      if (error) {
        console.error('Erro ao excluir evento:', error);
        toast.error('Erro ao excluir evento: ' + error.message);
      } else {
        toast.success('Evento excluído permanentemente');
        onUpdate?.();
      }
    } catch (err) {
      console.error('Erro inesperado ao excluir evento:', err);
      toast.error('Erro inesperado ao excluir evento');
    }
    
    setActionLoading(false);
    setDeleteDialogOpen(false);
  };

  const getStatusBadge = () => {
    if (isArchived) {
      return <Badge variant="secondary" className="text-xs">Arquivado</Badge>;
    }
    if (!isActive) {
      return <Badge variant="outline" className="text-xs">Inativo</Badge>;
    }
    if (isHidden) {
      return <Badge variant="outline" className="text-xs gap-1"><EyeOff className="h-3 w-3" /> Oculto</Badge>;
    }
    return null;
  };

  return (
    <>
      <Card className={cn(
        "hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden",
        !isActive && "opacity-75"
      )}>
        <CardContent className="p-0">
          {/* Imagem de Capa */}
          {primaryEvento.imagem_banner && (
            <div className="aspect-[3/1] overflow-hidden">
              <img
                src={primaryEvento.imagem_banner}
                alt={groupName}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Header colorido */}
          <div className={cn(
            "bg-gradient-to-r from-primary/10 to-primary/5 p-5 border-b",
            !primaryEvento.imagem_banner && "rounded-t-lg"
          )}>
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xl text-foreground">{groupName}</h3>
                  {getStatusBadge()}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{getDateRange()}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <EditEventoModal
                  evento={primaryEvento}
                  onSuccess={onUpdate}
                  trigger={
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/50">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  }
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/50">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {isActive ? (
                      <DropdownMenuItem onClick={() => updateEventStatus('inativo')} disabled={actionLoading}>
                        <Power className="w-4 h-4 mr-2" />
                        Desativar
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => updateEventStatus('ativo')} disabled={actionLoading}>
                        <Power className="w-4 h-4 mr-2" />
                        Ativar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={toggleVisibility} disabled={actionLoading}>
                      {isHidden ? (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Mostrar no Painel
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4 mr-2" />
                          Ocultar do Painel
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => updateEventStatus('arquivado')} disabled={actionLoading || isArchived}>
                      <Archive className="w-4 h-4 mr-2" />
                      Arquivar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setDeleteDialogOpen(true)} 
                      disabled={actionLoading}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir Permanente
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Badges de operação */}
            <div className="flex items-center gap-2 flex-wrap">
              {aggregatedStats.transfer > 0 && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1.5 py-1 px-2.5">
                  <Car className="w-3.5 h-3.5" />
                  {aggregatedStats.transfer} Transfer
                </Badge>
              )}
              {aggregatedStats.shuttle > 0 && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1.5 py-1 px-2.5">
                  <Bus className="w-3.5 h-3.5" />
                  {aggregatedStats.shuttle} Shuttle
                </Badge>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{aggregatedStats.total}</p>
                <p className="text-xs text-muted-foreground">Viagens</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{aggregatedStats.totalPax.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Passageiros</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{eventos.length}</p>
                <p className="text-xs text-muted-foreground">Dias</p>
              </div>
            </div>

            {/* Action Button */}
            <Button 
              className="w-full" 
              onClick={handleEnterEvent}
              disabled={selectedEventIds.length === 0}
            >
              Acessar evento
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Evento Permanentemente</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Tem certeza que deseja excluir <strong>{groupName}</strong>?
              </p>
              <p className="text-destructive font-medium">
                Esta ação é irreversível e excluirá todas as viagens, motoristas, veículos e dados associados.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteEvent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
