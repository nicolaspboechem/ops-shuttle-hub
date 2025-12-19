import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Calendar, Bus, Car, ChevronRight, ChevronDown, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Evento } from '@/lib/types/viagem';
import { supabase } from '@/integrations/supabase/client';

interface EventoGroupCardProps {
  groupName: string;
  eventos: Evento[];
}

interface ViagemStats {
  transfer: number;
  shuttle: number;
  total: number;
  totalPax: number;
}

export function EventoGroupCard({ groupName, eventos }: EventoGroupCardProps) {
  const navigate = useNavigate();
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>(eventos.map(e => e.id));
  const [stats, setStats] = useState<Record<string, ViagemStats>>({});
  const [isOpen, setIsOpen] = useState(false);

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

  const selectAll = () => setSelectedEventIds(eventos.map(e => e.id));
  const deselectAll = () => setSelectedEventIds([]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getDateRange = () => {
    const dates = eventos.map(e => new Date(e.data_criacao));
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    return `${formatDate(min.toISOString())} - ${formatDate(max.toISOString())}`;
  };

  const handleEnterEvent = () => {
    // If only one event selected, go directly to it
    if (selectedEventIds.length === 1) {
      navigate(`/evento/${selectedEventIds[0]}`);
    } else if (selectedEventIds.length > 0) {
      // Go to first selected event (could implement multi-event view later)
      navigate(`/evento/${selectedEventIds[0]}`);
    }
  };

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
            
            <h3 className="font-semibold text-lg text-foreground">{groupName}</h3>
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

        {/* Date Filter */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between mb-2">
              <span className="text-sm">Filtrar por data</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 p-3 rounded-lg border border-border bg-card">
              <div className="flex justify-between mb-2">
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={selectAll}>
                  Selecionar todos
                </Button>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={deselectAll}>
                  Limpar seleção
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {eventos.map((evento) => {
                  const eventStats = stats[evento.id] || { total: 0 };
                  return (
                    <label
                      key={evento.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedEventIds.includes(evento.id)}
                        onCheckedChange={() => toggleEventId(evento.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {formatDate(evento.data_criacao)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {eventStats.total} viagens
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Action Button */}
        <Button 
          className="w-full mt-3" 
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
