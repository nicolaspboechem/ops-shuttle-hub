import { useMemo } from 'react';
import { format, parseISO, addDays, subDays, isAfter, isBefore, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface DiaSeletorProps {
  dataOperacional: string; // "YYYY-MM-DD"
  onChange: (data: string) => void;
  dataInicio?: string | null;
  dataFim?: string | null;
  showToggleAll?: boolean;
  verTodosDias?: boolean;
  onToggleTodosDias?: (value: boolean) => void;
  compact?: boolean;
}

export function DiaSeletor({ 
  dataOperacional, 
  onChange, 
  dataInicio, 
  dataFim,
  showToggleAll = true,
  verTodosDias = false,
  onToggleTodosDias,
  compact = false,
}: DiaSeletorProps) {
  const dataAtual = useMemo(() => parseISO(dataOperacional), [dataOperacional]);
  const hoje = useMemo(() => new Date(), []);
  
  const limites = useMemo(() => {
    return {
      inicio: dataInicio ? parseISO(dataInicio) : undefined,
      fim: dataFim ? parseISO(dataFim) : undefined,
    };
  }, [dataInicio, dataFim]);

  const podeAnterior = useMemo(() => {
    if (!limites.inicio) return true;
    return isAfter(dataAtual, limites.inicio);
  }, [dataAtual, limites.inicio]);

  const podeProximo = useMemo(() => {
    if (!limites.fim) return !isAfter(dataAtual, hoje);
    return isBefore(dataAtual, limites.fim);
  }, [dataAtual, limites.fim, hoje]);

  const irAnterior = () => {
    if (podeAnterior) {
      onChange(format(subDays(dataAtual, 1), 'yyyy-MM-dd'));
    }
  };

  const irProximo = () => {
    if (podeProximo) {
      onChange(format(addDays(dataAtual, 1), 'yyyy-MM-dd'));
    }
  };

  const isHoje = isSameDay(dataAtual, hoje);

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
    }
  };

  const disabledDays = useMemo(() => {
    const disabled: Array<Date | { after: Date } | { before: Date }> = [];
    
    // Disable days before event start
    if (limites.inicio) {
      disabled.push({ before: limites.inicio });
    }
    
    // Disable days after event end or today (whichever is earlier)
    const maxDate = limites.fim 
      ? (isBefore(limites.fim, hoje) ? limites.fim : hoje)
      : hoje;
    disabled.push({ after: maxDate });
    
    return disabled;
  }, [limites, hoje]);

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7"
          onClick={irAnterior}
          disabled={!podeAnterior || verTodosDias}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className={cn(
                "h-7 px-2 text-xs font-medium",
                verTodosDias && "opacity-50"
              )}
              disabled={verTodosDias}
            >
              {format(dataAtual, "dd/MM", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={dataAtual}
              onSelect={handleCalendarSelect}
              disabled={disabledDays}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7"
          onClick={irProximo}
          disabled={!podeProximo || verTodosDias}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {showToggleAll && onToggleTodosDias && (
          <Button
            variant={verTodosDias ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => onToggleTodosDias(!verTodosDias)}
            title={verTodosDias ? "Voltar para dia único" : "Ver todos os dias"}
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8"
        onClick={irAnterior}
        disabled={!podeAnterior || verTodosDias}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            className={cn(
              "h-8 px-3 gap-2",
              verTodosDias && "opacity-50"
            )}
            disabled={verTodosDias}
          >
            <CalendarDays className="h-4 w-4" />
            <span className="font-medium">
              {format(dataAtual, "EEE, dd 'de' MMM", { locale: ptBR })}
            </span>
            {isHoje && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Hoje
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={dataAtual}
            onSelect={handleCalendarSelect}
            disabled={disabledDays}
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8"
        onClick={irProximo}
        disabled={!podeProximo || verTodosDias}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {showToggleAll && onToggleTodosDias && (
        <Button
          variant={verTodosDias ? "secondary" : "ghost"}
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => onToggleTodosDias(!verTodosDias)}
        >
          <List className="h-4 w-4" />
          <span className="hidden sm:inline">
            {verTodosDias ? "Dia único" : "Todos"}
          </span>
        </Button>
      )}
    </div>
  );
}
