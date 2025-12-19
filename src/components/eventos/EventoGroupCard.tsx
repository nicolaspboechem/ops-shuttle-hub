import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Calendar, Bus, Car, ChevronRight, Users, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Evento } from '@/lib/types/viagem';
import { supabase } from '@/integrations/supabase/client';
import { EditEventoModal } from './EditEventoModal';
import { cn } from '@/lib/utils';

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

  const toggleEventId = (id: string) => {
    setSelectedEventIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  };

  const getDateRange = () => {
    const dates = eventos.map(e => new Date(e.data_criacao));
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    return `${formatDate(min.toISOString())} - ${formatDate(max.toISOString())}`;
  };

  const handleEnterEvent = () => {
    if (selectedEventIds.length === 1) {
      navigate(`/evento/${selectedEventIds[0]}`);
    } else if (selectedEventIds.length > 0) {
      navigate(`/evento/${selectedEventIds[0]}`);
    }
  };

  // For editing, use the first event in the group
  const primaryEvento = eventos[0];

  return (
    <Card className="hover:border-primary/50 hover:shadow-md transition-all">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {aggregatedStats.transfer > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    <Car className="w-4 h-4" />
                  </div>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                    Transfer ({aggregatedStats.transfer})
                  </Badge>
                </div>
              )}
              {aggregatedStats.shuttle > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    <Bus className="w-4 h-4" />
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    Shuttle ({aggregatedStats.shuttle})
                  </Badge>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg text-foreground">{groupName}</h3>
              <EditEventoModal
                evento={primaryEvento}
                onSuccess={onUpdate}
                trigger={
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                }
              />
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {getDateRange()}
              </span>
              <span>{eventos.length} dias</span>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 mb-4 p-3 rounded-lg bg-muted/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{aggregatedStats.total}</p>
            <p className="text-xs text-muted-foreground">Viagens</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-2xl font-bold text-foreground">{aggregatedStats.totalPax.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Passageiros</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{selectedEventIds.length}/{eventos.length}</p>
            <p className="text-xs text-muted-foreground">Dias selecionados</p>
          </div>
        </div>

        {/* Date Chips - Better Filter */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Filtrar por data:</p>
            <div className="flex gap-1">
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setSelectedEventIds(eventos.map(e => e.id))}
              >
                Todos
              </Button>
              <span className="text-muted-foreground">|</span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setSelectedEventIds([])}
              >
                Limpar
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {eventos.map((evento) => {
              const isSelected = selectedEventIds.includes(evento.id);
              const eventStats = stats[evento.id] || { total: 0 };
              return (
                <button
                  key={evento.id}
                  onClick={() => toggleEventId(evento.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                  )}
                >
                  {formatShortDate(evento.data_criacao)}
                  {eventStats.total > 0 && (
                    <span className="ml-1 opacity-70">({eventStats.total})</span>
                  )}
                </button>
              );
            })}
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
      </CardContent>
    </Card>
  );
}
