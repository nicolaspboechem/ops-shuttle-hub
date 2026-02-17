import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Clock, UserMinus, Trash2, Pencil, ChevronLeft, ChevronRight, CalendarIcon, History } from 'lucide-react';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useEscalas, Escala } from '@/hooks/useEscalas';
import { Motorista } from '@/hooks/useCadastros';
import { CreateEscalaWizard } from './CreateEscalaWizard';
import { cn } from '@/lib/utils';
import { getDataOperacional } from '@/lib/utils/diaOperacional';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface MotoristasEscalaProps {
  eventoId: string;
  motoristas: Motorista[];
  getPresenca: (motoristaId: string) => { checkin_at?: string | null; checkout_at?: string | null } | null;
  horarioVirada?: string;
}

function MotoristaEscalaCard({
  motorista,
  presenca,
  onRemove,
}: {
  motorista: Motorista;
  presenca: { checkin_at?: string | null; checkout_at?: string | null } | null;
  onRemove: () => void;
}) {
  const statusColor = presenca?.checkout_at
    ? 'bg-red-500'
    : presenca?.checkin_at
    ? 'bg-green-500'
    : 'bg-muted-foreground/40';

  return (
    <div className="group flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:shadow-sm transition-shadow">
      <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', statusColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{motorista.nome}</p>
        {motorista.veiculo && (
          <p className="text-[10px] text-muted-foreground truncate">
            {motorista.veiculo.nome || motorista.veiculo.placa}
          </p>
        )}
      </div>
      <Badge variant="outline" className="text-[10px] shrink-0">
        {presenca?.checkout_at ? 'Saiu' : presenca?.checkin_at ? 'Ativo' : '—'}
      </Badge>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-destructive shrink-0"
        title="Remover da escala"
      >
        <UserMinus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function EscalaKanbanColumn({
  escala,
  motoristas,
  getPresenca,
  collapsed,
  onToggleCollapse,
  onEdit,
  onDelete,
  onRemoveMotorista,
}: {
  escala: Escala;
  motoristas: Motorista[];
  getPresenca: MotoristasEscalaProps['getPresenca'];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveMotorista: (motoristaId: string) => void;
}) {
  const ativos = motoristas.filter(m => {
    const p = getPresenca(m.id);
    return p?.checkin_at && !p?.checkout_at;
  }).length;

  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center w-12 shrink-0 bg-muted/30 rounded-xl border border-border/50 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggleCollapse}
      >
        <ChevronRight className="w-4 h-4 text-muted-foreground mb-2" />
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 mb-2">
          {motoristas.length}
        </Badge>
        <span
          className="text-xs font-semibold text-muted-foreground"
          style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
        >
          {escala.nome}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-muted/30 rounded-xl border border-border/50 min-w-[280px] max-w-[320px] w-full shrink-0">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border/50 space-y-1">
        <div className="flex items-center gap-2">
          <button onClick={onToggleCollapse} className="p-0.5 hover:bg-muted rounded">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground flex-1 truncate">{escala.nome}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
            {motoristas.length}
          </Badge>
          <button onClick={onEdit} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir escala?</AlertDialogTitle>
                <AlertDialogDescription>
                  A escala "{escala.nome}" será desativada.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
          <Clock className="w-3 h-3" />
          <span>{escala.horario_inicio?.slice(0, 5)} - {escala.horario_fim?.slice(0, 5)}</span>
          <span className="text-green-600 font-medium ml-auto">{ativos} ativos</span>
        </div>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-16rem)]">
        <div className="p-2 space-y-1.5 min-h-[60px]">
          {motoristas.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum motorista</p>
          ) : (
            motoristas.map(m => (
              <MotoristaEscalaCard
                key={m.id}
                motorista={m}
                presenca={getPresenca(m.id)}
                onRemove={() => onRemoveMotorista(m.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function MotoristasEscala({ eventoId, motoristas, getPresenca, horarioVirada = '04:00' }: MotoristasEscalaProps) {
  const {
    escalas,
    loading,
    createEscala,
    updateEscala,
    deleteEscala,
    removeMotoristaFromEscala,
    getMotoristasByEscala,
    getEscalaByMotorista,
  } = useEscalas(eventoId);

  const [showWizard, setShowWizard] = useState(false);
  const [escalaParaEditar, setEscalaParaEditar] = useState<(Escala & { motorista_ids: string[] }) | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Date filter
  const diaOperacionalHoje = useMemo(() => getDataOperacional(new Date(), horarioVirada), [horarioVirada]);
  const [selectedDate, setSelectedDate] = useState(diaOperacionalHoje);
  const isToday = selectedDate === diaOperacionalHoje;

  // Historical presence data
  const [presencasHistorico, setPresencasHistorico] = useState<Record<string, { checkin_at: string | null; checkout_at: string | null }>>({});
  const [loadingPresencas, setLoadingPresencas] = useState(false);

  useEffect(() => {
    if (isToday || !eventoId) {
      setPresencasHistorico({});
      return;
    }

    setLoadingPresencas(true);
    supabase
      .from('motorista_presenca')
      .select('motorista_id, checkin_at, checkout_at')
      .eq('evento_id', eventoId)
      .eq('data', selectedDate)
      .then(({ data }) => {
        const map: Record<string, { checkin_at: string | null; checkout_at: string | null }> = {};
        data?.forEach(row => {
          // Keep the most recent record per driver
          const existing = map[row.motorista_id];
          if (!existing || (row.checkin_at && (!existing.checkin_at || row.checkin_at > existing.checkin_at))) {
            map[row.motorista_id] = { checkin_at: row.checkin_at, checkout_at: row.checkout_at };
          }
        });
        setPresencasHistorico(map);
        setLoadingPresencas(false);
      });
  }, [selectedDate, isToday, eventoId]);

  // Unified getPresenca: real-time for today, historical for past dates
  const getPresencaEfetiva = useCallback((motoristaId: string) => {
    if (isToday) return getPresenca(motoristaId);
    const hist = presencasHistorico[motoristaId];
    return hist || null;
  }, [isToday, getPresenca, presencasHistorico]);

  const navigateDate = (direction: -1 | 1) => {
    const current = parseISO(selectedDate);
    const next = direction === -1 ? subDays(current, 1) : addDays(current, 1);
    setSelectedDate(format(next, 'yyyy-MM-dd'));
  };

  const toggleCollapse = (id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openEditWizard = (escala: Escala) => {
    const mIds = getMotoristasByEscala(escala.id).map(em => em.motorista_id);
    setEscalaParaEditar({ ...escala, motorista_ids: mIds });
    setShowWizard(true);
  };

  const handleWizardClose = (open: boolean) => {
    setShowWizard(open);
    if (!open) setEscalaParaEditar(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Carregando escalas...
      </div>
    );
  }

  const formattedDate = format(parseISO(selectedDate), "dd 'de' MMM", { locale: ptBR });

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold">Escalas de Turno</h2>
            <p className="text-sm text-muted-foreground">
              {escalas.length} escala{escalas.length !== 1 ? 's' : ''} cadastrada{escalas.length !== 1 ? 's' : ''}
            </p>
          </div>
          {!isToday && (
            <Badge variant="outline" className="text-xs gap-1 border-amber-500/50 text-amber-600">
              <History className="w-3 h-3" />
              Histórico
            </Badge>
          )}
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
                <CalendarIcon className="w-3.5 h-3.5" />
                {formattedDate}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={parseISO(selectedDate)}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(format(date, 'yyyy-MM-dd'));
                    setCalendarOpen(false);
                  }
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          {!isToday && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedDate(diaOperacionalHoje)}>
              Hoje
            </Button>
          )}
        </div>

        <Button onClick={() => { setEscalaParaEditar(null); setShowWizard(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Nova Escala
        </Button>
      </div>

      {escalas.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Clock className="w-12 h-12 opacity-20" />
          <p>Nenhuma escala cadastrada</p>
          <Button variant="outline" onClick={() => setShowWizard(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Criar primeira escala
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto min-h-0">
          <div className="flex gap-3 h-full p-1">
            {escalas.map(escala => {
              const mIds = getMotoristasByEscala(escala.id).map(em => em.motorista_id);
              const escalaMotoristas = motoristas.filter(m => mIds.includes(m.id));

              return (
                <EscalaKanbanColumn
                  key={escala.id}
                  escala={escala}
                  motoristas={escalaMotoristas}
                  getPresenca={getPresencaEfetiva}
                  collapsed={collapsedIds.has(escala.id)}
                  onToggleCollapse={() => toggleCollapse(escala.id)}
                  onEdit={() => openEditWizard(escala)}
                  onDelete={() => deleteEscala(escala.id)}
                  onRemoveMotorista={(mid) => removeMotoristaFromEscala(escala.id, mid)}
                />
              );
            })}
          </div>
        </div>
      )}

      <CreateEscalaWizard
        open={showWizard}
        onOpenChange={handleWizardClose}
        motoristas={motoristas}
        escalasExistentes={escalas}
        getEscalaByMotorista={getEscalaByMotorista}
        onSubmit={createEscala}
        escalaParaEditar={escalaParaEditar}
        onEdit={(id, data) => updateEscala(id, data)}
      />
    </div>
  );
}
