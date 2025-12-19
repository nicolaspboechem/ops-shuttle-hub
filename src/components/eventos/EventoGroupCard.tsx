import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Calendar, Bus, Car, ChevronRight, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Evento } from '@/lib/types/viagem';
import { supabase } from '@/integrations/supabase/client';
import { EditEventoModal } from './EditEventoModal';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  const getDateRange = () => {
    const primaryEvento = eventos[0];
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

  const primaryEvento = eventos[0];

  return (
    <Card className="hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden">
      <CardContent className="p-0">
        {/* Header colorido */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-5 border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-bold text-xl text-foreground">{groupName}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{getDateRange()}</span>
              </div>
            </div>
            <EditEventoModal
              evento={primaryEvento}
              onSuccess={onUpdate}
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/50">
                  <Pencil className="w-4 h-4" />
                </Button>
              }
            />
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
  );
}
